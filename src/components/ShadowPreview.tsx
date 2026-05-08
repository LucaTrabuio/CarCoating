'use client';

import { useEffect, useRef } from 'react';

export interface ShadowPreviewProps {
  /** Sanitized HTML to render inside the shadow root. */
  html: string;
  /** Sanitized CSS to inject. Selectors are isolated from the outer page. */
  css?: string;
  className?: string;
  /** Optional ARIA label for accessibility. */
  ariaLabel?: string;
}

/**
 * Renders user-supplied HTML + CSS inside a Shadow DOM root, so selectors like
 * `.banner` or `body` cannot leak out and style the rest of the page.
 *
 * Uses `:host { all: initial; }` to block inherited styles from the outer
 * document — the rendered content is a clean slate that relies only on what
 * the user provided.
 */
export default function ShadowPreview({ html, css, className, ariaLabel }: ShadowPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    const reset = ':host{all:initial;display:block;box-sizing:border-box;}:host *{box-sizing:border-box;}';
    shadow.innerHTML = `<style>${reset}${css || ''}</style>${html || ''}`;
  }, [html, css]);

  return <div ref={hostRef} className={className} aria-label={ariaLabel} />;
}
