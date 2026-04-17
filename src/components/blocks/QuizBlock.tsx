'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { trackEvent } from '@/lib/track';

type Tier = 'standard' | 'premium' | 'flagship';

interface Choice {
  label: string;
  points: Tier;
}

interface Question {
  question: string;
  choices: Choice[];
}

const questions: Question[] = [
  {
    question: 'お車の使い方は？',
    choices: [
      { label: '通勤・日常使い', points: 'standard' },
      { label: '週末ドライブ', points: 'premium' },
      { label: '大切な愛車', points: 'flagship' },
    ],
  },
  {
    question: 'コーティングに求めることは？',
    choices: [
      { label: '手軽さ・コスパ', points: 'standard' },
      { label: '輝き・持続性', points: 'premium' },
      { label: '最高品質', points: 'flagship' },
    ],
  },
  {
    question: 'メンテナンスの頻度は？',
    choices: [
      { label: 'なるべく少なく', points: 'flagship' },
      { label: '年1〜2回', points: 'premium' },
      { label: '定期的にOK', points: 'standard' },
    ],
  },
  {
    question: 'ご予算は？',
    choices: [
      { label: '〜3万円', points: 'standard' },
      { label: '3〜7万円', points: 'premium' },
      { label: '7万円以上', points: 'flagship' },
    ],
  },
];

interface TierResult {
  name: string;
  nameEn: string;
  tagline: string;
  description: string;
}

const tierResults: Record<Tier, TierResult> = {
  standard: {
    name: 'クリスタルキーパー',
    nameEn: 'Crystal Keeper',
    tagline: '手軽に始めるスタンダード',
    description:
      '年1回の施工で新車の輝きをキープ。約2時間で完了し、施工を重ねるほど塗装面が改善されます。コスパ重視の方に最適です。',
  },
  premium: {
    name: 'ダイヤモンドキーパー',
    nameEn: 'Diamond Keeper',
    tagline: '3年間ノーメンテナンス',
    description:
      '通常のガラスコーティングの約50倍の膜厚で、深いガラスのような透明感を実現。年1回のメンテナンスで最長5年持続します。',
  },
  flagship: {
    name: 'EXキーパー',
    nameEn: 'EX Keeper',
    tagline: '過剰なまでの美しさ',
    description:
      'KeePer最高峰のコーティング。有機ガラス被膜が圧倒的な膜厚と透明感を実現し、洗車だけで輝きが6年続きます。',
  },
};

function computeResult(answers: Tier[]): Tier {
  const scores: Record<Tier, number> = { standard: 0, premium: 0, flagship: 0 };
  for (const a of answers) {
    scores[a]++;
  }
  if (scores.flagship >= scores.premium && scores.flagship >= scores.standard) return 'flagship';
  if (scores.premium >= scores.standard) return 'premium';
  return 'standard';
}

interface QuizBlockProps {
  storeId?: string;
  basePath?: string;
}

export default function QuizBlock({ storeId, basePath = '' }: QuizBlockProps) {
  const [step, setStep] = useState(-1); // -1 = intro, 0..3 = questions, 4 = result
  const [answers, setAnswers] = useState<Tier[]>([]);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  const handleStart = useCallback(() => {
    setDirection('forward');
    setStep(0);
  }, []);

  const handleAnswer = useCallback(
    (tier: Tier) => {
      const next = [...answers, tier];
      setAnswers(next);
      setDirection('forward');
      const nextStep = next.length >= 4 ? 4 : next.length;
      setStep(nextStep);
      if (nextStep === 4 && storeId) {
        const result = computeResult(next);
        trackEvent(storeId, 'quiz_complete', { tier: result });
      }
    },
    [answers, storeId],
  );

  const handleBack = useCallback(() => {
    if (step <= 0) {
      setStep(-1);
      setAnswers([]);
      return;
    }
    setDirection('backward');
    setAnswers((prev) => prev.slice(0, -1));
    setStep((prev) => prev - 1);
  }, [step]);

  const handleReset = useCallback(() => {
    setDirection('forward');
    setStep(-1);
    setAnswers([]);
  }, []);

  const result = step === 4 ? tierResults[computeResult(answers)] : null;
  const progress = step >= 0 && step <= 4 ? Math.min(step, 4) / 4 : 0;

  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const parallaxRafRef = useRef(0);
  const parallaxTargetRef = useRef({ x: 0, y: 0 });
  const parallaxPendingRef = useRef(false);
  const [inView, setInView] = useState(false);
  const [btnHover, setBtnHover] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const applyParallax = () => {
    parallaxPendingRef.current = false;
    const el = bgRef.current;
    if (!el) return;
    const { x, y } = parallaxTargetRef.current;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.01)`;
  };

  const scheduleParallax = () => {
    if (parallaxPendingRef.current) return;
    parallaxPendingRef.current = true;
    parallaxRafRef.current = requestAnimationFrame(applyParallax);
  };

  const onSectionMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = (e.clientX - rect.left) / rect.width;  // 0..1
    const ny = (e.clientY - rect.top) / rect.height;  // 0..1
    const MAX = 2; // px
    parallaxTargetRef.current = { x: -(nx - 0.5) * 2 * MAX, y: -(ny - 0.5) * 2 * MAX };
    scheduleParallax();
  };

  const onSectionLeave = () => {
    parallaxTargetRef.current = { x: 0, y: 0 };
    scheduleParallax();
  };

  return (
    <section
      ref={sectionRef}
      onMouseMove={onSectionMove}
      onMouseLeave={onSectionLeave}
      className="relative w-full overflow-hidden px-5 flex items-start justify-center"
      style={{ aspectRatio: '3138 / 1044' }}
    >
      <div
        ref={bgRef}
        aria-hidden
        className="absolute inset-[-3%] bg-cover bg-center bg-no-repeat will-change-transform"
        style={{
          backgroundImage: 'url(/images/quiz-bg.png)',
          transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), filter 3.2s cubic-bezier(0.22, 1, 0.36, 1) 0.6s',
          transform: 'translate3d(0,0,0) scale(1.01)',
          filter:
            inView && step === -1
              ? btnHover
                ? 'blur(4px)'
                : 'blur(2px)'
              : 'blur(0px)',
        }}
      />
      {/* Vignette + subtle dim — fades in with the intro button */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.45) 85%, rgba(0,0,0,0.65) 100%)',
          opacity: inView && step === -1 ? 1 : 0,
          transition: 'opacity 3.2s cubic-bezier(0.22, 1, 0.36, 1) 0.6s',
        }}
      />
      {/* Intro button — absolutely centered over the section */}
      {step === -1 && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(28px)',
            transition: 'opacity 3.2s cubic-bezier(0.22, 1, 0.36, 1) 0.6s, transform 3.2s cubic-bezier(0.22, 1, 0.36, 1) 0.6s',
          }}
        >
          <button
            onClick={handleStart}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            className="pointer-events-auto px-8 py-4 bg-amber-500 text-[#0C3290] font-bold rounded-xl text-base cursor-pointer shadow-lg transition-transform duration-300 ease-out hover:scale-110 hover:shadow-2xl hover:bg-amber-400 active:scale-105"
          >
            診断スタート
          </button>
        </div>
      )}
      <div className="relative w-full pt-4 md:pt-6 pb-10 text-center">
        {/* Header */}
        <div className="mb-10">
          <h2
            className="text-white font-black tracking-tight whitespace-nowrap leading-[1.05]"
            style={{
              fontFamily: '"Noto Sans JP", sans-serif',
              fontSize: 'clamp(1.75rem, 6.5vw, 5rem)',
              textShadow: '0 6px 16px rgba(0,0,0,0.95), 0 3px 6px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.85)',
            }}
          >
            あなたに<span className="text-amber-400">ぴったり</span>の<span className="text-amber-400">コース</span>は？
          </h2>
          <p
            className="text-white font-bold mt-4"
            style={{
              fontFamily: '"Noto Sans JP", sans-serif',
              fontSize: 'clamp(0.85rem, 2vw, 1.5rem)',
              textShadow: '0 4px 10px rgba(0,0,0,0.95), 0 2px 4px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.85)',
            }}
          >
            愛車に最適なカーコーティングを選ぼう
          </p>
        </div>

        <div className="max-w-[600px] mx-auto">

        {/* Progress bar */}
        {step >= 0 && step <= 4 && (
          <div className="mb-6">
            <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-1 bg-amber-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            {step < 4 && (
              <p className="text-[10px] text-slate-400 font-bold mt-1 text-right">
                {step + 1} / 4
              </p>
            )}
          </div>
        )}

        {/* Intro (non-intro path renders inline here) */}

        {/* Questions */}
        {step >= 0 && step <= 3 && (
          <div
            key={step}
            className={`bg-slate-50 rounded-xl p-6 ${
              direction === 'forward'
                ? 'animate-[slideInRight_0.35s_ease-out]'
                : 'animate-[slideInLeft_0.35s_ease-out]'
            }`}
          >
            <h3 className="text-lg font-bold text-[#0C3290] mb-5">
              {questions[step].question}
            </h3>
            <div className="space-y-2.5">
              {questions[step].choices.map((choice) => (
                <button
                  key={choice.label}
                  onClick={() => handleAnswer(choice.points)}
                  className="w-full text-left px-5 py-4 bg-white border border-slate-200 rounded-lg text-[14px] font-semibold text-[#0C3290] hover:border-amber-500 hover:bg-amber-50 transition-colors cursor-pointer"
                >
                  {choice.label}
                </button>
              ))}
            </div>

            {/* Back button */}
            <button
              onClick={handleBack}
              className="mt-4 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ← 戻る
            </button>
          </div>
        )}

        {/* Result */}
        {step === 4 && result && (
          <div className="bg-[#0C3290] rounded-xl p-8 text-center text-white animate-[fadeIn_0.5s_ease-out]">
            <p className="text-[#0C3290] text-xs font-bold tracking-widest mb-3">
              YOUR RECOMMENDATION
            </p>
            <h3
              className="text-2xl font-bold mb-1"
              style={{ fontFamily: '"Noto Sans JP", sans-serif' }}
            >
              {result.name}
            </h3>
            <p className="text-white/50 text-sm mb-1">{result.nameEn}</p>
            <p className="text-white/60 text-xs mb-4">{result.tagline}</p>
            <p className="text-white/70 text-[13px] leading-relaxed mb-6 max-w-[420px] mx-auto">
              {result.description}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                href={`${basePath}/booking`}
                onClick={() => storeId && trackEvent(storeId, 'cta_booking', { source: 'quiz' })}
                className="px-6 py-3 bg-amber-500 text-[#0C3290] font-bold rounded-lg text-sm hover:bg-amber-500 transition-colors"
              >
                このコースで予約する
              </Link>
              <Link
                href={`${basePath}/booking?mode=inquiry`}
                onClick={() => storeId && trackEvent(storeId, 'cta_inquiry', { source: 'quiz' })}
                className="px-6 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-lg text-sm hover:bg-white/20 transition-colors"
              >
                まずは相談する
              </Link>
            </div>
            <button
              onClick={handleReset}
              className="text-white/30 text-xs mt-5 hover:text-white/60 cursor-pointer"
            >
              もう一度診断する
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Inline keyframes for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </section>
  );
}
