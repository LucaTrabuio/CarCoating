const GALLERY_IMAGES = [
  { src: 'https://eniwa-coating.com/img/temp/20251212164034.jpg', label: '恵庭店', region: '北海道' },
  { src: 'https://sapporo-coating.com/img/temp/20251212163823.jpg', label: '札幌エリア', region: '北海道' },
  { src: 'https://ashikaga-coating.com/img/temp/20260129194523.jpg', label: '足利エリア', region: '北関東' },
  { src: 'https://ichihara-coating.com/img/temp/20260205185411.jpg', label: '市原エリア', region: '南関東' },
  { src: 'https://coating-nagoyashi.com/img/temp/20260128152026.jpg', label: '名古屋エリア', region: '中部' },
  { src: 'https://kanazawa-coating.com/img/temp/20260123191952.jpg', label: '金沢エリア', region: '東海北陸' },
  { src: 'https://okayama-coating.com/img/temp/20251227105100.jpg', label: '岡山エリア', region: '中国' },
  { src: 'https://coating-hiroshima.com/img/temp/20251227105935.jpg', label: '広島緑井エリア', region: '中国' },
  { src: 'https://kumamoto-coating.com/img/temp/20251010004043.jpg', label: '熊本エリア', region: '九州' },
  { src: 'https://kitakyushu-coating.com/img/temp/20251010005121.jpg', label: '北九州エリア', region: '九州' },
];

export default function StoreGalleryBlock() {
  return (
    <section className="py-16 px-5 bg-white overflow-hidden">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#0C3290]" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>全国の店舗</h2>
          <p className="text-sm text-gray-500 mt-1">北海道から九州まで、各地のKeePer PRO SHOPから</p>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory -mx-5 px-5 scrollbar-hide">
          {GALLERY_IMAGES.map((img, i) => (
            <div key={i} className="snap-start shrink-0 w-[280px] md:w-[320px] rounded-xl overflow-hidden border border-gray-200 group">
              <div className="relative h-[180px] bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={`${img.label}の施工風景`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3">
                  <span className="text-[9px] text-white/70 font-bold tracking-wider">{img.region}</span>
                  <div className="text-white text-sm font-bold">{img.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
