import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Download from '@/lib/models/Download';
import { getSignedDownloadUrl } from '@/lib/r2';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await dbConnect();

        const download = await Download.findOne({ downloadId: id });

        if (!download) {
            return NextResponse.json(
                { error: 'Download not found' },
                { status: 404 }
            );
        }

        // If completed, generate signed URL
        let signedUrl = null;
        if (download.status === 'completed') {
            try {
                signedUrl = await getSignedDownloadUrl(download.r2Key, 3600); // 1 hour expiry
            } catch (error) {
                console.error('Error generating signed URL:', error);
            }
        }

        return NextResponse.json({
            downloadId: download.downloadId,
            originalUrl: download.originalUrl,
            fileName: download.fileName,
            fileSize: download.fileSize,
            mimeType: download.mimeType,
            status: download.status,
            progress: download.progress,
            error: download.error,
            downloadCount: download.downloadCount,
            downloadUrl: signedUrl,
            createdAt: download.createdAt,
            updatedAt: download.updatedAt,
        });
    } catch (error) {
        console.error('Error fetching download:', error);
        return NextResponse.json(
            { error: 'Failed to fetch download' },
            { status: 500 }
        );
    }
}

// Increment download count when user actually downloads
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await dbConnect();

        const download = await Download.findOneAndUpdate(
            { downloadId: id, status: 'completed' },
            { $inc: { downloadCount: 1 } },
            { new: true }
        );

        if (!download) {
            return NextResponse.json(
                { error: 'Download not found or not completed' },
                { status: 404 }
            );
        }

        // Generate fresh signed URL
        const signedUrl = await getSignedDownloadUrl(download.r2Key, 3600);

        return NextResponse.json({
            success: true,
            downloadUrl: signedUrl,
            downloadCount: download.downloadCount,
        });
    } catch (error) {
        console.error('Error processing download:', error);
        return NextResponse.json(
            { error: 'Failed to process download' },
            { status: 500 }
        );
    }
}
