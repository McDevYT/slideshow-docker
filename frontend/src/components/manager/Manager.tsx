import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MemeGenerator from './MemeGenerator';
import './Manager.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type MediaFile = string;
type Tab = 'library' | 'queue' | 'loop' | 'meme';

const isVideo = (filename: string) => /\.(mp4|webm|ogg|mov)$/i.test(filename);

const MediaCard = ({ 
  file, 
  type, 
  onAction1, 
  onAction2, 
  onDelete,
  onDownload
}: { 
  file: string, 
  type: Tab, 
  onAction1?: () => Promise<void>, 
  onAction2?: () => Promise<void>,
  onDelete?: () => void,
  onDownload: () => Promise<void>
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [feedback, setFeedback] = useState<'action1' | 'action2' | 'download' | null>(null);

  const handleMouseEnter = () => videoRef.current?.play();
  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleAction1 = async () => {
    if (onAction1) {
      await onAction1();
      setFeedback('action1');
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  const handleAction2 = async () => {
    if (onAction2) {
      await onAction2();
      setFeedback('action2');
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  const handleDownload = async () => {
    await onDownload();
    setFeedback('download');
    setTimeout(() => setFeedback(null), 1500);
  };

  return (
    <div className="media-card" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="media-preview">
        {isVideo(file) ? (
          <video 
            ref={videoRef}
            src={`${API_BASE}/file/${file}`} 
            muted 
            loop 
            playsInline
            preload="metadata" 
          />
        ) : (
          <img src={`${API_BASE}/file/${file}`} alt={file} loading="lazy" />
        )}
      </div>
      
      <div className="media-info">
        <span className="filename" title={file}>{file}</span>
      </div>

      <div className="media-actions">
        <button onClick={handleDownload} className="btn-icon" title="Download">
          <span className="material-symbols-outlined">
            {feedback === 'download' ? 'check' : 'download'}
          </span>
        </button>
        
        {type === 'library' && (
          <>
            <button onClick={handleAction1} className="btn-icon" title="Add to Queue">
              <span className={`material-symbols-outlined ${feedback === 'action1' ? 'success-text' : ''}`}>
                {feedback === 'action1' ? 'check' : 'queue_music'}
              </span>
            </button>
            <button onClick={handleAction2} className="btn-icon" title="Add to Loop">
              <span className={`material-symbols-outlined ${feedback === 'action2' ? 'success-text' : ''}`}>
                {feedback === 'action2' ? 'check' : 'repeat'}
              </span>
            </button>
            <button onClick={onDelete} className="btn-icon danger" title="Delete Permanently">
              <span className="material-symbols-outlined">delete</span>
            </button>
          </>
        )}
        
        {(type === 'queue' || type === 'loop') && (
          <button onClick={onDelete} className="btn-icon danger" title="Remove from list">
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default function Manager() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('library');
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [queue, setQueue] = useState<MediaFile[]>([]);
  const [loop, setLoop] = useState<MediaFile[]>([]);
  
  // Upload State
  const [uploading, setUploading] = useState(false);
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [showUploadPopup, setShowUploadPopup] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      const [filesRes, queueRes, loopRes] = await Promise.all([
        fetch(`${API_BASE}/files`),
        fetch(`${API_BASE}/slideshow/queue`),
        fetch(`${API_BASE}/slideshow/loop`)
      ]);
      setFiles(await filesRes.json());
      setQueue(await queueRes.json());
      setLoop(await loopRes.json());
    } catch (err) {
      console.error('Failed to sync data', err);
    }
  };

  useEffect(() => { fetchFiles(); }, []);

  useEffect(() => {
    return () => {
      if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
    };
  }, [uploadPreviewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileInput(file);
      setUploadPreviewUrl(URL.createObjectURL(file));
    }
  };

  const closeUploadModal = () => {
    setShowUploadPopup(false);
    setFileInput(null);
    setUploadPreviewUrl(null);
  };

  const uploadFile = async () => {
    if (!fileInput) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', fileInput);

    try {
      const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
      if (res.ok) {
        closeUploadModal();
        await fetchFiles();
        setActiveTab('library');
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      console.error('Failed to upload file', err);
    } finally {
      setUploading(false);
    }
  };

  const downloadFile = async (file: MediaFile) => {
    try {
      const res = await fetch(`${API_BASE}/file/${file}`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download file', err);
    }
  };

  // --- Actions ---
  const addToQueue = async (file: MediaFile) => {
    try {
      await fetch(`${API_BASE}/slideshow/queue`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file }) });
      setQueue((prev) => [...prev, file]);
    } catch (err) {
      console.error('Failed to add to Queue', err);
    }
  };

  const removeFromQueue = async (file: MediaFile) => {
    try {
      await fetch(`${API_BASE}/slideshow/queue`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file }) });
      setQueue((prev) => prev.filter((f) => f !== file));
    } catch (err) {
      console.error('Failed to remove from Queue', err);
    }
  };

  const addToLoop = async (file: MediaFile) => {
    try {
      await fetch(`${API_BASE}/slideshow/loop`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file }) });
      setLoop((prev) => [...prev, file]);
    } catch (err) {
      console.error('Failed to add to Loop', err);
    }
  };

  const removeFromLoop = async (file: MediaFile) => {
    try {
      await fetch(`${API_BASE}/slideshow/loop`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file }) });
      setLoop((prev) => prev.filter((f) => f !== file));
    } catch (err) {
      console.error('Failed to remove from Loop', err);
    }
  };

  const confirmLibraryDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`${API_BASE}/file/${encodeURIComponent(deleteTarget)}`, { method: 'DELETE' });
      setFiles((prev) => prev.filter((f) => f !== deleteTarget));
      setQueue((prev) => prev.filter((f) => f !== deleteTarget));
      setLoop((prev) => prev.filter((f) => f !== deleteTarget));
    } catch (err) {
      console.error('Failed to delete file', err);
    } finally {
      setDeleteTarget(null);
    }
  };

  const renderContent = () => {
    if (activeTab === 'meme') {
      return <MemeGenerator onUploadSuccess={() => { fetchFiles(); setActiveTab('library'); }} />;
    }

    let targetList = files;
    if (activeTab === 'queue') targetList = queue;
    if (activeTab === 'loop') targetList = loop;

    if (targetList.length === 0) {
      return (
        <div className="empty-state">
          <span className="material-symbols-outlined">
            {activeTab === 'library' ? 'folder_open' : 'inbox'}
          </span>
          <p>No media in {activeTab}</p>
          {activeTab !== 'library' && (
            <button className="btn-secondary" style={{ marginTop: '12px' }} onClick={() => setActiveTab('library')}>
              Browse Library
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="media-grid">
        {targetList.map((file, i) => (
          <MediaCard 
            key={`${file}-${i}`} 
            file={file} 
            type={activeTab} 
            onAction1={activeTab === 'library' ? () => addToQueue(file) : undefined} 
            onAction2={activeTab === 'library' ? () => addToLoop(file) : undefined} 
            onDelete={
              activeTab === 'library' ? () => setDeleteTarget(file) :
              activeTab === 'queue' ? () => removeFromQueue(file) :
              () => removeFromLoop(file)
            }
            onDownload={() => downloadFile(file)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="manager-layout">
      {/* Sidebar Layout */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Slideshow</h2>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            <span className="material-symbols-outlined">video_library</span>
            Library
            <span className="badge">{files.length}</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            <span className="material-symbols-outlined">queue_music</span>
            Queue
            <span className="badge">{queue.length}</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'loop' ? 'active' : ''}`}
            onClick={() => setActiveTab('loop')}
          >
            <span className="material-symbols-outlined">repeat</span>
            Loop
            <span className="badge">{loop.length}</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'meme' ? 'active' : ''}`}
            onClick={() => setActiveTab('meme')}
          >
            <span className="material-symbols-outlined">brush</span>
            Meme Generator
          </button>
        </nav>
        
        <div className="sidebar-footer">
          <button className="nav-item return-btn" onClick={() => navigate('/')}>
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Player
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="main-header">
          <h1 className="page-title">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </h1>
          <div className="header-actions">
            <button className="btn-icon-plain" onClick={fetchFiles} title="Sync Data">
               <span className="material-symbols-outlined">sync</span>
            </button>
            <button className="btn-primary" onClick={() => setShowUploadPopup(true)}>
              <span className="material-symbols-outlined">upload</span>
              Upload
            </button>
          </div>
        </header>

        <div className="content-scroll">
          {renderContent()}
        </div>
      </main>

      {/* Upload Modal */}
      {showUploadPopup && (
        <div className="modal-backdrop" onClick={closeUploadModal}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload Media</h3>
              <button className="btn-icon-plain" onClick={closeUploadModal}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="upload-dropzone">
                <input type="file" onChange={handleFileSelect} accept="image/*,video/*" />
                {!fileInput ? (
                  <div className="upload-placeholder">
                    <span className="material-symbols-outlined">cloud_upload</span>
                    <p>Click or drag to select file</p>
                  </div>
                ) : (
                  <div className="file-preview-container">
                    {uploadPreviewUrl && fileInput.type.startsWith('video') ? (
                       <video src={uploadPreviewUrl} controls className="preview-media" />
                    ) : (
                       <img src={uploadPreviewUrl || ''} alt="Preview" className="preview-media" />
                    )}
                    <div className="file-meta">
                      <span>{fileInput.name}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeUploadModal}>Cancel</button>
              <button className="btn-primary" onClick={uploadFile} disabled={!fileInput || uploading}>
                {uploading ? 'Uploading...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal-window small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="danger-text">Confirm Deletion</h3>
            </div>
            <div className="modal-body">
              <p>
                Permanently delete <strong>{deleteTarget}</strong> from the library? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-danger" onClick={confirmLibraryDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
