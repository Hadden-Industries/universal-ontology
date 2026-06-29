import os
from aws_cdk import (
    Stack,
    Duration,
    aws_s3 as s3,
    aws_s3_notifications as s3_notify,
    aws_lambda as lambda_,
    aws_iam as iam,
    aws_sns as sns,
    aws_sns_subscriptions as subs,
    aws_budgets as budgets,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_certificatemanager as acm,
)
from constructs import Construct

class AmazonGlobalStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # SNS Topic
        budget_topic = sns.Topic(self, "BudgetTopic",
            topic_name="CloudFrontBudgetLimitReached-CDK"
        )
        budget_topic.add_to_resource_policy(iam.PolicyStatement(
            actions=["sns:Publish"],
            principals=[iam.ServicePrincipal("budgets.amazonaws.com")],
            resources=[budget_topic.topic_arn]
        ))

        # DisableCloudFrontOnBudget Lambda
        with open("Lambda/Functions/DisableCloudFront.js", "r") as f:
            disable_code = f.read()

        disable_lambda = lambda_.Function(self, "DisableCloudFrontLambda",
            function_name="DisableCloudFrontOnBudget-CDK",
            runtime=lambda_.Runtime.NODEJS_24_X,
            handler="index.handler",
            code=lambda_.InlineCode(disable_code),
            timeout=Duration.seconds(30)
        )
        budget_topic.add_subscription(subs.LambdaSubscription(disable_lambda))

        # CloudFront Distribution
        cert_arn = os.environ.get('CERT_ARN', f"arn:aws:acm:us-east-1:{self.account}:certificate/57bc44c5-a202-4f98-9f8c-74b642e6a4d4")
        cert = acm.Certificate.from_certificate_arn(self, "DomainCert", cert_arn)
        
        # Response Headers Policy
        cors_policy = cloudfront.ResponseHeadersPolicy(self, "CorsPolicy",
            response_headers_policy_name="Allow-CORS-For-HI-Ontology-CDK",
            cors_behavior=cloudfront.ResponseHeadersCorsBehavior(
                access_control_allow_origins=["*"],
                access_control_allow_headers=["*"],
                access_control_allow_methods=["GET", "HEAD", "OPTIONS"],
                access_control_allow_credentials=False,
                origin_override=True,
                access_control_max_age=Duration.seconds(600)
            ),
            security_headers_behavior=cloudfront.ResponseSecurityHeadersBehavior(
                xss_protection=cloudfront.ResponseHeadersXSSProtection(override=True, protection=True, mode_block=True),
                frame_options=cloudfront.ResponseHeadersFrameOptions(override=True, frame_option=cloudfront.HeadersFrameOption.DENY),
                referrer_policy=cloudfront.ResponseHeadersReferrerPolicy(override=True, referrer_policy=cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN),
                content_type_options=cloudfront.ResponseHeadersContentTypeOptions(override=True)
            )
        )

        # CloudFront Function
        with open("CloudFront/Functions/RewriteVocabularyURI.js", "r") as f:
            cf_func_code = f.read()
            
        rewrite_func = cloudfront.Function(self, "RewriteUriFunction",
            function_name="RewriteVocabularyURI-CDK",
            runtime=cloudfront.FunctionRuntime.JS_2_0,
            code=cloudfront.FunctionCode.from_inline(cf_func_code)
        )

        # We must force HTTP_ONLY because the S3 wildcard cert (*.s3.amazonaws.com) is invalid for buckets with dots in their name.
        origin = origins.HttpOrigin("haddenindustries.com.s3.amazonaws.com", protocol_policy=cloudfront.OriginProtocolPolicy.HTTP_ONLY)

        self.distribution = cloudfront.Distribution(self, "HIOntologyDistribution",
            default_root_object="index.html",
            domain_names=["haddenindustries.com"],
            certificate=cert,
            default_behavior=cloudfront.BehaviorOptions(
                origin=origin,
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowed_methods=cloudfront.AllowedMethods.ALLOW_GET_HEAD,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED
            ),
            additional_behaviors={
                "ontology/*": cloudfront.BehaviorOptions(
                    origin=origin,
                    viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    allowed_methods=cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                    cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
                    response_headers_policy=cors_policy,
                    function_associations=[
                        cloudfront.FunctionAssociation(
                            function=rewrite_func,
                            event_type=cloudfront.FunctionEventType.VIEWER_REQUEST
                        )
                    ]
                )
            }
        )

        # Grant Disable lambda permission to update distribution
        disable_lambda.add_environment("DISTRIBUTION_ID", self.distribution.distribution_id)
        disable_lambda.add_to_role_policy(iam.PolicyStatement(
            actions=["cloudfront:GetDistribution", "cloudfront:GetDistributionConfig", "cloudfront:UpdateDistribution"],
            resources=[f"arn:aws:cloudfront::{self.account}:distribution/{self.distribution.distribution_id}"]
        ))

        # AWS Budget
        alert_email = os.environ.get('ALERT_EMAIL', 'info@haddenindustries.com')
        budgets.CfnBudget(self, "CloudFrontBudget",
            budget=budgets.CfnBudget.BudgetDataProperty(
                budget_name="CloudFront-Monthly-10USD-Limit-CDK",
                budget_type="COST",
                time_unit="MONTHLY",
                budget_limit=budgets.CfnBudget.SpendProperty(amount=10, unit="USD"),
                cost_filters={"Service": ["Amazon CloudFront"]}
            ),
            notifications_with_subscribers=[
                budgets.CfnBudget.NotificationWithSubscribersProperty(
                    notification=budgets.CfnBudget.NotificationProperty(
                        comparison_operator="GREATER_THAN",
                        notification_type="ACTUAL",
                        threshold=80,
                        threshold_type="PERCENTAGE"
                    ),
                    subscribers=[budgets.CfnBudget.SubscriberProperty(
                        address=alert_email, subscription_type="EMAIL"
                    )]
                ),
                budgets.CfnBudget.NotificationWithSubscribersProperty(
                    notification=budgets.CfnBudget.NotificationProperty(
                        comparison_operator="GREATER_THAN",
                        notification_type="ACTUAL",
                        threshold=100,
                        threshold_type="PERCENTAGE"
                    ),
                    subscribers=[budgets.CfnBudget.SubscriberProperty(
                        address=budget_topic.topic_arn, subscription_type="SNS"
                    )]
                )
            ]
        )

class AmazonRegionalStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, distribution_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Read-Only reference to S3 Bucket
        bucket = s3.Bucket.from_bucket_attributes(self, "ImportedBucket",
            bucket_name="haddenindustries.com"
        )

        # AutoInvalidateCache Lambda
        with open("Lambda/Functions/AutoInvalidateCache.js", "r") as f:
            invalidate_code = f.read()

        invalidate_lambda = lambda_.Function(self, "AutoInvalidateCacheLambda",
            function_name="AutoInvalidateCache-CDK",
            runtime=lambda_.Runtime.NODEJS_24_X,
            handler="index.handler",
            code=lambda_.InlineCode(invalidate_code),
            timeout=Duration.seconds(15),
            environment={
                "DISTRIBUTION_ID": distribution_id
            }
        )
        
        # Grant Invalidation permission on the CloudFront Distribution
        invalidate_lambda.add_to_role_policy(iam.PolicyStatement(
            actions=["cloudfront:CreateInvalidation"],
            resources=[f"arn:aws:cloudfront::{self.account}:distribution/{distribution_id}"]
        ))

        # Add S3 Event Trigger using EventBridge instead of modifying the bucket's notification configuration directly!
        # This is the safest way to trigger a Lambda from S3 without modifying the bucket's intrinsic notification state.
        # Alternatively, using `bucket.add_event_notification` might attempt to create a custom resource.
        bucket.add_event_notification(
            s3.EventType.OBJECT_CREATED,
            s3_notify.LambdaDestination(invalidate_lambda)
        )
