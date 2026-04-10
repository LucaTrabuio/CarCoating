import type { USPConfig } from '@/lib/block-types';

interface USPBlockProps {
  config: USPConfig;
}

export default function USPBlock({ config }: USPBlockProps) {
  if (!config.items || config.items.length === 0) return null;

  return (
    <section className="py-14 px-5 bg-[#0C3290]">
      <div className="max-w-[1100px] mx-auto">
        <h2 className="text-white text-3xl md:text-5xl font-black tracking-tight text-center mb-8" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
          {'\u9078\u3070\u308C\u308B6\u3064\u306E\u7406\u7531'}
        </h2>
        <div className="grid md:grid-cols-3 gap-5">
          {config.items.map(item => (
            <div key={item.id} className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition-all">
              <div className="text-2xl mb-2">{item.icon}</div>
              <h3 className="text-gray-900 font-bold text-sm mb-1">{item.title}</h3>
              <p className="text-gray-500 text-xs">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
