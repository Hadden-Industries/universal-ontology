#!/usr/bin/env python3
import sys
import os
import subprocess

# ENFORCE VIRTUAL ENVIRONMENT
if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
    print("CRITICAL ERROR: Deployment must be run from inside the active virtual environment (.venv)!")
    print("Please activate it first using: .\\.venv\\Scripts\\activate (Windows) or source .venv/bin/activate (Mac/Linux)")
    sys.exit(1)

from dotenv import load_dotenv
load_dotenv()

import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def main():
    print("=> Validating AWS Credentials...")
    try:
        sts = boto3.client('sts')
        identity = sts.get_caller_identity()
        account_id = identity['Account']
        print(f"=> Detected AWS Account: {account_id}")
    except (NoCredentialsError, ClientError) as e:
        print("CRITICAL: Unable to fetch AWS Account ID. Are you logged in with valid AWS credentials?")
        print(f"Error: {e}")
        sys.exit(1)

    print("=> Bootstrapping Global and Regional AWS environments...")
    bootstrap_cmd = [
        "npx", "aws-cdk", "bootstrap",
        f"aws://{account_id}/us-east-1",
        f"aws://{account_id}/eu-west-1"
    ]
    
    # Run bootstrap
    try:
        # shell=True is sometimes needed on Windows for npx, but we'll try without first, 
        # or use shell=os.name=='nt' to ensure cross-platform compatibility
        subprocess.run(bootstrap_cmd, check=True, shell=(os.name == 'nt'))
    except subprocess.CalledProcessError:
        print("CRITICAL: Bootstrapping failed.")
        sys.exit(1)

    print("=> Deploying Universal Ontology Infrastructure...")
    deploy_cmd = ["npx", "aws-cdk", "deploy", "--all"]
    try:
        subprocess.run(deploy_cmd, check=True, shell=(os.name == 'nt'))
    except subprocess.CalledProcessError:
        print("CRITICAL: Deployment failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
