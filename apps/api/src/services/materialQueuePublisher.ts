import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

const sqs = new SQSClient({});

export interface MaterialProcessingJob {
  queueUrl: string;
  materialId: string;
  bucket: string;
  key: string;
  contentType: string;
}

export async function enqueueMaterialProcessing(input: MaterialProcessingJob): Promise<void> {
  await sqs.send(new SendMessageCommand({
    QueueUrl: input.queueUrl,
    MessageBody: JSON.stringify({
      materialId: input.materialId,
      bucket: input.bucket,
      key: input.key,
      contentType: input.contentType
    })
  }));
}
