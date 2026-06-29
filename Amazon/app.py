#!/usr/bin/env python3
import sys

# ENFORCE VIRTUAL ENVIRONMENT
if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
    print("CRITICAL ERROR: AWS CDK must be run from inside the active virtual environment (.venv)!")
    print("Please activate it first using: .\\.venv\\Scripts\\activate (Windows) or source .venv/bin/activate (Mac/Linux)")
    sys.exit(1)

import os
import aws_cdk as cdk
from infrastructure.stack import AmazonGlobalStack, AmazonRegionalStack
from dotenv import load_dotenv

load_dotenv('.env')

app = cdk.App()

global_stack = AmazonGlobalStack(
    app, 
    "UniversalOntologyGlobalStack",
    env=cdk.Environment(account=os.getenv('CDK_DEFAULT_ACCOUNT'), region='us-east-1'),
    cross_region_references=True
)

regional_stack = AmazonRegionalStack(
    app, 
    "UniversalOntologyRegionalStack",
    distribution_id=global_stack.distribution.distribution_id,
    env=cdk.Environment(account=os.getenv('CDK_DEFAULT_ACCOUNT'), region='eu-west-1'),
    cross_region_references=True
)

app.synth()
