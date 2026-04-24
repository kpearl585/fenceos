'use client';

import { useCallback, useState } from 'react';
import type { DeviceType } from './device-detection';

export type ARMode = 'quick_look' | 'scene_viewer' | 'webxr' | 'fallback_3d';
export type ARSessionStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'launching'
  | 'active'
  | 'completed'
  | 'error';

export interface ARAssetData {
  glbUrl: string;
  usdzUrl: string;
  thumbnailUrl?: string;
  panelCount: number;
  segmentLengthFt: number;
  fenceTypeId: string;
  heightFt: number;
}

interface UseARSessionOpts {
  token?: string;
  launchedBy: 'contractor' | 'customer';
}

interface PrepareResult {
  ok: boolean;
  asset?: ARAssetData;
  error?: string;
}

export function useARSession({ token, launchedBy }: UseARSessionOpts) {
  const [status, setStatus] = useState<ARSessionStatus>('idle');
  const [asset, setAsset] = useState<ARAssetData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prepare = useCallback(async (): Promise<PrepareResult> => {
    if (!token) {
      setError('No quote token');
      setStatus('error');
      return { ok: false, error: 'No quote token' };
    }
    setStatus('loading');
    setError(null);
    try {
      const res = await fetch(`/api/ar/assets?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }));
        const msg = body.error ?? `Failed to load assets (${res.status})`;
        setError(msg);
        setStatus('error');
        return { ok: false, error: msg };
      }
      const data = (await res.json()) as ARAssetData;
      setAsset(data);
      setStatus('ready');
      return { ok: true, asset: data };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error';
      setError(msg);
      setStatus('error');
      return { ok: false, error: msg };
    }
  }, [token]);

  const createSession = useCallback(
    async (deviceType: DeviceType, arMode: ARMode): Promise<string | null> => {
      try {
        const res = await fetch('/api/ar/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            launchedBy,
            deviceType,
            arMode,
            userAgent:
              typeof navigator !== 'undefined'
                ? navigator.userAgent.slice(0, 500)
                : undefined,
          }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { sessionId: string };
        setSessionId(data.sessionId);
        return data.sessionId;
      } catch {
        return null;
      }
    },
    [token, launchedBy]
  );

  const updateStatus = useCallback(
    async (patch: {
      status?: 'launched' | 'placed' | 'screenshot_taken' | 'abandoned' | 'completed';
      arLaunchedAt?: string;
      firstPlacedAt?: string;
      completedAt?: string;
      durationSeconds?: number;
    }) => {
      if (!sessionId) return;
      try {
        await fetch(`/api/ar/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...patch,
            publicToken: token,
          }),
        });
      } catch {
        // non-fatal
      }
    },
    [sessionId, token]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setAsset(null);
    setSessionId(null);
    setError(null);
  }, []);

  return {
    status,
    asset,
    sessionId,
    error,
    prepare,
    createSession,
    updateStatus,
    reset,
  };
}
