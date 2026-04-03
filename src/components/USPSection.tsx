const usps = [
  {
    num: '01',
    title: 'KeePer PRO SHOP 認定店',
    desc: 'KeePer技研公認の専門施工店。全国統一の品質基準で施工します。',
  },
  {
    num: '02',
    title: '1級・2級資格保有技術者',
    desc: 'KeePer公認の資格を持つ技術者が一台一台丁寧に施工。確かな腕をお約束。',
  },
  {
    num: '03',
    title: '特許技術で守る',
    desc: '特許取得のガラス被膜技術。ミネラル固着防止・塗装面改善など独自技術を採用。',
  },
  {
    num: '04',
    title: 'Web限定割引',
    desc: 'Web予約のお客様だけの特別割引。お電話でのご予約でもWeb割引を適用します。',
  },
  {
    num: '05',
    title: '無料アフターケア',
    desc: '施工後1ヶ月・6ヶ月の手洗い洗車＆点検が無料。高接触部の除菌も無料実施。',
  },
  {
    num: '06',
    title: '完全予約制 = 待ち時間ゼロ',
    desc: 'ご予約のお客様を優先。お預け→お仕事→夕方お引渡しのスムーズな流れ。',
  },
];

export default function USPSection() {
  return (
    <section className="py-16 px-5 bg-[#0f1c2e]">
      <div className="max-w-[900px] mx-auto">
        <div className="text-center mb-10">
          <p className="text-amber-400 text-xs font-bold tracking-widest mb-2">WHY CHOOSE US</p>
          <h2 className="text-white text-xl md:text-2xl font-bold" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            選ばれる6つの理由
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {usps.map(usp => (
            <div key={usp.num} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors">
              <div className="text-amber-500 text-[11px] font-bold tracking-widest mb-2">{usp.num}</div>
              <h3 className="text-white font-bold text-[15px] mb-2">{usp.title}</h3>
              <p className="text-white/50 text-[13px] leading-relaxed">{usp.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
