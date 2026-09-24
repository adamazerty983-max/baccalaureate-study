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
 * Monitor and report web vitals
 */
export const reportWebVitals = (onPerfEntry?: (metric: any) => void) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    }).catch(() => {
      // web-vitals not available, skip reporting
    });
  }
};

/**
 * Debounce function for performance optimization
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function for performance optimization
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Check if the browser supports modern features
 */
export const checkBrowserSupport = () => {
  return {
    webp: document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0,
    serviceWorker: 'serviceWorker' in navigator,
    indexedDB: 'indexedDB' in window,
    webGL: !!document.createElement('canvas').getContext('webgl'),
  };
};

/**
 * Lazy load images with IntersectionObserver
 */
export const lazyLoadImage = (img: HTMLImageElement) => {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const image = entry.target as HTMLImageElement;
          const src = image.dataset.src;
          if (src) {
            image.src = src;
            image.removeAttribute('data-src');
          }
          observer.unobserve(image);
        }
      });
    });

    observer.observe(img);
  } else {
    // Fallback for browsers without IntersectionObserver
    const src = img.dataset.src;
    if (src) img.src = src;
  }
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

/**
 * Memory cleanup helper
 */
export const cleanupMemory = () => {
  // Clear unused caches
  if ('caches' in window) {
    caches.keys().then((names) => {
      const currentCache = 'mybac-offline-v4';
      names.forEach((name) => {
        if (name !== currentCache) {
          caches.delete(name);
        }
      });
    });
  }

  // Force garbage collection if available (Chrome DevTools)
  if ((window as any).gc) {
    (window as any).gc();
  }
};
