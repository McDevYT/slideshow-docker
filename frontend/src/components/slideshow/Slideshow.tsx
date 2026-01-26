import { useEffect, useRef, useState } from 'react';
import './Slideshow.css';
import { isImage, isVideo } from '../../utils/utils';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const DISPLAY_TIME = 15000;

type Media = {
    file: string;
    url: string;
};

const Slideshow = () => {
    const [current, setCurrent] = useState<Media | null>(null);
    const nextRef = useRef<Media | null>(null);
    const timeoutRef = useRef<number | null>(null);
    const loopActive = useRef(true);

    const fetchNext = async (): Promise<Media | null> => {
        try {
            const res = await fetch(`${API_BASE}/slideshow/next`);
            const data = await res.json();
            if (!data?.file) return null;
            return { file: data.file, url: `${API_BASE}/file/${data.file}` };
        } catch (e) {
            console.error('Failed to fetch next media', e);
            return null;
        }
    };

    const preload = (media: Media) =>
        new Promise<void>((resolve) => {
            if (isVideo(media.file)) {
                const video = document.createElement('video');
                video.src = media.url;
                video.onloadeddata = () => resolve();
            } else {
                const img = new Image();
                img.src = media.url;
                img.onload = () => resolve();
            }
        });

    const scheduleNext = async () => {
        if (!loopActive.current) return;

        let next = nextRef.current || (await fetchNext());
        if (!next) return;

        await preload(next);

        setCurrent(next);

        fetchNext().then((upcoming) => {
            if (upcoming) preload(upcoming).then(() => (nextRef.current = upcoming));
        });

        const timeout = isImage(next.file)
            ? DISPLAY_TIME
            : await new Promise<number>((resolve) => {
                  const videoEl = document.querySelector<HTMLVideoElement>('video.media');
                  if (!videoEl) return resolve(DISPLAY_TIME);
                  if (videoEl.readyState >= 2) {
                      videoEl.onended = () => resolve(0);
                  } else {
                      videoEl.onloadeddata = () => (videoEl.onended = () => resolve(0));
                  }
              });

        timeoutRef.current = window.setTimeout(scheduleNext, timeout || DISPLAY_TIME);
    };

    useEffect(() => {
        loopActive.current = true;
        scheduleNext();

        return () => {
            loopActive.current = false;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <div className="slideshow">
            {current && isImage(current.file) && <img src={current.url} className="media" />}
            {current && isVideo(current.file) && (
                <video src={current.url} autoPlay muted className="media" />
            )}
        </div>
    );
};

export default Slideshow;
