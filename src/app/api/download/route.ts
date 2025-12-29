import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Download from '@/lib/models/Download';
import { r2Client, R2_BUCKET } from '@/lib/r2';
import { Upload } from '@aws-sdk/lib-storage';
import { nanoid } from 'nanoid';

// Helper to extract filename from URL
function extractFileName(url: string): string {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const segments = pathname.split('/').filter(Boolean);
        const lastSegment = segments[segments.length - 1] || 'file';

        // Decode URI component and clean the filename
        const decodedName = decodeURIComponent(lastSegment);

        // If no extension, add a generic one
        if (!decodedName.includes('.')) {
            return `${decodedName}.bin`;
        }

        return decodedName;
    } catch {
        return `file_${Date.now()}.bin`;
    }
}

// Helper to get content type from headers or filename
function getContentType(headers: Headers, fileName: string): string {
    const contentType = headers.get('content-type');
    if (contentType && contentType !== 'application/octet-stream') {
        return contentType.split(';')[0].trim();
    }

    // Fallback based on extension
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
        pdf: 'application/pdf',
        zip: 'application/zip',
        rar: 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        mp4: 'video/mp4',
        mkv: 'video/x-matroska',
        avi: 'video/x-msvideo',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        txt: 'text/plain',
        html: 'text/html',
        css: 'text/css',
        js: 'application/javascript',
        json: 'application/json',
        xml: 'application/xml',
        exe: 'application/x-msdownload',
        iso: 'application/x-iso9660-image',
        tar: 'application/x-tar',
        gz: 'application/gzip',
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
}

export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            );
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            return NextResponse.json(
                { error: 'Invalid URL format' },
                { status: 400 }
            );
        }

        await dbConnect();

        // Generate unique download ID
        const downloadId = nanoid(12);
        const fileName = extractFileName(url);
        const r2Key = `downloads/${downloadId}/${fileName}`;

        // Create download record with pending status
        const download = await Download.create({
            originalUrl: url,
            fileName,
            r2Key,
            downloadId,
            status: 'pending',
            progress: 0,
        });

        // Start the download process in the background
        processDownload(download._id.toString(), url, r2Key, fileName);

        return NextResponse.json({
            success: true,
            downloadId,
            message: 'Download started',
            status: 'pending',
        });
    } catch (error) {
        console.error('Error creating download:', error);
        return NextResponse.json(
            { error: 'Failed to start download' },
            { status: 500 }
        );
    }
}

// Background download process with streaming upload
async function processDownload(
    mongoId: string,
    url: string,
    r2Key: string,
    fileName: string
) {
    try {
        await dbConnect();

        // Update status to downloading
        await Download.findByIdAndUpdate(mongoId, {
            status: 'downloading',
            progress: 5,
        });

        console.log(`Starting download: ${fileName} from ${url}`);

        // Fetch the file
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Encoding': 'identity',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }

        const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
        const contentType = getContentType(response.headers, fileName);

        console.log(`File info: ${contentLength} bytes, type: ${contentType}`);

        // Update with file info
        await Download.findByIdAndUpdate(mongoId, {
            fileSize: contentLength,
            mimeType: contentType,
            progress: 10,
        });

        // Read the response as buffer
        console.log('Downloading file content...');
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log(`Downloaded ${buffer.length} bytes, starting R2 upload...`);

        // Update progress - file downloaded
        await Download.findByIdAndUpdate(mongoId, {
            progress: 40,
        });

        // Use multipart upload for large files
        const upload = new Upload({
            client: r2Client,
            params: {
                Bucket: R2_BUCKET,
                Key: r2Key,
                Body: buffer,
                ContentType: contentType,
            },
            queueSize: 4, // concurrent part uploads
            partSize: 10 * 1024 * 1024, // 10MB parts
            leavePartsOnError: false,
        });

        // Track upload progress
        upload.on('httpUploadProgress', async (progress) => {
            if (progress.loaded && progress.total) {
                const uploadPercent = Math.round((progress.loaded / progress.total) * 50);
                const totalProgress = 40 + uploadPercent; // 40-90%
                console.log(`Upload progress: ${totalProgress}%`);
                await Download.findByIdAndUpdate(mongoId, {
                    progress: Math.min(totalProgress, 90),
                });
            }
        });

        await upload.done();

        console.log(`Upload completed for ${fileName}`);

        const r2Url = `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev/${r2Key}`;

        // Mark as completed
        await Download.findByIdAndUpdate(mongoId, {
            status: 'completed',
            progress: 100,
            r2Url,
            fileSize: buffer.length,
        });

        console.log(`Download completed: ${fileName}`);
    } catch (error) {
        console.error('Download processing error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Full error:', errorMessage);

        await Download.findByIdAndUpdate(mongoId, {
            status: 'failed',
            error: errorMessage,
        });
    }
}

// GET all downloads
export async function GET() {
    try {
        await dbConnect();

        const downloads = await Download.find()
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        return NextResponse.json({ downloads });
    } catch (error) {
        console.error('Error fetching downloads:', error);
        return NextResponse.json(
            { error: 'Failed to fetch downloads' },
            { status: 500 }
        );
    }
}
