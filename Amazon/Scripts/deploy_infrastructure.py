import boto3
import json
import zipfile
import time
import io
from pathlib import Path
from dotenv import load_dotenv

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / '.env'

# Load environment variables from the Amazon-scoped .env file
load_dotenv(ENV_PATH)

# Configuration
ROLE_NAME = 'CloudFrontInvalidatorRole'
POLICY_NAME = 'CloudFrontInvalidationPolicy'
FUNCTION_NAME = 'AutoInvalidateCache'
BUCKET_NAME = 'haddenindustries.com'
# IMPORTANT: This MUST match the region where your S3 bucket is located!
REGION_NAME = 'eu-west-1'

ROLE_POLICY_PATH = BASE_DIR / 'IAM' / 'Roles' / 'LambdaTrustPolicy.json'
IAM_POLICY_PATH = BASE_DIR / 'IAM' / 'Policies' / 'CloudFrontInvalidationPolicy.json'
LAMBDA_CODE_PATH = BASE_DIR / 'Lambda' / 'Functions' / 'AutoInvalidateCache.js'

def get_boto_clients():
    # We explicitly declare the region here since the local environment lacks a default config
    session = boto3.Session(region_name=REGION_NAME)
    return session.client('iam'), session.client('lambda'), session.client('s3'), session.client('sts')

def setup_iam(iam):
    print("Setting up IAM Role and Policy...")
    with open(ROLE_POLICY_PATH, 'r') as f:
        trust_policy = f.read()
    
    role_arn = None
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
        # Wait for role to propagate across AWS datacenters
        time.sleep(10)

    with open(IAM_POLICY_PATH, 'r') as f:
        invalidation_policy = f.read()

    iam.put_role_policy(
        RoleName=ROLE_NAME,
        PolicyName=POLICY_NAME,
        PolicyDocument=invalidation_policy
    )
    print(f"Attached inline policy {POLICY_NAME} to {ROLE_NAME}.")
    return role_arn

def package_lambda():
    print("Zipping Lambda code in memory...")
    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w') as z:
        # Zip the AutoInvalidateCache.js file, but name it index.js inside the zip 
        # so the standard AWS Node.js handler "index.handler" finds it.
        z.write(LAMBDA_CODE_PATH, arcname='index.js')
    
    return memory_file.getvalue()

def setup_lambda(lambda_client, role_arn, zip_bytes, account_id):
    print("Setting up Lambda Function...")
    function_arn = None
    try:
        response = lambda_client.get_function(FunctionName=FUNCTION_NAME)
        function_arn = response['Configuration']['FunctionArn']
        print(f"Function {FUNCTION_NAME} exists. Updating code and runtime configuration...")
        lambda_client.update_function_code(
            FunctionName=FUNCTION_NAME,
            ZipFile=zip_bytes
        )
        lambda_client.update_function_configuration(
            FunctionName=FUNCTION_NAME,
            Runtime='nodejs24.x'
        )
    except lambda_client.exceptions.ResourceNotFoundException:
        print(f"Creating function {FUNCTION_NAME}...")
        # Retry creating function in case IAM role hasn't propagated yet
        for _ in range(6):
            try:
                response = lambda_client.create_function(
                    FunctionName=FUNCTION_NAME,
                    Runtime='nodejs24.x',
                    Role=role_arn,
                    Handler='index.handler',
                    Code={'ZipFile': zip_bytes},
                    Timeout=15
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
            
    # Add S3 Invoke Permission
    print("Configuring Lambda S3 Trigger Permission...")
    try:
        lambda_client.add_permission(
            FunctionName=FUNCTION_NAME,
            StatementId='AllowS3Invoke',
            Action='lambda:InvokeFunction',
            Principal='s3.amazonaws.com',
            SourceArn=f"arn:aws:s3:::{BUCKET_NAME}",
            SourceAccount=account_id
        )
        print("Added S3 invoke permission to Lambda.")
        print("Waiting for Lambda resource policy to propagate...")
        time.sleep(10)
    except lambda_client.exceptions.ResourceConflictException:
        print("S3 invoke permission already exists.")
        # We'll also sleep here just in case they re-ran the script immediately
        time.sleep(3)

    return function_arn

def setup_s3_versioning(s3_client):
    print(f"Enabling S3 Versioning on '{BUCKET_NAME}'...")
    s3_client.put_bucket_versioning(
        Bucket=BUCKET_NAME,
        VersioningConfiguration={'Status': 'Enabled'}
    )
    print("S3 Versioning enabled.")

def setup_s3_lifecycle(s3_client):
    print(f"Configuring 7-day Lifecycle Expiration rule on '{BUCKET_NAME}'...")
    
    # We want to permanently delete noncurrent versions after 7 days
    rule = {
        'ID': 'ExpireOldVersions7Days',
        'Filter': {},
        'Status': 'Enabled',
        'NoncurrentVersionExpiration': {
            'NoncurrentDays': 7
        }
    }
    
    try:
        # Fetch existing to avoid blindly overwriting, though for simplicity we will append or overwrite
        existing = s3_client.get_bucket_lifecycle_configuration(Bucket=BUCKET_NAME)
        rules = existing.get('Rules', [])
        # Remove old matching rule if it exists
        rules = [r for r in rules if r.get('ID') != 'ExpireOldVersions7Days']
        rules.append(rule)
    except Exception:
        # If no lifecycle configuration exists, start fresh
        rules = [rule]
        
    s3_client.put_bucket_lifecycle_configuration(
        Bucket=BUCKET_NAME,
        LifecycleConfiguration={'Rules': rules}
    )
    print("S3 Lifecycle rule configured.")

def setup_s3_trigger(s3_client, function_arn):
    print(f"Configuring S3 Bucket '{BUCKET_NAME}' notification...")
    
    try:
        existing = s3_client.get_bucket_notification_configuration(Bucket=BUCKET_NAME)
    except Exception as e:
        existing = {}

    # Keep existing configurations but remove old matching ones to avoid duplicates
    lambda_configs = existing.get('LambdaFunctionConfigurations', [])
    lambda_configs = [c for c in lambda_configs if c.get('LambdaFunctionArn') != function_arn]
    
    lambda_configs.append({
        'LambdaFunctionArn': function_arn,
        'Events': ['s3:ObjectCreated:*']
    })
    
    # AWS S3 API requires all existing configs to be re-supplied or they will be deleted
    new_config = {}
    if lambda_configs:
        new_config['LambdaFunctionConfigurations'] = lambda_configs
    if existing.get('TopicConfigurations'):
        new_config['TopicConfigurations'] = existing['TopicConfigurations']
    if existing.get('QueueConfigurations'):
        new_config['QueueConfigurations'] = existing['QueueConfigurations']
    if existing.get('EventBridgeConfiguration'):
        new_config['EventBridgeConfiguration'] = existing['EventBridgeConfiguration']
    
    s3_client.put_bucket_notification_configuration(
        Bucket=BUCKET_NAME,
        NotificationConfiguration=new_config
    )
    print("S3 bucket notification configured successfully!")

def main():
    try:
        print("Starting AWS Deployment...\n")
        iam, lambda_client, s3, sts = get_boto_clients()
        
        # Verify valid AWS credentials exist
        identity = sts.get_caller_identity()
        print(f"Authenticated as AWS Account: {identity['Account']}")
        
        role_arn = setup_iam(iam)
        zip_bytes = package_lambda()
        function_arn = setup_lambda(lambda_client, role_arn, zip_bytes, identity['Account'])
        
        setup_s3_versioning(s3)
        setup_s3_lifecycle(s3)
        setup_s3_trigger(s3, function_arn)
        
        print("\nDeployment completed successfully!")
    except Exception as e:
        print(f"\nDeployment failed: {e}")

if __name__ == '__main__':
    main()
