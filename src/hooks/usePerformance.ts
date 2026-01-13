'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Debounce a value to reduce re-renders.
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Throttle a callback function.
 */
export function useThrottle<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
): T {
    const lastCall = useRef(0);
    const lastResult = useRef<ReturnType<T>>();

    return useCallback(
        ((...args: Parameters<T>) => {
            const now = Date.now();
            if (now - lastCall.current >= delay) {
                lastCall.current = now;
                lastResult.current = callback(...args);
            }
            return lastResult.current;
        }) as T,
        [callback, delay]
    );
}

/**
 * Intersection observer hook for lazy loading.
 */
export function useIntersectionObserver(
    options: IntersectionObserverInit = {}
): [React.RefObject<HTMLDivElement>, boolean] {
    const ref = useRef<HTMLDivElement>(null);
    const [isIntersecting, setIsIntersecting] = useState(false);

    useEffect(() => {
        if (!ref.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => setIsIntersecting(entry.isIntersecting),
            { threshold: 0.1, ...options }
        );

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [options.threshold, options.rootMargin]);

    return [ref, isIntersecting];
}

/**
 * Lazy load component when it enters viewport.
 */
export function useLazyLoad<T>(
    loadFn: () => Promise<T>,
    deps: any[] = []
): { data: T | null; isLoading: boolean; error: Error | null } {
    const [ref, isVisible] = useIntersectionObserver();
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const hasLoaded = useRef(false);

    useEffect(() => {
        if (!isVisible || hasLoaded.current) return;

        hasLoaded.current = true;
        setIsLoading(true);

        loadFn()
            .then(setData)
            .catch(setError)
            .finally(() => setIsLoading(false));
    }, [isVisible, ...deps]);

    return { data, isLoading, error };
}

/**
 * Media query hook for responsive behavior.
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        setMatches(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [query]);

    return matches;
}

// Preset breakpoints matching Tailwind
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');

/**
 * Measure render time for performance monitoring.
 */
export function useRenderTime(componentName: string) {
    const renderStart = useRef(performance.now());

    useEffect(() => {
        const renderEnd = performance.now();
        const duration = renderEnd - renderStart.current;

        if (process.env.NODE_ENV === 'development' && duration > 16) {
            console.warn(`[Performance] ${componentName} took ${duration.toFixed(2)}ms to render`);
        }
    });
}

/**
 * Web Vitals tracking helper.
 */
export function reportWebVitals(metric: {
    id: string;
    name: string;
    value: number;
    delta: number;
    entries: PerformanceEntry[];
}) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.log(`[WebVital] ${metric.name}:`, metric.value.toFixed(2));
    }

    // Send to analytics in production
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', metric.name, {
            value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
            event_label: metric.id,
            non_interaction: true,
        });
    }
}

// Extend window type for gtag
declare global {
    interface Window {
        gtag?: (...args: any[]) => void;
    }
}

/**
 * Detect if the device has a touch screen.
 */
export function useIsTouchDevice(): boolean {
    const [isTouch, setIsTouch] = useState(false);

    useEffect(() => {
        setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }, []);

    return isTouch;
}

/**
 * Prefetch data on hover for faster navigation.
 */
export function usePrefetch<T>(
    fetchFn: () => Promise<T>,
    options: { delay?: number } = {}
): {
    prefetch: () => void;
    data: T | null;
    isPrefetched: boolean;
} {
    const { delay = 100 } = options;
    const [data, setData] = useState<T | null>(null);
    const [isPrefetched, setIsPrefetched] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout>();

    const prefetch = useCallback(() => {
        if (isPrefetched) return;

        timeoutRef.current = setTimeout(() => {
            fetchFn()
                .then(result => {
                    setData(result);
                    setIsPrefetched(true);
                })
                .catch(() => {}); // Silently fail prefetches
        }, delay);
    }, [fetchFn, delay, isPrefetched]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return { prefetch, data, isPrefetched };
}
