interface Props {
  groupName: string;
  storeCount: number;
  title?: string;
  subtitle?: string;
}

export default function AreaHeaderBlock({ groupName, storeCount, title, subtitle }: Props) {
  return (
    <section className="py-12 px-5 bg-[#0C3290] text-white">
      <div className="max-w-[1100px] mx-auto text-center">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight">
          {title?.trim() ? title : groupName}
        </h1>
        <p className="mt-3 text-base text-blue-200">
          {subtitle?.trim() ? subtitle : `${storeCount}店舗のKeePer PRO SHOPが集まるエリアです。`}
        </p>
      </div>
    </section>
  );
}
