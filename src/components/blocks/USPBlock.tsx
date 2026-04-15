import type { USPConfig } from '@/lib/block-types';
import USPCard from './USPCard';

interface USPBlockProps {
  config: USPConfig;
  basePath: string;
}

// "See more" link + button label per USP title (relative to store basePath)
const USP_LINK_BY_TITLE: Record<string, { href: string; label: string }> = {
  '最高品質のコーティング': { href: '/guide#tier-ex-premium', label: 'コーティングガイドを読む →' },
  '技術認定スタッフ': { href: '/cases', label: '施工事例を見る →' },
  '短時間施工': { href: '/inquiry', label: 'お問い合わせはこちら →' },
  'Web限定割引': { href: '/price', label: '料金を比較する →' },
  '専用ブース完備': { href: '/booking', label: '店舗を予約する →' },
  'アフターサポート': { href: '/reviews', label: 'お客様の声を見る →' },
};

// Static images mapped by USP title (matches the default 6 items)
const USP_IMAGE_BY_TITLE: Record<string, string> = {
  '最高品質のコーティング': '/images/usp/quality.png',
  '技術認定スタッフ': '/images/usp/staff.jpg',
  '短時間施工': '/images/usp/short-time.jpg',
  'Web限定割引': '/images/usp/web-discount.png',
  '専用ブース完備': '/images/usp/booth.jpg',
  'アフターサポート': '/images/usp/aftercare.jpg',
};

const USP_IMAGE_FALLBACK = [
  '/images/usp/quality.png',
  '/images/usp/staff.jpg',
  '/images/usp/short-time.jpg',
  '/images/usp/web-discount.png',
  '/images/usp/booth.jpg',
  '/images/usp/aftercare.jpg',
];

export default function USPBlock({ config, basePath }: USPBlockProps) {
  if (!config.items || config.items.length === 0) return null;

  return (
    <section className="py-14 px-5 bg-[#0C3290]">
      <div className="max-w-[1100px] mx-auto">
        <h2 className="text-white text-3xl md:text-5xl font-black tracking-tight text-center mb-8" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
          {'\u9078\u3070\u308C\u308B6\u3064\u306E\u7406\u7531'}
        </h2>
        <div className="grid md:grid-cols-3 gap-5">
          {config.items.map((item, i) => {
            const link = USP_LINK_BY_TITLE[item.title];
            const href = link ? `${basePath}${link.href}` : undefined;
            return (
              <USPCard
                key={item.id}
                imageSrc={USP_IMAGE_BY_TITLE[item.title] ?? USP_IMAGE_FALLBACK[i % USP_IMAGE_FALLBACK.length]}
                title={item.title}
                description={item.description}
                icon={item.icon}
                href={href}
                ctaLabel={link?.label}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
