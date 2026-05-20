const WHY_ITEMS = [
  { num: '01', title: '特許技術', desc: 'KeePer独自の特許技術による被膜構造。一般的なコーティングとは根本的に異なる科学的アプローチ。' },
  { num: '02', title: '認定技術者', desc: '1級・2級資格認定制度。全国統一の技術基準で、どの店舗でも同じ品質をお約束。' },
  { num: '03', title: '研究開発力', desc: 'KeePer技研の研究所で開発されたコーティング剤。科学的データに基づく確かな性能。' },
  { num: '04', title: 'Web予約割引', desc: 'Web予約限定で最大20%OFF。オプションも全メニュー10%OFFで施工可能。' },
  { num: '05', title: '無料アフターケア', desc: '施工後の手洗い洗車＆点検を2回無料。コーティングの状態をプロが確認。' },
  { num: '06', title: '完全予約制', desc: '一台一台を丁寧に施工。完全予約制で待ち時間なし。朝預けて夕方お引渡し。' },
];

export default function WhyKeeperBlock() {
  return (
    <section className="py-16 px-5 bg-slate-50">
      <div className="max-w-[900px] mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-[#0C3290]" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>KeePer が選ばれる理由</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {WHY_ITEMS.map(item => (
            <div key={item.title} className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="text-2xl font-bold text-amber-500 mb-3 tabular-nums">{item.num}</div>
              <h3 className="font-bold text-[#0C3290] mb-2">{item.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
