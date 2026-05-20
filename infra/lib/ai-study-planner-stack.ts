import { Aws, CfnOutput, CfnParameter, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpUserPoolAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Role, type IRole } from "aws-cdk-lib/aws-iam";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const apiEntry = (relative: string) => path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../apps/api/src",
  relative
);

export class AiStudyPlannerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const userPool = new UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      removalPolicy: RemovalPolicy.DESTROY
    });
    const userPoolClient = new UserPoolClient(this, "UserPoolClient", {
      userPool,
      authFlows: { userPassword: true, userSrp: true }
    });

    const coursesTable = this.table("Courses", "courseId");
    coursesTable.addGlobalSecondaryIndex({
      indexName: "byUser",
      partitionKey: { name: "userId", type: AttributeType.STRING }
    });

    const materialsTable = this.table("Materials", "materialId");
    materialsTable.addGlobalSecondaryIndex({
      indexName: "byCourse",
      partitionKey: { name: "courseId", type: AttributeType.STRING }
    });
    materialsTable.addGlobalSecondaryIndex({
      indexName: "byUser",
      partitionKey: { name: "userId", type: AttributeType.STRING }
    });

    const studyPlansTable = this.table("StudyPlans", "planId");
    const tasksTable = this.table("StudyTasks", "taskId");
    tasksTable.addGlobalSecondaryIndex({
      indexName: "byDate",
      partitionKey: { name: "date", type: AttributeType.STRING }
    });
    tasksTable.addGlobalSecondaryIndex({
      indexName: "byCourse",
      partitionKey: { name: "courseId", type: AttributeType.STRING }
    });
    const notificationsTable = this.table("Notifications", "notificationId");
    notificationsTable.addGlobalSecondaryIndex({
      indexName: "byUser",
      partitionKey: { name: "userId", type: AttributeType.STRING }
    });

    const materialsBucket = new Bucket(this, "MaterialsBucket", {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY
    });
    const materialQueue = new Queue(this, "MaterialQueue", {
      visibilityTimeout: Duration.minutes(5)
    });

    const geminiSecret = Secret.fromSecretNameV2(this, "GeminiSecret", "gemini-api-key");
    const reminderEmailAddress = this.configuredReminderEmailAddress();
    const reminderTopic = new Topic(this, "ReminderTopic", {
      topicName: "AiStudyPlannerReminders"
    });
    reminderTopic.addSubscription(new EmailSubscription(reminderEmailAddress));
    const lambdaRole = this.configuredLambdaRole();

    const commonEnvironment = {
      COURSES_TABLE: coursesTable.tableName,
      MATERIALS_TABLE: materialsTable.tableName,
      STUDY_PLANS_TABLE: studyPlansTable.tableName,
      TASKS_TABLE: tasksTable.tableName,
      NOTIFICATIONS_TABLE: notificationsTable.tableName,
      MATERIALS_BUCKET: materialsBucket.bucketName,
      MATERIAL_QUEUE_URL: materialQueue.queueUrl,
      GEMINI_API_KEY_SECRET_ID: geminiSecret.secretName
    };

    const createCourse = this.lambda("CreateCourse", "http/createCourse.ts", commonEnvironment, lambdaRole);
    const listCourses = this.lambda("ListCourses", "http/listCourses.ts", commonEnvironment, lambdaRole);
    const getDashboard = this.lambda("GetDashboard", "http/getDashboard.ts", commonEnvironment, lambdaRole);
    const createMaterialUpload = this.lambda("CreateMaterialUpload", "http/createMaterialUpload.ts", commonEnvironment, lambdaRole);
    const queueMaterialProcessing = this.lambda("QueueMaterialProcessing", "http/queueMaterialProcessing.ts", commonEnvironment, lambdaRole);
    const listCourseMaterials = this.lambda("ListCourseMaterials", "http/listCourseMaterials.ts", commonEnvironment, lambdaRole);
    const generateStudyPlan = this.lambda("GenerateStudyPlan", "http/generateStudyPlan.ts", commonEnvironment, lambdaRole);
    const listCourseTasks = this.lambda("ListCourseTasks", "http/listCourseTasks.ts", commonEnvironment, lambdaRole);
    const updateStudyTask = this.lambda("UpdateStudyTask", "http/updateStudyTask.ts", commonEnvironment, lambdaRole);
    const listNotifications = this.lambda("ListNotifications", "http/listNotifications.ts", commonEnvironment, lambdaRole);
    const processMaterial = this.lambda("ProcessMaterial", "async/processMaterial.ts", commonEnvironment, lambdaRole);
    const sendReminders = this.lambda("SendReminders", "async/sendReminders.ts", {
      ...commonEnvironment,
      REMINDER_TOPIC_ARN: reminderTopic.topicArn
    }, lambdaRole);
    const runReminders = this.lambda("RunReminders", "http/runReminders.ts", {
      ...commonEnvironment,
      REMINDER_TOPIC_ARN: reminderTopic.topicArn
    }, lambdaRole);

    [
      createCourse,
      listCourses,
      getDashboard,
      createMaterialUpload,
      queueMaterialProcessing,
      listCourseMaterials,
      generateStudyPlan,
      listCourseTasks,
      updateStudyTask,
      listNotifications,
      processMaterial,
      sendReminders,
      runReminders
    ]
      .forEach((fn) => {
        coursesTable.grantReadWriteData(fn);
        materialsTable.grantReadWriteData(fn);
        studyPlansTable.grantReadWriteData(fn);
        tasksTable.grantReadWriteData(fn);
        notificationsTable.grantReadWriteData(fn);
        geminiSecret.grantRead(fn);
      });
    materialsBucket.grantReadWrite(createMaterialUpload);
    materialsBucket.grantRead(processMaterial);
    materialQueue.grantSendMessages(queueMaterialProcessing);
    materialQueue.grantConsumeMessages(processMaterial);
    processMaterial.addEventSource(new SqsEventSource(materialQueue, { batchSize: 5 }));
    reminderTopic.grantPublish(sendReminders);
    reminderTopic.grantPublish(runReminders);

    const authorizer = new HttpUserPoolAuthorizer("CognitoAuthorizer", userPool, {
      userPoolClients: [userPoolClient]
    });
    const api = new HttpApi(this, "HttpApi");
    api.addRoutes({
      path: "/courses",
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration("CreateCourseIntegration", createCourse),
      authorizer
    });
    api.addRoutes({
      path: "/courses",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration("ListCoursesIntegration", listCourses),
      authorizer
    });
    api.addRoutes({
      path: "/dashboard",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration("GetDashboardIntegration", getDashboard),
      authorizer
    });
    api.addRoutes({
      path: "/materials/upload",
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration("CreateMaterialUploadIntegration", createMaterialUpload),
      authorizer
    });
    api.addRoutes({
      path: "/materials/{materialId}/process",
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration("QueueMaterialProcessingIntegration", queueMaterialProcessing),
      authorizer
    });
    api.addRoutes({
      path: "/courses/{courseId}/materials",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration("ListCourseMaterialsIntegration", listCourseMaterials),
      authorizer
    });
    api.addRoutes({
      path: "/study-plans",
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration("GenerateStudyPlanIntegration", generateStudyPlan),
      authorizer
    });
    api.addRoutes({
      path: "/courses/{courseId}/tasks",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration("ListCourseTasksIntegration", listCourseTasks),
      authorizer
    });
    api.addRoutes({
      path: "/study-tasks/{taskId}",
      methods: [HttpMethod.PATCH],
      integration: new HttpLambdaIntegration("UpdateStudyTaskIntegration", updateStudyTask),
      authorizer
    });
    api.addRoutes({
      path: "/notifications",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration("ListNotificationsIntegration", listNotifications),
      authorizer
    });
    api.addRoutes({
      path: "/reminders/run",
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration("RunRemindersIntegration", runReminders),
      authorizer
    });

    new Rule(this, "ReminderSchedule", {
      schedule: Schedule.rate(Duration.days(1)),
      targets: [new LambdaFunction(sendReminders)]
    });

    new CfnOutput(this, "ApiBaseUrl", { value: api.apiEndpoint });
    new CfnOutput(this, "CognitoUserPoolId", { value: userPool.userPoolId });
    new CfnOutput(this, "CognitoUserPoolClientId", { value: userPoolClient.userPoolClientId });
    new CfnOutput(this, "AwsRegion", { value: Aws.REGION });
    new CfnOutput(this, "MaterialsBucketName", { value: materialsBucket.bucketName });
    new CfnOutput(this, "GeminiSecretName", { value: geminiSecret.secretName });
  }

  private configuredReminderEmailAddress(): string {
    const contextValue = this.node.tryGetContext("reminderEmailAddress");
    if (typeof contextValue === "string" && contextValue.length > 0) return contextValue;
    if (process.env.REMINDER_EMAIL_ADDRESS) return process.env.REMINDER_EMAIL_ADDRESS;

    return new CfnParameter(this, "ReminderEmailAddress", {
      type: "String",
      description: "Email address subscribed to SNS study reminders.",
      default: "verified@example.com"
    }).valueAsString;
  }

  private configuredLambdaRole(): IRole | undefined {
    const roleArn = this.node.tryGetContext("labRoleArn");
    if (typeof roleArn !== "string" || roleArn.length === 0) return undefined;
    return Role.fromRoleArn(this, "LabRole", roleArn, { mutable: false });
  }

  private table(id: string, partitionKey: string): Table {
    return new Table(this, id, {
      partitionKey: { name: partitionKey, type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });
  }

  private lambda(id: string, entry: string, environment: Record<string, string>, role?: IRole): NodejsFunction {
    return new NodejsFunction(this, id, {
      entry: apiEntry(entry),
      handler: "handler",
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(30),
      environment,
      role
    });
  }
}
