import { App } from "aws-cdk-lib";
import { AiStudyPlannerStack } from "../lib/ai-study-planner-stack.js";

const app = new App();
new AiStudyPlannerStack(app, "AiStudyPlannerStack");
