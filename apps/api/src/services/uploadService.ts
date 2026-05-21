import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({});

export async function createUploadUrl(input: {
  bucket: string;
  key: string;
  contentType: string;
}): Promise<string> {
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      ContentType: input.contentType
    }),
    { expiresIn: 900 }
  );
}
