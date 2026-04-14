'use client';

import { useState, useEffect, useRef } from 'react';
import type { V3StoreData } from '@/lib/v3-types';
import type { HeroConfig } from '@/lib/block-types';
import TrustBadges from '@/components/TrustBadges';
import TrackedLink from '@/components/TrackedLink';

interface HeroBlockProps {
  config: HeroConfig;
  store: V3StoreData;
  basePath: string;
}

const PARALLAX_FACTOR = 0.4;
const CURSOR_PARALLAX_MAX = 8;
const BUBBLE_RADIUS = 180;
const BUBBLE_ENABLED = false;

export default function HeroBlock({ config, store, basePath }: HeroBlockProps) {
  const [showText, setShowText] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [isReblurred, setIsReblurred] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef(0);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setShowText(true);
      setIsReblurred(true);
    }, 2200);
    const t2 = setTimeout(() => setShowButtons(true), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Parallax scroll handler: translate the image based on section scroll position.
  useEffect(() => {
    let rafId = 0;
    let pending = false;

    const update = () => {
      pending = false;
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const y = Math.max(0, window.scrollY) * PARALLAX_FACTOR;
      parallaxRef.current = y;
      wrapper.style.transform = `translate3d(0, ${y}px, 0)`;
    };

    const onScroll = () => {
      if (pending) return;
      pending = true;
      rafId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Cursor parallax + bubble reveal: translate the image and track cursor for the clear-bubble overlay.
  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return;
    let rafId = 0;
    let pending = false;
    let targetX = 0;
    let targetY = 0;
    let bubbleX = 0;
    let bubbleY = 0;

    const update = () => {
      pending = false;
      const el = cursorRef.current;
      const bubble = bubbleRef.current;
      if (el) el.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      if (bubble) {
        bubble.style.setProperty('--mx', `${bubbleX}px`);
        bubble.style.setProperty('--my', `${bubbleY}px`);
      }
    };

    const onMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * -CURSOR_PARALLAX_MAX * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * -CURSOR_PARALLAX_MAX * 2;
      const section = sectionRef.current;
      if (section) {
        const rect = section.getBoundingClientRect();
        bubbleX = e.clientX - rect.left;
        bubbleY = e.clientY - rect.top;
      }
      if (pending) return;
      pending = true;
      rafId = requestAnimationFrame(update);
    };

    const onLeave = () => {
      const bubble = bubbleRef.current;
      if (bubble) bubble.style.opacity = '0';
    };
    const onEnter = () => {
      const bubble = bubbleRef.current;
      if (bubble) bubble.style.opacity = '1';
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    const section = sectionRef.current;
    if (section) {
      section.addEventListener('mouseenter', onEnter);
      section.addEventListener('mouseleave', onLeave);
    }
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMove);
      if (section) {
        section.removeEventListener('mouseenter', onEnter);
        section.removeEventListener('mouseleave', onLeave);
      }
    };
  }, []);

  const imgSrc = config.image_url || store.hero_image_url || '/images/dia2-hero.jpg';

  return (
    <section
      ref={sectionRef}
      suppressHydrationWarning
      className="relative min-h-[360px] sm:min-h-[500px] md:min-h-[800px] flex items-center justify-center overflow-hidden"
    >
      <div
        ref={wrapperRef}
        className="absolute inset-0 will-change-transform"
        style={{
          maskImage: 'linear-gradient(to bottom, black calc(100% - 10px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black calc(100% - 10px), transparent 100%)',
        }}
      >
        <div
          ref={cursorRef}
          className="absolute inset-0 will-change-transform"
          style={{ transition: 'transform 0.4s ease-out' }}
        >
          <img
            src={imgSrc}
            alt={store.store_name}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover will-change-transform animate-hero-zoom"
            style={{
              filter: isReblurred ? 'blur(20px) brightness(0.85) saturate(1.1)' : 'blur(0px) brightness(1)',
              transition: 'filter 0.8s ease-in-out',
            }}
          />
          <div
            ref={bubbleRef}
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: BUBBLE_ENABLED && isReblurred ? 1 : 0,
              display: BUBBLE_ENABLED ? undefined : 'none',
              transition: 'opacity 0.6s ease-in-out',
              maskImage: `radial-gradient(circle ${BUBBLE_RADIUS}px at var(--mx, -9999px) var(--my, -9999px), black 0%, black 40%, transparent 100%)`,
              WebkitMaskImage: `radial-gradient(circle ${BUBBLE_RADIUS}px at var(--mx, -9999px) var(--my, -9999px), black 0%, black 40%, transparent 100%)`,
            }}
          >
            <img
              src={imgSrc}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover animate-hero-zoom"
            />
          </div>
        </div>
      </div>
      <div
        className="relative w-full p-8 z-10"
        style={{
          opacity: showText ? 1 : 0,
          transform: showText ? 'translateY(0px)' : 'translateY(20px)',
          transition: 'opacity 1s ease-out, transform 1s ease-out',
        }}
      >
        <div className="max-w-[900px] mx-auto text-center">
          <h1
            className="text-white font-bold leading-tight mb-3 whitespace-nowrap"
            style={{
              fontFamily: '"Noto Sans JP", sans-serif',
              fontSize: 'clamp(1.5rem, 6vw, 4rem)',
              fontFeatureSettings: '"palt" 1',
              paddingLeft: '0.5em',
              textShadow: '0 2px 3px rgba(0,0,0,0.9)',
            }}
          >
            {config.title || store.hero_title || '洗車だけで、この輝きが続く。'}
          </h1>
          <p
            className="text-white text-sm mb-4"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
          >
            {config.subtitle || store.hero_subtitle || `${store.store_name} ｜ KeePer PRO SHOP認定`}
          </p>
          <div style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.7))' }}>
            {config.show_badges && <TrustBadges hasBooth={store.has_booth} level1Count={store.level1_staff_count} level2Count={store.level2_staff_count} />}
          </div>
          <div
            className="flex gap-3 justify-center mt-5"
            style={{
              opacity: showButtons ? 1 : 0,
              transform: showButtons ? 'scale(1)' : 'scale(0.85)',
              transition: 'opacity 0.5s ease-out, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {config.show_cta_booking && <TrackedLink href={`${basePath}/booking`} storeId={store.store_id} event="cta_booking" className="px-7 py-3 bg-amber-500 text-[#0C3290] font-bold rounded-lg text-sm hover:bg-amber-500 transition-colors shadow-lg">{'\u4E88\u7D04\u3059\u308B'}</TrackedLink>}
            {config.show_cta_inquiry && <TrackedLink href={`${basePath}/booking?mode=inquiry`} storeId={store.store_id} event="cta_inquiry" className="px-7 py-3 bg-white border border-white text-[#0C3290] font-semibold rounded-lg text-sm hover:bg-gray-100 transition-colors shadow-lg">{'\u304A\u554F\u3044\u5408\u308F\u305B'}</TrackedLink>}
          </div>
        </div>
      </div>
    </section>
  );
}
