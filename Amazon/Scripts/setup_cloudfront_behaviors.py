import os
import boto3
from pathlib import Path
from dotenv import load_dotenv

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / '.env'

# Load environment variables
load_dotenv(ENV_PATH)

def get_boto_clients():
    session = boto3.Session(region_name='us-east-1')
    return session.client('cloudfront')

def setup_response_headers_policy(client):
    print("Setting up Response Headers Policy 'Allow-CORS-For-HI-Ontology'...")
    policy_name = "Allow-CORS-For-HI-Ontology"
    policy_config = {
        'Comment': '',
        'Name': policy_name,
        'CorsConfig': {
            'AccessControlAllowOrigins': {'Quantity': 1, 'Items': ['*']},
            'AccessControlAllowHeaders': {'Quantity': 1, 'Items': ['*']},
            'AccessControlAllowMethods': {'Quantity': 3, 'Items': ['GET', 'HEAD', 'OPTIONS']},
            'AccessControlAllowCredentials': False,
            'AccessControlExposeHeaders': {'Quantity': 0, 'Items': []},
            'AccessControlMaxAgeSec': 600,
            'OriginOverride': True
        },
        'SecurityHeadersConfig': {
            'XSSProtection': {
                'Override': True,
                'Protection': True,
                'ModeBlock': True
            },
            'FrameOptions': {
                'Override': True,
                'FrameOption': 'DENY'
            },
            'ReferrerPolicy': {
                'Override': True,
                'ReferrerPolicy': 'strict-origin-when-cross-origin'
            },
            'ContentTypeOptions': {
                'Override': True
            }
        }
    }
    
    # Try to find existing policy first
    marker = None
    while True:
        if marker:
            list_response = client.list_response_headers_policies(Type='custom', Marker=marker)
        else:
            list_response = client.list_response_headers_policies(Type='custom')
            
        for policy in list_response.get('ResponseHeadersPolicyList', {}).get('Items', []):
            if policy['ResponseHeadersPolicy']['ResponseHeadersPolicyConfig']['Name'] == policy_name:
                policy_id = policy['ResponseHeadersPolicy']['Id']
                print(f"Policy '{policy_name}' already exists with ID: {policy_id}. Updating...")
                
                existing = client.get_response_headers_policy(Id=policy_id)
                etag = existing['ETag']
                
                client.update_response_headers_policy(
                    Id=policy_id,
                    ResponseHeadersPolicyConfig=policy_config,
                    IfMatch=etag
                )
                return policy_id
                
        marker = list_response.get('ResponseHeadersPolicyList', {}).get('NextMarker')
        if not marker:
            break

    # Create if not exists
    print(f"Creating Response Headers Policy '{policy_name}'...")
    response = client.create_response_headers_policy(ResponseHeadersPolicyConfig=policy_config)
    policy_id = response['ResponseHeadersPolicy']['Id']
    print(f"Created Policy with ID: {policy_id}")
    return policy_id

def setup_cloudfront_function(client):
    print("Setting up CloudFront Function 'RewriteVocabularyURI'...")
    function_name = 'RewriteVocabularyURI'
    function_path = BASE_DIR / 'CloudFront' / 'Functions' / 'RewriteVocabularyURI.js'
    
    with open(function_path, 'r', encoding='utf-8') as f:
        function_code = f.read().encode('utf-8')
        
    try:
        response = client.describe_function(Name=function_name)
        etag = response['ETag']
        print(f"Function {function_name} exists, updating...")
        
        update_response = client.update_function(
            Name=function_name,
            IfMatch=etag,
            FunctionConfig={
                'Comment': 'Rewrites vocabulary URLs',
                'Runtime': 'cloudfront-js-2.0'
            },
            FunctionCode=function_code
        )
        etag = update_response['ETag']
    except client.exceptions.NoSuchFunctionExists:
        print(f"Creating function {function_name}...")
        create_response = client.create_function(
            Name=function_name,
            FunctionConfig={
                'Comment': 'Rewrites vocabulary URLs',
                'Runtime': 'cloudfront-js-2.0'
            },
            FunctionCode=function_code
        )
        etag = create_response['Location'] if 'Location' in create_response else create_response.get('ETag')
        # Actually create_function returns ETag too
        etag = create_response['ETag']

    print(f"Publishing function {function_name}...")
    publish_response = client.publish_function(
        Name=function_name,
        IfMatch=etag
    )
    
    function_arn = publish_response['FunctionSummary']['FunctionMetadata']['FunctionARN']
    print(f"Published function ARN: {function_arn}")
    return function_arn

def setup_cloudfront_behavior(client, distribution_id, response_headers_policy_id, function_arn):
    print(f"Updating CloudFront Distribution '{distribution_id}'...")
    
    # Managed-CachingOptimized Cache Policy ID
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    
    # Get current distribution config
    response = client.get_distribution_config(Id=distribution_id)
    config = response['DistributionConfig']
    etag = response['ETag']
    
    # Check if 'ontology/*' behavior already exists
    behaviors = config.get('CacheBehaviors', {'Quantity': 0, 'Items': []})
    
    # Use the newly deployed function ARN
    
    new_behavior = {
        "PathPattern": "ontology/*",
        "TargetOriginId": "S3-haddenindustries.com",
        "TrustedSigners": { "Enabled": False, "Quantity": 0 },
        "TrustedKeyGroups": { "Enabled": False, "Quantity": 0 },
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
            "Quantity": 3,
            "Items": [ "HEAD", "GET", "OPTIONS" ],
            "CachedMethods": { "Quantity": 2, "Items": [ "HEAD", "GET" ] }
        },
        "SmoothStreaming": False,
        "Compress": True,
        "LambdaFunctionAssociations": { "Quantity": 0 },
        "FunctionAssociations": {
            "Quantity": 1,
            "Items": [
                {
                    "FunctionARN": function_arn,
                    "EventType": "viewer-request"
                }
            ]
        },
        "FieldLevelEncryptionId": "",
        "CachePolicyId": cache_policy_id,
        "ResponseHeadersPolicyId": response_headers_policy_id
    }
    
    # Update or add behavior
    updated = False
    for i, behavior in enumerate(behaviors.get('Items', [])):
        if behavior.get('PathPattern') == 'ontology/*':
            behaviors['Items'][i] = new_behavior
            updated = True
            break
            
    if not updated:
        if 'Items' not in behaviors:
            behaviors['Items'] = []
        behaviors['Items'].append(new_behavior)
        behaviors['Quantity'] += 1
    
    config['CacheBehaviors'] = behaviors
    
    # Update distribution
    print("Applying updated configuration to distribution...")
    try:
        client.update_distribution(
            DistributionConfig=config,
            Id=distribution_id,
            IfMatch=etag
        )
        print("Distribution updated successfully!")
    except Exception as e:
        print(f"Error updating distribution: {e}")

def main():
    try:
        print("Starting CloudFront Behaviors Setup...\n")
        
        distribution_id = os.environ.get('CLOUDFRONT_DISTRIBUTION_ID')
        if not distribution_id:
            print("ERROR: CLOUDFRONT_DISTRIBUTION_ID environment variable is not set.")
            print(f"Please add CLOUDFRONT_DISTRIBUTION_ID=your_dist_id to {ENV_PATH} and try again.")
            return

        client = get_boto_clients()
        
        policy_id = setup_response_headers_policy(client)
        function_arn = setup_cloudfront_function(client)
        setup_cloudfront_behavior(client, distribution_id, policy_id, function_arn)
        
        print("\nCloudFront setup completed successfully!")
    except Exception as e:
        print(f"\nSetup failed: {e}")

if __name__ == '__main__':
    main()
