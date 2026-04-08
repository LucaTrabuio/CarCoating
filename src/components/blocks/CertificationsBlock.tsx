import type { CertificationsConfig } from '@/lib/block-types';

interface CertificationsBlockProps {
  config: CertificationsConfig;
}

export default function CertificationsBlock({ config }: CertificationsBlockProps) {
  if (config.certs.length === 0) return null;

  return (
    <section className="py-14 px-5 bg-white">
      <div className="max-w-[900px] mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          {config.certs.map(cert => (
            <div key={cert.id} className="text-center">
              <h2
                className="text-lg font-bold text-[#0f1c2e] mb-1"
                style={{ fontFamily: '"Noto Serif JP", serif' }}
              >
                {cert.title}
              </h2>
              {cert.subtitle && (
                <h3 className="text-sm text-slate-500 mb-4">{cert.subtitle}</h3>
              )}
              {cert.image_url && (
                <div className="rounded-xl overflow-hidden">
                  <img
                    src={cert.image_url}
                    alt={cert.title}
                    className="w-full max-h-[300px] object-contain"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
