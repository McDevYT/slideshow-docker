import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Slideshow.css';
import { isVideo } from '../../utils/utils';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const DISPLAY_TIME = 15000;
const FADE_DURATION = 500;

type Media = {
    file: string;
    url: string;
    type: 'image' | 'video';
};

const Slideshow = () => {
    const navigate = useNavigate();
    const [current, setCurrent] = useState<Media | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<number | null>(null);
    const mountedRef = useRef(true);

    const fetchNext = async (): Promise<Media | null> => {
        try {
            const res = await fetch(`${API_BASE}/slideshow/next`);
            const data = await res.json();
            if (!data?.file) return null;
            return { 
                file: data.file, 
                url: `${API_BASE}/file/${data.file}`,
                type: isVideo(data.file) ? 'video' : 'image'
            };
        } catch {
            return null;
        }
    };

    const preload = (media: Media) => new Promise<void>((resolve, reject) => {
        if (media.type === 'video') {
            const video = document.createElement('video');
            video.src = media.url;
            video.preload = 'auto';
            video.onloadeddata = () => resolve(); 
            video.onerror = () => reject();
        } else {
            const img = new Image();
            img.src = media.url;
            img.onload = () => resolve();
            img.onerror = () => reject();
        }
    });

    const wait = (ms: number) => new Promise(resolve => {
        timeoutRef.current = window.setTimeout(resolve, ms);
    });

    const runLoop = async () => {
        if (!mountedRef.current) return;

        await wait(DISPLAY_TIME);

        if (!mountedRef.current) return;

        const next = await fetchNext();

        if (!next) {
            runLoop();
            return;
        }

        try {
            await preload(next);
            
            if (mountedRef.current) {
                setIsVisible(false);
                
                await wait(FADE_DURATION);
                
                setCurrent(next);

                requestAnimationFrame(() => {
                    setTimeout(() => {
                        if (mountedRef.current) setIsVisible(true);
                    }, 50);
                });

                runLoop();
            }
        } catch {
            runLoop();
        }
    };

    useEffect(() => {
        mountedRef.current = true;

        const init = async () => {
            const initial = await fetchNext();
            if (initial) {
                await preload(initial);
                setCurrent(initial);
                setTimeout(() => setIsVisible(true), 100);
            }
            runLoop();
        };

        init();

        return () => {
            mountedRef.current = false;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'd' || e.key === 'D') {
                navigate('/dashboard');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);

    if (!current) return <div className="slideshow-container" />;

    return (
        <div className="slideshow-container">
            {current.type === 'image' ? (
                <img 
                    src={current.url} 
                    alt="slide" 
                    className={`media ${isVisible ? 'visible' : ''}`} 
                />
            ) : (
                <video 
                    src={current.url} 
                    autoPlay 
                    muted 
                    playsInline 
                    loop 
                    className={`media ${isVisible ? 'visible' : ''}`} 
                />
            )}
        </div>
    );
};

export default Slideshow;
