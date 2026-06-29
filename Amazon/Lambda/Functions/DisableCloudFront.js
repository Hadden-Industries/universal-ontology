const { CloudFrontClient, GetDistributionConfigCommand, UpdateDistributionCommand } = require("@aws-sdk/client-cloudfront");

exports.handler = async (event) => {
    console.log("Received event from SNS:", JSON.stringify(event, null, 2));

    const distributionId = process.env.DISTRIBUTION_ID;
    if (!distributionId) {
        console.error("DISTRIBUTION_ID environment variable is missing.");
        return;
    }

    const client = new CloudFrontClient();

    try {
        console.log(`Fetching config for Distribution ID: ${distributionId}`);
        const getCommand = new GetDistributionConfigCommand({ Id: distributionId });
        const getConfigResult = await client.send(getCommand);
        
        const config = getConfigResult.DistributionConfig;
        const eTag = getConfigResult.ETag;
        
        if (!config.Enabled) {
            console.log("Distribution is already disabled.");
            return { statusCode: 200, body: 'Already disabled' };
        }

        console.log(`Disabling Distribution ID: ${distributionId}`);
        config.Enabled = false;
        
        const updateCommand = new UpdateDistributionCommand({
            Id: distributionId,
            IfMatch: eTag,
            DistributionConfig: config
        });
        
        await client.send(updateCommand);
        console.log("Distribution successfully disabled.");
        
        return { statusCode: 200, body: 'Distribution disabled successfully' };
    } catch (error) {
        console.error("Error disabling distribution:", error);
        throw error;
    }
};
