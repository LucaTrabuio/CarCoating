'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { trackEvent } from '@/lib/track';

type Step = 0 | 1 | 2 | 3 | 4;

const questions = [
  {
    question: 'お車の状態は？',
    options: [
      { label: '新車・納車3ヶ月以内', value: 'new' },
      { label: '1〜3年', value: '1-3' },
      { label: '3年以上', value: '3plus' },
    ],
  },
  {
    question: '駐車環境は？',
    options: [
      { label: '屋根付きガレージ', value: 'covered' },
      { label: '青空駐車（屋外）', value: 'outdoor' },
    ],
  },
  {
    question: '重視するポイントは？',
    options: [
      { label: 'コスパ重視', value: 'cost' },
      { label: '長期間の持続力', value: 'durability' },
      { label: '最高の仕上がり', value: 'best' },
    ],
  },
  {
    question: '洗車の頻度は？',
    options: [
      { label: '週1回以上', value: 'weekly' },
      { label: '月1〜2回', value: 'monthly' },
      { label: 'ほぼしない', value: 'rarely' },
    ],
  },
];

interface Result {
  tierName: string;
  tierId: string;
  tagline: string;
  reason: string;
}

function getRecommendation(answers: string[]): Result {
  const [carAge, parking, priority, washing] = answers;

  if (priority === 'best') {
    return carAge === '3plus'
      ? { tierName: 'EXキーパープレミアム', tierId: 'ex-premium', tagline: '最高峰の輝きと保護力', reason: '経年車を新車以上に仕上げる研磨付き最上位コース。UV保護・ミネラル固着防止も。' }
      : { tierName: 'EXキーパー', tierId: 'ex', tagline: '過剰なまでの美しさ', reason: '有機ガラス被膜VP326による圧倒的な膜厚。洗車だけで輝きが6年続きます。' };
  }

  if (priority === 'durability') {
    if (parking === 'outdoor' || washing === 'rarely') {
      return carAge === '3plus'
        ? { tierName: 'ダイヤⅡキーパープレミアム', tierId: 'dia2-premium', tagline: '自浄効果 × 研磨の最強タッグ', reason: '雨で汚れが流れる自浄効果。研磨で経年車のくすみも除去。最長6年持続。' }
        : { tierName: 'ダイヤⅡキーパー', tierId: 'dia2', tagline: '2倍の艶と自浄効果', reason: '青空駐車でも汚れにくい自浄構造。メンテなし3年 or 2年メンテで6年。' };
    }
    return carAge === '3plus'
      ? { tierName: 'ダイヤモンドキーパープレミアム', tierId: 'diamond-premium', tagline: 'ダイヤモンドに研磨をプラス', reason: '研磨で下地を整えてからのW被膜。年1回メンテで5年持続。' }
      : { tierName: 'ダイヤモンドキーパー', tierId: 'diamond', tagline: '3年間ノーメンテナンス', reason: '通常の50倍の膜厚。初めての本格コーティングに最適。' };
  }

  if (parking === 'outdoor' && washing === 'rarely') {
    return { tierName: 'フレッシュキーパー', tierId: 'fresh', tagline: '別次元のキレイさ', reason: '圧倒的な防汚力で青空駐車でも汚れにくい。メンテ不要、年1回再施工。' };
  }
  return { tierName: 'クリスタルキーパー', tierId: 'crystal', tagline: '手軽に始めるスタンダード', reason: '年1回の施工で新車の輝き。施工を重ねるほど塗装面が改善。約2時間で完了。' };
}

const STORAGE_KEY = 'quiz_popup_dismissed';

export default function QuizPopup({ storeId, basePath }: { storeId: string; basePath: string }) {
  const [showButton, setShowButton] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);

  // Show button after scrolling past 400px, unless dismissed this session
  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch { /* SSR or blocked */ }

    const onScroll = () => {
      if (window.scrollY > 400) setShowButton(true);
    };
    // Also show after 5 seconds
    const timer = setTimeout(() => setShowButton(true), 5000);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
    };
  }, []);

  const openPopup = useCallback(() => {
    setIsOpen(true);
    setStep(1);
    setAnswers([]);
    setResult(null);
    trackEvent(storeId, 'quiz_complete'); // track open — quiz_complete tracks both
  }, [storeId]);

  function dismiss() {
    setIsOpen(false);
    setShowButton(false);
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch { /* blocked */ }
  }

  function handleAnswer(value: string) {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);
    if (newAnswers.length >= 4) {
      setResult(getRecommendation(newAnswers));
      setStep(4);
      trackEvent(storeId, 'quiz_complete');
    } else {
      setStep(newAnswers.length as Step);
    }
  }

  function goBack() {
    if (step <= 1) return;
    setAnswers(answers.slice(0, -1));
    setStep((step - 1) as Step);
  }

  function reset() {
    setStep(1);
    setAnswers([]);
    setResult(null);
  }

  // Floating button
  if (!isOpen && showButton) {
    return (
      <button
        onClick={openPopup}
        className="fixed bottom-24 right-4 z-40 bg-amber-500 text-white px-4 py-3 rounded-full shadow-lg hover:bg-amber-600 transition-all text-sm font-bold flex items-center gap-2 cursor-pointer animate-bounce-slow"
        style={{ animationDuration: '3s' }}
      >
        <span className="text-lg">✨</span>
        コーティング診断
      </button>
    );
  }

  // Modal overlay
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[500px] max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-lg cursor-pointer"
        >
          ×
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <p className="text-amber-500 text-[10px] font-bold tracking-widest mb-1">COATING QUIZ</p>
            <h2 className="text-[#0f1c2e] text-lg font-bold" style={{ fontFamily: '"Noto Serif JP", serif' }}>
              あなたにぴったりのコースは？
            </h2>
            <p className="text-xs text-slate-400 mt-1">4つの質問に答えるだけ（30秒）</p>
          </div>

          {/* Progress bar */}
          {step >= 1 && step <= 3 && (
            <div className="flex items-center gap-2 mb-4">
              {step > 1 && (
                <button onClick={goBack} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">← 戻る</button>
              )}
              <span className="text-[10px] text-slate-400 font-bold">Q{step}/4</span>
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
                <div className="h-1.5 bg-amber-500 rounded-full transition-all" style={{ width: `${(step / 4) * 100}%` }} />
              </div>
            </div>
          )}

          {/* Questions */}
          {step >= 1 && step <= 3 && (
            <div>
              <h3 className="text-base font-bold text-[#0f1c2e] mb-3">{questions[step - 1].question}</h3>
              <div className="space-y-2">
                {questions[step - 1].options.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(opt.value)}
                    className="w-full text-left px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-[#0f1c2e] hover:border-amber-400 hover:bg-amber-50 transition-colors cursor-pointer"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Result */}
          {step === 4 && result && (
            <div className="bg-[#0f1c2e] rounded-xl p-6 text-center text-white -mx-2">
              <p className="text-amber-400 text-[10px] font-bold tracking-widest mb-2">YOUR RECOMMENDATION</p>
              <h3 className="text-xl font-bold mb-1" style={{ fontFamily: '"Noto Serif JP", serif' }}>
                {result.tierName}
              </h3>
              <p className="text-white/50 text-xs mb-3">{result.tagline}</p>
              <p className="text-white/70 text-xs leading-relaxed mb-5 max-w-[350px] mx-auto">{result.reason}</p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Link
                  href={`${basePath}/coatings#${result.tierId}`}
                  onClick={dismiss}
                  className="px-5 py-2.5 bg-amber-500 text-white font-bold rounded-lg text-xs hover:bg-amber-600 transition-colors"
                >
                  詳細を見る →
                </Link>
                <Link
                  href={`${basePath}/booking`}
                  onClick={dismiss}
                  className="px-5 py-2.5 bg-white/10 border border-white/20 text-white font-semibold rounded-lg text-xs hover:bg-white/20 transition-colors"
                >
                  予約する
                </Link>
              </div>
              <button onClick={reset} className="text-white/30 text-[10px] mt-3 hover:text-white/60 cursor-pointer">
                もう一度診断する
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
