'use client';

import { useState } from 'react';

const concerns = [
  {
    worry: 'コーティングって高くない？',
    answer: 'ワックスを月2回 × 12ヶ月行うと年間12時間以上の作業時間。材料費込みで年1〜2万円。クリスタルキーパーなら年1回の施工で手間ゼロ。長期コースなら年あたりのコストはさらに下がります。Web限定割引も適用されます。',
  },
  {
    worry: '施工に時間がかかる？',
    answer: 'クリスタルキーパーなら約2時間。朝お預けいただき、お仕事やお買い物の間に完了。夕方にはピカピカの状態でお引渡しします。完全予約制なので待ち時間もありません。',
  },
  {
    worry: '本当に効果あるの？',
    answer: 'KeePer技研の特許技術に基づく施工です。第三者機関のテストでも光沢度・撥水性能が実証済み。施工事例の写真でビフォーアフターをご確認いただけます。',
  },
  {
    worry: '新車じゃないとダメ？',
    answer: 'まったくそんなことはありません。プレミアムコース（研磨付き）なら、経年車のくすみ・小傷を除去してからコーティング。新車時以上の仕上がりになるケースも多いです。',
  },
  {
    worry: 'メンテナンスが面倒では？',
    answer: 'コーティング後は水洗いだけで十分キレイが続きます。メンテナンス付きコースでも年1〜2回の来店でOK。施工後1ヶ月・6ヶ月の無料点検もあるので安心です。',
  },
  {
    worry: 'どのコースを選べばいいかわからない',
    answer: 'お気軽にご相談ください。お車の年式・状態・駐車環境・ご予算を伺った上で、最適なコースをご提案します。まずはページ内の「おすすめ診断」をお試しください。',
  },
];

export default function ConcernSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-16 px-5 bg-slate-50">
      <div className="max-w-[700px] mx-auto">
        <div className="text-center mb-10">
          <p className="text-slate-400 text-xs font-bold tracking-widest mb-2">FAQ</p>
          <h2 className="text-[#0f1c2e] text-xl md:text-2xl font-bold" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            よくあるご不安にお答えします
          </h2>
        </div>
        <div className="space-y-2">
          {concerns.map((c, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-5 py-4 flex items-center justify-between text-left cursor-pointer"
              >
                <span className="text-[14px] font-semibold text-[#0f1c2e]">{c.worry}</span>
                <span className="text-slate-400 text-lg flex-shrink-0 ml-3">{openIndex === i ? '−' : '+'}</span>
              </button>
              {openIndex === i && (
                <div className="px-5 pb-4">
                  <p className="text-[13px] text-slate-600 leading-relaxed">{c.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
