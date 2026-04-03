'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

const FAQ_GROUPS = [
  {
    title: 'コース選びについて',
    items: [
      { q: 'コーティングの種類の違いは？', a: 'クリスタル（1年）、ダイヤモンド（3-5年）、EX（3-6年）の3段階が基本。持続期間と被膜の厚さが異なります。' },
      { q: '新車にもコーティングは必要？', a: '納車後すぐのタイミングがお勧めです。キーパーコーティングは有機溶剤を使わないため、塗りたての塗装でも問題ありません。' },
      { q: '中古車・経年車でもコーティングできる？', a: 'もちろん可能です。経年車は施工前に研磨で下地を整えることで、新車に近い輝きを取り戻せます。プレミアムコースには研磨が含まれています。' },
    ],
  },
  {
    title: 'ご来店について',
    items: [
      { q: '予約は必要ですか？', a: '事前予約をお勧めします。当日でも空きがあれば対応可能ですが、確実にご案内するため予約が安心です。' },
      { q: '施工時間はどのくらい？', a: 'クリスタル：約2時間、ダイヤモンド：6〜10時間（朝預け夕方お渡し）、EX：1日〜。お車の状態により前後します。' },
      { q: '施工中は待っていないとダメ？', a: '待合室もご利用いただけますが、多くのお客様は朝お預けいただきお仕事やお買い物へ。完了次第お電話いたします。' },
      { q: '支払い方法は？', a: '現金、クレジットカード、電子マネーに対応しています。' },
    ],
  },
  {
    title: 'コーティングについて',
    items: [
      { q: 'コーティング後、雨に濡れても大丈夫？', a: '問題ありません。必要な乾燥時間は施工時間に含まれています。' },
      { q: 'コーティングで塗装は傷みませんか？', a: '傷みません。KeePer製品は有機溶剤を一切含んでおらず、塗装に優しい設計です。' },
      { q: '輸入車にも対応していますか？', a: '全メーカー対応しています。ダイヤモンドキーパーはドイツSONAX製で、ベンツ・BMWに純正指定されています。' },
      { q: 'メンテナンスは必要？費用は？', a: 'ダイヤモンドは年1回、ダイヤⅡ・EXは2年に1回のメンテナンスで効果を維持します。' },
    ],
  },
  {
    title: '料金・価値について',
    items: [
      { q: 'ディーラーのコーティングとの違いは？', a: 'PRO SHOPはKeePer技研の認定を受けた専門店です。技術者は国家資格レベルの認定を取得しています。' },
      { q: '仕上がりに満足でき��かった場合は？', a: '施工完了時に仕上がりをご確認いただきます。ご満足いただけない場合は再施工で対応いたします。' },
    ],
  },
];

const SAMPLE_REVIEWS = [
  { stars: 5, car: 'トヨタ ハリアー（ブラック）', tier: 'ダイヤモンドキーパー', text: '購入3年目で小傷が目立ち始めて依頼。施工後は新車の時以上の深い艶が出て驚きました。半年経った今も水洗いだけで維持できていま��。', author: '世田谷区 M.K.様', date: '2025年11月', staffReply: 'ありがとうございます。次回メンテナンスもお待ちしています。' },
  { stars: 5, car: 'テスラ Model 3', tier: 'EXキーパー', text: 'EXキーパーを施工して半年。水洗いだけで新車のような輝きが維持できています。スタッフの説明も丁寧で安心できました。', author: '港区 A.N.様', date: '2025年9月', staffReply: null },
  { stars: 4, car: 'ホンダ N-BOX', tier: 'クリスタルキーパー', text: '初めてのコーティング。手軽な価格で始められて良かったです。仕上がりもきれいで満足。駐車場がもう少し広いと嬉しい。', author: '新宿区 Y.T.様', date: '2025年8月', staffReply: '駐車場のご不便おかけし申し訳ございません。スタッフがお車の誘導をいたしますので、お気軽にお声がけください。' },
];

export default function ReviewsPage() {
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  return (
    <main>
      {/* HEADER */}
      <section className="bg-[#0f1c2e] pt-4 pb-6 px-5 text-center">
        <h1 className="text-white text-xl font-bold" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>お客様の声・Q&A</h1>
        <div className="flex gap-4 justify-center mt-3 text-sm text-white/80">
          <span>★★★★★ <strong className="text-amber-300">4.8</strong></span>
          <span>Google口コミ 47件</span>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="py-10 px-5">
        <div className="max-w-[700px] mx-auto">
          <h2 className="text-lg font-bold text-[#0f1c2e] text-center mb-6" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>お客様の声</h2>
          <div className="space-y-4">
            {SAMPLE_REVIEWS.map((r, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-yellow-400 text-sm mb-1">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</div>
                <div className="flex gap-2 mb-2 flex-wrap">
                  <span className="text-[11px] font-bold bg-[#0f1c2e] text-white px-2 py-0.5 rounded-full">{r.car}</span>
                  <span className="text-[11px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{r.tier}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-2">{r.text}</p>
                <div className="text-xs text-gray-400">— {r.author}（{r.date}施工）</div>
                {r.staffReply && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                    <strong>スタッフより：</strong> {r.staffReply}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 px-5 bg-gray-50">
        <div className="max-w-[700px] mx-auto">
          <h2 className="text-lg font-bold text-[#0f1c2e] text-center mb-6" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>よくあるご質問</h2>
          {FAQ_GROUPS.map(group => (
            <div key={group.title} className="mb-6">
              <h3 className="text-sm font-bold text-[#0f1c2e] mb-3">{group.title}</h3>
              <div className="border-t border-gray-200">
                {group.items.map(item => {
                  const isOpen = openFaq === item.q;
                  return (
                    <div key={item.q} className="border-b border-gray-200">
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : item.q)}
                        className="w-full flex justify-between items-center py-3.5 text-left text-sm font-semibold hover:text-amber-600 transition-colors"
                      >
                        {item.q}
                        <span className="text-amber-600 text-lg ml-2">{isOpen ? '−' : '+'}</span>
                      </button>
                      {isOpen && (
                        <p className="pb-3.5 text-sm text-gray-500 leading-relaxed">{item.a}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 px-5">
        <div className="max-w-[600px] mx-auto bg-[#0f1c2e] rounded-xl p-8 text-center text-white">
          <h3 className="font-bold text-lg mb-1">ここに載っていない質問がありましたら</h3>
          <p className="text-sm opacity-60 mb-4">写真を送って相談もできます</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href="#" className="px-5 py-2.5 bg-[#06c755] text-white font-bold rounded-lg text-sm">LINEで質問する</a>
            <a href="#" className="px-5 py-2.5 bg-white/10 border border-white/20 text-white font-bold rounded-lg text-sm">&#9742; 電話で質問する</a>
          </div>
        </div>
      </section>
    </main>
  );
}
