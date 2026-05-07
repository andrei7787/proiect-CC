import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({});

export async function sendReminderEmail(userId: string, subject: string): Promise<void> {
  const source = required("REMINDER_EMAIL_SOURCE");
  await ses.send(new SendEmailCommand({
    Source: source,
    Destination: { ToAddresses: [userId] },
    Message: {
      Subject: { Data: subject },
      Body: {
        Text: { Data: subject }
      }
    }
  }));
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
