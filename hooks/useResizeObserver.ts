import { useCallback, useEffect, useState } from 'react';

export function useResizeObserver<T extends HTMLElement>() {
  const [ref, setRef] = useState<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onResize = useCallback((entries: ResizeObserverEntry[]) => {
    if (!Array.isArray(entries) || !entries.length) {
      return;
    }

    const entry = entries[0];
    setSize({
      width: entry.contentRect.width,
      height: entry.contentRect.height,
    });
  }, []);

  useEffect(() => {
    if (!ref) return;

    const observer = new ResizeObserver(onResize);
    observer.observe(ref);

    return () => {
      observer.disconnect();
    };
  }, [ref, onResize]);

  return [setRef, size] as const;
}
