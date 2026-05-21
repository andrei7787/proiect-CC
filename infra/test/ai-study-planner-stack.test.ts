import { App, CliCredentialsStackSynthesizer } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { AiStudyPlannerStack } from "../lib/ai-study-planner-stack";

describe("AiStudyPlannerStack", { timeout: 60000 }, () => {
  it("exposes deploy outputs needed by the frontend and demo setup", () => {
    const template = synthesize("student-email", { reminderEmailAddress: "student@example.com" });

    template.hasOutput("ApiBaseUrl", { Value: Match.anyValue() });
    template.hasOutput("CognitoUserPoolId", { Value: Match.anyValue() });
    template.hasOutput("CognitoUserPoolClientId", { Value: Match.anyValue() });
    template.hasOutput("AwsRegion", { Value: Match.anyValue() });
    template.hasOutput("MaterialsBucketName", { Value: Match.anyValue() });
    template.hasOutput("GeminiSecretName", { Value: Match.anyValue() });
  });

  it("creates an SNS email reminder topic for the configured demo address", () => {
    const template = synthesize("student-email", { reminderEmailAddress: "student@example.com" });

    template.hasResourceProperties("AWS::SNS::Topic", {
      TopicName: "AiStudyPlannerReminders"
    });
    template.hasResourceProperties("AWS::SNS::Subscription", {
      Protocol: "email",
      Endpoint: "student@example.com"
    });
    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          REMINDER_TOPIC_ARN: Match.anyValue()
        }
      }
    });
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "POST /reminders/run",
      AuthorizationType: "JWT"
    });
  });

  it("creates protected read routes needed by the demo frontend", () => {
    const template = synthesize("student-email", { reminderEmailAddress: "student@example.com" });

    for (const routeKey of [
      "GET /courses/{courseId}/materials",
      "GET /courses/{courseId}/tasks",
      "GET /dashboard",
      "GET /notifications",
      "POST /materials/{materialId}/process"
    ]) {
      template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
        RouteKey: routeKey,
        AuthorizationType: "JWT"
      });
    }

    template.hasResourceProperties("AWS::DynamoDB::Table", {
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({ IndexName: "byCourse" })
      ])
    });
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({ IndexName: "byUser" })
      ])
    });
  });

  it("can reuse an existing lab role without creating IAM roles and bootstrap roles", () => {
    const template = synthesize("lab-role-assets", {
      labRoleArn: "arn:aws:iam::381492031643:role/LabRole"
    }, new CliCredentialsStackSynthesizer({
      fileAssetsBucketName: "demo-cdk-assets"
    }));

    template.resourceCountIs("AWS::IAM::Role", 0);
    template.resourceCountIs("Custom::S3BucketNotifications", 0);
    template.resourceCountIs("Custom::S3AutoDeleteObjects", 0);
    template.hasResourceProperties("AWS::Lambda::Function", {
      Role: "arn:aws:iam::381492031643:role/LabRole"
    });
    expect(template.toJSON().Parameters).not.toHaveProperty("BootstrapVersion");
  });
});

const templates = new Map<string, Template>();

function synthesize(
  cacheKey: string,
  context: Record<string, string> = {},
  synthesizer?: CliCredentialsStackSynthesizer
): Template {
  const cached = templates.get(cacheKey);
  if (cached) return cached;

  const app = new App({ context });
  const stack = new AiStudyPlannerStack(app, "TestStack", { synthesizer });
  const template = Template.fromStack(stack);
  templates.set(cacheKey, template);
  return template;
}
