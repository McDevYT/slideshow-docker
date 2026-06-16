import React, { useState, useRef, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { toPng } from 'html-to-image';
import './MemeGenerator.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Caption {
  id: string;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MemeGeneratorProps {
  onUploadSuccess: () => void;
}

const FONTS = ['Impact, sans-serif', 'Arial, sans-serif', '"Comic Sans MS", cursive', '"Courier New", Courier, monospace'];

export default function MemeGenerator({ onUploadSuccess }: MemeGeneratorProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [memeName, setMemeName] = useState<string>('my_meme');
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'success'>('idle');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success'>('idle');
  const [urlInput, setUrlInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setImageSrc(evt.target.result as string);
          setCaptions([]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addCaption = () => {
    const newCaption: Caption = {
      id: Math.random().toString(36).substr(2, 9),
      text: 'NEW TEXT',
      fontSize: 40,
      fontFamily: FONTS[0],
      color: '#ffffff',
      x: 50,
      y: 50,
      width: 300,
      height: 80,
    };
    setCaptions([...captions, newCaption]);
    setSelectedId(newCaption.id);
  };

  const updateCaption = (id: string, updates: Partial<Caption>) => {
    setCaptions(captions.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeCaption = (id: string) => {
    setCaptions(captions.filter(c => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const discardMeme = () => {
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(null);
    setCaptions([]);
    setMemeName('my_meme');
    setSelectedId(null);
  };

  const exportMeme = useCallback(async (): Promise<Blob | null> => {
    if (!containerRef.current) return null;
    setSelectedId(null); 
    
    await new Promise(r => setTimeout(r, 100));
    
    try {
      // skipFonts prevents CSSRule crashes from external fonts
      const dataUrl = await toPng(containerRef.current, { cacheBust: true, pixelRatio: 2, skipFonts: true });
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch (err) {
      console.error('Failed to export meme', err);
      return null;
    }
  }, []);

  const downloadMeme = async () => {
    setIsProcessing(true);
    const blob = await exportMeme();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${memeName}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      setDownloadStatus('success');
      setTimeout(() => setDownloadStatus('idle'), 1500);
    }
    setIsProcessing(false);
  };

  const uploadMeme = async () => {
    setIsProcessing(true);
    const blob = await exportMeme();
    if (blob) {
      const file = new File([blob], `${memeName}.png`, { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
        if (res.ok) {
          setUploadStatus('success');
          setTimeout(() => {
            setUploadStatus('idle');
            onUploadSuccess(); 
            discardMeme();
          }, 1000);
        } else {
          console.error('Upload failed');
        }
      } catch (err) {
        console.error('Failed to upload meme', err);
      }
    }
    setIsProcessing(false);
  };

  const selectedCaption = captions.find(c => c.id === selectedId);

  const loadUrl = () => {
    if (urlInput.trim()) {
      setImageSrc(urlInput.trim());
      setCaptions([]);
    }
  };

  if (!imageSrc) {
    return (
      <div className="meme-generator-empty">
        <span className="material-symbols-outlined large-icon">add_photo_alternate</span>
        <h2>Create a Meme</h2>
        <p>Upload a base image or paste a URL to start creating your meme.</p>
        
        <div className="meme-empty-actions">
          <label htmlFor="meme-upload-input" className="btn-primary" style={{ cursor: 'pointer', display: 'flex' }}>
            <span className="material-symbols-outlined">upload_file</span>
            Upload Image
          </label>
          <input 
            id="meme-upload-input" 
            type="file" 
            accept="image/*" 
            onChange={handleImageUpload} 
            style={{ display: 'none' }} 
          />

          <span className="text-muted">OR</span>

          <div className="url-input-wrapper">
            <input 
              type="text" 
              placeholder="Paste Image URL..." 
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadUrl()}
            />
            <button className="btn-secondary" onClick={loadUrl}>Load</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="meme-generator-layout">
      <div className="meme-editor-area">
        <div className="canvas-wrapper">
          <div 
            className="meme-canvas" 
            ref={containerRef} 
            onClick={() => setSelectedId(null)}
          >
            <img 
              src={imageSrc} 
              crossOrigin={imageSrc.startsWith('http') ? 'anonymous' : undefined} 
              alt="Meme Base" 
              className="meme-base-image" 
            />
            
            {captions.map(caption => (
              <Rnd
                key={caption.id}
                size={{ width: caption.width, height: caption.height }}
                position={{ x: caption.x, y: caption.y }}
                onDragStop={(_e, d) => updateCaption(caption.id, { x: d.x, y: d.y })}
                onResizeStop={(_e, _direction, ref, _delta, position) => {
                  updateCaption(caption.id, {
                    width: parseInt(ref.style.width),
                    height: parseInt(ref.style.height),
                    ...position,
                  });
                }}
                bounds="parent"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setSelectedId(caption.id);
                }}
                className={`caption-rnd ${selectedId === caption.id ? 'selected' : ''}`}
                enableUserSelectHack={false}
              >
                <div 
                  className="caption-text-display"
                  style={{
                    fontSize: `${caption.fontSize}px`,
                    fontFamily: caption.fontFamily,
                    color: caption.color,
                  }}
                >
                  {caption.text}
                </div>
              </Rnd>
            ))}
          </div>
        </div>
      </div>

      <div className="meme-controls-area">
        <div className="control-section">
          <h3>Meme Settings</h3>
          <div className="input-group">
            <label>Name</label>
            <input 
              type="text" 
              value={memeName} 
              onChange={e => setMemeName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
              placeholder="my_meme"
            />
          </div>
          <button className="btn-secondary w-full" onClick={addCaption}>
            <span className="material-symbols-outlined">title</span>
            Add Text Box
          </button>
        </div>

        {selectedCaption ? (
          <div className="control-section">
            <h3>Edit Text</h3>
            <div className="input-group">
              <textarea 
                value={selectedCaption.text}
                onChange={e => updateCaption(selectedId!, { text: e.target.value })}
                rows={3}
              />
            </div>
            
            <div className="controls-row">
              <div className="input-group flex-1">
                <label>Font Size ({selectedCaption.fontSize}px)</label>
                <input 
                  type="range" 
                  min="10" 
                  max="120" 
                  value={selectedCaption.fontSize}
                  onChange={e => updateCaption(selectedId!, { fontSize: Number(e.target.value) })}
                />
              </div>
              <div className="input-group flex-1">
                <label>Color</label>
                <input 
                  type="color" 
                  value={selectedCaption.color}
                  onChange={e => updateCaption(selectedId!, { color: e.target.value })}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Font Family</label>
              <select 
                value={selectedCaption.fontFamily}
                onChange={e => updateCaption(selectedId!, { fontFamily: e.target.value })}
              >
                {FONTS.map(f => (
                  <option key={f} value={f}>{f.split(',')[0].replace(/"/g, '')}</option>
                ))}
              </select>
            </div>

            <button className="btn-danger w-full mt-2" onClick={() => removeCaption(selectedId!)}>
              Remove Selected Text
            </button>
          </div>
        ) : (
          <div className="control-section empty-selection">
            <p>Select a text box on the image to edit its properties.</p>
          </div>
        )}

        <div className="spacer"></div>

        <div className="meme-actions">
          <button className="btn-secondary" onClick={discardMeme} disabled={isProcessing}>
            Discard
          </button>
          <div className="primary-actions">
            <button className={`btn-secondary ${downloadStatus === 'success' ? 'success-text' : ''}`} onClick={downloadMeme} disabled={isProcessing}>
              <span className="material-symbols-outlined">
                {downloadStatus === 'success' ? 'check' : 'download'}
              </span>
              Save
            </button>
            <button className="btn-primary" onClick={uploadMeme} disabled={isProcessing}>
              <span className="material-symbols-outlined">
                {uploadStatus === 'success' ? 'check' : 'cloud_upload'}
              </span>
              Upload to Server
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
