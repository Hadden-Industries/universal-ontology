const { CloudFrontClient, CreateInvalidationCommand } = require("@aws-sdk/client-cloudfront");
const crypto = require("crypto");
const client = new CloudFrontClient();

// Replace with your actual CloudFront Distribution ID
const DISTRIBUTION_ID = "E3A1546UWU7C5X"; 

exports.handler = async (event) => {
    // Extract the exact file path that was just uploaded to S3
    const bucket = event.Records[0].s3.bucket.name;
    const objectKey = event.Records[0].s3.object.key;
    
    // CloudFront paths must start with a forward slash
    const cloudfrontPath = `/${objectKey}`;

    console.log(`Triggered by file upload: ${cloudfrontPath} in bucket ${bucket}`);

    const params = {
        DistributionId: DISTRIBUTION_ID,
        InvalidationBatch: {
            // A unique reference ID to guarantee idempotency and prevent clashing
            CallerReference: `s3-invalidation-${Date.now()}-${crypto.randomUUID()}`, 
            Paths: {
                Quantity: 1,
                Items: [cloudfrontPath]
            }
        }
    };

    try {
        const command = new CreateInvalidationCommand(params);
        const response = await client.send(command);
        console.log("Successfully created CloudFront invalidation:", response.Invalidation.Id);
        return response;
    } catch (error) {
        console.error("Error creating invalidation:", error);
        throw error;
    }
};
