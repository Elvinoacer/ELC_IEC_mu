import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET_KEY!,
  },
});

export async function getPresignedUploadUrl(fileName: string, contentType: string) {
  const key = `candidates/${Date.now()}-${fileName}`;
  
  const command = new PutObjectCommand({
    Bucket: process.env.DO_SPACES_BUCKET,
    Key: key,
    ContentType: contentType,
    ACL: "public-read",
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  
  return {
    uploadUrl: url,
    publicUrl: `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_REGION}.digitaloceanspaces.com/${key}`,
    key,
  };
}

export async function uploadFile(file: Buffer, fileName: string, contentType: string) {
  const key = `candidates/${Date.now()}-${fileName}`;
  
  const command = new PutObjectCommand({
    Bucket: process.env.DO_SPACES_BUCKET,
    Key: key,
    Body: file,
    ContentType: contentType,
    ACL: "public-read",
  });

  await s3Client.send(command);

  return {
    publicUrl: `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_REGION}.digitaloceanspaces.com/${key}`,
    key,
  };
}
