import type { BannersConfig } from '@/lib/block-types';
import { formatPrice, applyDiscount } from '@/lib/pricing';

interface BannersBlockProps {
  config: BannersConfig;
}

export default function BannersBlock({ config }: BannersBlockProps) {
  const visibleBanners = config.banners.filter(b => b.visible);

  if (visibleBanners.length === 0) return null;

  return (
    <section className="py-14 px-5 bg-white">
      <div className="max-w-[900px] mx-auto">
        <div className="grid md:grid-cols-2 gap-6">
          {visibleBanners.map(banner => {
            const discountedPrice = banner.original_price > 0 && banner.discount_rate > 0
              ? applyDiscount(banner.original_price, banner.discount_rate)
              : null;

            const content = (
              <div
                className="rounded-xl overflow-hidden border border-slate-200 hover:shadow-lg transition-shadow"
                style={banner.custom_css ? undefined : undefined}
              >
                {banner.image_url && (
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="w-full h-[180px] object-cover"
                  />
                )}
                <div className="p-5">
                  <h3 className="font-bold text-base text-[#0f1c2e] mb-1">{banner.title}</h3>
                  {banner.subtitle && (
                    <p className="text-xs text-slate-500 mb-3">{banner.subtitle}</p>
                  )}
                  {banner.original_price > 0 && (
                    <div className="flex items-baseline gap-2">
                      {discountedPrice !== null && (
                        <>
                          <span className="text-xs text-slate-400 line-through">
                            {formatPrice(banner.original_price)}
                          </span>
                          <span className="text-lg font-bold text-red-600">
                            {formatPrice(discountedPrice)}
                          </span>
                          <span className="text-[10px] text-red-500 font-bold">
                            {banner.discount_rate}%OFF
                          </span>
                        </>
                      )}
                      {discountedPrice === null && (
                        <span className="text-lg font-bold text-[#0f1c2e]">
                          {formatPrice(banner.original_price)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {banner.custom_css && (
                  <style dangerouslySetInnerHTML={{ __html: banner.custom_css }} />
                )}
              </div>
            );

            if (banner.link_url) {
              return (
                <a
                  key={banner.id}
                  href={banner.link_url}
                  className="block"
                  target={banner.link_url.startsWith('http') ? '_blank' : undefined}
                  rel={banner.link_url.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  {content}
                </a>
              );
            }

            return <div key={banner.id}>{content}</div>;
          })}
        </div>
      </div>
    </section>
  );
}
