const { test } = require('@playwright/test');

test('Mercariサイトの構造を調査', async ({ page }) => {
  // テスト商品のページに移動（Nintendo Switch関連の商品）
  // 実際の商品URLは変更される可能性があるため、検索結果から選択
  await page.goto('/search?keyword=nintendo%20switch');
  
  // 検索結果を待つ
  await page.waitForSelector('[data-testid="search-result"]', { timeout: 10000 }).catch(() => {
    console.log('search-result selector not found, trying alternative...');
  });
  
  // 最初の商品をクリック
  const firstProduct = await page.locator('a[href*="/item/"]').first();
  if (await firstProduct.isVisible()) {
    await firstProduct.click();
    await page.waitForLoadState('networkidle');
  } else {
    console.log('商品リンクが見つかりませんでした');
    return;
  }
  
  // ページのスクリーンショットを撮る
  await page.screenshot({ path: 'mercari-product-page.png', fullPage: true });
  
  // 通報ボタンの可能性があるセレクターを調査
  const possibleSelectors = [
    '[data-testid="report-button"]',
    '.item-action-button',
    'button:has-text("通報")',
    'button:has-text("報告")',
    '[aria-label*="通報"]',
    '[aria-label*="報告"]',
    'button[type="button"]:has-text("不適切な商品の報告")',
    'a:has-text("不適切な商品の報告")',
    '[data-testid="item-detail-report-button"]',
    '[data-testid="product-report-button"]',
    'button svg',
    'button:has(svg)',
    '.item-detail-action',
    '.item-report-button',
    'div[role="button"]:has-text("報告")',
    'div[role="button"]:has-text("通報")'
  ];
  
  console.log('\n=== 通報ボタンのセレクター調査 ===');
  
  for (const selector of possibleSelectors) {
    try {
      const element = await page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 })) {
        console.log(`✓ Found: ${selector}`);
        const text = await element.textContent().catch(() => '');
        const html = await element.evaluate(el => el.outerHTML).catch(() => '');
        console.log(`  Text: ${text}`);
        console.log(`  HTML: ${html.substring(0, 200)}...`);
      }
    } catch (e) {
      // セレクターが見つからない場合は無視
    }
  }
  
  // すべてのボタンを調査
  console.log('\n=== すべてのボタン要素 ===');
  const allButtons = await page.locator('button').all();
  for (let i = 0; i < Math.min(allButtons.length, 20); i++) {
    const button = allButtons[i];
    const text = await button.textContent();
    const classes = await button.getAttribute('class');
    const testId = await button.getAttribute('data-testid');
    const ariaLabel = await button.getAttribute('aria-label');
    
    if (text || ariaLabel) {
      console.log(`Button ${i}: text="${text}", class="${classes}", data-testid="${testId}", aria-label="${ariaLabel}"`);
    }
  }
  
  // SVGアイコンを含むボタンを調査
  console.log('\n=== SVGアイコンを含むボタン ===');
  const svgButtons = await page.locator('button:has(svg)').all();
  for (let i = 0; i < Math.min(svgButtons.length, 10); i++) {
    const button = svgButtons[i];
    const classes = await button.getAttribute('class');
    const testId = await button.getAttribute('data-testid');
    const ariaLabel = await button.getAttribute('aria-label');
    const title = await button.getAttribute('title');
    
    console.log(`SVG Button ${i}: class="${classes}", data-testid="${testId}", aria-label="${ariaLabel}", title="${title}"`);
  }
  
  // リンク要素も調査
  console.log('\n=== 報告・通報関連のリンク ===');
  const reportLinks = await page.locator('a:has-text("報告"), a:has-text("通報"), a:has-text("不適切")').all();
  for (const link of reportLinks) {
    const text = await link.textContent();
    const href = await link.getAttribute('href');
    console.log(`Link: text="${text}", href="${href}"`);
  }
});

test('通報モーダルの構造を調査', async ({ page }) => {
  // 商品ページに移動
  await page.goto('/search?keyword=nintendo%20switch%202');
  await page.waitForLoadState('networkidle');
  
  // 最初の商品をクリック
  const firstProduct = await page.locator('a[href*="/item/"]').first();
  if (await firstProduct.isVisible()) {
    await firstProduct.click();
    await page.waitForLoadState('networkidle');
  }
  
  // 通報ボタンを探して押す（いくつかの可能性を試す）
  const reportButtonSelectors = [
    'button:has(svg[aria-label*="報告"])',
    'button:has(svg[aria-label*="通報"])',
    'button[aria-label*="報告"]',
    'button[aria-label*="通報"]',
    'button:has-text("不適切な商品の報告")',
    'a:has-text("不適切な商品の報告")'
  ];
  
  let reportButtonFound = false;
  for (const selector of reportButtonSelectors) {
    try {
      const button = await page.locator(selector).first();
      if (await button.isVisible({ timeout: 1000 })) {
        console.log(`\n通報ボタンを発見: ${selector}`);
        await button.click();
        reportButtonFound = true;
        break;
      }
    } catch (e) {
      // 次のセレクターを試す
    }
  }
  
  if (!reportButtonFound) {
    console.log('通報ボタンが見つかりませんでした');
    return;
  }
  
  // モーダルが表示されるのを待つ
  await page.waitForTimeout(2000);
  
  // モーダル内の要素を調査
  console.log('\n=== 通報モーダルの構造 ===');
  
  // ラジオボタンやチェックボックスを調査
  const inputs = await page.locator('input[type="radio"], input[type="checkbox"]').all();
  for (const input of inputs) {
    const value = await input.getAttribute('value');
    const name = await input.getAttribute('name');
    const id = await input.getAttribute('id');
    const label = await page.locator(`label[for="${id}"]`).textContent().catch(() => '');
    
    console.log(`Input: type="radio/checkbox", value="${value}", name="${name}", label="${label}"`);
  }
  
  // テキストエリアを調査
  const textareas = await page.locator('textarea').all();
  for (const textarea of textareas) {
    const name = await textarea.getAttribute('name');
    const placeholder = await textarea.getAttribute('placeholder');
    console.log(`Textarea: name="${name}", placeholder="${placeholder}"`);
  }
  
  // スクリーンショットを撮る
  await page.screenshot({ path: 'mercari-report-modal.png', fullPage: true });
});