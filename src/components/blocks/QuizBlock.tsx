'use client';

import { useState, useCallback } from 'react';
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

  return (
    <section className="py-16 px-5 bg-white">
      <div className="max-w-[600px] mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-amber-500 text-xs font-bold tracking-widest mb-2">
            COATING QUIZ
          </p>
          <h2
            className="text-[#0f1c2e] text-xl md:text-2xl font-bold"
            style={{ fontFamily: '"Noto Serif JP", serif' }}
          >
            あなたにぴったりのコースは？
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            4つの質問に答えるだけ（30秒）
          </p>
        </div>

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

        {/* Intro */}
        {step === -1 && (
          <div className="text-center animate-[fadeIn_0.4s_ease-out]">
            <button
              onClick={handleStart}
              className="px-8 py-4 bg-gradient-to-br from-amber-600 to-amber-500 text-white font-bold rounded-xl text-base hover:opacity-90 transition-opacity cursor-pointer"
            >
              診断スタート
            </button>
          </div>
        )}

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
            <h3 className="text-lg font-bold text-[#0f1c2e] mb-5">
              {questions[step].question}
            </h3>
            <div className="space-y-2.5">
              {questions[step].choices.map((choice) => (
                <button
                  key={choice.label}
                  onClick={() => handleAnswer(choice.points)}
                  className="w-full text-left px-5 py-4 bg-white border border-slate-200 rounded-lg text-[14px] font-semibold text-[#0f1c2e] hover:border-amber-500 hover:bg-amber-50 transition-colors cursor-pointer"
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
          <div className="bg-[#0f1c2e] rounded-xl p-8 text-center text-white animate-[fadeIn_0.5s_ease-out]">
            <p className="text-amber-400 text-xs font-bold tracking-widest mb-3">
              YOUR RECOMMENDATION
            </p>
            <h3
              className="text-2xl font-bold mb-1"
              style={{ fontFamily: '"Noto Serif JP", serif' }}
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
                className="px-6 py-3 bg-amber-500 text-white font-bold rounded-lg text-sm hover:bg-amber-600 transition-colors"
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
