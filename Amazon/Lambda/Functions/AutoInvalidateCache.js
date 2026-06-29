const { CloudFrontClient, CreateInvalidationCommand } = require("@aws-sdk/client-cloudfront");
const { S3Client, ListObjectVersionsCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const cloudfront = new CloudFrontClient();
const s3 = new S3Client();

const DISTRIBUTION_ID = process.env.DISTRIBUTION_ID;

exports.handler = async (event) => {
    if (!DISTRIBUTION_ID) {
        console.error("DISTRIBUTION_ID environment variable is missing.");
        throw new Error("DISTRIBUTION_ID environment variable is missing.");
    }
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
        // Step 1: Check S3 Version History to see if this is an overwrite
        const versionCommand = new ListObjectVersionsCommand({
            Bucket: bucket,
            Prefix: objectKey
        });
        
        const versionData = await s3.send(versionCommand);
        // Filter strictly for the exact object key, in case the Prefix matched multiple similar files
        const exactVersions = (versionData.Versions || []).filter(v => v.Key === objectKey);
        
        if (exactVersions.length <= 1) {
            console.log(`Skipping invalidation: ${objectKey} is a brand new file with no previous versions.`);
            return { message: "Skipped - Brand new file" };
        }
        
        console.log(`${objectKey} was overwritten (Version count: ${exactVersions.length}). Proceeding with invalidation...`);

        // Step 2: Trigger CloudFront Invalidation
        const command = new CreateInvalidationCommand(params);
        const response = await cloudfront.send(command);
        console.log("Successfully created CloudFront invalidation:", response.Invalidation.Id);
        return response;
    } catch (error) {
        console.error("Error creating invalidation:", error);
        throw error;
    }
};
