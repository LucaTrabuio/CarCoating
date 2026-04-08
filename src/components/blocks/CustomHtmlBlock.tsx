import type { CustomHtmlConfig } from '@/lib/block-types';

interface CustomHtmlBlockProps {
  config: CustomHtmlConfig;
}

export default function CustomHtmlBlock({ config }: CustomHtmlBlockProps) {
  if (!config.html) return null;

  return (
    <section className="py-14 px-5 bg-white">
      <div className="max-w-[900px] mx-auto">
        {config.css && (
          <style dangerouslySetInnerHTML={{ __html: config.css }} />
        )}
        <div
          className="custom-html-block"
          dangerouslySetInnerHTML={{ __html: config.html }}
        />
      </div>
    </section>
  );
}
