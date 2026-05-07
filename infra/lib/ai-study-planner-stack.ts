import { Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpUserPoolAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { BlockPublicAccess, Bucket, EventType } from "aws-cdk-lib/aws-s3";
import { SqsDestination } from "aws-cdk-lib/aws-s3-notifications";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
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

    const studyPlansTable = this.table("StudyPlans", "planId");
    const tasksTable = this.table("StudyTasks", "taskId");
    tasksTable.addGlobalSecondaryIndex({
      indexName: "byDate",
      partitionKey: { name: "date", type: AttributeType.STRING }
    });
    const notificationsTable = this.table("Notifications", "notificationId");

    const materialsBucket = new Bucket(this, "MaterialsBucket", {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });
    const materialQueue = new Queue(this, "MaterialQueue", {
      visibilityTimeout: Duration.minutes(5)
    });
    materialsBucket.addEventNotification(EventType.OBJECT_CREATED, new SqsDestination(materialQueue));

    const geminiSecret = Secret.fromSecretNameV2(this, "GeminiSecret", "gemini-api-key");

    const commonEnvironment = {
      COURSES_TABLE: coursesTable.tableName,
      MATERIALS_TABLE: materialsTable.tableName,
      STUDY_PLANS_TABLE: studyPlansTable.tableName,
      TASKS_TABLE: tasksTable.tableName,
      NOTIFICATIONS_TABLE: notificationsTable.tableName,
      MATERIALS_BUCKET: materialsBucket.bucketName,
      GEMINI_API_KEY_SECRET_ID: geminiSecret.secretName
    };

    const createCourse = this.lambda("CreateCourse", "http/createCourse.ts", commonEnvironment);
    const listCourses = this.lambda("ListCourses", "http/listCourses.ts", commonEnvironment);
    const createMaterialUpload = this.lambda("CreateMaterialUpload", "http/createMaterialUpload.ts", commonEnvironment);
    const generateStudyPlan = this.lambda("GenerateStudyPlan", "http/generateStudyPlan.ts", commonEnvironment);
    const updateStudyTask = this.lambda("UpdateStudyTask", "http/updateStudyTask.ts", commonEnvironment);
    const processMaterial = this.lambda("ProcessMaterial", "async/processMaterial.ts", commonEnvironment);
    const sendReminders = this.lambda("SendReminders", "async/sendReminders.ts", {
      ...commonEnvironment,
      REMINDER_EMAIL_SOURCE: "verified@example.com"
    });

    [createCourse, listCourses, createMaterialUpload, generateStudyPlan, updateStudyTask, processMaterial, sendReminders]
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
    materialQueue.grantConsumeMessages(processMaterial);
    processMaterial.addEventSource(new SqsEventSource(materialQueue, { batchSize: 5 }));
    sendReminders.addToRolePolicy(new PolicyStatement({
      actions: ["ses:SendEmail", "ses:SendRawEmail"],
      resources: ["*"]
    }));

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
      path: "/materials/upload",
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration("CreateMaterialUploadIntegration", createMaterialUpload),
      authorizer
    });
    api.addRoutes({
      path: "/study-plans",
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration("GenerateStudyPlanIntegration", generateStudyPlan),
      authorizer
    });
    api.addRoutes({
      path: "/study-tasks/{taskId}",
      methods: [HttpMethod.PATCH],
      integration: new HttpLambdaIntegration("UpdateStudyTaskIntegration", updateStudyTask),
      authorizer
    });

    new Rule(this, "ReminderSchedule", {
      schedule: Schedule.rate(Duration.days(1)),
      targets: [new LambdaFunction(sendReminders)]
    });
  }

  private table(id: string, partitionKey: string): Table {
    return new Table(this, id, {
      partitionKey: { name: partitionKey, type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });
  }

  private lambda(id: string, entry: string, environment: Record<string, string>): NodejsFunction {
    return new NodejsFunction(this, id, {
      entry: apiEntry(entry),
      handler: "handler",
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(30),
      environment
    });
  }
}
