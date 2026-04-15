'use client';

import { useEffect, useRef } from 'react';

const CURSOR_PARALLAX_MAX = 8;
const BUBBLE_RADIUS = 260;

interface GuideHeroProps {
  title: string;
  subtitle: string;
  imageSrc: string;
}

export default function GuideHero({ title, subtitle, imageSrc }: GuideHeroProps) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Cursor parallax + bubble position (both driven by mousemove)
  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return;
    let rafId = 0;
    let pending = false;
    let parallaxX = 0;
    let parallaxY = 0;
    let bubbleX = -9999;
    let bubbleY = -9999;

    const update = () => {
      pending = false;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${parallaxX}px, ${parallaxY}px, 0)`;
      }
      if (bubbleRef.current) {
        bubbleRef.current.style.setProperty('--mx', `${bubbleX}px`);
        bubbleRef.current.style.setProperty('--my', `${bubbleY}px`);
      }
    };

    const onMove = (e: MouseEvent) => {
      parallaxX = (e.clientX / window.innerWidth - 0.5) * -CURSOR_PARALLAX_MAX * 2;
      parallaxY = (e.clientY / window.innerHeight - 0.5) * -CURSOR_PARALLAX_MAX * 2;
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
      if (bubbleRef.current) bubbleRef.current.style.opacity = '0';
    };
    const onEnter = () => {
      if (bubbleRef.current) bubbleRef.current.style.opacity = '1';
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

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      {/* Blurred base layer with cursor parallax */}
      <div
        ref={cursorRef}
        className="will-change-transform"
        style={{ transition: 'transform 0.2s ease-out' }}
      >
        <img
          src={imageSrc}
          alt={title}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="block w-full h-auto"
          style={{ filter: 'blur(20px) brightness(0.85) saturate(1.1)' }}
        />
      </div>

      {/* Clear image overlay masked to a radial "window" at the cursor — cuts through the blur */}
      <div
        ref={bubbleRef}
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0,
          transition: 'opacity 0.6s ease-in-out',
          maskImage: `radial-gradient(circle ${BUBBLE_RADIUS}px at var(--mx, -9999px) var(--my, -9999px), black 0%, black 40%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(circle ${BUBBLE_RADIUS}px at var(--mx, -9999px) var(--my, -9999px), black 0%, black 40%, transparent 100%)`,
        }}
      >
        <img
          src={imageSrc}
          alt=""
          aria-hidden
          className="block w-full h-auto"
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center p-8 z-10">
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
            {title}
          </h1>
          <p
            className="text-white text-sm mb-4"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
          >
            {subtitle}
          </p>
        </div>
      </div>
    </section>
  );
}
