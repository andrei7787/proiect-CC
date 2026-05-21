import { App, CliCredentialsStackSynthesizer } from "aws-cdk-lib";
import { AiStudyPlannerStack } from "../lib/ai-study-planner-stack.js";

const app = new App();
const fileAssetsBucketName = app.node.tryGetContext("fileAssetsBucketName");

new AiStudyPlannerStack(app, "AiStudyPlannerStack", {
  synthesizer: typeof fileAssetsBucketName === "string" && fileAssetsBucketName.length > 0
    ? new CliCredentialsStackSynthesizer({ fileAssetsBucketName })
    : undefined
});
