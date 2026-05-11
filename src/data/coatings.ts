export type LayerNode = {
  name: string;
  color: string;
  thickness: "normal" | "thick" | "extra-thick";
  note?: string;
};

export type CoatingProduct = {
  id: string;
  name: string;
  subtitle: string;
  catchphrase: string;
  themeColor: {
    bg: string;
    text: string;
    border: string;
  };
  radar: {
    subject: string;
    A: number; // Value out of 5
    fullMark: number;
  }[];
  stars: number; // Out of 7
  durationText: string;
  layers: LayerNode[];
  isNew?: boolean;
};

export const coatingsData: CoatingProduct[] = [
  {
    id: "crystal",
    name: "CRYSTAL",
    subtitle: "クリスタルキーパー",
    catchphrase: "はじめてのコーティングに!",
    themeColor: { bg: "bg-[#29AEE2]", text: "text-white", border: "border-[#29AEE2]" },
    stars: 4,
    durationText: "1年間ノーメンテナンス\n洗車だけで1年耐久",
    isNew: false,
    radar: [
      { subject: "洗車の減り方", A: 3, fullMark: 5 },
      { subject: "耐候力", A: 3, fullMark: 5 },
      { subject: "持続時間", A: 3, fullMark: 5 },
      { subject: "艶", A: 3, fullMark: 5 },
    ],
    layers: [
      { name: "レジン被膜", color: "#F7DA75", thickness: "normal" },
      { name: "中密度ガラス被膜", color: "#6EBCE4", thickness: "normal" },
    ],
  },
  {
    id: "fresh",
    name: "フレッシュキーパー",
    subtitle: "FRESH KEEPER",
    catchphrase: "雨が降るたび勝手にキレイ",
    themeColor: { bg: "bg-[#FFF100]", text: "text-[#333333]", border: "border-[#FFF100]" },
    stars: 7,
    durationText: "1年間ノーメンテナンス\n洗車だけで1年耐久",
    isNew: false,
    radar: [
      { subject: "洗車の減り方", A: 5, fullMark: 5 },
      { subject: "耐候力", A: 3, fullMark: 5 },
      { subject: "持続時間", A: 3, fullMark: 5 },
      { subject: "艶", A: 3, fullMark: 5 },
    ],
    layers: [
      { name: "エコレジン被膜", color: "#74C7A3", thickness: "normal", note: "防汚機能に優れ\n少ない洗車回数でOK" },
      { name: "中密度ガラス被膜", color: "#6EBCE4", thickness: "normal" },
    ],
  },
  {
    id: "diamond",
    name: "DIAMOND",
    subtitle: "ダイヤモンドキーパー",
    catchphrase: "ガラスの厚みと密度が深いツヤを生む",
    themeColor: { bg: "bg-[#B89B4A]", text: "text-white", border: "border-[#B89B4A]" },
    stars: 5,
    durationText: "3年間ノーメンテナンス\nまたは1年1回で5年",
    isNew: false,
    radar: [
      { subject: "洗車の減り方", A: 3, fullMark: 5 },
      { subject: "耐候力", A: 4, fullMark: 5 },
      { subject: "持続時間", A: 4, fullMark: 5 },
      { subject: "艶", A: 4, fullMark: 5 },
    ],
    layers: [
      { name: "レジン被膜", color: "#F7DA75", thickness: "normal" },
      { name: "高密度ガラス被膜", color: "#6EBCE4", thickness: "thick", note: "クリスタルやフレッシュの２倍の厚み" },
    ],
  },
  {
    id: "dia2",
    name: "DIAⅡ",
    subtitle: "ダイヤⅡキーパー",
    catchphrase: "ダイヤモンドキーパーの2倍の艶",
    themeColor: { bg: "bg-[#333E85]", text: "text-white", border: "border-[#333E85]" },
    stars: 6,
    durationText: "3年間ノーメンテナンス\nまたは1年1回で5年",
    isNew: false,
    radar: [
      { subject: "洗車の減り方", A: 5, fullMark: 5 },
      { subject: "耐候力", A: 4, fullMark: 5 },
      { subject: "持続時間", A: 4, fullMark: 5 },
      { subject: "艶", A: 5, fullMark: 5 },
    ],
    layers: [
      { name: "新ダイヤⅡレジン被膜", color: "#F7DA75", thickness: "normal" },
      { name: "高密度ガラス被膜", color: "#6EBCE4", thickness: "thick", note: "クリスタルやフレッシュの２倍の厚み" },
    ],
  },
  {
    id: "iron",
    name: "アイアン・プロテクトキーパー",
    subtitle: "",
    catchphrase: "鉄粉から塗装を守る",
    themeColor: { bg: "bg-[#002266]", text: "text-white", border: "border-[#002266]" },
    stars: 5,
    durationText: "3年間持続",
    isNew: true,
    radar: [
      { subject: "洗車の減り方", A: 3, fullMark: 5 },
      { subject: "耐候力", A: 4, fullMark: 5 },
      { subject: "持続時間", A: 3, fullMark: 5 },
      { subject: "艶", A: 4, fullMark: 5 },
    ],
    layers: [
      { name: "レジン被膜", color: "#F7DA75", thickness: "normal" },
      { name: "高密度ガラス被膜", color: "#6EBCE4", thickness: "extra-thick", note: "2層の高密度ガラス被膜" },
    ],
  },
  {
    id: "ecodiamond",
    name: "エコダイヤキーパー",
    subtitle: "",
    catchphrase: "勝手にキレイ。とっても長持ち",
    themeColor: { bg: "bg-[#00913A]", text: "text-white", border: "border-[#00913A]" },
    stars: 7,
    durationText: "3年間ノーメンテナンス\nまたは1年1回で5年",
    isNew: false,
    radar: [
      { subject: "洗車の減り方", A: 5, fullMark: 5 },
      { subject: "耐候力", A: 4, fullMark: 5 },
      { subject: "持続時間", A: 4, fullMark: 5 },
      { subject: "艶", A: 4, fullMark: 5 },
    ],
    layers: [
      { name: "エコレジン被膜", color: "#74C7A3", thickness: "normal", note: "防汚機能に優れ\n少ない洗車回数でOK" },
      { name: "高密度ガラス被膜", color: "#6EBCE4", thickness: "thick", note: "クリスタルやフレッシュの２倍の厚み" },
    ],
  },
  {
    id: "exkeeper",
    name: "EXキーパー",
    subtitle: "異次元の美しさ",
    catchphrase: "息を呑む、過剰なまでの艶",
    themeColor: { bg: "bg-[#000000]", text: "text-white", border: "border-[#000000]" },
    stars: 7,
    durationText: "3年間ノーメンテナンス\nまたは1年1回で6年",
    isNew: false,
    radar: [
      { subject: "洗車の減り方", A: 5, fullMark: 5 },
      { subject: "耐候力", A: 5, fullMark: 5 },
      { subject: "持続時間", A: 5, fullMark: 5 },
      { subject: "艶", A: 5, fullMark: 5 },
    ],
    layers: [
      { name: "VP326被膜", color: "#A8B2C1", thickness: "thick", note: "圧倒的な厚みを持つ有機質被膜" },
      { name: "プライマーガラス", color: "#D1D5DB", thickness: "thick", note: "定着をよくする被膜" },
    ],
  },
];
