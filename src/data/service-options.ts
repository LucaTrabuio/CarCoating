export type ServiceOptionCategory = 'coating' | 'window' | 'body' | 'chemical' | 'interior';

export interface ServiceOption {
  id: string;
  name: string;
  description: string;
  price: number;
  time: string;
  popular: boolean;
  category: ServiceOptionCategory;
}

export const CATEGORY_LABELS: Record<string, string> = {
  coating: 'コーティング系',
  window: 'ウィンドウ系',
  body: 'ボディ系',
  chemical: 'ケミカル系',
  interior: '車内系',
};

export const DEFAULT_SERVICE_OPTIONS: ServiceOption[] = [
  // Coating
  { id: 'window-full', name: '超撥水ウィンドウコーティング（全面）', description: '雨の日の視界を良好に', price: 8270, time: '15分', popular: true, category: 'window' },
  { id: 'wheel-single', name: 'ホイールコーティング（シングル）', description: 'ガラス被膜でホイールを保護', price: 10700, time: '30分', popular: true, category: 'coating' },
  { id: 'lens', name: 'レンズコーティング', description: '専用ガラス被膜でライトレンズを保護', price: 6810, time: '30分', popular: true, category: 'coating' },
  { id: 'headlight', name: 'ヘッドライトクリーン＆コーティング', description: '黄ばみ・くすみを除去しコーティング', price: 11630, time: '45分', popular: false, category: 'coating' },
  { id: 'wheel-double', name: 'ホイールコーティング（ダブル）', description: 'より艶と水弾きを長期間キープ', price: 15900, time: '90分', popular: false, category: 'coating' },
  { id: 'fender', name: '樹脂フェンダーキーパー', description: '無塗装樹脂パーツの色褪せを防止', price: 6280, time: '30分', popular: false, category: 'coating' },
  // Window
  { id: 'window-front', name: '超撥水ウィンドウコーティング（フロント）', description: 'フロントガラスのみ施工', price: 3720, time: '15分', popular: false, category: 'window' },
  { id: 'window-scale', name: 'ウィンドウウロコ取り（サイド）', description: '窓ガラスの水垢・ウロコを除去', price: 6480, time: '10分/枚', popular: false, category: 'window' },
  { id: 'window-scale-full', name: 'ウィンドウウロコ取り（全面）', description: 'フロント・リア・ルーフ含む全面', price: 12970, time: '10分/枚', popular: false, category: 'window' },
  // Body
  { id: 'polish', name: '細密研磨', description: '塗装表面のキズのエッジを細密に磨き取る', price: 18600, time: '60分', popular: false, category: 'body' },
  // Chemical
  { id: 'oil-film-full', name: '油膜取り（全面）', description: 'ギラギラの油膜を特殊ケミカルで除去', price: 4750, time: '15分', popular: false, category: 'chemical' },
  { id: 'oil-film-front', name: '油膜取り（フロント）', description: 'フロントガラスのみ', price: 1690, time: '10分', popular: false, category: 'chemical' },
  { id: 'iron', name: '鉄粉取り（上面）', description: 'ボディのザラザラ鉄粉をすっきり除去', price: 2830, time: '15分', popular: false, category: 'chemical' },
  { id: 'sap', name: '樹液取り', description: '松ヤニ等を専用ケミカルで安全に除去', price: 2750, time: '15分', popular: false, category: 'chemical' },
  { id: 'wheel-clean', name: 'ホイールクリーニング', description: 'ブレーキダスト・油汚れを専用道具で除去', price: 2270, time: '10分', popular: false, category: 'chemical' },
  // Interior
  { id: 'disinfect', name: '車内除菌抗菌「オールクリア」', description: '車内清掃＋除菌・抗菌処理', price: 4650, time: '30分', popular: false, category: 'interior' },
];
