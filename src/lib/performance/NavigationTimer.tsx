'use client';

/**
 * Navigation Timer (Client-Side)
 * Tracks time between route changes, including hydration and data fetching
 */

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { performanceCollector } from './PerformanceCollector';
import type { NavigationMetric } from './types';

export function NavigationTimer(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navigationStart = useRef<number>(performance.now());
  const previousPath = useRef<string>('');
  const isInitialLoad = useRef<boolean>(true);

  // Track route changes
  useEffect(() => {
    const currentPath =
      pathname + (searchParams?.toString() ? `?${searchParams}` : '');
    const endTime = performance.now();
    const duration = endTime - navigationStart.current;

    if (previousPath.current && previousPath.current !== currentPath) {
      const metric: NavigationMetric = {
        type: 'navigation',
        from: previousPath.current,
        to: currentPath,
        duration: Math.round(duration),
        timestamp: Date.now(),
      };

      // Capture Web Vitals if available
      if (typeof window !== 'undefined' && 'performance' in window) {
        const navEntry = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        if (navEntry) {
          metric.ttfb = Math.round(
            navEntry.responseStart - navEntry.requestStart
          );
        }
      }

      performanceCollector.record(metric);

      // Console logging for development
      if (process.env.NODE_ENV === 'development') {
        const status = duration > 1000 ? '🔴' : duration > 500 ? '🟡' : '🟢';
        console.log(
          `${status} [NAV] ${metric.from} → ${metric.to}: ${duration.toFixed(0)}ms`
        );
      }
    }

    // Handle initial page load
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      const initialLoadMetric: NavigationMetric = {
        type: 'navigation',
        from: 'initial',
        to: currentPath,
        duration: Math.round(performance.now()),
        timestamp: Date.now(),
      };

      // Capture initial load Web Vitals
      if (typeof window !== 'undefined' && 'performance' in window) {
        const navEntry = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        if (navEntry) {
          initialLoadMetric.ttfb = Math.round(
            navEntry.responseStart - navEntry.requestStart
          );
        }
      }

      performanceCollector.record(initialLoadMetric);

      if (process.env.NODE_ENV === 'development') {
        const status =
          initialLoadMetric.duration > 2000
            ? '🔴'
            : initialLoadMetric.duration > 1000
              ? '🟡'
              : '🟢';
        console.log(
          `${status} [INITIAL LOAD] ${currentPath}: ${initialLoadMetric.duration}ms`
        );
      }
    }

    previousPath.current = currentPath;
    navigationStart.current = performance.now();
  }, [pathname, searchParams]);

  return null;
}
