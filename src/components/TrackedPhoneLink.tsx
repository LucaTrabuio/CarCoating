'use client';

import { trackEvent } from '@/lib/track';

interface TrackedPhoneLinkProps {
  tel: string;
  storeId: string;
  className?: string;
  children: React.ReactNode;
}

export default function TrackedPhoneLink({ tel, storeId, className, children }: TrackedPhoneLinkProps) {
  return (
    <a
      href={`tel:${tel}`}
      onClick={() => trackEvent(storeId, 'phone_call')}
      className={className}
    >
      {children}
    </a>
  );
}
