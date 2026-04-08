import type { USPConfig } from '@/lib/block-types';

interface USPBlockProps {
  config: USPConfig;
}

export default function USPBlock({ config }: USPBlockProps) {
  if (!config.items || config.items.length === 0) return null;

  return (
    <section className="py-14 px-5 bg-[#0f1c2e]">
      <div className="max-w-[1100px] mx-auto">
        <h2 className="text-white text-xl md:text-2xl font-bold text-center mb-8" style={{ fontFamily: '"Noto Serif JP", serif' }}>
          {'\u9078\u3070\u308C\u308B6\u3064\u306E\u7406\u7531'}
        </h2>
        <div className="grid md:grid-cols-3 gap-5">
          {config.items.map(item => (
            <div key={item.id} className="bg-white/5 rounded-xl p-5 border border-white/10">
              <div className="text-2xl mb-2">{item.icon}</div>
              <h3 className="text-white font-bold text-sm mb-1">{item.title}</h3>
              <p className="text-white/50 text-xs">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
