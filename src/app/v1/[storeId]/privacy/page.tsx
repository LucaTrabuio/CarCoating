import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStoreByIdAsync, getBaseUrl } from '@/lib/store-data';

interface PrivacyPageProps {
  params: Promise<{ storeId: string }>;
}

export default async function StorePrivacyPage({ params }: PrivacyPageProps) {
  const { storeId } = await params;
  const baseUrl = await getBaseUrl();
  const store = await getStoreByIdAsync(storeId, baseUrl);

  if (!store) notFound();

  return (
    <main className="py-10 px-5">
      <div className="max-w-[700px] mx-auto">
        <h1
          className="text-2xl font-bold text-[#0f1c2e] mb-1"
          style={{ fontFamily: '"Noto Serif JP", serif' }}
        >
          プライバシーポリシー
        </h1>
        <p className="text-xs text-gray-400 mb-8">最終更新日：2024年4月1日</p>

        <section className="mb-8">
          <h2 className="text-base font-bold text-[#0f1c2e] mb-2">
            お客様情報の取り扱いについて
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            KeePer PRO SHOP（以下「当社」）は、お客様の個人情報の重要性を認識し、個人情報に関する法令を遵守し、適正な取り扱いおよび安全管理に努めます。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-[#0f1c2e] mb-2">利用目的</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            当社が取得する個人情報（お名前、ご住所、電話番号、メールアドレス、車両情報等）は、ご予約・お問い合わせへの対応、サービスのご提供、アフターフォロー、およびキャンペーンのご案内の目的にのみ使用いたします。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-[#0f1c2e] mb-2">
            第三者提供について
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            お客様の個人情報は、法令に基づく場合を除き、お客様の同意なく第三者に提供することはありません。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-[#0f1c2e] mb-2">
            Cookieについて
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            当サイトでは、利便性の向上やアクセス解析のためにCookieを使用しています。ブラウザの設定によりCookieの受け取りを拒否することが可能です。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-[#0f1c2e] mb-2">
            お問い合わせ窓口
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            個人情報に関するお問い合わせは、下記店舗までお電話またはメールにてご連絡ください。
          </p>
          <div className="bg-gray-50 rounded-xl p-5">
            <p className="font-bold text-sm text-[#0f1c2e] mb-2">
              {store.store_name}
            </p>
            <div className="text-sm text-gray-600 space-y-1">
              <p>{store.address}</p>
              {store.tel && (
                <p>
                  TEL:{' '}
                  <a
                    href={`tel:${store.tel}`}
                    className="text-amber-600 hover:underline"
                  >
                    {store.tel}
                  </a>
                </p>
              )}
              {store.email && <p>Email: {store.email}</p>}
              <p>営業時間: {store.business_hours}</p>
            </div>
          </div>
        </section>

        <div className="text-center pt-4">
          <Link
            href={`/${storeId}`}
            className="text-amber-600 font-semibold text-sm hover:underline"
          >
            ← 店舗トップに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
