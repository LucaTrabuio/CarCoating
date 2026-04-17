'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';

const TILT_MAX = 8; // degrees
const SCALE_HOVER = 1.04;

interface USPCardProps {
  imageSrc: string;
  title: string;
  description: string;
  icon: string;
  href?: string;
  ctaLabel?: string;
}

export default function USPCard({ imageSrc, title, description, icon, href, ctaLabel }: USPCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const pendingRef = useRef(false);
  const targetRef = useRef({ rx: 0, ry: 0, scale: 1 });

  const apply = () => {
    pendingRef.current = false;
    const el = cardRef.current;
    if (!el) return;
    const { rx, ry, scale } = targetRef.current;
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`;
  };

  const schedule = () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    rafRef.current = requestAnimationFrame(apply);
  };

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width;  // 0..1
    const cy = (e.clientY - rect.top) / rect.height;  // 0..1
    targetRef.current.ry = (cx - 0.5) * 2 * TILT_MAX;          // left/right rotate
    targetRef.current.rx = -(cy - 0.5) * 2 * TILT_MAX;         // up/down rotate (inverted)
    targetRef.current.scale = SCALE_HOVER;
    schedule();
  };

  const onLeave = () => {
    targetRef.current = { rx: 0, ry: 0, scale: 1 };
    schedule();
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="bg-white rounded-xl border border-gray-200 hover:shadow-xl transition-shadow overflow-hidden will-change-transform cursor-pointer flex flex-col h-full"
      style={{ transformStyle: 'preserve-3d', transition: 'transform 0.2s ease-out' }}
    >
      <Image
        src={imageSrc}
        alt={title}
        width={640}
        height={360}
        sizes="(min-width: 768px) 33vw, 100vw"
        className="w-full aspect-[16/9] object-cover"
      />
      <div className="p-5 flex flex-col flex-1">
        <h3
          className="text-gray-900 font-black tracking-tight text-base mb-1 text-center"
          style={{ fontFamily: '"Noto Sans JP", sans-serif' }}
        >
          {title} <span className="text-xl align-middle">{icon}</span>
        </h3>
        <p className="text-gray-500 text-xs text-center">{description}</p>
        {href && (
          <div className="text-right mt-auto pt-3">
            <Link
              href={href}
              className="inline-block bg-amber-500 text-[#0C3290] px-4 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
            >
              {ctaLabel ?? '詳しく見る →'}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
