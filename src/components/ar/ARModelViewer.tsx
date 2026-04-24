'use client';

import { useEffect, useRef, useState } from 'react';

// IMPORTANT: @google/model-viewer registers a custom element globally
// when imported client-side. We dynamically import it inside useEffect
// to avoid `window is not defined` during Next.js SSR.

export type ArStatus =
  | 'not-presenting'
  | 'session-started'
  | 'object-placed'
  | 'failed';

interface Props {
  glbUrl: string;
  usdzUrl: string;
  thumbnailUrl?: string;
  alt?: string;
  autoRotate?: boolean;
  onArStatus?: (status: ArStatus) => void;
  className?: string;
}

export default function ARModelViewer({
  glbUrl,
  usdzUrl,
  thumbnailUrl,
  alt = 'Fence 3D model',
  autoRotate = true,
  onArStatus,
  className,
}: Props) {
  const viewerRef = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    // Dynamic client-only import registers the <model-viewer> custom element
    import('@google/model-viewer')
      .then(() => {
        if (mounted) setReady(true);
      })
      .catch((err) => {
        console.error('Failed to load model-viewer', err);
        onArStatus?.('failed');
      });
    return () => {
      mounted = false;
    };
  }, [onArStatus]);

  useEffect(() => {
    const el = viewerRef.current;
    if (!el || !onArStatus) return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { status?: string } | undefined;
      const raw = detail?.status;
      if (
        raw === 'session-started' ||
        raw === 'object-placed' ||
        raw === 'not-presenting' ||
        raw === 'failed'
      ) {
        onArStatus(raw);
      }
    };

    el.addEventListener('ar-status', handler as EventListener);
    return () => el.removeEventListener('ar-status', handler as EventListener);
  }, [onArStatus, ready]);

  if (!ready) {
    return (
      <div
        className={
          className ??
          'w-full h-[500px] bg-surface-3 border border-border rounded-xl flex items-center justify-center'
        }
      >
        <div className="text-muted text-sm">Loading 3D preview…</div>
      </div>
    );
  }

  return (
    <model-viewer
      ref={viewerRef as React.RefObject<HTMLElement>}
      src={glbUrl}
      ios-src={usdzUrl}
      poster={thumbnailUrl}
      alt={alt}
      ar
      ar-modes="scene-viewer quick-look"
      ar-scale="fixed"
      ar-placement="floor"
      camera-controls
      auto-rotate={autoRotate ? '' : undefined}
      shadow-intensity="1"
      exposure="1"
      loading="lazy"
      touch-action="pan-y"
      className={className}
      style={{
        width: '100%',
        height: '500px',
        backgroundColor: '#0a1a2f',
        borderRadius: '0.75rem',
      }}
    />
  );
}
