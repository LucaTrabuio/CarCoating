const PROCESS_STEPS = [
  { num: '1', title: '店舗を探す', desc: '現在地から最寄りのKeePer PRO SHOPを検索。' },
  { num: '2', title: '見積もり・ご相談', desc: 'Webまたはお電話で無料見積もり。おすすめコースをご提案。' },
  { num: '3', title: 'Web予約', desc: 'カレンダーから希望日時を選択。限定割引が自動適用。' },
  { num: '4', title: '施工・お引渡し', desc: '朝お預け → 夕方お引渡し。無料点検2回付き。' },
];

export default function ProcessHomeBlock() {
  return (
    <section className="py-16 px-5 bg-white">
      <div className="max-w-[900px] mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-[#0C3290]" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>ご利用の流れ</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {PROCESS_STEPS.map(step => (
            <div key={step.num} className="text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500 text-[#0C3290] font-bold flex items-center justify-center text-lg mx-auto mb-3">
                {step.num}
              </div>
              <h3 className="font-bold text-sm text-[#0C3290] mb-1">{step.title}</h3>
              <p className="text-xs text-gray-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
