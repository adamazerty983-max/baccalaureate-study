/**
 * Performance Optimization Utilities
 * Handles resource hints, lazy loading, and performance monitoring
 */

/**
 * Preload critical chunks for faster navigation
 */
export const preloadCriticalChunks = () => {
  if (typeof window === 'undefined') return;

  // Preload vendor chunks that are likely to be needed
  const criticalChunks = [
    'vendor-react',
    'vendor-icons',
    'vendor-animations',
  ];

  criticalChunks.forEach((chunk) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'script';
    link.href = `/baccalaureate-study/assets/${chunk}.js`;
    document.head.appendChild(link);
  });
};

/**
 * Optimize animations with requestIdleCallback
 */
export const runWhenIdle = (callback: () => void) => {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(callback);
  } else {
    setTimeout(callback, 1);
  }
};
