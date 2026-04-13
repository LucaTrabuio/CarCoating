import type { ProcessConfig } from '@/lib/block-types';

interface ProcessBlockProps {
  config: ProcessConfig;
}

export default function ProcessBlock({ config }: ProcessBlockProps) {
  if (config.steps.length === 0) return null;

  return (
    <section className="py-14 px-5 bg-slate-50">
      <div className="max-w-[900px] mx-auto">
        <h2
          className="text-3xl md:text-5xl font-black tracking-tight text-[#0C3290] text-center mb-10"
          style={{ fontFamily: '"Noto Sans JP", sans-serif' }}
        >
          ご利用の流れ
        </h2>
        <div className="relative">
          {config.steps.map((step, i) => (
            <div key={step.id} className="flex gap-5 mb-8 last:mb-0">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-[#0C3290] flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {step.number}
                </div>
                {i < config.steps.length - 1 && (
                  <div className="w-0.5 flex-1 bg-amber-200 mt-2" />
                )}
              </div>
              <div className="pt-1.5 pb-4">
                <h3 className="font-bold text-[#0C3290] text-base mb-1">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
