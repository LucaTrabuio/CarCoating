import Link from 'next/link';
import { news } from '@/data/news';

const categoryLabels: Record<string, string> = {
  campaign: 'キャンペーン',
  case_study: '施工事例',
  store_update: 'お知らせ',
};

const categoryColors: Record<string, string> = {
  campaign: 'bg-amber-100 text-amber-700',
  case_study: 'bg-blue-100 text-blue-700',
  store_update: 'bg-green-100 text-green-700',
};

export default async function V3NewsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const base = `/v3/${storeId}`;
  const sortedNews = [...news].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <main>
      <section className="bg-[#0f1c2e] py-12 px-5 text-center">
        <h1 className="text-white text-2xl font-bold" style={{ fontFamily: '"Noto Serif JP", serif' }}>ニュース・お知らせ</h1>
      </section>

      <section className="py-10 px-5">
        <div className="max-w-[800px] mx-auto space-y-3">
          {sortedNews.map((item, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 hover:border-amber-300 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${categoryColors[item.category] || 'bg-gray-100 text-gray-600'}`}>
                  {categoryLabels[item.category] || item.category}
                </span>
                <span className="text-[10px] text-gray-400">{item.date}</span>
              </div>
              <h2 className="text-sm font-bold text-[#0f1c2e]">{item.title}</h2>
              {item.body && <p className="text-xs text-gray-500 mt-1">{item.body}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="py-10 px-5 bg-[#0f1c2e]">
        <div className="max-w-[500px] mx-auto text-center text-white">
          <h2 className="text-lg font-bold mb-4" style={{ fontFamily: '"Noto Serif JP", serif' }}>コーティングをご検討中の方へ</h2>
          <div className="flex gap-3 justify-center">
            <Link href={`${base}/coatings`} className="px-5 py-2.5 bg-white/10 border border-white/15 text-white font-semibold rounded-md text-sm hover:bg-white/20">メニュー一覧</Link>
            <Link href={`${base}/booking`} className="px-5 py-2.5 bg-amber-500 text-white font-bold rounded-md text-sm hover:bg-amber-600">ご予約 →</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
