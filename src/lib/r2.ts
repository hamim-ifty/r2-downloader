import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2 Configuration - Using environment variables only
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'r2c';

// Validate required environment variables
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.warn('Warning: R2 credentials not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables.');
}

// Create S3 client configured for Cloudflare R2
export const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || '',
        secretAccessKey: R2_SECRET_ACCESS_KEY || '',
    },
    forcePathStyle: true, // Required for Cloudflare R2
});

export const R2_BUCKET = R2_BUCKET_NAME;

export async function uploadToR2(
    key: string,
    body: Buffer | ReadableStream | Uint8Array,
    contentType: string = 'application/octet-stream',
    contentLength?: number
): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        ...(contentLength && { ContentLength: contentLength }),
    });

    await r2Client.send(command);

    return `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`;
}

export async function getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
    });

    return await getSignedUrl(r2Client, command, { expiresIn });
}

export async function checkFileExists(key: string): Promise<boolean> {
    try {
        const command = new HeadObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
        });
        await r2Client.send(command);
        return true;
    } catch {
        return false;
    }
}

export async function getFileMetadata(key: string) {
    const command = new HeadObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
    });

    const response = await r2Client.send(command);

    return {
        contentLength: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
    };
}
