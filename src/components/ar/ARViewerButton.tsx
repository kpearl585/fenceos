'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ARModelViewer, { type ArStatus } from './ARModelViewer';
import {
  detectARCapability,
  getDeviceType,
  type ARCapability,
} from '@/lib/ar/device-detection';
import { useARSession, type ARMode } from '@/lib/ar/use-ar-session';

interface Props {
  token?: string;
  launchedBy: 'contractor' | 'customer';
  variant?: 'primary' | 'secondary';
  className?: string;
}

function capabilityToMode(cap: ARCapability): ARMode {
  if (cap === 'quick-look') return 'quick_look';
  if (cap === 'scene-viewer') return 'scene_viewer';
  if (cap === 'webxr') return 'webxr';
  return 'fallback_3d';
}

const AR_ICON = (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3 2 8l10 5 10-5-10-5Z" />
    <path d="m2 12 10 5 10-5" />
    <path d="m2 17 10 5 10-5" />
  </svg>
);

const CLOSE_ICON = (
  <svg
    className="w-6 h-6"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const SPINNER = (
  <svg
    className="animate-spin h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4Zm2 5.3A8 8 0 0 1 4 12H0c0 3 1.1 5.8 3 8l3-2.7Z"
    />
  </svg>
);

export default function ARViewerButton({
  token,
  launchedBy,
  variant = 'primary',
  className,
}: Props) {
  const [capability, setCapability] = useState<ARCapability>('unsupported');
  const [isOpen, setIsOpen] = useState(false);
  const launchStartRef = useRef<number | null>(null);

  const { status, asset, error, prepare, createSession, updateStatus, reset } =
    useARSession({ token, launchedBy });

  useEffect(() => {
    setCapability(detectARCapability());
  }, []);

  const handleArStatus = useCallback(
    (arStatus: ArStatus) => {
      if (arStatus === 'session-started') {
        launchStartRef.current = Date.now();
        updateStatus({
          status: 'launched',
          arLaunchedAt: new Date().toISOString(),
        });
      } else if (arStatus === 'object-placed') {
        updateStatus({
          status: 'placed',
          firstPlacedAt: new Date().toISOString(),
        });
      } else if (arStatus === 'not-presenting' && launchStartRef.current != null) {
        const duration = Math.round((Date.now() - launchStartRef.current) / 1000);
        updateStatus({
          status: 'completed',
          completedAt: new Date().toISOString(),
          durationSeconds: duration,
        });
      }
    },
    [updateStatus]
  );

  const handleOpen = useCallback(async () => {
    setIsOpen(true);
    const result = await prepare();
    if (result.ok) {
      const device = getDeviceType();
      const mode = capabilityToMode(capability);
      await createSession(device, mode);
    }
  }, [prepare, createSession, capability]);

  const handleClose = useCallback(() => {
    if (launchStartRef.current == null) {
      updateStatus({
        status: 'abandoned',
        completedAt: new Date().toISOString(),
      });
    }
    setIsOpen(false);
    launchStartRef.current = null;
    reset();
  }, [updateStatus, reset]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  if (capability === 'unsupported') return null;

  const is3D = capability === 'fallback-3d';
  const label = is3D ? '3D Preview' : 'See Your Fence in AR';

  const buttonClass =
    variant === 'primary'
      ? 'inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light accent-glow text-white rounded-lg font-semibold transition-colors duration-150'
      : 'inline-flex items-center gap-2 px-4 py-2 bg-surface-3 border-2 border-border hover:border-accent text-text hover:text-accent-light rounded-lg font-semibold transition-colors duration-150';

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`${buttonClass} ${className ?? ''}`.trim()}
        aria-label={label}
      >
        {AR_ICON}
        <span>{label}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <div className="bg-surface-2 border border-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-accent/10 border-b border-accent/20 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-text">{label}</h2>
                <p className="text-sm text-muted mt-1">
                  {is3D
                    ? 'Explore your fence in 3D'
                    : 'Point your phone at your yard'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-muted hover:text-text transition-colors duration-150"
                aria-label="Close"
              >
                {CLOSE_ICON}
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!is3D && status !== 'error' && (
                <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 text-sm text-text">
                  <strong className="text-accent-light">Tips for best results:</strong> Works best outdoors on
                  grass, gravel, or concrete with even lighting. Point your
                  camera at the ground where you want to see the fence.
                </div>
              )}

              {status === 'loading' && (
                <div className="w-full h-[500px] bg-surface-3 border border-border rounded-xl flex items-center justify-center text-muted gap-2">
                  {SPINNER} <span>Loading 3D model…</span>
                </div>
              )}

              {status === 'error' && (
                <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 text-sm text-danger">
                  <strong>Unable to load AR preview.</strong> {error}
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        reset();
                        handleOpen();
                      }}
                      className="text-danger underline hover:no-underline font-semibold"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {status === 'ready' && asset && (
                <ARModelViewer
                  glbUrl={asset.glbUrl}
                  usdzUrl={asset.usdzUrl}
                  thumbnailUrl={asset.thumbnailUrl}
                  alt="Your fence preview"
                  autoRotate
                  onArStatus={handleArStatus}
                />
              )}

              <div className="text-xs text-muted text-center space-y-1">
                <p>Powered by FenceEstimatePro</p>
                <p className="text-muted">
                  3D model by{' '}
                  <a
                    href="https://skfb.ly/otBYu"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-text transition-colors duration-150"
                  >
                    plaggy
                  </a>
                  {' '}&middot;{' '}
                  <a
                    href="https://creativecommons.org/licenses/by/4.0/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-text transition-colors duration-150"
                  >
                    CC BY 4.0
                  </a>
                  {' '}&middot;{' '}
                  <a
                    href="/credits"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-text transition-colors duration-150"
                  >
                    Credits
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
