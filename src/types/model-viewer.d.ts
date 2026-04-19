// TypeScript JSX declarations for the <model-viewer> custom element
// See https://modelviewer.dev/ and docs/AR-Fence-Visualizer-Research.md Section 9.1

import '@google/model-viewer';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> &
          Partial<{
            src: string;
            'ios-src': string;
            alt: string;
            ar: boolean | string;
            'ar-modes': string;
            'ar-scale': string;
            'ar-placement': string;
            'camera-controls': boolean | string;
            'auto-rotate': boolean | string;
            'shadow-intensity': string;
            'environment-image': string;
            exposure: string;
            poster: string;
            loading: 'auto' | 'lazy' | 'eager';
            reveal: 'auto' | 'manual';
            'touch-action': string;
          }>,
        HTMLElement
      >;
    }
  }
}

export {};
