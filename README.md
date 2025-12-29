# R2 Downloader

A Next.js application that downloads files from URLs and stores them on Cloudflare R2 storage.

## Features

- 📥 Download files from any URL
- ☁️ Store permanently on Cloudflare R2
- 🔗 Generate shareable download links
- 📊 Track download progress and status
- 🗄️ MongoDB for URL and metadata storage

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# MongoDB Configuration
MONGODB_URI=your_mongodb_connection_string

# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_bucket_name
```

### Getting Cloudflare R2 Credentials

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 Object Storage**
3. Create a bucket if you haven't already
4. Go to **Manage R2 API Tokens**
5. Create a new token with **Object Read & Write** permissions
6. Copy the Access Key ID and Secret Access Key

### Getting MongoDB URI

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a database user
3. Get your connection string from the cluster's "Connect" menu

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the application.

## How It Works

1. User pastes a file URL
2. Server downloads the file from the URL
3. File is uploaded to Cloudflare R2
4. Download metadata is stored in MongoDB
5. User receives a permanent download link

## Tech Stack

- **Framework**: Next.js 15
- **Styling**: Tailwind CSS
- **Database**: MongoDB with Mongoose
- **Storage**: Cloudflare R2 (S3-compatible)
- **Language**: TypeScript

## License

MIT
