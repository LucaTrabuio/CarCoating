'use client';

import { useEffect, useRef, useState } from 'react';
import type { V3StoreData } from '@/lib/v3-types';

const DEFAULT_BANNERS = [
  { src: '/images/keeper-h1.jpg', alt: 'カーコーティング専門店 KeePer PRO SHOP' },
  { src: '/images/keeper-03.jpg', alt: 'ダイヤⅡキーパー 25%OFF キャンペーン' },
  { src: '/images/keeper-01.jpg', alt: '純水仕上げで最高品質' },
  { src: '/images/keeper-02.jpg', alt: 'コーティング専用ブース完備' },
];

const BASE_SPEED = 50;     // px/sec — normal drift
const HOVER_SPEED = 260;   // px/sec — accelerated on edge hover

interface PromoBannersBlockProps {
  store?: V3StoreData;
}

export default function PromoBannersBlock({ store }: PromoBannersBlockProps) {
  let custom: { src?: string; alt?: string }[] = [];
  try { custom = JSON.parse(store?.promo_banners || '[]'); } catch { /* empty */ }
  const banners = DEFAULT_BANNERS.map((def, i) =>
    custom[i]?.src ? { src: custom[i].src!, alt: custom[i].alt || def.alt } : def,
  );

  const loop = [...banners, ...banners];
  const N = banners.length;

  const trackRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const offsetRef = useRef(0);
  const speedRef = useRef(BASE_SPEED);
  const halfWidthRef = useRef(0);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const tweenRef = useRef<{ from: number; to: number; duration: number; elapsed: number } | null>(null);

  const [activeIdx, setActiveIdx] = useState(0);
  const activeIdxRef = useRef(0);

  useEffect(() => {
    const measure = () => {
      if (!trackRef.current) return;
      halfWidthRef.current = trackRef.current.scrollWidth / 2;
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener('resize', measure);

    const frame = (t: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = t;
      const dt = Math.min((t - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = t;

      if (tweenRef.current) {
        const tw = tweenRef.current;
        tw.elapsed += dt;
        const p = Math.min(tw.elapsed / tw.duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        offsetRef.current = tw.from + (tw.to - tw.from) * eased;
        if (p >= 1) tweenRef.current = null;
      } else {
        offsetRef.current -= speedRef.current * dt;
      }

      const hw = halfWidthRef.current;
      if (hw > 0) {
        while (offsetRef.current <= -hw) offsetRef.current += hw;
        while (offsetRef.current > 0) offsetRef.current -= hw;
      }

      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(${offsetRef.current}px)`;
      }

      // Find which original-index item is closest to the left edge
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < N; i++) {
        const el = itemsRef.current[i];
        if (!el) continue;
        const screenX = el.offsetLeft + offsetRef.current;
        const dist = screenX >= -10 ? screenX : Infinity;
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      if (best !== activeIdxRef.current) {
        activeIdxRef.current = best;
        setActiveIdx(best);
      }

      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', measure);
      ro.disconnect();
    };
  }, [N]);

  const jumpTo = (idx: number) => {
    const el = itemsRef.current[idx];
    if (!el) return;
    const target = -el.offsetLeft;
    tweenRef.current = { from: offsetRef.current, to: target, duration: 0.6, elapsed: 0 };
  };

  return (
    <section className="relative py-6 bg-white overflow-hidden w-full">
      <div
        ref={trackRef}
        className="flex gap-4 w-max will-change-transform"
      >
        {loop.map((banner, i) => (
          <div
            key={banner.src + i}
            ref={(el) => { itemsRef.current[i] = el; }}
            className="shrink-0 rounded-xl overflow-hidden shadow-md"
          >
            <img
              src={banner.src}
              alt={banner.alt || ''}
              className="block w-auto select-none"
              style={{ height: 'clamp(180px, 28vw, 360px)' }}
              loading={i < 2 ? 'eager' : 'lazy'}
              draggable={false}
            />
          </div>
        ))}
      </div>

      <div
        className="absolute inset-y-0 left-0 w-[10%] z-10"
        onMouseEnter={() => { speedRef.current = -HOVER_SPEED; }}
        onMouseLeave={() => { speedRef.current = BASE_SPEED; }}
      />
      <div
        className="absolute inset-y-0 right-0 w-[10%] z-10"
        onMouseEnter={() => { speedRef.current = HOVER_SPEED; }}
        onMouseLeave={() => { speedRef.current = BASE_SPEED; }}
      />

      <div className="flex gap-2 justify-center mt-4 relative z-20">
        {banners.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i + 1}枚目へ`}
            onClick={() => jumpTo(i)}
            className={`h-2 rounded-full transition-all cursor-pointer ${
              i === activeIdx ? 'w-6 bg-amber-500' : 'w-2 bg-slate-300 hover:bg-slate-400'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
