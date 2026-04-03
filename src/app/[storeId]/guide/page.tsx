import { getStoreById, getAllStoreIds } from '@/lib/store-data';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export async function generateStaticParams() {
  return getAllStoreIds().map(id => ({ storeId: id }));
}

export async function generateMetadata({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const store = getStoreById(storeId);
  if (!store) return {};
  return {
    title: `カーコーティングガイド｜${store.store_name}｜KeePer PRO SHOP`,
    description: 'カーコーティングの基礎知識、ワックスとの違い、ガラスvsセラミック、施工後のお手入れ方法を解説。',
  };
}

const articles = [
  {
    id: 'what-is-coating',
    title: 'カーコーティングとは？どんな車に必要？',
    summary: 'コーティングの仕組み、効果、向いている車を解説します。',
    content: [
      {
        heading: 'コーティングの基本',
        text: 'カーコーティングとは、車のボディ表面にガラスやレジンの透明被膜を形成し、塗装を外部の攻撃から守る施工です。紫外線、酸性雨、鳥のフン、花粉、黄砂、鉄粉など、日常的に車の塗装を劣化させる要因は多く、コーティングはこれらの攻撃に対する「盾」の役割を果たします。',
      },
      {
        heading: 'ワックスとの違い',
        text: 'ワックスは油脂系の薄い膜を塗装面に乗せるだけなので、雨や洗車で数週間〜1ヶ月���流れ落ちます。一方、ガラスコーティングは塗装面と化学結合するため、1年〜6年の長期間にわたり保護力を維持。施工後は洗車だけで輝きが続き、ワックスがけが不要になります。',
      },
      {
        heading: 'こんな方におすすめ',
        text: '「新車の輝きを長く保ちたい」「洗車の回数を減らしたい」「青空駐車で汚れが気になる」「下取り査定額を上げたい」という方に特におすすめです。新車はもちろん、経年車でも研磨＋コーティングで新車以上の仕上がりが可能です。',
      },
    ],
  },
  {
    id: 'wax-vs-coating',
    title: 'ワックス vs コーティング — 本当の違い',
    summary: '持続期間、施工の手間、コスト、仕上がりを徹底比較。',
    content: [
      {
        heading: '持続期間の違い',
        text: 'ワックスの持続期間は約2週間〜1ヶ月。カーシャンプーや雨で簡単に流れ落ちるため、月1〜2回の再施工が必要です。ガラスコーティングは1回の施工で1年（クリスタルキーパー）〜6年（EXキーパー）持続。年間のメンテナンスコストを考えると、実はコーティングの方がお得になるケースがほとんどです。',
      },
      {
        heading: '仕上がりの違い',
        text: 'ワックスは油脂系の「ぬめり感」のある艶。ガラスコーティングは透明度の高い「ガラスのような透明感」が特徴です。特にダイヤモンドキーパー以上のコースでは、通常のガラスコーティングの約50倍の膜厚により、深い奥行きのある輝きが生まれます。',
      },
      {
        heading: '手間とコスト比較',
        text: 'ワックス：月2回 × 30分 × 12ヶ月 = 年間12時間の作業時間。材料費を含めると年間1〜2万円。クリスタルキーパー：年1回・約2時間の施工で¥18,200〜。プロの仕上がりで、自分の時間を有効活用できます。3年以上のコースなら、さらにコストパフォーマンスが向上します。',
      },
    ],
  },
  {
    id: 'glass-vs-ceramic',
    title: 'ガラスコーティング vs セラミックコーティング',
    summary: '素材の違い、メリット・���メリット、選び方を解説。',
    content: [
      {
        heading: 'ガラスコーティングとは',
        text: 'ケイ素（シリカ）を主成分とした被膜。塗装面と化学結合し、透明度の高い硬い被膜を形成します。KeePer のコーティングはすべてこのガラス系をベースにしています。特徴は透明感のある美しい艶、比較的リーズナブルな価格、そして信頼性の高い実績です。',
      },
      {
        heading: 'セラミックコーティングとは',
        text: '酸化チタンなどのセラミック素材を使用した被膜。硬度が非常に高く（9H以上を謳う製品も）、耐薬品性に優れます。ただし、施工に高い技術が必要で価格も高額（10万円〜50万円以上）。施工ミスがあると修正が難しいというリスクもあります。',
      },
      {
        heading: 'どちらを選ぶべき？',
        text: '日常使いの車には、コストパフォーマンスと信頼性に優れたガラスコーティングがおすすめです。KeePer のEXキーパーは有機ガラス被膜VP326を採用し、ガラスの保護力とセラミックに匹敵する撥水・防汚性能を両立。特許技術によりミネラルの固着も防止します。「ガ���スの良さを活かしながら弱点を補う」のがKeePer の技術思想です。',
      },
    ],
  },
  {
    id: 'after-care',
    title: 'コーティング施工後のお手入れ方法',
    summary: '正しい洗車方法、やってはいけないこと、メンテナンスのタイミング。',
    content: [
      {
        heading: '施工後の洗車',
        text: 'コーティング施工後は、水洗いまたはカーシャンプーでの手洗い洗車が基本です。コーティング被膜が汚れの固着を防いでいるので、軽い水洗いだけで十分キレイになります。洗車機は使用可能ですが、ブラシタイプよりもノンブラシ（ノータッチ）タイプを推奨します。',
      },
      {
        heading: 'やってはいけないこと',
        text: 'ワックスやコンパウンド（研磨剤）入りのカーシャンプーは使用しないでください。コーティング被膜を削ってしまいます。また、鳥のフンや虫の死骸は酸性が強いため、見つけたらなるべく早く水で洗い流してください。放置すると被膜にダメージを与える場合があります。',
      },
      {
        heading: 'メンテナンスのタイミング',
        text: 'クリスタルキーパー・フレッシュキーパー：年1回の再施工で輝きを維持。ダイヤモンドキーパー：年1回のメンテナンスで5年間持続（メンテなしでも3年OK）。ダイヤⅡキーパー：2年ごとのメンテで最長6年（メンテなし3年）。EXキーパー：1〜2年ごとのメンテで最長6年。当店では施工後1ヶ月・6ヶ月の無料点検で状態を確認します。',
      },
    ],
  },
  {
    id: 'new-car-vs-used',
    title: '新車と経年車、どちらにもコーティングは必要？',
    summary: '新車に施工するメリット、経年車でも間に合う理由を解説。',
    content: [
      {
        heading: '新車こそコーティング',
        text: '「新車だからキレイ」は事実ですが、塗装が無防備な状態であることも事実。紫外線や酸性雨は納車日から塗装を攻撃し始めます。新車のうちにコーティングすれば、塗装が劣化する前に保護できるため、最も効率的。研磨が不要なのでコストも抑えられます。納車3ヶ月以内のダイヤモンド・ダイヤⅡなら人気オ���ション1つ無料の特典も。',
      },
      {
        heading: '経年車でも大丈夫',
        text: '「もう3年乗ったから手遅れ」ということはありません。プレミアムコース（研磨付き）なら、経年によるくすみ、小傷、水垢を研磨で除去してからコーティング。新車時以上の仕上がりになるケースも珍しくありません。実際、当店の施工事例の多くは経年車です。',
      },
      {
        heading: '下取り・売却への影響',
        text: 'コーティングで塗装の状態を保つと、数年後の下取り査定額に好影響。特に濃色車（ブラック、ダークブルー等）は塗装劣化が査定に直結するため、コーティングの費用対効果が最も高いカテゴリです。',
      },
    ],
  },
];

export default async function GuidePage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const store = getStoreById(storeId);
  if (!store) notFound();

  return (
    <main>
      {/* HERO */}
      <section className="bg-[#0f1c2e] py-14 px-5 text-center">
        <div className="max-w-[700px] mx-auto">
          <h1 className="text-white text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            カーコーティングガイド
          </h1>
          <p className="text-white/40 text-sm leading-relaxed">
            初めてのコーティングで迷わないための基礎知識。ワックスとの違い、ガラスとセラミックの比較、施工後のお手入れまで。
          </p>
        </div>
      </section>

      {/* TABLE OF CONTENTS */}
      <section className="py-8 px-5 bg-slate-50 border-b border-slate-200">
        <div className="max-w-[700px] mx-auto">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">目次</p>
          <div className="space-y-1.5">
            {articles.map((a, i) => (
              <a key={a.id} href={`#${a.id}`} className="flex gap-3 text-sm text-slate-600 hover:text-amber-700 transition-colors">
                <span className="text-amber-500 font-bold">{i + 1}.</span>
                <span>{a.title}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ARTICLES */}
      {articles.map((article, i) => (
        <section key={article.id} id={article.id} className={`py-12 px-5 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`}>
          <div className="max-w-[700px] mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-sm flex-shrink-0">{i + 1}</span>
              <h2 className="text-lg md:text-xl font-bold text-[#0f1c2e]" style={{ fontFamily: '"Noto Serif JP", serif' }}>
                {article.title}
              </h2>
            </div>
            <p className="text-sm text-slate-500 mb-6 pl-11">{article.summary}</p>

            <div className="space-y-6 pl-11">
              {article.content.map((section, j) => (
                <div key={j}>
                  <h3 className="font-bold text-sm text-[#0f1c2e] mb-2">{section.heading}</h3>
                  <p className="text-[13px] text-slate-600 leading-relaxed">{section.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="py-12 px-5 bg-[#0f1c2e]">
        <div className="max-w-[500px] mx-auto text-center text-white">
          <h2 className="text-lg font-bold mb-2" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            コーティングを検討中の方へ
          </h2>
          <p className="text-sm text-white/40 mb-6">お車の状態を見て最適なコースをご提案します。</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href={`/${storeId}/coatings`} className="px-5 py-2.5 bg-white/10 border border-white/15 text-white font-semibold rounded-md text-sm hover:bg-white/20 transition-colors">
              メニュー一覧
            </Link>
            <Link href={`/${storeId}/price`} className="px-5 py-2.5 bg-amber-500 text-white font-bold rounded-md text-sm hover:bg-amber-600 transition-colors">
              見積もりシミュレーター →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
