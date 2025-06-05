const { test } = require('@playwright/test');

test('シンプルな構造調査', async ({ page }) => {
  // タイムアウトを延長
  test.setTimeout(60000);
  
  // User-Agentを設定
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  // Mercariのトップページから開始
  console.log('Mercariトップページにアクセス...');
  await page.goto('https://jp.mercari.com/', { waitUntil: 'domcontentloaded' });
  
  // 少し待つ
  await page.waitForTimeout(3000);
  
  // 検索を実行
  console.log('検索を実行...');
  const searchInput = await page.locator('input[type="search"], input[placeholder*="検索"]').first();
  if (await searchInput.isVisible()) {
    await searchInput.fill('nintendo switch');
    await searchInput.press('Enter');
    await page.waitForTimeout(5000);
  }
  
  // ページのHTMLを保存して構造を確認
  const html = await page.content();
  const fs = require('fs');
  fs.writeFileSync('mercari-page.html', html);
  console.log('HTMLを mercari-page.html に保存しました');
  
  // 商品リンクを探す
  console.log('\n=== 商品リンクの構造 ===');
  const productLinks = await page.locator('a[href*="/item/"]').all();
  console.log(`商品リンク数: ${productLinks.length}`);
  
  if (productLinks.length > 0) {
    // 最初の商品のURLを取得
    const firstProductUrl = await productLinks[0].getAttribute('href');
    console.log(`最初の商品URL: ${firstProductUrl}`);
    
    // 商品ページに移動
    await productLinks[0].click();
    await page.waitForTimeout(5000);
    
    // 商品ページのHTMLを保存
    const productHtml = await page.content();
    fs.writeFileSync('mercari-product-page.html', productHtml);
    console.log('商品ページのHTMLを mercari-product-page.html に保存しました');
    
    // すべてのボタンとその親要素を調査
    console.log('\n=== ボタン要素の詳細調査 ===');
    const buttons = await page.locator('button').all();
    
    for (let i = 0; i < buttons.length; i++) {
      try {
        const button = buttons[i];
        const isVisible = await button.isVisible();
        
        if (isVisible) {
          const text = await button.textContent() || '';
          const innerHTML = await button.innerHTML();
          
          // SVGアイコンを含むかチェック
          const hasSvg = innerHTML.includes('<svg');
          
          // 親要素の情報も取得
          const parentTag = await button.evaluateHandle(el => el.parentElement?.tagName);
          const parentClass = await button.evaluateHandle(el => el.parentElement?.className);
          
          // 通報に関連しそうなボタンを探す
          if (hasSvg || text.includes('報告') || text.includes('通報') || text.includes('問題')) {
            console.log(`\nButton ${i}:`);
            console.log(`  Text: "${text.trim()}"`);
            console.log(`  Has SVG: ${hasSvg}`);
            console.log(`  Parent: ${await parentTag.jsonValue()} (class: ${await parentClass.jsonValue()})`);
            
            // クリック可能な領域の親要素も調査
            const clickableParent = await button.evaluateHandle(el => {
              let parent = el;
              while (parent && parent.tagName !== 'A' && parent.tagName !== 'DIV') {
                parent = parent.parentElement;
              }
              return parent;
            });
            
            if (clickableParent) {
              const parentHtml = await clickableParent.evaluate(el => el?.outerHTML);
              if (parentHtml) {
                console.log(`  Clickable parent HTML: ${parentHtml.substring(0, 200)}...`);
              }
            }
          }
        }
      } catch (e) {
        // エラーは無視
      }
    }
    
    // アイコンボタンを特定して調査
    console.log('\n=== アイコンボタン（SVG）の調査 ===');
    const iconButtons = await page.locator('button:has(svg)').all();
    
    for (let i = 0; i < iconButtons.length; i++) {
      try {
        const button = iconButtons[i];
        const ariaLabel = await button.getAttribute('aria-label');
        const title = await button.getAttribute('title');
        const svgContent = await button.locator('svg').innerHTML();
        
        console.log(`\nIcon Button ${i}:`);
        console.log(`  aria-label: "${ariaLabel}"`);
        console.log(`  title: "${title}"`);
        console.log(`  SVG content sample: ${svgContent.substring(0, 100)}...`);
        
        // クリックハンドラーがあるか確認
        const hasClickHandler = await button.evaluate(el => {
          return el.onclick !== null || el.hasAttribute('onclick');
        });
        console.log(`  Has click handler: ${hasClickHandler}`);
      } catch (e) {
        // エラーは無視
      }
    }
  }
  
  // スクリーンショットを撮る
  await page.screenshot({ path: 'mercari-screenshot.png', fullPage: false });
  console.log('\nスクリーンショットを mercari-screenshot.png に保存しました');
});