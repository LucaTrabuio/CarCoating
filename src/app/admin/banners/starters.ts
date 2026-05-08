/**
 * Built-in starter templates for the banner maker.
 * Each starter seeds a new draft with working HTML + CSS the user can tweak.
 */

import type { TemplateField } from '@/lib/banner-presets-shared';

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  mode: 'structured' | 'html' | 'combined';
  /** When true, the starter seeds a parameterized template. Fields auto-extract on first use. */
  is_template?: boolean;
  /** Explicit field schema (with polished labels). Overrides auto-extraction when set. */
  fields?: TemplateField[];
  structured?: {
    title: string;
    subtitle: string;
    original_price: number;
    discount_rate: number;
    link_url: string;
    custom_css: string;
  };
  html_content?: { html: string; css: string };
  combined_content?: { source: string };
}

export const STARTERS: StarterTemplate[] = [
  {
    id: 'sale',
    name: 'セールバナー',
    description: '大きな割引率を強調したキャンペーン向け',
    emoji: '🏷️',
    mode: 'html',
    is_template: true,
    fields: [
      { key: 'badge', label: 'バッジ', type: 'text', default: 'SALE', editable: true, origin: 'html' },
      { key: 'title', label: 'タイトル', type: 'text', default: '春のキャンペーン', editable: true, origin: 'html' },
      { key: 'subtitle', label: 'サブタイトル', type: 'text', default: 'Web予約限定・期間中ずっと', editable: true, origin: 'html' },
      { key: 'amount', label: '割引率（表示文言）', type: 'text', default: '最大20%', editable: true, origin: 'html' },
      { key: 'off_label', label: 'OFF ラベル', type: 'text', default: 'OFF', editable: true, origin: 'html' },
    ],
    html_content: {
      html: `<div class="sale-banner">
  <div class="sale-badge">{{badge}}</div>
  <h3 class="sale-title">{{title}}</h3>
  <p class="sale-sub">{{subtitle}}</p>
  <div class="sale-price">
    <span class="sale-amount">{{amount}}</span>
    <span class="sale-off">{{off_label}}</span>
  </div>
</div>`,
      css: `.sale-banner {
  position: relative;
  padding: 2.5rem 2rem;
  background: linear-gradient(135deg, #0C3290 0%, #1e3a8a 100%);
  color: white;
  text-align: center;
  overflow: hidden;
}
.sale-banner::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 20% 20%, rgba(240,234,1,0.25), transparent 40%);
  pointer-events: none;
}
.sale-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #F0EA01;
  color: #0C3290;
  font-weight: 800;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  border-radius: 999px;
  margin-bottom: 0.75rem;
}
.sale-title {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0 0 0.25rem;
  letter-spacing: 0.02em;
}
.sale-sub {
  font-size: 0.8rem;
  opacity: 0.75;
  margin: 0 0 1.25rem;
}
.sale-price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.25rem;
}
.sale-amount {
  font-size: 3rem;
  font-weight: 900;
  color: #F0EA01;
  line-height: 1;
}
.sale-off {
  font-size: 1.1rem;
  font-weight: 800;
  color: #F0EA01;
}`,
    },
  },
  {
    id: 'announcement',
    name: 'お知らせ',
    description: 'シンプルな告知・ニュース向け',
    emoji: '📣',
    mode: 'html',
    is_template: true,
    fields: [
      { key: 'label', label: 'カテゴリ', type: 'text', default: 'お知らせ', editable: true, origin: 'html' },
      { key: 'title', label: '見出し', type: 'text', default: '年末年始の営業時間について', editable: true, origin: 'html' },
      { key: 'body', label: '本文', type: 'textarea', default: '12月29日〜1月3日は休業とさせていただきます。', editable: true, origin: 'html' },
    ],
    html_content: {
      html: `<div class="ann-banner">
  <div class="ann-accent"></div>
  <div class="ann-body">
    <div class="ann-label">{{label}}</div>
    <h3 class="ann-title">{{title}}</h3>
    <p class="ann-text">{{body}}</p>
  </div>
</div>`,
      css: `.ann-banner {
  display: flex;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  overflow: hidden;
}
.ann-accent {
  width: 6px;
  background: #0C3290;
  flex-shrink: 0;
}
.ann-body {
  padding: 1.25rem 1.5rem;
  flex: 1;
}
.ann-label {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  background: #eff6ff;
  color: #0C3290;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}
.ann-title {
  font-size: 1rem;
  font-weight: 700;
  color: #111;
  margin: 0 0 0.25rem;
}
.ann-text {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}`,
    },
  },
  {
    id: 'cta',
    name: 'CTA カード',
    description: 'ボタン誘導型のコンパクトなバナー',
    emoji: '🎯',
    mode: 'html',
    is_template: true,
    fields: [
      { key: 'title', label: '見出し', type: 'text', default: '無料で見積もりを試す', editable: true, origin: 'html' },
      { key: 'description', label: '説明文', type: 'textarea', default: '車種とサイズを選ぶだけで、Web割引後の料金をその場で確認できます。', editable: true, origin: 'html' },
      { key: 'button_text', label: 'ボタン文言', type: 'text', default: '見積もりシミュレーターへ →', editable: true, origin: 'html' },
    ],
    html_content: {
      html: `<div class="cta-card">
  <h3 class="cta-title">{{title}}</h3>
  <p class="cta-desc">{{description}}</p>
  <span class="cta-button">{{button_text}}</span>
</div>`,
      css: `.cta-card {
  padding: 2rem;
  background: #F0EA01;
  color: #0C3290;
  text-align: center;
}
.cta-title {
  font-size: 1.25rem;
  font-weight: 800;
  margin: 0 0 0.5rem;
}
.cta-desc {
  font-size: 0.85rem;
  margin: 0 0 1.25rem;
  opacity: 0.85;
  line-height: 1.6;
}
.cta-button {
  display: inline-block;
  padding: 0.75rem 1.75rem;
  background: #0C3290;
  color: #F0EA01;
  font-weight: 700;
  font-size: 0.85rem;
  border-radius: 999px;
}`,
    },
  },
  {
    id: 'minimal',
    name: 'ミニマル',
    description: '画像＋タイトルのみ、控えめな紹介バナー',
    emoji: '🖼️',
    mode: 'structured',
    structured: {
      title: 'プレミアムコーティング',
      subtitle: '最高品質の仕上がりを、最短2時間で。',
      original_price: 0,
      discount_rate: 0,
      link_url: '',
      custom_css: `.banner-custom-wrapper { background: #fafafa; }`,
    },
  },
  {
    id: 'hero',
    name: 'ヒーロー風',
    description: 'フルカラー背景＋大きな見出し',
    emoji: '✨',
    mode: 'html',
    is_template: true,
    fields: [
      { key: 'tag', label: 'タグ', type: 'text', default: 'NEW', editable: true, origin: 'html' },
      { key: 'title', label: '見出し', type: 'text', default: 'DIA Ⅱ コーティング登場', editable: true, origin: 'html' },
      { key: 'subtitle', label: '説明文', type: 'textarea', default: '最新世代の超撥水被膜技術で、新車の輝きを最大5年間。', editable: true, origin: 'html' },
    ],
    html_content: {
      html: `<div class="hero-banner">
  <div class="hero-grid"></div>
  <div class="hero-content">
    <div class="hero-tag">{{tag}}</div>
    <h2 class="hero-title">{{title}}</h2>
    <p class="hero-sub">{{subtitle}}</p>
  </div>
</div>`,
      css: `.hero-banner {
  position: relative;
  padding: 3rem 2rem;
  background: linear-gradient(120deg, #0a1e5a 0%, #0C3290 50%, #1e40af 100%);
  color: white;
  overflow: hidden;
}
.hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(ellipse at top right, black, transparent 70%);
}
.hero-content {
  position: relative;
}
.hero-tag {
  display: inline-block;
  padding: 0.2rem 0.7rem;
  background: #F0EA01;
  color: #0C3290;
  font-weight: 800;
  font-size: 0.65rem;
  letter-spacing: 0.15em;
  border-radius: 999px;
  margin-bottom: 0.75rem;
}
.hero-title {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0 0 0.5rem;
  letter-spacing: 0.01em;
  line-height: 1.2;
}
.hero-sub {
  font-size: 0.85rem;
  opacity: 0.8;
  margin: 0;
  max-width: 32rem;
  line-height: 1.6;
}`,
    },
  },
  {
    id: 'pasted-snippet',
    name: 'ウィンター限定カード',
    description: 'HTMLと<style>を1つの入力に貼り付ける「コンバイン」モードの例',
    emoji: '🧷',
    mode: 'combined',
    is_template: true,
    fields: [
      { key: 'title', label: '見出し', type: 'text', default: 'ウィンター限定コース', editable: true, origin: 'html' },
      { key: 'description', label: '説明文', type: 'textarea', default: '冬季メンテナンス＋撥水処理を特別価格で', editable: true, origin: 'html' },
      { key: 'button_text', label: 'ボタン文言', type: 'text', default: '予約する →', editable: true, origin: 'html' },
    ],
    combined_content: {
      source: `<style>
  .p-card {
    padding: 2rem;
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border-radius: 1rem;
    text-align: center;
    color: #92400e;
  }
  .p-card h3 {
    font-size: 1.5rem;
    font-weight: 800;
    margin: 0 0 0.5rem;
  }
  .p-card p {
    font-size: 0.85rem;
    margin: 0 0 1rem;
    opacity: 0.85;
  }
  .p-card a {
    display: inline-block;
    padding: 0.6rem 1.25rem;
    background: #92400e;
    color: #fef3c7;
    border-radius: 999px;
    font-weight: 700;
    font-size: 0.8rem;
    text-decoration: none;
  }
</style>

<div class="p-card">
  <h3>{{title}}</h3>
  <p>{{description}}</p>
  <a href="#">{{button_text}}</a>
</div>`,
    },
  },
  // ─── Car coating / detailing industry templates (parameterized) ──

  {
    id: 'coating-campaign',
    name: 'コーティングキャンペーン',
    description: '季節キャンペーン用。割引率とキャッチコピーを差し替え',
    emoji: '🚗',
    mode: 'combined',
    is_template: true,
    fields: [
      { key: 'season', label: 'シーズン名', type: 'text', default: '春', editable: true, origin: 'html' },
      { key: 'headline', label: '見出し', type: 'text', default: '新車の輝きを取り戻す', editable: true, origin: 'html' },
      { key: 'discount', label: '割引率', type: 'number', default: '20', unit: '', editable: true, origin: 'html' },
      { key: 'deadline', label: '期限', type: 'text', default: '4月30日まで', editable: true, origin: 'html' },
      { key: 'cta', label: 'ボタン文言', type: 'text', default: '予約する', editable: true, origin: 'html' },
      { key: 'accent', label: 'アクセントカラー', type: 'color', default: '#F0EA01', editable: true, origin: 'css' },
      { key: 'base', label: '背景カラー', type: 'color', default: '#0C3290', editable: true, origin: 'css' },
    ],
    combined_content: {
      source: `<style>
  .cc-wrap {
    position: relative;
    padding: 2.5rem 2rem;
    background: linear-gradient(135deg, var(--base, #0C3290) 0%, #0a2a7a 60%, #050e30 100%);
    color: white;
    overflow: hidden;
    font-family: system-ui, -apple-system, "Noto Sans JP", sans-serif;
  }
  .cc-wrap::before {
    content: '';
    position: absolute;
    top: -40%;
    right: -20%;
    width: 60%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(circle at center, var(--accent, #F0EA01) 0%, transparent 60%);
    opacity: 0.35;
    filter: blur(12px);
  }
  .cc-season {
    display: inline-block;
    padding: 0.25rem 0.85rem;
    background: var(--accent, #F0EA01);
    color: var(--base, #0C3290);
    font-weight: 800;
    font-size: 0.7rem;
    letter-spacing: 0.15em;
    border-radius: 999px;
  }
  .cc-headline {
    font-size: 1.85rem;
    font-weight: 800;
    margin: 0.9rem 0 0.25rem;
    letter-spacing: 0.02em;
    line-height: 1.25;
  }
  .cc-rate {
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
    margin: 1.2rem 0 0.5rem;
    position: relative;
  }
  .cc-rate .n {
    font-size: 4rem;
    font-weight: 900;
    color: var(--accent, #F0EA01);
    line-height: 0.9;
  }
  .cc-rate .p { font-size: 1.5rem; color: var(--accent, #F0EA01); font-weight: 800; }
  .cc-rate .off { font-size: 1rem; margin-left: 0.35rem; font-weight: 700; opacity: 0.85; }
  .cc-deadline { font-size: 0.75rem; opacity: 0.65; letter-spacing: 0.05em; }
  .cc-cta {
    display: inline-block;
    margin-top: 1.5rem;
    padding: 0.75rem 1.75rem;
    background: var(--accent, #F0EA01);
    color: var(--base, #0C3290);
    font-weight: 800;
    font-size: 0.85rem;
    border-radius: 999px;
    text-decoration: none;
  }
</style>

<div class="cc-wrap">
  <span class="cc-season">{{season}}のキャンペーン</span>
  <h2 class="cc-headline">{{headline}}</h2>
  <div class="cc-rate">
    <span class="n">{{discount}}</span>
    <span class="p">%</span>
    <span class="off">OFF</span>
  </div>
  <div class="cc-deadline">Web予約限定 · {{deadline}}</div>
  <a class="cc-cta" href="#">{{cta}} →</a>
</div>`,
    },
  },

  {
    id: 'coating-warranty',
    name: '保証バッジ',
    description: 'コーティングの耐久年数と保証を訴求',
    emoji: '🛡️',
    mode: 'combined',
    is_template: true,
    fields: [
      { key: 'tier_name', label: 'コース名', type: 'text', default: 'ダイヤモンドキーパー', editable: true, origin: 'html' },
      { key: 'years', label: '耐久年数', type: 'number', default: '3', unit: '', editable: true, origin: 'html' },
      { key: 'description', label: '説明文', type: 'textarea', default: '深い艶と強力な撥水。一度の施工で長期間、新車の輝きを維持します。', editable: true, origin: 'html' },
      { key: 'badge_text', label: 'バッジ文字', type: 'text', default: 'プレミアム認定', editable: true, origin: 'html' },
      { key: 'primary', label: 'プライマリカラー', type: 'color', default: '#0C3290', editable: true, origin: 'css' },
    ],
    combined_content: {
      source: `<style>
  .ww-card {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1.25rem;
    align-items: center;
    padding: 1.5rem 1.75rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 1rem;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(12,50,144,0.06);
    font-family: system-ui, -apple-system, "Noto Sans JP", sans-serif;
  }
  .ww-shield {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, var(--primary, #0C3290), #0a1e5a);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.5rem;
    font-weight: 900;
    box-shadow: inset 0 -4px 10px rgba(0,0,0,0.25), 0 4px 12px rgba(12,50,144,0.3);
    flex-direction: column;
    line-height: 0.9;
  }
  .ww-shield .y { font-size: 1.3rem; }
  .ww-shield .label { font-size: 0.55rem; opacity: 0.8; margin-top: 2px; letter-spacing: 0.1em; }
  .ww-body { min-width: 0; }
  .ww-badge {
    display: inline-block;
    padding: 0.15rem 0.6rem;
    background: color-mix(in srgb, var(--primary, #0C3290) 10%, white);
    color: var(--primary, #0C3290);
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    border-radius: 4px;
    margin-bottom: 0.3rem;
  }
  .ww-title {
    margin: 0 0 0.25rem;
    font-size: 1.1rem;
    font-weight: 800;
    color: #111;
  }
  .ww-desc {
    margin: 0;
    font-size: 0.8rem;
    color: #6b7280;
    line-height: 1.55;
  }
</style>

<div class="ww-card">
  <div class="ww-shield">
    <span class="y">{{years}}年</span>
    <span class="label">WARRANTY</span>
  </div>
  <div class="ww-body">
    <span class="ww-badge">{{badge_text}}</span>
    <h3 class="ww-title">{{tier_name}}</h3>
    <p class="ww-desc">{{description}}</p>
  </div>
</div>`,
    },
  },

  {
    id: 'coating-testimonial',
    name: 'お客様の声',
    description: 'レビューカード。星評価＋コメント',
    emoji: '💬',
    mode: 'combined',
    is_template: true,
    fields: [
      { key: 'quote', label: 'コメント', type: 'textarea', default: '施工後のボディがまるで新車のような輝きで、洗車が楽しくなりました。丁寧な対応にも感謝しています。', editable: true, origin: 'html' },
      { key: 'customer_name', label: 'お客様名', type: 'text', default: '田中 様', editable: true, origin: 'html' },
      { key: 'car_model', label: '車種', type: 'text', default: 'トヨタ アルファード', editable: true, origin: 'html' },
      { key: 'service_name', label: 'ご利用コース', type: 'text', default: 'ダイヤモンドキーパー', editable: true, origin: 'html' },
    ],
    combined_content: {
      source: `<style>
  .tt-card {
    position: relative;
    padding: 1.75rem 1.75rem 1.5rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 1rem;
    font-family: system-ui, -apple-system, "Noto Sans JP", sans-serif;
  }
  .tt-quote-mark {
    position: absolute;
    top: 0.75rem;
    left: 1.5rem;
    font-size: 4rem;
    font-weight: 900;
    color: #F0EA01;
    line-height: 1;
    opacity: 0.7;
  }
  .tt-stars {
    color: #F0EA01;
    font-size: 1rem;
    letter-spacing: 0.1em;
    margin-bottom: 0.75rem;
  }
  .tt-quote {
    position: relative;
    padding-top: 0.25rem;
    margin: 0 0 1.25rem;
    font-size: 0.95rem;
    line-height: 1.7;
    color: #111;
  }
  .tt-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding-top: 1rem;
    border-top: 1px solid #f3f4f6;
  }
  .tt-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #0C3290, #1e40af);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1rem;
  }
  .tt-who { flex: 1; min-width: 0; }
  .tt-name { font-size: 0.85rem; font-weight: 700; color: #111; }
  .tt-desc { font-size: 0.7rem; color: #6b7280; }
  .tt-chip {
    flex-shrink: 0;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.25rem 0.6rem;
    background: #eff6ff;
    color: #0C3290;
    border-radius: 4px;
  }
</style>

<div class="tt-card">
  <div class="tt-quote-mark">"</div>
  <div class="tt-stars">★★★★★</div>
  <p class="tt-quote">{{quote}}</p>
  <div class="tt-meta">
    <div class="tt-avatar">{{customer_name}}</div>
    <div class="tt-who">
      <div class="tt-name">{{customer_name}}</div>
      <div class="tt-desc">{{car_model}}</div>
    </div>
    <span class="tt-chip">{{service_name}}</span>
  </div>
</div>`,
    },
  },

  {
    id: 'coating-booking-cta',
    name: '予約誘導 CTA',
    description: '電話・LINE・Web の予約導線',
    emoji: '📞',
    mode: 'combined',
    is_template: true,
    fields: [
      { key: 'headline', label: '見出し', type: 'text', default: 'まずはお気軽にご相談ください', editable: true, origin: 'html' },
      { key: 'sub', label: 'サブ見出し', type: 'text', default: 'お車の状態を確認し最適なコースをご提案します', editable: true, origin: 'html' },
      { key: 'tel', label: '電話番号', type: 'text', default: '0120-000-000', editable: true, origin: 'html' },
      { key: 'hours', label: '営業時間', type: 'text', default: '10:00 - 19:00 / 年中無休', editable: true, origin: 'html' },
      { key: 'bg', label: '背景カラー', type: 'color', default: '#0C3290', editable: true, origin: 'css' },
    ],
    combined_content: {
      source: `<style>
  .bc-wrap {
    padding: 2rem 1.75rem;
    background: var(--bg, #0C3290);
    color: white;
    border-radius: 1rem;
    text-align: center;
    font-family: system-ui, -apple-system, "Noto Sans JP", sans-serif;
    overflow: hidden;
    position: relative;
  }
  .bc-wrap::after {
    content: '';
    position: absolute;
    bottom: -30%;
    left: 50%;
    transform: translateX(-50%);
    width: 110%;
    aspect-ratio: 4 / 1;
    background: radial-gradient(ellipse at center, rgba(240,234,1,0.2), transparent 70%);
    pointer-events: none;
  }
  .bc-head {
    font-size: 1.25rem;
    font-weight: 800;
    margin: 0 0 0.35rem;
    position: relative;
  }
  .bc-sub {
    font-size: 0.8rem;
    opacity: 0.75;
    margin: 0 0 1.5rem;
    position: relative;
  }
  .bc-tel {
    position: relative;
    display: inline-block;
    padding: 0.5rem 1rem 0.5rem 2.5rem;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 999px;
    font-weight: 800;
    letter-spacing: 0.05em;
    font-size: 1.25rem;
    color: white;
    text-decoration: none;
  }
  .bc-tel::before {
    content: '☎';
    position: absolute;
    left: 0.85rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1rem;
  }
  .bc-hours {
    display: block;
    margin-top: 0.75rem;
    font-size: 0.7rem;
    opacity: 0.6;
    position: relative;
  }
</style>

<div class="bc-wrap">
  <h3 class="bc-head">{{headline}}</h3>
  <p class="bc-sub">{{sub}}</p>
  <a class="bc-tel" href="tel:{{tel}}">{{tel}}</a>
  <span class="bc-hours">{{hours}}</span>
</div>`,
    },
  },

  {
    id: 'coating-new-service',
    name: '新コース登場',
    description: '新しいコーティングメニューの告知',
    emoji: '✨',
    mode: 'combined',
    is_template: true,
    fields: [
      { key: 'service', label: 'コース名', type: 'text', default: 'EX キーパー Ultra', editable: true, origin: 'html' },
      { key: 'tagline', label: 'キャッチコピー', type: 'text', default: '5年保証の最新世代', editable: true, origin: 'html' },
      { key: 'feature_1', label: '特徴 1', type: 'text', default: '超撥水 × 深艶', editable: true, origin: 'html' },
      { key: 'feature_2', label: '特徴 2', type: 'text', default: '傷埋め効果', editable: true, origin: 'html' },
      { key: 'feature_3', label: '特徴 3', type: 'text', default: '5年保証', editable: true, origin: 'html' },
    ],
    combined_content: {
      source: `<style>
  .ns-card {
    position: relative;
    padding: 2rem 1.75rem;
    background: linear-gradient(140deg, #fafafa 0%, #ffffff 60%);
    border: 1px solid #e5e7eb;
    border-radius: 1rem;
    overflow: hidden;
    font-family: system-ui, -apple-system, "Noto Sans JP", sans-serif;
  }
  .ns-glow {
    position: absolute;
    top: -30%;
    right: -20%;
    width: 50%;
    aspect-ratio: 1;
    background: radial-gradient(circle, rgba(240,234,1,0.45), transparent 60%);
    filter: blur(18px);
    pointer-events: none;
  }
  .ns-tag {
    display: inline-block;
    padding: 0.2rem 0.65rem;
    background: #0C3290;
    color: #F0EA01;
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.2em;
    border-radius: 4px;
    margin-bottom: 0.75rem;
    position: relative;
  }
  .ns-title {
    margin: 0 0 0.25rem;
    font-size: 1.5rem;
    font-weight: 900;
    color: #0C3290;
    letter-spacing: 0.01em;
    position: relative;
  }
  .ns-tagline {
    margin: 0 0 1.25rem;
    font-size: 0.8rem;
    color: #6b7280;
    position: relative;
  }
  .ns-features {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    position: relative;
  }
  .ns-feature {
    padding: 0.75rem 0.5rem;
    background: white;
    border: 1px solid #f3f4f6;
    border-radius: 0.5rem;
    text-align: center;
    font-size: 0.7rem;
    font-weight: 700;
    color: #0C3290;
    line-height: 1.35;
  }
  .ns-feature::before {
    content: '✦';
    display: block;
    color: #F0EA01;
    margin-bottom: 0.25rem;
    font-size: 0.85rem;
  }
</style>

<div class="ns-card">
  <div class="ns-glow"></div>
  <span class="ns-tag">NEW</span>
  <h2 class="ns-title">{{service}}</h2>
  <p class="ns-tagline">{{tagline}}</p>
  <div class="ns-features">
    <div class="ns-feature">{{feature_1}}</div>
    <div class="ns-feature">{{feature_2}}</div>
    <div class="ns-feature">{{feature_3}}</div>
  </div>
</div>`,
    },
  },

  {
    id: 'ribbon',
    name: 'リボン付き',
    description: '左上のリボンでアテンションを集める',
    emoji: '🎀',
    mode: 'html',
    is_template: true,
    fields: [
      { key: 'ribbon_text', label: 'リボン文字', type: 'text', default: 'Featured', editable: true, origin: 'html' },
      { key: 'title', label: '見出し', type: 'text', default: 'プロが選ぶ No.1 コース', editable: true, origin: 'html' },
      { key: 'body', label: '本文', type: 'textarea', default: '耐久5年・プレミアムな艶と撥水を、一度の施工で。', editable: true, origin: 'html' },
    ],
    html_content: {
      html: `<div class="rb-banner">
  <div class="rb-ribbon">{{ribbon_text}}</div>
  <div class="rb-body">
    <h3 class="rb-title">{{title}}</h3>
    <p class="rb-text">{{body}}</p>
  </div>
</div>`,
      css: `.rb-banner {
  position: relative;
  padding: 2rem;
  padding-left: 2.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  overflow: hidden;
}
.rb-ribbon {
  position: absolute;
  top: 1rem;
  left: -2.25rem;
  padding: 0.2rem 2.5rem;
  background: #ef4444;
  color: white;
  font-weight: 700;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  transform: rotate(-45deg);
}
.rb-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #0C3290;
  margin: 0 0 0.5rem;
}
.rb-text {
  font-size: 0.85rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.6;
}`,
    },
  },
];
