import mongoose, { Document, Schema } from 'mongoose';

export interface IDownload extends Document {
    originalUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    r2Key: string;
    r2Url: string;
    downloadId: string;
    status: 'pending' | 'downloading' | 'completed' | 'failed';
    progress: number;
    error?: string;
    downloadCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const DownloadSchema = new Schema<IDownload>(
    {
        originalUrl: {
            type: String,
            required: true,
        },
        fileName: {
            type: String,
            required: true,
        },
        fileSize: {
            type: Number,
            default: 0,
        },
        mimeType: {
            type: String,
            default: 'application/octet-stream',
        },
        r2Key: {
            type: String,
            required: true,
        },
        r2Url: {
            type: String,
            default: '',
        },
        downloadId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['pending', 'downloading', 'completed', 'failed'],
            default: 'pending',
        },
        progress: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        error: {
            type: String,
        },
        downloadCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Ensure model isn't compiled multiple times in development
export default mongoose.models.Download || mongoose.model<IDownload>('Download', DownloadSchema);
