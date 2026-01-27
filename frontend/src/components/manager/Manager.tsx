import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Manager.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type MediaFile = string;

const isVideo = (filename: string) => {
  return /\.(mp4|webm|ogg|mov)$/i.test(filename);
};

const MediaCard = ({ 
  file, 
  type, 
  onAction1, 
  onAction2, 
  onDelete 
}: { 
  file: string, 
  type: 'queue' | 'loop' | 'library', 
  onAction1?: () => void, 
  onAction2?: () => void,
  onDelete?: () => void 
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
        {type === 'library' && (
          <>
            <button onClick={onAction1} className="btn-icon" title="Add to Queue">
              <span className="material-symbols-outlined">queue_music</span>
            </button>
            <button onClick={onAction2} className="btn-icon" title="Add to Loop">
              <span className="material-symbols-outlined">repeat</span>
            </button>
            <button onClick={onDelete} className="btn-icon danger" title="Delete File">
              <span className="material-symbols-outlined">delete</span>
            </button>
          </>
        )}
        {(type === 'queue' || type === 'loop') && (
          <button onClick={onDelete} className="btn-icon danger" title="Remove">
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
  const [uploading, setUploading] = useState(false);
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [showUploadPopup, setShowUploadPopup] = useState(false);

  const fetchFiles = async () => {
    const res = await fetch(`${API_BASE}/files`);
    setFiles(await res.json());

    const queueRes = await fetch(`${API_BASE}/slideshow/queue`);
    setQueue(await queueRes.json());

    const loopRes = await fetch(`${API_BASE}/slideshow/loop`);
    setLoop(await loopRes.json());
  };

  useEffect(() => { fetchFiles(); }, []);

  const addToQueue = async (file: MediaFile) => {
    await fetch(`${API_BASE}/slideshow/queue`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file }) });
    setQueue((prev) => [...prev, file]);
  };

  const removeFromQueue = async (file: MediaFile) => {
    await fetch(`${API_BASE}/slideshow/queue`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file }) });
    setQueue((prev) => prev.filter((f) => f !== file));
  };

  const addToLoop = async (file: MediaFile) => {
    await fetch(`${API_BASE}/slideshow/loop`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file }) });
    setLoop((prev) => [...prev, file]);
  };

  const removeFromLoop = async (file: MediaFile) => {
    await fetch(`${API_BASE}/slideshow/loop`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file }) });
    setLoop((prev) => prev.filter((f) => f !== file));
  };

  const deleteFile = async (file: MediaFile) => {
    if(!confirm('Permanently delete this file?')) return;
    await fetch(`${API_BASE}/file/${encodeURIComponent(file)}`, { method: 'DELETE' });
    setFiles((prev) => prev.filter((f) => f !== file));
    setQueue((prev) => prev.filter((f) => f !== file));
    setLoop((prev) => prev.filter((f) => f !== file));
  };

  const uploadFile = async () => {
    if (!fileInput) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', fileInput);

    const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
    if (res.ok) {
      setFileInput(null);
      setShowUploadPopup(false);
      fetchFiles();
    } else {
      alert('Upload failed');
    }
    setUploading(false);
  };

  return (
    <div className="manager-layout">
      <header className="manager-header">
        <div className="header-left">
          <button className="btn-ghost" onClick={() => navigate('/')}>
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Slideshow
          </button>
        </div>
        
        <h1 className="header-title">Media Manager</h1>

        <div className="header-actions">
          <button className="btn-ghost" onClick={fetchFiles} title="Sync">
             <span className="material-symbols-outlined">sync</span>
          </button>
          <button className="btn-primary" onClick={() => setShowUploadPopup(true)}>
            <span className="material-symbols-outlined">upload</span>
            <span>Upload</span>
          </button>
        </div>
      </header>

      <main className="manager-grid">
        <section className="track-section">
          <div className="section-header">
            <h3>Queue</h3>
            <span className="badge">{queue.length}</span>
            <p className="hint">Plays once</p>
          </div>
          <div className="card-track">
            {queue.length === 0 ? <div className="empty-message">Queue is empty</div> : 
              queue.map((file, i) => (
                <MediaCard key={`${file}-q-${i}`} file={file} type="queue" onDelete={() => removeFromQueue(file)} />
              ))
            }
          </div>
        </section>

        <section className="track-section">
          <div className="section-header">
            <h3>Loop</h3>
            <span className="badge">{loop.length}</span>
            <p className="hint">Plays repeatedly</p>
          </div>
          <div className="card-track">
            {loop.length === 0 ? <div className="empty-message">Loop is empty</div> : 
              loop.map((file, i) => (
                <MediaCard key={`${file}-l-${i}`} file={file} type="loop" onDelete={() => removeFromLoop(file)} />
              ))
            }
          </div>
        </section>

        <section className="library-section">
          <div className="section-header">
            <h3>Library</h3>
            <span className="badge">{files.length}</span>
          </div>
          <div className="library-grid">
            {files.map((file) => (
              <MediaCard 
                key={file} 
                file={file} 
                type="library" 
                onAction1={() => addToQueue(file)} 
                onAction2={() => addToLoop(file)} 
                onDelete={() => deleteFile(file)}
              />
            ))}
          </div>
        </section>
      </main>

      {showUploadPopup && (
        <div className="modal-overlay" onClick={() => setShowUploadPopup(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Upload Media</h3>
              <button className="btn-icon" onClick={() => setShowUploadPopup(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="upload-area">
              <input type="file" onChange={(e) => setFileInput(e.target.files?.[0] || null)} />
              {fileInput ? (
                <div className="file-preview">
                  <span className="material-symbols-outlined file-icon">description</span>
                  <p>{fileInput.name}</p>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <span className="material-symbols-outlined">cloud_upload</span>
                  <p>Click or Drag file here</p>
                </div>
              )}
            </div>

            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setShowUploadPopup(false)}>Cancel</button>
              <button className="btn-primary" onClick={uploadFile} disabled={!fileInput || uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
