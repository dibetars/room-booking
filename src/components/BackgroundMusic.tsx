'use client';

import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'boko-music';
const SRC = '/sound/Bokobokotheme.mp3';
const VOLUME = 0.35;

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const getAudio = () => {
    if (!audioRef.current) {
      const a = new Audio(SRC);
      a.loop = true;
      a.volume = VOLUME;
      audioRef.current = a;
    }
    return audioRef.current;
  };

  const start = () =>
    getAudio().play().then(() => { setPlaying(true); return true; }).catch(() => false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === 'off') return;

    const events = ['pointerdown', 'keydown', 'touchstart'] as const;
    // Browsers block audible autoplay until the visitor interacts with the page.
    const onFirstInteraction = (e: Event) => {
      if (buttonRef.current?.contains(e.target as Node)) return;
      if (localStorage.getItem(STORAGE_KEY) === 'off') return removeListeners();
      start().then((ok) => { if (ok) removeListeners(); });
    };
    const removeListeners = () =>
      events.forEach((ev) => window.removeEventListener(ev, onFirstInteraction));

    start().then((ok) => {
      if (!ok) events.forEach((ev) => window.addEventListener(ev, onFirstInteraction));
    });

    return () => {
      removeListeners();
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      const a = audioRef.current;
      if (!a || !playing) return;
      if (document.hidden) a.pause();
      else a.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [playing]);

  const toggle = () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      localStorage.setItem(STORAGE_KEY, 'off');
    } else {
      localStorage.setItem(STORAGE_KEY, 'on');
      start();
    }
  };

  return (
    <button
      ref={buttonRef}
      onClick={toggle}
      aria-label={playing ? 'Turn music off' : 'Turn music on'}
      title={playing ? 'Turn music off' : 'Turn music on'}
      className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full bg-black/70 px-4 py-2.5 text-sm font-medium text-white shadow-lg backdrop-blur hover:bg-[#BE6A45] transition-colors"
    >
      {playing ? (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11 5 6 9H2v6h4l5 4V5z" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      ) : (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11 5 6 9H2v6h4l5 4V5z" />
          <path d="m23 9-6 6" />
          <path d="m17 9 6 6" />
        </svg>
      )}
      <span>{playing ? 'Music on' : 'Music off'}</span>
    </button>
  );
}
