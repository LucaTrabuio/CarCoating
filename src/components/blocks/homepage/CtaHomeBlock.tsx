interface Props {
  heading?: string;
  description?: string;
  button_text?: string;
  button_link?: string;
}

export default function CtaHomeBlock({
  heading = 'コーティングを始めませんか？',
  description = 'お近くの店舗で無料見積もり。Web予約限定の割引特典もご用意しています。',
  button_text = '近くの店舗を探す',
  button_link = '#store-finder',
}: Props) {
  return (
    <section className="py-14 px-5 bg-[#0C3290]">
      <div className="max-w-[600px] mx-auto text-center text-white">
        <h2 className="text-xl font-bold mb-2" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>{heading}</h2>
        <p className="text-sm text-white/40 mb-6">{description}</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <a href={button_link} className="px-7 py-3 bg-amber-500 text-[#0C3290] font-bold rounded-lg text-sm hover:bg-amber-500 transition-colors">
            {button_text}
          </a>
        </div>
      </div>
    </section>
  );
}
