'use client';

import Link from 'next/link';
import { trackEvent, type TrackableEvent } from '@/lib/track';

interface TrackedLinkProps {
  href: string;
  storeId: string;
  event: TrackableEvent;
  meta?: Record<string, string>;
  className?: string;
  children: React.ReactNode;
  target?: string;
  rel?: string;
}

export default function TrackedLink({ href, storeId, event, meta, className, children, target, rel }: TrackedLinkProps) {
  const isExternal = target === '_blank' || href.startsWith('http');

  if (isExternal) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        onClick={() => trackEvent(storeId, event, meta)}
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      onClick={() => trackEvent(storeId, event, meta)}
      className={className}
    >
      {children}
    </Link>
  );
}
