'use client';

import { useState, useEffect, useCallback } from 'react';

interface Download {
  _id: string;
  downloadId: string;
  originalUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  error?: string;
  downloadCount: number;
  downloadUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [activeDownload, setActiveDownload] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchDownloads = useCallback(async () => {
    try {
      const res = await fetch('/api/download');
      const data = await res.json();
      if (data.downloads) {
        setDownloads(data.downloads);
      }
    } catch (error) {
      console.error('Error fetching downloads:', error);
    }
  }, []);

  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  useEffect(() => {
    if (!activeDownload) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/download/${activeDownload}`);
        const data = await res.json();

        setDownloads(prev => {
          const index = prev.findIndex(d => d.downloadId === activeDownload);
          if (index === -1) {
            return [data, ...prev];
          }
          const updated = [...prev];
          updated[index] = { ...updated[index], ...data };
          return updated;
        });

        if (data.status === 'completed' || data.status === 'failed') {
          setActiveDownload(null);
          fetchDownloads();
          if (data.status === 'completed') {
            showNotification('success', 'Download completed successfully!');
          } else {
            showNotification('error', data.error || 'Download failed');
          }
        }
      } catch (error) {
        console.error('Error polling download:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeDownload, fetchDownloads]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      showNotification('error', 'Please enter a valid URL');
      return;
    }

    try {
      new URL(url);
    } catch {
      showNotification('error', 'Please enter a valid URL');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start download');
      }

      setActiveDownload(data.downloadId);
      setUrl('');
      showNotification('success', 'Download started!');
      fetchDownloads();
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to start download');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadClick = async (downloadId: string) => {
    try {
      const res = await fetch(`/api/download/${downloadId}`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
        fetchDownloads();
      }
    } catch (error) {
      showNotification('error', 'Failed to generate download link');
      console.error(error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (mimeType: string, fileName: string) => {
    if (mimeType?.startsWith('video/') || fileName?.match(/\.(mp4|mkv|avi|mov|webm)$/i)) return '🎬';
    if (mimeType?.startsWith('audio/') || fileName?.match(/\.(mp3|wav|flac|aac)$/i)) return '🎵';
    if (mimeType?.startsWith('image/') || fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return '🖼️';
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('zip') || mimeType?.includes('rar') || mimeType?.includes('7z')) return '📦';
    return '📁';
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0c0c1d 0%, #1a1a2e 50%, #16213e 100%)' }}>
      {/* Notification */}
      {notification && (
        <div
          className="fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-xl"
          style={{
            background: notification.type === 'success' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <p className="text-white font-medium">{notification.message}</p>
        </div>
      )}

      {/* Header */}
      <header className="border-b" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              R2
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">R2 Downloader</h1>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Cloudflare R2 Storage</p>
            </div>
          </div>
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
            style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}
          >
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span style={{ color: 'rgba(34, 197, 94, 0.9)' }}>Connected</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Download & Store Files
          </h2>
          <p className="text-lg mb-10" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Paste any URL to download and store permanently on Cloudflare R2
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mb-12">
            <div
              className="flex flex-col sm:flex-row gap-3 p-3 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
              }}
            >
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/file.zip"
                className="flex-1 px-4 py-3 rounded-xl text-white placeholder-gray-400 outline-none"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
                }}
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Processing</span>
                  </>
                ) : (
                  <span>Download</span>
                )}
              </button>
            </div>
          </form>

          {/* Stats */}
          <div className="flex justify-center gap-12">
            {[
              { icon: '⚡', label: 'Fast', sub: 'CDN Delivery' },
              { icon: '🔐', label: 'Secure', sub: 'R2 Storage' },
              { icon: '🔗', label: 'Permanent', sub: 'Links' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-white font-semibold">{item.label}</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Downloads */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Recent Downloads</h3>
            <button
              onClick={fetchDownloads}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all hover:opacity-80"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)'
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {downloads.length === 0 ? (
            <div
              className="text-center py-16 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="text-5xl mb-4 opacity-50">📁</div>
              <p className="text-lg" style={{ color: 'rgba(255,255,255,0.5)' }}>No downloads yet</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Paste a URL above to start</p>
            </div>
          ) : (
            <div className="space-y-3">
              {downloads.map((download) => (
                <div
                  key={download.downloadId}
                  className="rounded-xl p-4 transition-all hover:translate-y-[-2px]"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                  }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Icon & Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-xl shrink-0"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                      >
                        {getFileIcon(download.mimeType, download.fileName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {/* Status Badge */}
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              background:
                                download.status === 'completed' ? 'rgba(34, 197, 94, 0.15)' :
                                  download.status === 'downloading' ? 'rgba(59, 130, 246, 0.15)' :
                                    download.status === 'pending' ? 'rgba(245, 158, 11, 0.15)' :
                                      'rgba(239, 68, 68, 0.15)',
                              color:
                                download.status === 'completed' ? '#22c55e' :
                                  download.status === 'downloading' ? '#3b82f6' :
                                    download.status === 'pending' ? '#f59e0b' :
                                      '#ef4444',
                              border: `1px solid ${download.status === 'completed' ? 'rgba(34, 197, 94, 0.3)' :
                                download.status === 'downloading' ? 'rgba(59, 130, 246, 0.3)' :
                                  download.status === 'pending' ? 'rgba(245, 158, 11, 0.3)' :
                                    'rgba(239, 68, 68, 0.3)'
                                }`
                            }}
                          >
                            {download.status === 'completed' && '✓ '}
                            {download.status === 'failed' && '✕ '}
                            {download.status}
                            {(download.status === 'downloading' || download.status === 'pending') && ` ${download.progress}%`}
                          </span>
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {formatDate(download.createdAt)}
                          </span>
                        </div>
                        <h4
                          className="font-medium text-white truncate text-sm mb-0.5"
                          title={download.fileName}
                        >
                          {download.fileName}
                        </h4>
                        <p
                          className="text-xs truncate"
                          style={{ color: 'rgba(255,255,255,0.4)' }}
                          title={download.originalUrl}
                        >
                          {download.originalUrl}
                        </p>
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center gap-4 lg:gap-6">
                      {download.fileSize > 0 && (
                        <div className="text-center min-w-[70px]">
                          <p className="text-xs uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>Size</p>
                          <p className="text-sm font-medium text-white">{formatBytes(download.fileSize)}</p>
                        </div>
                      )}
                      <div className="text-center min-w-[50px]">
                        <p className="text-xs uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>DLs</p>
                        <p className="text-sm font-medium text-white">{download.downloadCount}</p>
                      </div>

                      {download.status === 'completed' && (
                        <button
                          onClick={() => handleDownloadClick(download.downloadId)}
                          className="px-4 py-2 rounded-lg font-medium text-sm text-white transition-all hover:opacity-90"
                          style={{
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)'
                          }}
                        >
                          Download
                        </button>
                      )}

                      {download.status === 'failed' && download.error && (
                        <div
                          className="px-3 py-1.5 rounded-lg text-xs max-w-[150px] truncate"
                          style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                          title={download.error}
                        >
                          {download.error}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress bar for active downloads */}
                  {(download.status === 'downloading' || download.status === 'pending') && (
                    <div className="mt-3">
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.1)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${download.progress}%`,
                            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-6 px-6 text-center text-sm"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
      >
        <span className="font-medium text-white">R2 Downloader</span> • Built with Next.js & Cloudflare R2 • {downloads.length} files stored
      </footer>
    </div>
  );
}
