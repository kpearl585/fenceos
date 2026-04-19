// Detects what form of AR the current device/browser supports.
// SSR-safe — returns 'unsupported' during server render.

export type ARCapability =
  | 'quick-look'       // iOS Safari — native Apple AR Quick Look
  | 'scene-viewer'     // Android Chrome — Google Scene Viewer
  | 'webxr'            // Chromium desktop with WebXR
  | 'fallback-3d'      // No AR but can render 3D orbital preview
  | 'unsupported';     // SSR or otherwise unknown

export type DeviceType = 'ios' | 'android' | 'desktop' | 'unknown';

export function detectARCapability(): ARCapability {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'unsupported';
  }
  const ua = navigator.userAgent;

  // iOS detection (not Mac Safari — MSStream check rules out IE)
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;
  if (isIOS) return 'quick-look';

  // Android Chrome with ARCore (Samsung Internet is also Chromium-based)
  const isAndroid = /Android/.test(ua);
  const isChromium = /Chrome|Samsung/.test(ua);
  if (isAndroid && isChromium) return 'scene-viewer';

  // Desktop Chromium with WebXR
  if ('xr' in navigator) return 'webxr';

  // 3D orbital preview fallback (still renders the model, just no AR)
  return 'fallback-3d';
}

export function getDeviceType(): DeviceType {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'unknown';
  }
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Mobi/.test(ua)) return 'unknown';
  return 'desktop';
}

export function isMobile(): boolean {
  const d = getDeviceType();
  return d === 'ios' || d === 'android';
}
