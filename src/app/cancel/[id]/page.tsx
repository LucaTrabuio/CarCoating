import { notFound } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase-admin';
import { getV3StoreById } from '@/lib/firebase-stores';
import CancelContent from './CancelContent';

export const revalidate = 0;

export default async function CancelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;
  const db = getAdminDb();
  const doc = await db.collection('reservations').doc(id).get();
  if (!doc.exists) notFound();

  const data = doc.data()!;

  // Require token for reservations that have one. Legacy reservations without
  // cancelToken can still be cancelled — remove after grace period.
  if (data.cancelToken && data.cancelToken !== token) {
    notFound();
  }

  const store = await getV3StoreById(data.storeId);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-5">
      <div className="max-w-[500px] mx-auto bg-white rounded-xl border border-gray-200 p-6">
        <h1 className="text-xl font-bold text-[#0f1c2e] mb-2">予約のキャンセル</h1>
        <p className="text-sm text-gray-500 mb-6">以下の予約をキャンセルしますか？</p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
          <div><span className="text-gray-400">店舗: </span>{store?.store_name || data.storeId}</div>
          <div><span className="text-gray-400">お名前: </span>{data.name} 様</div>
          <div><span className="text-gray-400">電話: </span>{data.phone}</div>
          <div><span className="text-gray-400">希望日時: </span>
            {(data.choices || []).map((c: { date: string; time: string }, i: number) => (
              <div key={i} className="ml-4">第{i + 1}希望: {c.date} {c.time}</div>
            ))}
          </div>
          <div><span className="text-gray-400">状態: </span>
            <span className={data.status === 'cancelled' ? 'text-red-500' : 'text-green-600'}>
              {data.status === 'pending' ? '確認待ち' : data.status === 'confirmed' ? '確定' : data.status === 'cancelled' ? 'キャンセル済み' : data.status}
            </span>
          </div>
        </div>

        {data.status === 'cancelled' ? (
          <p className="text-center text-sm text-gray-500">この予約は既にキャンセルされています。</p>
        ) : data.status === 'completed' ? (
          <p className="text-center text-sm text-gray-500">この予約は完了済みのためキャンセルできません。</p>
        ) : (
          <CancelContent reservationId={id} token={token} />
        )}
      </div>
    </main>
  );
}
