import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

const sns = new SNSClient({});

export interface ReminderNotificationInput {
  topicArn: string;
  subject: string;
  message: string;
}

export async function publishReminderNotification(input: ReminderNotificationInput): Promise<void> {
  await sns.send(new PublishCommand({
    TopicArn: input.topicArn,
    Subject: input.subject,
    Message: input.message
  }));
}
