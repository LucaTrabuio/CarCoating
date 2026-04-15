'use client';

import type { CustomHtmlConfig } from '@/lib/block-types';
import { sanitizeHtml } from '@/lib/sanitize';
import { sanitizeCss } from '@/lib/sanitize-css';

interface CustomHtmlBlockProps {
  config: CustomHtmlConfig;
}

export default function CustomHtmlBlock({ config }: CustomHtmlBlockProps) {
  if (!config.html) return null;

  const safeHtml = sanitizeHtml(config.html);
  const safeCss = config.css ? sanitizeCss(config.css) : '';

  if (!safeHtml) return null;

  return (
    <section className="py-14 px-5 bg-white">
      <div className="max-w-[900px] mx-auto">
        {safeCss && (
          <style dangerouslySetInnerHTML={{ __html: safeCss }} />
        )}
        <div
          className="custom-html-block"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </div>
    </section>
  );
}
