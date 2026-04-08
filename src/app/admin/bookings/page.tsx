'use client';

const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: '受付済み', color: 'bg-yellow-100 text-yellow-800' },
  2: { label: '確定', color: 'bg-green-100 text-green-800' },
  3: { label: 'キャンセル', color: 'bg-red-100 text-red-800' },
  4: { label: '施工完了', color: 'bg-blue-100 text-blue-800' },
};

const SAMPLE_BOOKINGS = [
  { id: '#1024', status: 1, name: '山田 太郎', car: 'ハリアー (L)', plan: 'ダイヤモンド', price: '¥67,600', c1: '4/10 9:00', c2: '4/12 10:00', c3: '4/16 13:00' },
  { id: '#1023', status: 1, name: '佐藤 花子', car: 'N-BOX (SS)', plan: 'クリスタル', price: '¥14,560', c1: '4/11 14:00', c2: '4/14 9:00', c3: '—' },
  { id: '#1022', status: 2, name: '鈴木 一郎', car: 'アルファード (LL)', plan: 'EXキーパー', price: '¥163,400', c1: '4/8 9:00 ✓', c2: '', c3: '' },
  { id: '#1021', status: 4, name: '田中 次郎', car: 'プリウス (M)', plan: 'ダイヤⅡ', price: '¥74,400', c1: '4/5 完了', c2: '', c3: '' },
];

export default function BookingsPage() {
  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">予約リクエスト一覧</h2>
          <div className="flex gap-2 text-xs">
            {Object.entries(STATUS_LABELS).map(([code, { label, color }]) => (
              <span key={code} className={`px-2 py-0.5 rounded-full font-bold ${color}`}>{label}</span>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-semibold">ID</th>
                <th className="px-3 py-2 text-left font-semibold">ステータス</th>
                <th className="px-3 py-2 text-left font-semibold">お客様</th>
                <th className="px-3 py-2 text-left font-semibold">車種</th>
                <th className="px-3 py-2 text-left font-semibold">プラン</th>
                <th className="px-3 py-2 text-left font-semibold">見積額</th>
                <th className="px-3 py-2 text-left font-semibold">第1希望</th>
                <th className="px-3 py-2 text-left font-semibold">第2希望</th>
                <th className="px-3 py-2 text-left font-semibold">第3希望</th>
                <th className="px-3 py-2 text-left font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_BOOKINGS.map(b => (
                <tr key={b.id} className="border-b border-gray-100">
                  <td className="px-3 py-2.5">{b.id}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${STATUS_LABELS[b.status].color}`}>
                      {STATUS_LABELS[b.status].label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-semibold">{b.name}</td>
                  <td className="px-3 py-2.5">{b.car}</td>
                  <td className="px-3 py-2.5">{b.plan}</td>
                  <td className="px-3 py-2.5">{b.price}</td>
                  <td className="px-3 py-2.5">
                    {b.status === 1 && b.c1 ? <>{b.c1} <button className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-bold">〇</button></> : b.c1}
                  </td>
                  <td className="px-3 py-2.5">
                    {b.status === 1 && b.c2 ? <>{b.c2} <button className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-bold">〇</button></> : b.c2}
                  </td>
                  <td className="px-3 py-2.5">
                    {b.status === 1 && b.c3 && b.c3 !== '—' ? <>{b.c3} <button className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-bold">〇</button></> : b.c3}
                  </td>
                  <td className="px-3 py-2.5">
                    {b.status === 1 && <button className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-[10px] font-bold">代替提案</button>}
                    {b.status === 2 && <button className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-bold">施工完了</button>}
                    {b.status === 4 && <span className="text-gray-400">インセンティブ対象</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
