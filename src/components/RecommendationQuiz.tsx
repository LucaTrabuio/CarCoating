'use client';

import { useState } from 'react';
import Link from 'next/link';

type Step = 0 | 1 | 2 | 3 | 4; // 0=start, 1-4=questions, 4=result

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

  // Logic: map answer combinations to tier recommendations
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

  // cost priority
  if (parking === 'outdoor' && washing === 'rarely') {
    return { tierName: 'フレッシュキーパー', tierId: 'fresh', tagline: '別次元のキレイさ', reason: '圧倒的な防汚力で青空駐車でも汚れにくい。メンテ不要、年1回再施工。' };
  }
  return { tierName: 'クリスタルキーパー', tierId: 'crystal', tagline: '手軽に始めるスタンダード', reason: '年1回の施工で新車の輝き。施工を重ねるほど塗装面が改善。約2時間で完了。' };
}

export default function RecommendationQuiz() {
  const [step, setStep] = useState<Step>(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);

  function handleAnswer(value: string) {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);

    if (newAnswers.length >= 4) {
      setResult(getRecommendation(newAnswers));
      setStep(4);
    } else {
      setStep((newAnswers.length) as Step);
    }
  }

  function reset() {
    setStep(0);
    setAnswers([]);
    setResult(null);
  }

  return (
    <section className="py-16 px-5 bg-white">
      <div className="max-w-[600px] mx-auto">
        <div className="text-center mb-8">
          <p className="text-[#0C3290] text-xs font-bold tracking-widest mb-2">RECOMMENDATION</p>
          <h2 className="text-black text-xl md:text-2xl font-bold" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
            あなたにぴったりのコースは？
          </h2>
          <p className="text-sm text-slate-400 mt-1">4つの質問に答えるだけ（30秒）</p>
        </div>

        {step === 0 && (
          <div className="text-center">
            <button
              onClick={() => setStep(1)}
              className="px-8 py-4 bg-amber-500 text-black font-bold rounded-xl text-base hover:opacity-90 transition-opacity cursor-pointer"
            >
              診断スタート →
            </button>
          </div>
        )}

        {step >= 1 && step <= 3 && (
          <div className="bg-slate-50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] text-slate-400 font-bold">Q{step}/4</span>
              <div className="flex-1 h-1 bg-slate-200 rounded-full">
                <div className="h-1 bg-amber-500 rounded-full transition-all" style={{ width: `${(step / 4) * 100}%` }} />
              </div>
            </div>
            <h3 className="text-lg font-bold text-[#0C3290] mb-4">{questions[step - 1].question}</h3>
            <div className="space-y-2">
              {questions[step - 1].options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(opt.value)}
                  className="w-full text-left px-5 py-3.5 bg-white border border-slate-200 rounded-lg text-[14px] font-semibold text-[#0C3290] hover:border-amber-500 hover:bg-amber-50 transition-colors cursor-pointer"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && result && (
          <div className="bg-[#0C3290] rounded-xl p-8 text-center text-white">
            <p className="text-[#0C3290] text-xs font-bold tracking-widest mb-3">YOUR RECOMMENDATION</p>
            <h3 className="text-2xl font-bold mb-1" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
              {result.tierName}
            </h3>
            <p className="text-white/50 text-sm mb-4">{result.tagline}</p>
            <p className="text-white/70 text-[13px] leading-relaxed mb-6 max-w-[400px] mx-auto">{result.reason}</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                href={`/booking?mode=inquiry&recommended=${result.tierId}`}
                className="px-6 py-3 bg-amber-500 text-black font-bold rounded-lg text-sm hover:bg-amber-500 transition-colors"
              >
                このコースについて相談する →
              </Link>
              <Link
                href="/booking"
                className="px-6 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-lg text-sm hover:bg-white/20 transition-colors"
              >
                予約する
              </Link>
            </div>
            <button onClick={reset} className="text-white/30 text-xs mt-4 hover:text-white/60 cursor-pointer">
              もう一度診断する
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
