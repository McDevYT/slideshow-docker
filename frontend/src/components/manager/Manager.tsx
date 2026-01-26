import { useEffect, useState } from 'react';
import './Manager.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type MediaFile = string;

export default function Manager() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [queue, setQueue] = useState<MediaFile[]>([]);
  const [loop, setLoop] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [showUploadPopup, setShowUploadPopup] = useState(false);

  const fetchFiles = async () => {
    const res = await fetch(`${API_BASE}/files`);
    const data: MediaFile[] = await res.json();
    setFiles(data);

    const queueRes = await fetch(`${API_BASE}/slideshow/queue`);
    setQueue(await queueRes.json());

    const loopRes = await fetch(`${API_BASE}/slideshow/loop`);
    setLoop(await loopRes.json());
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // === Queue & Loop Operations ===
  const addToQueue = async (file: MediaFile) => {
    await fetch(`${API_BASE}/slideshow/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file }),
    });
    setQueue((prev) => [...prev, file]);
  };

  const removeFromQueue = async (file: MediaFile) => {
    await fetch(`${API_BASE}/slideshow/queue`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file }),
    });
    setQueue((prev) => prev.filter((f) => f !== file));
  };

  const addToLoop = async (file: MediaFile) => {
    await fetch(`${API_BASE}/slideshow/loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file }),
    });
    setLoop((prev) => [...prev, file]);
  };

  const removeFromLoop = async (file: MediaFile) => {
    await fetch(`${API_BASE}/slideshow/loop`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file }),
    });
    setLoop((prev) => prev.filter((f) => f !== file));
  };

  // === File Deletion & Upload ===
  const deleteFile = async (file: MediaFile) => {
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

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      setFileInput(null);
      fetchFiles();
    } else {
      alert('Upload failed');
    }

    setUploading(false);
  };

  return (
    <div className="media-manager">
      <header>
        <h2>Media Manager</h2>
        <div>
          <button onClick={fetchFiles}>Reload</button>
          <button onClick={() => setShowUploadPopup(true)}>Upload</button>
        </div>
      </header>

      {/* === Queue === */}
      <h3>Queue</h3>
      <div className="media-grid">
        {queue.map((file) => (
          <div key={file} className="media-card">
            <img className="preview" src={`${API_BASE}/file/${file}`} alt={file} />
            <div className="buttons">
              <button onClick={() => removeFromQueue(file)}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      {/* === Loop === */}
      <h3>Loop</h3>
      <div className="media-grid">
        {loop.map((file) => (
          <div key={file} className="media-card">
            <img className="preview" src={`${API_BASE}/file/${file}`} alt={file} />
            <div className="buttons">
              <button onClick={() => removeFromLoop(file)}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      {/* === Files Library === */}
      <h3>Files</h3>
      <div className="media-grid">
        {files.map((file) => (
          <div key={file} className="media-card">
            <img className="preview" src={`${API_BASE}/file/${file}`} alt={file} />
            <div className="buttons">
              <button onClick={() => addToQueue(file)}>Queue</button>
              <button onClick={() => addToLoop(file)}>Loop</button>
              <button onClick={() => deleteFile(file)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* === Upload Popup === */}
      {showUploadPopup && (
        <>
          <div className="overlay" onClick={() => setShowUploadPopup(false)}></div>
          <div className="upload-popup">
            <h3>Upload File</h3>
            <input
              type="file"
              onChange={(e) => setFileInput(e.target.files?.[0] || null)}
            />
            {fileInput && (
              <div style={{ marginTop: '1rem' }}>
                <img
                  className="preview"
                  src={URL.createObjectURL(fileInput)}
                  alt="Preview"
                />
              </div>
            )}
            <div style={{ marginTop: '1rem' }}>
              <button onClick={uploadFile} disabled={!fileInput || uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button className="close" onClick={() => setShowUploadPopup(false)}>
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
