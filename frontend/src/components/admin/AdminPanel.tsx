import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminPanel.css';
import '../manager/Manager.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type MediaFile = string;

const isVideo = (filename: string) => /\.(mp4|webm|ogg|mov)$/i.test(filename);

const DeletedMediaCard = ({ 
  file, 
  authHeader,
  onRestore, 
  onDelete,
  onDownload
}: { 
  file: string, 
  authHeader: string,
  onRestore: () => Promise<void>, 
  onDelete: () => void,
  onDownload: () => Promise<void>
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [feedback, setFeedback] = useState<'restore' | 'download' | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string>('');

  useEffect(() => {
    // Fetch media with auth header and create object URL
    const fetchMedia = async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/deleted-file/${file}`, {
          headers: { 'Authorization': authHeader }
        });
        if (res.ok) {
          const blob = await res.blob();
          setMediaUrl(URL.createObjectURL(blob));
        }
      } catch (err) {
        console.error('Error fetching media', err);
      }
    };
    fetchMedia();

    return () => {
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    };
  }, [file, authHeader]);

  const handleMouseEnter = () => videoRef.current?.play();
  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleRestore = async () => {
    await onRestore();
    setFeedback('restore');
    setTimeout(() => setFeedback(null), 1500);
  };

  const handleDownload = async () => {
    await onDownload();
    setFeedback('download');
    setTimeout(() => setFeedback(null), 1500);
  };

  return (
    <div className="media-card" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="media-preview">
        {mediaUrl ? (
          isVideo(file) ? (
            <video 
              ref={videoRef}
              src={mediaUrl} 
              muted 
              loop 
              playsInline
              preload="metadata" 
            />
          ) : (
            <img src={mediaUrl} alt={file} loading="lazy" />
          )
        ) : (
          <div className="loading-preview">Loading...</div>
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
        
        <button onClick={handleRestore} className="btn-icon" title="Restore to Library">
          <span className={`material-symbols-outlined ${feedback === 'restore' ? 'success-text' : ''}`}>
            {feedback === 'restore' ? 'check' : 'restore_from_trash'}
          </span>
        </button>

        <button onClick={onDelete} className="btn-icon danger" title="Delete Permanently">
          <span className="material-symbols-outlined">delete_forever</span>
        </button>
      </div>
    </div>
  );
};

export default function AdminPanel() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authHeader, setAuthHeader] = useState('');
  const [error, setError] = useState('');
  
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Check localStorage for auth
  useEffect(() => {
    const savedAuth = localStorage.getItem('adminAuth');
    if (savedAuth) {
      setAuthHeader(savedAuth);
      setIsAuthenticated(true);
      fetchFiles(savedAuth);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = 'Basic ' + btoa(`${username}:${password}`);
    try {
      const res = await fetch(`${API_BASE}/admin/deleted-files`, {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        setAuthHeader(token);
        setIsAuthenticated(true);
        localStorage.setItem('adminAuth', token);
        const data = await res.json();
        setFiles(data);
        setError('');
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    setIsAuthenticated(false);
    setAuthHeader('');
    setFiles([]);
  };

  const fetchFiles = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/deleted-files`, {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        setFiles(await res.json());
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error('Failed to fetch deleted files', err);
    }
  };

  const downloadFile = async (file: MediaFile) => {
    try {
      const res = await fetch(`${API_BASE}/admin/download/${file}`, {
        headers: { 'Authorization': authHeader }
      });
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

  const restoreFile = async (file: MediaFile) => {
    try {
      await fetch(`${API_BASE}/admin/restore-file/${encodeURIComponent(file)}`, { 
        method: 'POST',
        headers: { 'Authorization': authHeader }
      });
      setFiles((prev) => prev.filter((f) => f !== file));
    } catch (err) {
      console.error('Failed to restore file', err);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`${API_BASE}/admin/deleted-file/${encodeURIComponent(deleteTarget)}`, { 
        method: 'DELETE',
        headers: { 'Authorization': authHeader }
      });
      setFiles((prev) => prev.filter((f) => f !== deleteTarget));
    } catch (err) {
      console.error('Failed to delete file', err);
    } finally {
      setDeleteTarget(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <form className="login-box" onSubmit={handleLogin}>
          <h2>Admin Login</h2>
          {error && <div className="error-text">{error}</div>}
          <input 
            type="text" 
            placeholder="Username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <button type="submit">Login</button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/')} style={{marginTop: '0.5rem', background: 'transparent', border: '1px solid var(--border)'}}>Back to Home</button>
        </form>
      </div>
    );
  }

  return (
    <div className="manager-layout admin-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Admin Panel</h2>
        </div>
        <nav className="sidebar-nav">
          <button className="nav-item active">
            <span className="material-symbols-outlined">delete</span>
            Trash
            <span className="badge">{files.length}</span>
          </button>
        </nav>
        
        <div className="sidebar-footer">
          <button className="nav-item return-btn" onClick={handleLogout} style={{marginBottom: '0.5rem'}}>
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
          <button className="nav-item return-btn" onClick={() => navigate('/dashboard')}>
            <span className="material-symbols-outlined">dashboard</span>
            Back to Dashboard
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="main-header">
          <h1 className="page-title">Deleted Memes</h1>
          <div className="header-actions">
            <button className="btn-icon-plain" onClick={() => fetchFiles(authHeader)} title="Sync Data">
               <span className="material-symbols-outlined">sync</span>
            </button>
          </div>
        </header>

        <div className="content-scroll">
          {files.length === 0 ? (
            <div className="empty-state">
              <span className="material-symbols-outlined">delete_outline</span>
              <p>Trash is empty</p>
            </div>
          ) : (
            <div className="media-grid">
              {files.map((file, i) => (
                <DeletedMediaCard 
                  key={`${file}-${i}`} 
                  file={file} 
                  authHeader={authHeader}
                  onRestore={() => restoreFile(file)}
                  onDelete={() => setDeleteTarget(file)}
                  onDownload={() => downloadFile(file)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal-window small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="danger-text">Confirm Permanent Deletion</h3>
            </div>
            <div className="modal-body">
              <p>
                Permanently delete <strong>{deleteTarget}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-danger" onClick={confirmDelete}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
