import { getStoreByIdAsync, getBaseUrl } from '@/lib/store-data';
import { notFound } from 'next/navigation';

export default async function PrivacyPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const store = await getStoreByIdAsync(storeId, await getBaseUrl());
  if (!store) notFound();

  return (
    <main className="py-10 px-5">
      <div className="max-w-[700px] mx-auto">
        <h1 className="text-2xl font-bold text-[#0f1c2e] mb-1" style={{ fontFamily: '"Noto Serif JP", serif' }}>プライバシーポリシー</h1>
        <p className="text-xs text-gray-400 mb-8">最終更新日：2024年4月1日</p>

        <section className="mb-8">
          <h2 className="text-base font-bold text-[#0f1c2e] mb-2">お客様情報の取り扱いについて</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            {store.store_name}（以下「当社」）は、お客様の個人情報の重要性を認識し、個人情報に関する法令を遵守し、適正な取り扱いおよび安全管理に努めます。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-[#0f1c2e] mb-2">利用目的</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            当社が取得する個人情報（お名前、ご住所、電話番号、メールアドレス、車両情報等）は、ご予約・お問い合わせへの対応、サービスのご提供、アフターフォロー、およびキャンペーンのご案内の目的にのみ使用いたします。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-[#0f1c2e] mb-2">第三者提供について</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            お客様の個人情報は、法令に基づく場合を除き、お客様の同意なく第三者に提供することはありません。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-[#0f1c2e] mb-2">Cookieについて</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            当サイトでは、利便性の向上やアクセス解析のためにCookieを使用しています。ブラウザの設定によりCookieの受け取りを拒否することが可能です。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-[#0f1c2e] mb-2">お問い合わせ窓口</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            個人情報に関するお問い合わせは下記までご連絡ください。<br />
            {store.store_name}<br />
            {store.address}<br />
            電話：{store.tel}
          </p>
        </section>
      </div>
    </main>
  );
}
