'use client';

import { useEffect, useRef } from 'react';
import { trackEvent } from '@/lib/track';

export default function PageViewTracker({ storeId }: { storeId: string }) {
  const tracked = useRef(false);
  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackEvent(storeId, 'page_view');
    }
  }, [storeId]);
  return null;
}
