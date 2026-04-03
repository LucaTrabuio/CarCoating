import { CarModel } from '@/lib/types';

export const carDatabase: CarModel[] = [
  // Toyota
  { make: 'トヨタ', make_en: 'Toyota', model: 'アルファード', model_en: 'Alphard', size: 'LL' },
  { make: 'トヨタ', make_en: 'Toyota', model: 'ヴェルファイア', model_en: 'Vellfire', size: 'LL' },
  { make: 'トヨタ', make_en: 'Toyota', model: 'ハリアー', model_en: 'Harrier', size: 'L' },
  { make: 'トヨタ', make_en: 'Toyota', model: 'RAV4', model_en: 'RAV4', size: 'L' },
  { make: 'トヨタ', make_en: 'Toyota', model: 'クラウン', model_en: 'Crown', size: 'L' },
  { make: 'トヨタ', make_en: 'Toyota', model: 'カムリ', model_en: 'Camry', size: 'M' },
  { make: 'トヨタ', make_en: 'Toyota', model: 'プリウス', model_en: 'Prius', size: 'M' },
  { make: 'トヨタ', make_en: 'Toyota', model: 'カローラ', model_en: 'Corolla', size: 'M' },
  { make: 'トヨタ', make_en: 'Toyota', model: 'ヤリス', model_en: 'Yaris', size: 'S' },
  { make: 'トヨタ', make_en: 'Toyota', model: 'アクア', model_en: 'Aqua', size: 'S' },
  { make: 'トヨタ', make_en: 'Toyota', model: 'ノア', model_en: 'Noah', size: 'L' },
  { make: 'トヨタ', make_en: 'Toyota', model: 'ヴォクシー', model_en: 'Voxy', size: 'L' },
  { make: 'トヨタ', make_en: 'Toyota', model: 'シエンタ', model_en: 'Sienta', size: 'M' },
  { make: 'トヨタ', make_en: 'Toyota', model: 'ランドクルーザー', model_en: 'Land Cruiser', size: 'XL' },
  { make: 'トヨタ', make_en: 'Toyota', model: 'ハイエース', model_en: 'HiAce', size: 'XL' },
  { make: 'トヨタ', make_en: 'Toyota', model: 'GR86', model_en: 'GR86', size: 'M' },
  { make: 'トヨタ', make_en: 'Toyota', model: 'GRヤリス', model_en: 'GR Yaris', size: 'S' },
  { make: 'トヨタ', make_en: 'Toyota', model: 'ヤリスクロス', model_en: 'Yaris Cross', size: 'M' },
  // Honda
  { make: 'ホンダ', make_en: 'Honda', model: 'N-BOX', model_en: 'N-BOX', size: 'SS' },
  { make: 'ホンダ', make_en: 'Honda', model: 'フィット', model_en: 'Fit', size: 'S' },
  { make: 'ホンダ', make_en: 'Honda', model: 'ヴェゼル', model_en: 'Vezel', size: 'M' },
  { make: 'ホンダ', make_en: 'Honda', model: 'ステップワゴン', model_en: 'Step Wagon', size: 'L' },
  { make: 'ホンダ', make_en: 'Honda', model: 'フリード', model_en: 'Freed', size: 'M' },
  { make: 'ホンダ', make_en: 'Honda', model: 'シビック', model_en: 'Civic', size: 'M' },
  { make: 'ホンダ', make_en: 'Honda', model: 'ZR-V', model_en: 'ZR-V', size: 'L' },
  // Nissan
  { make: '日産', make_en: 'Nissan', model: 'ノート', model_en: 'Note', size: 'S' },
  { make: '日産', make_en: 'Nissan', model: 'セレナ', model_en: 'Serena', size: 'L' },
  { make: '日産', make_en: 'Nissan', model: 'エクストレイル', model_en: 'X-Trail', size: 'L' },
  { make: '日産', make_en: 'Nissan', model: 'リーフ', model_en: 'Leaf', size: 'M' },
  { make: '日産', make_en: 'Nissan', model: 'アリア', model_en: 'Ariya', size: 'L' },
  { make: '日産', make_en: 'Nissan', model: 'GT-R', model_en: 'GT-R', size: 'L' },
  // Mazda
  { make: 'マツダ', make_en: 'Mazda', model: 'CX-5', model_en: 'CX-5', size: 'L' },
  { make: 'マツダ', make_en: 'Mazda', model: 'CX-8', model_en: 'CX-8', size: 'LL' },
  { make: 'マツダ', make_en: 'Mazda', model: 'MAZDA3', model_en: 'MAZDA3', size: 'M' },
  { make: 'マツダ', make_en: 'Mazda', model: 'ロードスター', model_en: 'Roadster', size: 'S' },
  // Subaru
  { make: 'スバル', make_en: 'Subaru', model: 'フォレスター', model_en: 'Forester', size: 'L' },
  { make: 'スバル', make_en: 'Subaru', model: 'レヴォーグ', model_en: 'Levorg', size: 'M' },
  { make: 'スバル', make_en: 'Subaru', model: 'BRZ', model_en: 'BRZ', size: 'M' },
  { make: 'スバル', make_en: 'Subaru', model: 'インプレッサ', model_en: 'Impreza', size: 'M' },
  // Suzuki
  { make: 'スズキ', make_en: 'Suzuki', model: 'ジムニー', model_en: 'Jimny', size: 'SS' },
  { make: 'スズキ', make_en: 'Suzuki', model: 'スイフト', model_en: 'Swift', size: 'S' },
  { make: 'スズキ', make_en: 'Suzuki', model: 'ハスラー', model_en: 'Hustler', size: 'SS' },
  { make: 'スズキ', make_en: 'Suzuki', model: 'スペーシア', model_en: 'Spacia', size: 'SS' },
  // Daihatsu
  { make: 'ダイハツ', make_en: 'Daihatsu', model: 'タント', model_en: 'Tanto', size: 'SS' },
  { make: 'ダイハツ', make_en: 'Daihatsu', model: 'ムーヴ', model_en: 'Move', size: 'SS' },
  { make: 'ダイハツ', make_en: 'Daihatsu', model: 'ロッキー', model_en: 'Rocky', size: 'M' },
  // Mitsubishi
  { make: '三菱', make_en: 'Mitsubishi', model: 'デリカD:5', model_en: 'Delica D:5', size: 'LL' },
  { make: '三菱', make_en: 'Mitsubishi', model: 'アウトランダー', model_en: 'Outlander', size: 'L' },
  // Lexus
  { make: 'レクサス', make_en: 'Lexus', model: 'NX', model_en: 'NX', size: 'L' },
  { make: 'レクサス', make_en: 'Lexus', model: 'RX', model_en: 'RX', size: 'LL' },
  { make: 'レクサス', make_en: 'Lexus', model: 'IS', model_en: 'IS', size: 'M' },
  { make: 'レクサス', make_en: 'Lexus', model: 'LX', model_en: 'LX', size: 'XL' },
  { make: 'レクサス', make_en: 'Lexus', model: 'UX', model_en: 'UX', size: 'M' },
  // BMW
  { make: 'BMW', make_en: 'BMW', model: '1シリーズ', model_en: '1 Series', size: 'M' },
  { make: 'BMW', make_en: 'BMW', model: '3シリーズ', model_en: '3 Series', size: 'M' },
  { make: 'BMW', make_en: 'BMW', model: '5シリーズ', model_en: '5 Series', size: 'L' },
  { make: 'BMW', make_en: 'BMW', model: 'X3', model_en: 'X3', size: 'L' },
  { make: 'BMW', make_en: 'BMW', model: 'X5', model_en: 'X5', size: 'LL' },
  { make: 'BMW', make_en: 'BMW', model: 'MINI', model_en: 'MINI', size: 'S' },
  // Mercedes-Benz
  { make: 'メルセデス・ベンツ', make_en: 'Mercedes-Benz', model: 'Aクラス', model_en: 'A-Class', size: 'M' },
  { make: 'メルセデス・ベンツ', make_en: 'Mercedes-Benz', model: 'Cクラス', model_en: 'C-Class', size: 'M' },
  { make: 'メルセデス・ベンツ', make_en: 'Mercedes-Benz', model: 'Eクラス', model_en: 'E-Class', size: 'L' },
  { make: 'メルセデス・ベンツ', make_en: 'Mercedes-Benz', model: 'GLC', model_en: 'GLC', size: 'L' },
  { make: 'メルセデス・ベンツ', make_en: 'Mercedes-Benz', model: 'GLE', model_en: 'GLE', size: 'LL' },
  // Audi
  { make: 'アウディ', make_en: 'Audi', model: 'A3', model_en: 'A3', size: 'M' },
  { make: 'アウディ', make_en: 'Audi', model: 'A4', model_en: 'A4', size: 'M' },
  { make: 'アウディ', make_en: 'Audi', model: 'Q5', model_en: 'Q5', size: 'L' },
  // Volkswagen
  { make: 'フォルクスワーゲン', make_en: 'Volkswagen', model: 'ゴルフ', model_en: 'Golf', size: 'M' },
  { make: 'フォルクスワーゲン', make_en: 'Volkswagen', model: 'ティグアン', model_en: 'Tiguan', size: 'L' },
  // Porsche
  { make: 'ポルシェ', make_en: 'Porsche', model: '911', model_en: '911', size: 'M' },
  { make: 'ポルシェ', make_en: 'Porsche', model: 'カイエン', model_en: 'Cayenne', size: 'LL' },
  { make: 'ポルシェ', make_en: 'Porsche', model: 'マカン', model_en: 'Macan', size: 'L' },
  // Tesla
  { make: 'テスラ', make_en: 'Tesla', model: 'Model 3', model_en: 'Model 3', size: 'M' },
  { make: 'テスラ', make_en: 'Tesla', model: 'Model Y', model_en: 'Model Y', size: 'L' },
  { make: 'テスラ', make_en: 'Tesla', model: 'Model S', model_en: 'Model S', size: 'L' },
  // Volvo
  { make: 'ボルボ', make_en: 'Volvo', model: 'XC60', model_en: 'XC60', size: 'L' },
  { make: 'ボルボ', make_en: 'Volvo', model: 'V60', model_en: 'V60', size: 'M' },
];

export function getUniqueMakes(): string[] {
  return [...new Set(carDatabase.map(c => c.make))];
}

export function getModelsByMake(make: string): CarModel[] {
  return carDatabase.filter(c => c.make === make);
}

export function findCarSize(make: string, model: string): CarModel | undefined {
  return carDatabase.find(c => c.make === make && c.model === model);
}
