import { notFound } from 'next/navigation';
import Link from 'next/link';
import { resolveSlugToStore } from '@/lib/firebase-stores';

export default async function V3PrivacyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await resolveSlugToStore(slug);
  if (!resolved) notFound();
  // For sub-companies, display the group name in the privacy text instead of primary store name
  const store = resolved.subCompanyName
    ? { ...resolved.store, store_name: resolved.subCompanyName }
    : resolved.store;

  const base = `/${slug}`;

  return (
    <main className="py-14 px-5">
      <div className="max-w-[700px] mx-auto">
        <h1 className="text-2xl font-bold text-[#0f1c2e] mb-8" style={{ fontFamily: '"Noto Serif JP", serif' }}>プライバシーポリシー</h1>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="font-bold text-[#0f1c2e] mb-2">1. 個人情報の取り扱いについて</h2>
            <p>{store.store_name}（以下「当店」）は、お客様の個人情報を適切に取り扱い、保護することが重要であると考えています。</p>
          </section>
          <section>
            <h2 className="font-bold text-[#0f1c2e] mb-2">2. 利用目的</h2>
            <p>取得した個人情報は、以下の目的で利用します。</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>予約の受付・確認・施工に関するご連絡</li>
              <li>キャンペーンやサービスに関するご案内</li>
              <li>お問い合わせへの対応</li>
              <li>サービス品質の向上</li>
            </ul>
          </section>
          <section>
            <h2 className="font-bold text-[#0f1c2e] mb-2">3. 第三者への提供</h2>
            <p>法令に基づく場合を除き、お客様の同意なく個人情報を第三者に提供することはありません。</p>
          </section>
          <section>
            <h2 className="font-bold text-[#0f1c2e] mb-2">4. Cookieの使用</h2>
            <p>当サイトでは、利便性向上のためCookieを使用しています。ブラウザの設定によりCookieを無効にすることが可能です。</p>
          </section>
          <section>
            <h2 className="font-bold text-[#0f1c2e] mb-2">5. お問い合わせ窓口</h2>
            <div className="bg-gray-50 rounded-lg p-4 mt-2">
              <p className="font-bold">{store.store_name}</p>
              <p>{store.address}</p>
              {store.tel && <p>TEL: <a href={`tel:${store.tel}`} className="text-amber-500 font-bold">{store.tel}</a></p>}
              {store.email && <p>Email: {store.email}</p>}
            </div>
          </section>
        </div>

        <div className="mt-8">
          <Link href={base} className="text-amber-500 text-sm font-semibold hover:underline">← 店舗トップに戻る</Link>
        </div>
      </div>
    </main>
  );
}
