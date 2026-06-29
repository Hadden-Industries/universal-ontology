import os
import io
import json
import zipfile
import time
import boto3
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / '.env'
load_dotenv(ENV_PATH)

# Paths to IAM and Lambda
ROLE_POLICY_PATH = BASE_DIR / 'IAM' / 'Roles' / 'LambdaTrustPolicy.json'
IAM_POLICY_PATH = BASE_DIR / 'IAM' / 'Policies' / 'DisableCloudFrontPolicy.json'
LAMBDA_CODE_PATH = BASE_DIR / 'Lambda' / 'Functions' / 'DisableCloudFront.js'

# Configuration
REGION_NAME = 'us-east-1' # Budgets are global, usually managed in us-east-1. IAM, Lambda, SNS can be us-east-1.
ROLE_NAME = 'DisableCloudFrontRole'
POLICY_NAME = 'DisableCloudFrontPolicy'
FUNCTION_NAME = 'DisableCloudFrontOnBudget'
TOPIC_NAME = 'CloudFrontBudgetLimitReached'

def get_boto_clients():
    session = boto3.Session(region_name=REGION_NAME)
    return (
        session.client('iam'),
        session.client('lambda'),
        session.client('sns'),
        session.client('budgets'),
        session.client('sts')
    )

def setup_sns_topic(sns):
    print("Setting up SNS Topic...")
    response = sns.create_topic(Name=TOPIC_NAME)
    topic_arn = response['TopicArn']
    print(f"SNS Topic created/found: {topic_arn}")
    return topic_arn

def setup_sns_policy_for_budgets(sns, topic_arn, account_id):
    # AWS Budgets needs permission to publish to this SNS Topic
    print("Adding SNS topic policy for AWS Budgets...")
    policy = {
        "Version": "2012-10-17",
        "Id": "__default_policy_ID",
        "Statement": [
            {
                "Sid": "AWSBudgetsSNSPublishingPermissions",
                "Effect": "Allow",
                "Principal": {
                    "Service": "budgets.amazonaws.com"
                },
                "Action": "SNS:Publish",
                "Resource": topic_arn,
                "Condition": {
                    "StringEquals": {
                        "aws:SourceAccount": account_id
                    }
                }
            }
        ]
    }
    sns.set_topic_attributes(
        TopicArn=topic_arn,
        AttributeName='Policy',
        AttributeValue=json.dumps(policy)
    )

def setup_iam(iam, account_id, distribution_id):
    print("Setting up IAM Role and Policy...")
    with open(ROLE_POLICY_PATH, 'r') as f:
        trust_policy = f.read()
        
    trust_policy = trust_policy.replace('${ACCOUNT_ID}', account_id)
    
    try:
        response = iam.get_role(RoleName=ROLE_NAME)
        role_arn = response['Role']['Arn']
        print(f"Role {ROLE_NAME} already exists.")
    except iam.exceptions.NoSuchEntityException:
        response = iam.create_role(
            RoleName=ROLE_NAME,
            AssumeRolePolicyDocument=trust_policy
        )
        role_arn = response['Role']['Arn']
        print(f"Created role {ROLE_NAME}.")
        time.sleep(10)

    with open(IAM_POLICY_PATH, 'r') as f:
        inline_policy = f.read()

    inline_policy = inline_policy.replace('${ACCOUNT_ID}', account_id)
    inline_policy = inline_policy.replace('${DISTRIBUTION_ID}', distribution_id)
    inline_policy = inline_policy.replace('${REGION}', REGION_NAME)
    inline_policy = inline_policy.replace('${FUNCTION_NAME}', FUNCTION_NAME)

    iam.put_role_policy(
        RoleName=ROLE_NAME,
        PolicyName=POLICY_NAME,
        PolicyDocument=inline_policy
    )
    print(f"Attached inline policy {POLICY_NAME} to {ROLE_NAME}.")
    return role_arn

def package_lambda():
    print("Zipping Lambda code in memory...")
    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w') as z:
        z.write(LAMBDA_CODE_PATH, arcname='index.js')
    return memory_file.getvalue()

def setup_lambda(lambda_client, role_arn, zip_bytes, distribution_id):
    print("Setting up Lambda Function...")
    function_arn = None
    env_vars = {'Variables': {'DISTRIBUTION_ID': distribution_id}}
    
    try:
        response = lambda_client.get_function(FunctionName=FUNCTION_NAME)
        function_arn = response['Configuration']['FunctionArn']
        print(f"Function {FUNCTION_NAME} exists. Updating code and configuration...")
        lambda_client.update_function_code(
            FunctionName=FUNCTION_NAME,
            ZipFile=zip_bytes
        )
        for attempt in range(15):
            try:
                lambda_client.update_function_configuration(
                    FunctionName=FUNCTION_NAME,
                    Runtime='nodejs24.x',
                    Environment=env_vars
                )
                break
            except lambda_client.exceptions.ResourceConflictException:
                if attempt == 14: raise
                print("Waiting for Lambda update to complete...")
                time.sleep(2)
    except lambda_client.exceptions.ResourceNotFoundException:
        print(f"Creating function {FUNCTION_NAME}...")
        for _ in range(6):
            try:
                response = lambda_client.create_function(
                    FunctionName=FUNCTION_NAME,
                    Runtime='nodejs24.x',
                    Role=role_arn,
                    Handler='index.handler',
                    Code={'ZipFile': zip_bytes},
                    Timeout=30,
                    Environment=env_vars
                )
                function_arn = response['FunctionArn']
                print(f"Created function {FUNCTION_NAME}.")
                break
            except Exception as e:
                if 'The role defined for the function cannot be assumed by Lambda' in str(e):
                    print("Waiting for IAM role propagation...")
                    time.sleep(5)
                else:
                    raise
        if not function_arn:
            raise Exception("Failed to create Lambda function due to IAM propagation delay.")
            
    return function_arn

def subscribe_lambda_to_sns(sns, lambda_client, topic_arn, function_arn):
    print("Subscribing Lambda to SNS Topic...")
    
    # Check if subscription already exists
    paginator = sns.get_paginator('list_subscriptions_by_topic')
    exists = False
    for page in paginator.paginate(TopicArn=topic_arn):
        for sub in page['Subscriptions']:
            if sub['Endpoint'] == function_arn:
                exists = True
                break
    
    if not exists:
        sns.subscribe(
            TopicArn=topic_arn,
            Protocol='lambda',
            Endpoint=function_arn
        )
        print("Subscribed Lambda to SNS Topic.")
    else:
        print("Lambda is already subscribed to SNS Topic.")

    # Add Lambda permission for SNS to invoke it
    try:
        lambda_client.add_permission(
            FunctionName=FUNCTION_NAME,
            StatementId='AllowSNSInvoke',
            Action='lambda:InvokeFunction',
            Principal='sns.amazonaws.com',
            SourceArn=topic_arn
        )
        print("Added SNS invoke permission to Lambda.")
    except lambda_client.exceptions.ResourceConflictException:
        print("SNS invoke permission already exists on Lambda.")

def setup_budget(budgets_client, account_id, alert_email, topic_arn):
    budget_name = 'CloudFront-Monthly-10USD-Limit'
    
    print(f"Setting up AWS Budget '{budget_name}'...")
    
    budget = {
        'BudgetName': budget_name,
        'BudgetLimit': {
            'Amount': '10',
            'Unit': 'USD'
        },
        'CostFilters': {
            'Service': ['Amazon CloudFront']
        },
        'TimeUnit': 'MONTHLY',
        'BudgetType': 'COST'
    }

    notifications_with_subscribers = [
        {
            'Notification': {
                'NotificationType': 'ACTUAL',
                'ComparisonOperator': 'GREATER_THAN',
                'Threshold': 80,
                'ThresholdType': 'PERCENTAGE'
            },
            'Subscribers': [
                {
                    'SubscriptionType': 'EMAIL',
                    'Address': alert_email
                }
            ]
        },
        {
            'Notification': {
                'NotificationType': 'ACTUAL',
                'ComparisonOperator': 'GREATER_THAN',
                'Threshold': 100,
                'ThresholdType': 'PERCENTAGE'
            },
            'Subscribers': [
                {
                    'SubscriptionType': 'SNS',
                    'Address': topic_arn
                }
            ]
        }
    ]

    try:
        budgets_client.delete_budget(AccountId=account_id, BudgetName=budget_name)
        print("Deleted existing budget to recreate it with current settings.")
    except budgets_client.exceptions.NotFoundException:
        pass
    except Exception as e:
        print(f"Note: Could not delete existing budget: {e}")

    budgets_client.create_budget(
        AccountId=account_id,
        Budget=budget,
        NotificationsWithSubscribers=notifications_with_subscribers
    )
    print("Successfully created budget with 80% Email Alert and 100% Lambda Trigger.")

def main():
    try:
        print("Starting AWS Budget Automation Setup...\n")
        
        alert_email = os.environ.get('ALERT_EMAIL')
        if not alert_email:
            print("ERROR: ALERT_EMAIL environment variable is not set.")
            print(f"Please add ALERT_EMAIL=your@email.com to {ENV_PATH} and try again.")
            return

        distribution_id = os.environ.get('CLOUDFRONT_DISTRIBUTION_ID')
        if not distribution_id:
            print("ERROR: CLOUDFRONT_DISTRIBUTION_ID environment variable is not set.")
            print(f"Please add CLOUDFRONT_DISTRIBUTION_ID=your_dist_id to {ENV_PATH} and try again.")
            return

        print(f"Using CloudFront Distribution ID: {distribution_id}")

        iam, lambda_client, sns, budgets_client, sts = get_boto_clients()
        
        identity = sts.get_caller_identity()
        account_id = identity['Account']
        print(f"Authenticated as AWS Account: {account_id}")
        
        topic_arn = setup_sns_topic(sns)
        setup_sns_policy_for_budgets(sns, topic_arn, account_id)
        
        role_arn = setup_iam(iam, account_id, distribution_id)
        zip_bytes = package_lambda()
        
        function_arn = setup_lambda(lambda_client, role_arn, zip_bytes, distribution_id)
        
        subscribe_lambda_to_sns(sns, lambda_client, topic_arn, function_arn)
        
        setup_budget(budgets_client, account_id, alert_email, topic_arn)
        
        print("\nAutomation setup completed successfully!")
    except Exception as e:
        print(f"\nSetup failed: {e}")

if __name__ == '__main__':
    main()
