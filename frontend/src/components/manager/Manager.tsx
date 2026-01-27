import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Manager.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type MediaFile = string;

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
  type: 'queue' | 'loop' | 'library', 
  onAction1?: () => void, 
  onAction2?: () => void,
  onDelete?: () => void,
  onDownload: () => void
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => videoRef.current?.play();
  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
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
        <button onClick={onDownload} className="btn-icon" title="Download">
          <span className="material-symbols-outlined">download</span>
        </button>
        
        {type === 'library' && (
          <>
            <button onClick={onAction1} className="btn-icon" title="Add to Queue">
              <span className="material-symbols-outlined">queue_music</span>
            </button>
            <button onClick={onAction2} className="btn-icon" title="Add to Loop">
              <span className="material-symbols-outlined">repeat</span>
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
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [queue, setQueue] = useState<MediaFile[]>([]);
  const [loop, setLoop] = useState<MediaFile[]>([]);
  
  // Upload State
  const [uploading, setUploading] = useState(false);
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [showUploadPopup, setShowUploadPopup] = useState(false);

  // Delete State (Only for Library)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchFiles = async () => {
    const res = await fetch(`${API_BASE}/files`);
    setFiles(await res.json());

    const queueRes = await fetch(`${API_BASE}/slideshow/queue`);
    setQueue(await queueRes.json());

    const loopRes = await fetch(`${API_BASE}/slideshow/loop`);
    setLoop(await loopRes.json());
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

    const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
    if (res.ok) {
      closeUploadModal();
      fetchFiles();
    } else {
      alert('Upload failed');
    }
    setUploading(false);
  };

  const downloadFile = async (file: MediaFile) => {
    try {
      const response = await fetch(`${API_BASE}/file/${file}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  // --- Queue Logic (Direct Action) ---
  const addToQueue = async (file: MediaFile) => {
    await fetch(`${API_BASE}/slideshow/queue`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file }) });
    setQueue((prev) => [...prev, file]);
  };

  const removeFromQueue = async (file: MediaFile) => {
    // No popup, remove immediately
    await fetch(`${API_BASE}/slideshow/queue`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file }) });
    setQueue((prev) => prev.filter((f) => f !== file));
  };

  // --- Loop Logic (Direct Action) ---
  const addToLoop = async (file: MediaFile) => {
    await fetch(`${API_BASE}/slideshow/loop`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file }) });
    setLoop((prev) => [...prev, file]);
  };

  const removeFromLoop = async (file: MediaFile) => {
    // No popup, remove immediately
    await fetch(`${API_BASE}/slideshow/loop`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file }) });
    setLoop((prev) => prev.filter((f) => f !== file));
  };

  // --- Library Delete Logic (Requires Popup) ---
  const requestLibraryDelete = (file: MediaFile) => {
    setDeleteTarget(file);
  };

  const confirmLibraryDelete = async () => {
    if (!deleteTarget) return;
    
    await fetch(`${API_BASE}/file/${encodeURIComponent(deleteTarget)}`, { method: 'DELETE' });
    
    // Update local state for all lists
    setFiles((prev) => prev.filter((f) => f !== deleteTarget));
    setQueue((prev) => prev.filter((f) => f !== deleteTarget));
    setLoop((prev) => prev.filter((f) => f !== deleteTarget));
    
    setDeleteTarget(null);
  };

  return (
    <div className="manager-layout">
      <header className="manager-header">
        <div className="header-left">
          <button className="btn-nav" onClick={() => navigate('/')}>
            <span className="material-symbols-outlined">arrow_back</span>
            Return
          </button>
        </div>
        
        <h1 className="header-title">Media Manager</h1>

        <div className="header-actions">
          <button className="btn-nav" onClick={fetchFiles} title="Sync">
             <span className="material-symbols-outlined">sync</span>
          </button>
          <button className="btn-primary" onClick={() => setShowUploadPopup(true)}>
            <span className="material-symbols-outlined">add</span>
            <span>Upload</span>
          </button>
        </div>
      </header>

      <div className="scroll-area">
        <main className="content-wrapper">
          
          <div className="active-tracks-container">
            <section className="track-section">
              <div className="section-header">
                <h3>Queue</h3>
                <span className="counter">{queue.length}</span>
              </div>
              <div className="track-scroll">
                {queue.length === 0 ? <div className="empty-state">Empty</div> : 
                  queue.map((file, i) => (
                    <MediaCard 
                      key={`${file}-q-${i}`} 
                      file={file} 
                      type="queue" 
                      onDelete={() => removeFromQueue(file)}
                      onDownload={() => downloadFile(file)}
                    />
                  ))
                }
              </div>
            </section>

            <section className="track-section">
              <div className="section-header">
                <h3>Loop</h3>
                <span className="counter">{loop.length}</span>
              </div>
              <div className="track-scroll">
                {loop.length === 0 ? <div className="empty-state">Empty</div> : 
                  loop.map((file, i) => (
                    <MediaCard 
                      key={`${file}-l-${i}`} 
                      file={file} 
                      type="loop" 
                      onDelete={() => removeFromLoop(file)} 
                      onDownload={() => downloadFile(file)}
                    />
                  ))
                }
              </div>
            </section>
          </div>

          <section className="library-section">
            <div className="section-header">
              <h3>Library</h3>
              <span className="counter">{files.length}</span>
            </div>
            <div className="library-grid">
              {files.map((file) => (
                <MediaCard 
                  key={file} 
                  file={file} 
                  type="library" 
                  onAction1={() => addToQueue(file)} 
                  onAction2={() => addToLoop(file)} 
                  onDelete={() => requestLibraryDelete(file)}
                  onDownload={() => downloadFile(file)}
                />
              ))}
            </div>
          </section>

        </main>
      </div>

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
                    <p>Select File</p>
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

      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal-window small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
            </div>
            <div className="modal-body">
              <p>
                Permanently delete <strong>{deleteTarget}</strong> from the library?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-danger" onClick={confirmLibraryDelete}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
