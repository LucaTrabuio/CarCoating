# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> Site Navigation >> Header navigation (desktop) >> desktop nav has reviews link
- Location: tests/navigation.spec.ts:46:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('nav a[href="/eniwa/reviews"]')
Expected: visible
Error: strict mode violation: locator('nav a[href="/eniwa/reviews"]') resolved to 2 elements:
    1) <a href="/eniwa/reviews" class="text-gray-600 text-[13px] hover:text-black transition-colors">お客様の声</a> aka getByRole('banner').getByRole('link', { name: 'お客様の声' })
    2) <a href="/eniwa/reviews" class="hover:text-white transition-colors">お客様の声</a> aka getByRole('contentinfo').getByRole('link', { name: 'お客様の声' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('nav a[href="/eniwa/reviews"]')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "KeePer 恵庭店" [ref=e4] [cursor=pointer]:
        - /url: /eniwa
        - img "KeePer" [ref=e5]
        - generic [ref=e6]: 恵庭店
      - navigation [ref=e7]:
        - link "ホーム" [ref=e8] [cursor=pointer]:
          - /url: /eniwa
        - button "メニュー ▾" [ref=e10] [cursor=pointer]
        - link "見積もり" [ref=e11] [cursor=pointer]:
          - /url: /eniwa/price
        - link "ガイド" [ref=e12] [cursor=pointer]:
          - /url: /eniwa/guide
        - link "施工事例" [ref=e13] [cursor=pointer]:
          - /url: /eniwa/cases
        - link "お客様の声" [ref=e14] [cursor=pointer]:
          - /url: /eniwa/reviews
        - link "ご予約" [ref=e15] [cursor=pointer]:
          - /url: /eniwa/booking
        - link "お問い合わせ" [ref=e16] [cursor=pointer]:
          - /url: /eniwa/inquiry
      - link "☎ 0800-812-8203" [ref=e18] [cursor=pointer]:
        - /url: tel:0800-812-8203
  - generic [ref=e19]:
    - generic [ref=e21]:
      - generic [ref=e22]: 春の新生活キャンペーン ｜ 最大15%OFF ｜ Web予約限定 ｜ 2026-04-30まで
      - generic [ref=e23]: 春の新生活キャンペーン ｜ 最大15%OFF ｜ Web予約限定 ｜ 2026-04-30まで
      - generic [ref=e24]: 春の新生活キャンペーン ｜ 最大15%OFF ｜ Web予約限定 ｜ 2026-04-30まで
      - generic [ref=e25]: 春の新生活キャンペーン ｜ 最大15%OFF ｜ Web予約限定 ｜ 2026-04-30まで
    - main [ref=e26]:
      - generic [ref=e27]:
        - img "恵庭店" [ref=e28]
        - generic [ref=e31]:
          - heading "洗車だけで、この輝きが続く。" [level=1] [ref=e32]
          - paragraph [ref=e33]: 恵庭店 ｜ KeePer PRO SHOP認定
          - generic [ref=e34]:
            - link "予約する" [ref=e35] [cursor=pointer]:
              - /url: /eniwa/booking
            - link "お問い合わせ" [ref=e36] [cursor=pointer]:
              - /url: /eniwa/booking?mode=inquiry
      - generic [ref=e38]:
        - img "カーコーティング専門店 KeePer PRO SHOP" [ref=e41]
        - img "ダイヤⅡキーパー 25%OFF キャンペーン" [ref=e44]
        - img "純水仕上げで最高品質" [ref=e47]
        - img "コーティング専用ブース完備" [ref=e50]
      - generic [ref=e53]:
        - heading "選ばれる6つの理由" [level=2] [ref=e54]
        - generic [ref=e55]:
          - generic [ref=e56]:
            - generic [ref=e57]: 🛡️
            - heading "最高品質のコーティング" [level=3] [ref=e58]
            - paragraph [ref=e59]: KeePer技研が開発した最先端のコーティング技術を使用
          - generic [ref=e60]:
            - generic [ref=e61]: 👨‍🔧
            - heading "技術認定スタッフ" [level=3] [ref=e62]
            - paragraph [ref=e63]: 全スタッフがKeePer技術資格を保有
          - generic [ref=e64]:
            - generic [ref=e65]: ⏱️
            - heading "短時間施工" [level=3] [ref=e66]
            - paragraph [ref=e67]: 最短2時間からの施工が可能
          - generic [ref=e68]:
            - generic [ref=e69]: 💰
            - heading "Web限定割引" [level=3] [ref=e70]
            - paragraph [ref=e71]: ホームページからのご予約で特別割引
          - generic [ref=e72]:
            - generic [ref=e73]: 🏢
            - heading "専用ブース完備" [level=3] [ref=e74]
            - paragraph [ref=e75]: コーティング専用の施工ブースで丁寧に仕上げ
          - generic [ref=e76]:
            - generic [ref=e77]: 📋
            - heading "アフターサポート" [level=3] [ref=e78]
            - paragraph [ref=e79]: メンテナンスプログラムで美しさを長期維持
      - generic [ref=e82]:
        - heading "よくあるご質問" [level=2] [ref=e83]
        - generic [ref=e84]:
          - button "コーティングは本当に必要ですか？ +" [ref=e86] [cursor=pointer]:
            - generic [ref=e87]: コーティングは本当に必要ですか？
            - generic [ref=e88]: +
          - button "施工時間はどのくらいですか？ +" [ref=e90] [cursor=pointer]:
            - generic [ref=e91]: 施工時間はどのくらいですか？
            - generic [ref=e92]: +
          - button "雨の日でも効果がありますか？ +" [ref=e94] [cursor=pointer]:
            - generic [ref=e95]: 雨の日でも効果がありますか？
            - generic [ref=e96]: +
          - button "メンテナンスは必要ですか？ +" [ref=e98] [cursor=pointer]:
            - generic [ref=e99]: メンテナンスは必要ですか？
            - generic [ref=e100]: +
          - button "他社との違いは何ですか？ +" [ref=e102] [cursor=pointer]:
            - generic [ref=e103]: 他社との違いは何ですか？
            - generic [ref=e104]: +
          - button "予約なしでも大丈夫ですか？ +" [ref=e106] [cursor=pointer]:
            - generic [ref=e107]: 予約なしでも大丈夫ですか？
            - generic [ref=e108]: +
      - generic [ref=e111]:
        - generic [ref=e112]:
          - paragraph [ref=e113]: COATING QUIZ
          - heading "あなたにぴったりのコースは？" [level=2] [ref=e114]
          - paragraph [ref=e115]: 4つの質問に答えるだけ（30秒）
        - button "診断スタート" [ref=e117] [cursor=pointer]
      - generic [ref=e120]:
        - heading "かんたん見積もり" [level=2] [ref=e121]
        - paragraph [ref=e122]: 車種を選ぶだけで料金がわかります
        - generic [ref=e124]:
          - generic [ref=e125]:
            - generic [ref=e126]: メーカー
            - combobox [ref=e127] [cursor=pointer]:
              - option "選択してください" [selected]
              - option "トヨタ"
              - option "ホンダ"
              - option "日産"
              - option "マツダ"
              - option "スバル"
              - option "スズキ"
              - option "ダイハツ"
              - option "三菱"
              - option "レクサス"
              - option "BMW"
              - option "メルセデス・ベンツ"
              - option "アウディ"
              - option "フォルクスワーゲン"
              - option "ポルシェ"
              - option "テスラ"
              - option "ボルボ"
          - generic [ref=e128]:
            - generic [ref=e129]: 車種
            - combobox [disabled] [ref=e130] [cursor=pointer]:
              - option "メーカーを先に選択" [selected]
        - button "見積もりシミュレーターへ →" [ref=e131] [cursor=pointer]
      - generic [ref=e134]:
        - heading "最近の施工事例" [level=2] [ref=e135]
        - generic [ref=e136]:
          - generic [ref=e137]:
            - img "テスラ モデル3" [ref=e139]
            - generic [ref=e140]:
              - paragraph [ref=e141]: テスラ モデル3
              - paragraph [ref=e142]: ダイヤⅡキーパー
          - generic [ref=e143]:
            - img "トヨタ スープラ" [ref=e145]
            - generic [ref=e146]:
              - paragraph [ref=e147]: トヨタ スープラ
              - paragraph [ref=e148]: ダイヤⅡキーパー
          - generic [ref=e149]:
            - img "テスラ モデルY" [ref=e151]
            - generic [ref=e152]:
              - paragraph [ref=e153]: テスラ モデルY
              - paragraph [ref=e154]: ダイヤⅡキーパー
          - generic [ref=e155]:
            - img "日産 セレナ" [ref=e157]
            - generic [ref=e158]:
              - paragraph [ref=e159]: 日産 セレナ
              - paragraph [ref=e160]: ダイヤⅡキーパー
        - link "施工事例をすべて見る →" [ref=e162] [cursor=pointer]:
          - /url: /eniwa/cases
      - generic [ref=e165]:
        - generic [ref=e166]:
          - heading "コーティング料金" [level=2] [ref=e167]
          - paragraph [ref=e168]: Web予約限定 最大15%OFF
        - generic [ref=e169]:
          - generic [ref=e170]:
            - heading "クリスタルキーパー" [level=3] [ref=e171]
            - paragraph [ref=e172]: 1年持続 | 約2時間〜
            - generic [ref=e173]: ¥15,470〜
            - paragraph [ref=e174]: SSサイズ・Web割後・税込
          - generic [ref=e175]:
            - generic [ref=e176]: 一番人気
            - heading "ダイヤモンドキーパー" [level=3] [ref=e177]
            - paragraph [ref=e178]: 3〜5年持続 | 4〜8時間
            - generic [ref=e179]: ¥44,455〜
            - paragraph [ref=e180]: SSサイズ・Web割後・税込
          - generic [ref=e181]:
            - heading "ダイヤⅡキーパー" [level=3] [ref=e182]
            - paragraph [ref=e183]: 3〜6年持続 | 6〜10時間
            - generic [ref=e184]: ¥53,805〜
            - paragraph [ref=e185]: SSサイズ・Web割後・税込
        - paragraph [ref=e186]:
          - link "全8コースの詳細を見る →" [ref=e187] [cursor=pointer]:
            - /url: /eniwa/coatings
      - generic [ref=e190]:
        - heading "お知らせ" [level=2] [ref=e191]
        - generic [ref=e192]:
          - generic [ref=e193]:
            - generic [ref=e194]: 2026-04-01
            - generic [ref=e195]: 春の新生活キャンペーン開始
            - paragraph [ref=e196]: クリスタル〜ダイヤⅡまで最大20%OFF。新車のお引き渡しに合わせてご予約ください。
          - generic [ref=e197]:
            - generic [ref=e198]: 2026-04-01
            - generic [ref=e199]: テスラ モデル3 ダイヤⅡキーパー施工事例
            - paragraph [ref=e200]: オーナー様のこだわりと丁寧な施工の記録をアップしました。
          - generic [ref=e201]:
            - generic [ref=e202]: 2026-03-25
            - generic [ref=e203]: GW期間中も通常営業
            - paragraph [ref=e204]: 4/29〜5/5も通常通り営業いたします。ご予約はお早めに。
          - generic [ref=e205]:
            - generic [ref=e206]: 2026-03-18
            - generic [ref=e207]: トヨタ86 EXキーパー施工
            - paragraph [ref=e208]: 濃色車の深い艶と耐久性、お客様からの声も掲載。
          - generic [ref=e209]:
            - generic [ref=e210]: 2026-03-10
            - generic [ref=e211]: コーティングガイド記事を5本公開
            - paragraph [ref=e212]: 初めての方向けの基礎知識・ワックス比較・施工後のお手入れまで。
      - generic [ref=e215]:
        - heading "ご利用の流れ" [level=2] [ref=e216]
        - generic [ref=e217]:
          - generic [ref=e218]:
            - generic [ref=e220]: "1"
            - generic [ref=e222]:
              - heading "お見積もり・ご相談" [level=3] [ref=e223]
              - paragraph [ref=e224]: お車の状態を確認し、最適なコースをご提案します。
          - generic [ref=e225]:
            - generic [ref=e227]: "2"
            - generic [ref=e229]:
              - heading "ご予約・ご来店" [level=3] [ref=e230]
              - paragraph [ref=e231]: ご都合の良い日時でご予約いただき、お車をお持ちください。
          - generic [ref=e232]:
            - generic [ref=e234]: "3"
            - generic [ref=e235]:
              - heading "施工・お引き渡し" [level=3] [ref=e236]
              - paragraph [ref=e237]: 専用ブースで丁寧に施工し、仕上がりをご確認いただきます。
      - generic [ref=e240]:
        - heading "Web予約限定 5つの特典" [level=2] [ref=e241]
        - paragraph [ref=e242]: 最大15%OFFの割引をはじめ、特典が充実
        - generic [ref=e243]:
          - list [ref=e244]:
            - listitem [ref=e245]:
              - generic [ref=e246]: "1"
              - generic [ref=e247]: Web予約限定の特別割引
            - listitem [ref=e248]:
              - generic [ref=e249]: "2"
              - generic [ref=e250]: 技術認定スタッフによる施工
            - listitem [ref=e251]:
              - generic [ref=e252]: "3"
              - generic [ref=e253]: 施工後のアフターサポート
            - listitem [ref=e254]:
              - generic [ref=e255]: "4"
              - generic [ref=e256]: 代車無料サービス
            - listitem [ref=e257]:
              - generic [ref=e258]: "5"
              - generic [ref=e259]: 各種お支払い方法に対応
          - generic [ref=e260]:
            - link "Web予約する" [ref=e261] [cursor=pointer]:
              - /url: /eniwa/booking
            - link "お問い合わせ" [ref=e262] [cursor=pointer]:
              - /url: /eniwa/booking?mode=inquiry
      - generic [ref=e265]:
        - heading "アクセス" [level=2] [ref=e266]
        - iframe [ref=e268]
        - generic [ref=e269]:
          - generic [ref=e270]:
            - generic [ref=e271]: 住所
            - generic [ref=e272]: 北海道恵庭市和光町１丁目８番１号
          - generic [ref=e273]:
            - generic [ref=e274]: 営業時間
            - generic [ref=e275]: 9:00〜18:00
          - generic [ref=e276]:
            - generic [ref=e277]: 定休日
            - generic [ref=e278]: 年中無休
          - generic [ref=e279]:
            - generic [ref=e280]: 電話番号
            - link "0800-812-8203" [ref=e282] [cursor=pointer]:
              - /url: tel:0800-812-8203
          - generic [ref=e283]:
            - generic [ref=e284]: 最寄り駅
            - generic [ref=e285]: 恵庭駅から車で5分（）、千歳駅から車で13分（）、北広島駅から車で20分（）
      - generic [ref=e288]:
        - heading "お気軽にお問い合わせください" [level=2] [ref=e289]
        - paragraph [ref=e290]: ご予約・ご質問はお電話またはLINEで承ります
        - link "0800-812-8203" [ref=e292] [cursor=pointer]:
          - /url: tel:0800-812-8203
          - img [ref=e293]
          - text: 0800-812-8203
  - contentinfo [ref=e295]:
    - generic [ref=e296]:
      - generic [ref=e297]:
        - generic [ref=e298]: 恵庭店
        - generic [ref=e299]: 北海道恵庭市和光町１丁目８番１号
        - generic [ref=e300]: "営業時間: 9:00〜18:00"
        - generic [ref=e301]: "定休日: 年中無休"
        - link "0800-812-8203" [ref=e302] [cursor=pointer]:
          - /url: tel:0800-812-8203
      - generic [ref=e303]:
        - generic [ref=e304]: "お支払い: 現金 / クレジットカード / 電子マネー"
        - generic [ref=e305]: "ポイント: Ponta / 楽天 / dポイント（¥200=1pt）"
      - navigation [ref=e306]:
        - link "ホーム" [ref=e307] [cursor=pointer]:
          - /url: /eniwa
        - link "メニュー" [ref=e308] [cursor=pointer]:
          - /url: /eniwa/coatings
        - link "見積もり・料金" [ref=e309] [cursor=pointer]:
          - /url: /eniwa/price
        - link "施工事例" [ref=e310] [cursor=pointer]:
          - /url: /eniwa/cases
        - link "お客様の声" [ref=e311] [cursor=pointer]:
          - /url: /eniwa/reviews
        - link "店舗情報" [ref=e312] [cursor=pointer]:
          - /url: /eniwa/access
        - link "ご予約" [ref=e313] [cursor=pointer]:
          - /url: /eniwa/booking
        - link "プライバシー" [ref=e314] [cursor=pointer]:
          - /url: /eniwa/privacy
      - paragraph [ref=e315]: © 2026 恵庭店 KeePer PRO SHOP. All Rights Reserved.
  - button "Open Next.js Dev Tools" [ref=e321] [cursor=pointer]:
    - img [ref=e322]
  - alert [ref=e325]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Site Navigation', () => {
  4   |   test.describe('Header navigation (desktop)', () => {
  5   |     test('header is visible on store page', async ({ page }) => {
  6   |       await page.goto('/eniwa');
  7   |       await expect(page.locator('header')).toBeVisible();
  8   |     });
  9   | 
  10  |     test('header has store logo/name link', async ({ page }) => {
  11  |       await page.goto('/eniwa');
  12  |       const logoLink = page.locator('header a[href="/eniwa"]');
  13  |       await expect(logoLink).toBeVisible();
  14  |     });
  15  | 
  16  |     test('desktop nav has coatings link', async ({ page }) => {
  17  |       await page.goto('/eniwa');
  18  |       await expect(page.locator('nav a[href="/eniwa/coatings"]').first()).toBeVisible();
  19  |     });
  20  | 
  21  |     test('desktop nav has booking link', async ({ page }) => {
  22  |       await page.goto('/eniwa');
  23  |       await expect(page.locator('nav a[href="/eniwa/booking"]')).toBeVisible();
  24  |     });
  25  | 
  26  |     test('desktop nav has inquiry link', async ({ page }) => {
  27  |       await page.goto('/eniwa');
  28  |       await expect(page.locator('nav a[href="/eniwa/inquiry"]')).toBeVisible();
  29  |     });
  30  | 
  31  |     test('desktop nav has guide link', async ({ page }) => {
  32  |       await page.goto('/eniwa');
  33  |       await expect(page.locator('nav a[href="/eniwa/guide"]')).toBeVisible();
  34  |     });
  35  | 
  36  |     test('desktop nav has price/estimate link', async ({ page }) => {
  37  |       await page.goto('/eniwa');
  38  |       await expect(page.locator('nav a[href="/eniwa/price"]')).toBeVisible();
  39  |     });
  40  | 
  41  |     test('desktop nav has cases link', async ({ page }) => {
  42  |       await page.goto('/eniwa');
  43  |       await expect(page.locator('nav a[href="/eniwa/cases"]')).toBeVisible();
  44  |     });
  45  | 
  46  |     test('desktop nav has reviews link', async ({ page }) => {
  47  |       await page.goto('/eniwa');
> 48  |       await expect(page.locator('nav a[href="/eniwa/reviews"]')).toBeVisible();
      |                                                                  ^ Error: expect(locator).toBeVisible() failed
  49  |     });
  50  | 
  51  |     test('header nav link navigates to coatings page', async ({ page }) => {
  52  |       await page.goto('/eniwa');
  53  |       await page.locator('nav a[href="/eniwa/coatings"]').first().click();
  54  |       await page.waitForURL('**/eniwa/coatings');
  55  |       expect(page.url()).toContain('/eniwa/coatings');
  56  |     });
  57  | 
  58  |     test('header nav link navigates to booking page', async ({ page }) => {
  59  |       await page.goto('/eniwa');
  60  |       await page.locator('nav a[href="/eniwa/booking"]').click();
  61  |       await page.waitForURL('**/eniwa/booking');
  62  |       expect(page.url()).toContain('/eniwa/booking');
  63  |     });
  64  |   });
  65  | 
  66  |   test.describe('Footer navigation', () => {
  67  |     test('footer is visible', async ({ page }) => {
  68  |       await page.goto('/eniwa');
  69  |       await expect(page.locator('footer')).toBeVisible();
  70  |     });
  71  | 
  72  |     test('footer has coatings link', async ({ page }) => {
  73  |       await page.goto('/eniwa');
  74  |       await expect(page.locator('footer a[href="/eniwa/coatings"]')).toBeVisible();
  75  |     });
  76  | 
  77  |     test('footer has booking link', async ({ page }) => {
  78  |       await page.goto('/eniwa');
  79  |       await expect(page.locator('footer a[href="/eniwa/booking"]')).toBeVisible();
  80  |     });
  81  | 
  82  |     test('footer has privacy link', async ({ page }) => {
  83  |       await page.goto('/eniwa');
  84  |       await expect(page.locator('footer a[href="/eniwa/privacy"]')).toBeVisible();
  85  |     });
  86  | 
  87  |     test('footer shows store name', async ({ page }) => {
  88  |       await page.goto('/eniwa');
  89  |       const footer = page.locator('footer');
  90  |       const footerText = await footer.textContent();
  91  |       expect(footerText).toBeTruthy();
  92  |     });
  93  | 
  94  |     test('footer has phone number link', async ({ page }) => {
  95  |       await page.goto('/eniwa');
  96  |       const phoneLink = page.locator('footer a[href^="tel:"]');
  97  |       expect(await phoneLink.count()).toBeGreaterThanOrEqual(1);
  98  |     });
  99  |   });
  100 | 
  101 |   test.describe('Mobile menu', () => {
  102 |     test('hamburger button visible on mobile', async ({ page }) => {
  103 |       await page.setViewportSize({ width: 375, height: 667 });
  104 |       await page.goto('/eniwa');
  105 |       const hamburger = page.locator('button[aria-label="メニュー"]');
  106 |       await expect(hamburger).toBeVisible();
  107 |     });
  108 | 
  109 |     test('mobile menu opens on hamburger click', async ({ page }) => {
  110 |       await page.setViewportSize({ width: 375, height: 667 });
  111 |       await page.goto('/eniwa');
  112 |       const hamburger = page.locator('button[aria-label="メニュー"]');
  113 |       await hamburger.click();
  114 |       // Mobile nav should appear
  115 |       const mobileNav = page.locator('nav.md\\:hidden');
  116 |       await expect(mobileNav).toBeVisible();
  117 |     });
  118 | 
  119 |     test('mobile menu has all navigation links', async ({ page }) => {
  120 |       await page.setViewportSize({ width: 375, height: 667 });
  121 |       await page.goto('/eniwa');
  122 |       await page.locator('button[aria-label="メニュー"]').click();
  123 |       const mobileNav = page.locator('nav.md\\:hidden');
  124 |       await expect(mobileNav.locator('a[href="/eniwa/coatings"]')).toBeVisible();
  125 |       await expect(mobileNav.locator('a[href="/eniwa/booking"]')).toBeVisible();
  126 |       await expect(mobileNav.locator('a[href="/eniwa/inquiry"]')).toBeVisible();
  127 |       await expect(mobileNav.locator('a[href="/eniwa/guide"]')).toBeVisible();
  128 |       await expect(mobileNav.locator('a[href="/eniwa/access"]')).toBeVisible();
  129 |     });
  130 | 
  131 |     test('mobile menu closes on link click', async ({ page }) => {
  132 |       await page.setViewportSize({ width: 375, height: 667 });
  133 |       await page.goto('/eniwa');
  134 |       await page.locator('button[aria-label="メニュー"]').click();
  135 |       const mobileNav = page.locator('nav.md\\:hidden');
  136 |       await expect(mobileNav).toBeVisible();
  137 |       await mobileNav.locator('a[href="/eniwa"]').click();
  138 |       await expect(mobileNav).not.toBeVisible();
  139 |     });
  140 | 
  141 |     test('mobile menu closes on X button click', async ({ page }) => {
  142 |       await page.setViewportSize({ width: 375, height: 667 });
  143 |       await page.goto('/eniwa');
  144 |       const hamburger = page.locator('button[aria-label="メニュー"]');
  145 |       await hamburger.click();
  146 |       await expect(page.locator('nav.md\\:hidden')).toBeVisible();
  147 |       await hamburger.click();
  148 |       await expect(page.locator('nav.md\\:hidden')).not.toBeVisible();
```