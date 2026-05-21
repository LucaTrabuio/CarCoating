interface Props {
  groupName: string;
  storeCount: number;
}

export default function AreaHeaderBlock({ groupName, storeCount }: Props) {
  return (
    <section className="py-12 px-5 bg-[#0C3290] text-white">
      <div className="max-w-[1100px] mx-auto text-center">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight">
          {groupName}
        </h1>
        <p className="mt-3 text-base text-blue-200">
          {storeCount}店舗のKeePer PRO SHOPが集まるエリアです。
        </p>
      </div>
    </section>
  );
}
