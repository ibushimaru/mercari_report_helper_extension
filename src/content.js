// メルカリ通報支援拡張機能のコンテンツスクリプト

// 設定のデフォルト値
const DEFAULT_SETTINGS = {
  enabled: true,
  defaultReportText: 'Nintendo Switch 2の転売品のため'
};

// 現在の設定を保持する変数
let currentSettings = { ...DEFAULT_SETTINGS };

// DOM要素を作成するヘルパー関数
function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);
  
  // 属性を設定
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'textContent') {
      element.textContent = value;
    } else {
      element.setAttribute(key, value);
    }
  });
  
  // 子要素を追加
  children.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  });
  
  return element;
}

// 通報支援ボタンを作成する関数
function createReportButton() {
  const button = createElement('button', {
    className: 'mercari-report-helper-button',
    title: '通報支援'
  }, [
    createElement('span', { className: 'mercari-report-helper-icon' }, ['!']),
    createElement('span', {}, ['通報支援'])
  ]);
  
  button.addEventListener('click', handleReportButtonClick);
  return button;
}

// 商品一覧用のミニ通報ボタンを作成する関数
function createMiniReportButton() {
  const button = createElement('div', {
    className: 'mercari-report-helper-mini-button',
    title: '通報支援'
  }, [
    createElement('span', { className: 'mercari-report-helper-mini-icon' }, ['!'])
  ]);
  
  button.addEventListener('click', handleMiniReportButtonClick);
  return button;
}

// 通報モーダルを作成する関数
function createReportModal() {
  const modal = createElement('div', { className: 'mercari-report-helper-overlay' }, [
    createElement('div', { className: 'mercari-report-helper-modal' }, [
      // モーダルヘッダー
      createElement('div', { className: 'mercari-report-helper-modal-header' }, [
        createElement('div', { className: 'mercari-report-helper-modal-title' }, ['通報支援']),
        createElement('div', { className: 'mercari-report-helper-modal-close' }, ['×'])
      ]),
      
      // モーダルボディ
      createElement('div', { className: 'mercari-report-helper-modal-body' }, [
        // 通報理由
        createElement('div', { className: 'mercari-report-helper-form-group' }, [
          createElement('label', { className: 'mercari-report-helper-form-label' }, ['通報理由:']),
          createElement('div', { className: 'mercari-report-helper-checkbox' }, [
            createElement('label', {}, [
              createElement('input', { type: 'checkbox', checked: 'checked', disabled: 'disabled' }),
              ' 禁止されている出品物'
            ])
          ]),
          createElement('div', { className: 'mercari-report-helper-checkbox mercari-report-helper-checkbox-indent' }, [
            createElement('label', {}, [
              createElement('input', { type: 'checkbox', checked: 'checked', disabled: 'disabled' }),
              ' その他不適切と判断されるもの'
            ])
          ])
        ]),
        
        // 詳細理由
        createElement('div', { className: 'mercari-report-helper-form-group' }, [
          createElement('label', { className: 'mercari-report-helper-form-label', for: 'report-detail' }, ['詳細理由:']),
          createElement('textarea', { 
            className: 'mercari-report-helper-form-control',
            id: 'report-detail',
            placeholder: '詳細な理由を入力してください'
          })
        ])
      ]),
      
      // モーダルフッター
      createElement('div', { className: 'mercari-report-helper-modal-footer' }, [
        createElement('button', { 
          className: 'mercari-report-helper-btn mercari-report-helper-btn-secondary',
          id: 'report-cancel'
        }, ['キャンセル']),
        createElement('button', { 
          className: 'mercari-report-helper-btn mercari-report-helper-btn-primary',
          id: 'report-submit'
        }, ['通報する'])
      ])
    ])
  ]);
  
  // イベントリスナーを追加
  modal.querySelector('.mercari-report-helper-modal-close').addEventListener('click', closeModal);
  modal.querySelector('#report-cancel').addEventListener('click', closeModal);
  modal.querySelector('#report-submit').addEventListener('click', submitReport);
  
  return modal;
}

// 通知メッセージを表示する関数
function showNotification(message, isError = false) {
  // 既存の通知を削除
  const existingNotification = document.querySelector('.mercari-report-helper-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // 新しい通知を作成
  const notification = createElement('div', { 
    className: `mercari-report-helper-notification ${isError ? 'error' : ''}`
  }, [message]);
  
  document.body.appendChild(notification);
  
  // 表示アニメーション
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // 一定時間後に削除
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// 商品詳細ページに通報ボタンを挿入する関数
function injectReportButtonToProductPage() {
  // 商品アクションエリアを探す（「いいね」ボタンなどがある場所）
  const actionArea = document.querySelector('[data-testid="button-container"]') || 
                     document.querySelector('.item-action-buttons');
  
  if (actionArea) {
    // 既存のボタンがあれば削除
    const existingButton = document.querySelector('.mercari-report-helper-button');
    if (existingButton) {
      existingButton.remove();
    }
    
    // 新しいボタンを挿入
    const reportButton = createReportButton();
    actionArea.appendChild(reportButton);
  }
}

// 商品一覧ページに通報ボタンを挿入する関数
function injectReportButtonsToListPage() {
  // 商品カードを全て探す
  const itemCards = document.querySelectorAll('[data-testid="item-cell"]') || 
                   document.querySelectorAll('.items-box');
  
  itemCards.forEach(card => {
    // 既にボタンが挿入されていないか確認
    if (!card.querySelector('.mercari-report-helper-mini-button')) {
      // カードの位置を相対位置に設定（絶対位置のボタン配置のため）
      if (window.getComputedStyle(card).position === 'static') {
        card.style.position = 'relative';
      }
      
      // ミニボタンを挿入
      const miniButton = createMiniReportButton();
      card.appendChild(miniButton);
    }
  });
}

// 通報ボタンのクリックハンドラ
function handleReportButtonClick(event) {
  event.preventDefault();
  event.stopPropagation();
  
  // 商品情報を取得
  const productInfo = extractProductInfo();
  
  // モーダルを表示
  showReportModal(productInfo);
}

// ミニ通報ボタンのクリックハンドラ
function handleMiniReportButtonClick(event) {
  event.preventDefault();
  event.stopPropagation();
  
  // 親要素の商品カードから商品ページへのリンクを取得
  const card = event.currentTarget.closest('[data-testid="item-cell"]') || 
               event.currentTarget.closest('.items-box');
  
  if (card) {
    const link = card.querySelector('a');
    if (link && link.href) {
      // 商品詳細ページに遷移
      window.location.href = link.href;
      // 遷移後に通報モーダルを表示するためのフラグをセッションストレージに保存
      sessionStorage.setItem('showReportModalOnLoad', 'true');
    }
  }
}

// 商品情報を抽出する関数
function extractProductInfo() {
  const productInfo = {
    title: '',
    price: '',
    url: window.location.href
  };
  
  // 商品タイトルを取得
  const titleElement = document.querySelector('h1') || 
                      document.querySelector('[data-testid="name"]');
  if (titleElement) {
    productInfo.title = titleElement.textContent.trim();
  }
  
  // 商品価格を取得
  const priceElement = document.querySelector('[data-testid="price"]') || 
                      document.querySelector('.item-price');
  if (priceElement) {
    productInfo.price = priceElement.textContent.trim();
  }
  
  return productInfo;
}

// 通報モーダルを表示する関数
function showReportModal(productInfo) {
  // 既存のモーダルを削除
  const existingModal = document.querySelector('.mercari-report-helper-overlay');
  if (existingModal) {
    existingModal.remove();
  }
  
  // 新しいモーダルを作成
  const modal = createReportModal();
  document.body.appendChild(modal);
  
  // 詳細理由に定型文を設定
  const detailTextarea = modal.querySelector('#report-detail');
  if (detailTextarea) {
    detailTextarea.value = currentSettings.defaultReportText;
    // フォーカスを設定し、カーソルを末尾に
    setTimeout(() => {
      detailTextarea.focus();
      detailTextarea.setSelectionRange(detailTextarea.value.length, detailTextarea.value.length);
    }, 100);
  }
}

// モーダルを閉じる関数
function closeModal() {
  const modal = document.querySelector('.mercari-report-helper-overlay');
  if (modal) {
    modal.remove();
  }
}

// 通報を実行する関数
function submitReport() {
  // 詳細理由を取得
  const detailTextarea = document.querySelector('#report-detail');
  const detailText = detailTextarea ? detailTextarea.value.trim() : '';
  
  if (!detailText) {
    showNotification('詳細理由を入力してください', true);
    return;
  }
  
  // 通報処理の実行
  // 実際のメルカリの通報ボタンをクリック
  const reportButton = document.querySelector('[data-testid="report-button"]') || 
                      document.querySelector('.item-action-button');
  
  if (reportButton) {
    // モーダルを閉じる
    closeModal();
    
    // 通報ボタンをクリック
    reportButton.click();
    
    // 少し待ってからメルカリの通報モーダルが表示されるのを待つ
    setTimeout(() => {
      // 禁止されている出品物を選択
      const prohibitedItemOption = document.querySelector('input[value="prohibited_item"]');
      if (prohibitedItemOption) {
        prohibitedItemOption.click();
        
        // サブカテゴリの選択（その他不適切と判断されるもの）
        setTimeout(() => {
          const otherInappropriateOption = document.querySelector('input[value="other_inappropriate"]');
          if (otherInappropriateOption) {
            otherInappropriateOption.click();
            
            // 詳細理由の入力
            setTimeout(() => {
              const reasonTextarea = document.querySelector('textarea[name="reason"]');
              if (reasonTextarea) {
                reasonTextarea.value = detailText;
                
                // 入力イベントを発火させる
                const event = new Event('input', { bubbles: true });
                reasonTextarea.dispatchEvent(event);
                
                showNotification('通報理由を入力しました。「事務局に報告する」ボタンを押して完了してください。');
              } else {
                showNotification('詳細理由の入力欄が見つかりませんでした。', true);
              }
            }, 300);
          } else {
            showNotification('サブカテゴリの選択肢が見つかりませんでした。', true);
          }
        }, 300);
      } else {
        showNotification('通報カテゴリの選択肢が見つかりませんでした。', true);
      }
    }, 500);
  } else {
    showNotification('通報ボタンが見つかりませんでした。', true);
  }
}

// 設定を読み込む関数
function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
    currentSettings = items;
    
    // 設定に基づいて機能を有効/無効化
    if (currentSettings.enabled) {
      initializeExtension();
    }
  });
}

// 拡張機能の初期化
function initializeExtension() {
  // URLに基づいて適切な処理を実行
  const url = window.location.href;
  
  if (url.includes('/item/')) {
    // 商品詳細ページ
    injectReportButtonToProductPage();
    
    // セッションストレージのフラグをチェック
    if (sessionStorage.getItem('showReportModalOnLoad') === 'true') {
      // フラグを削除
      sessionStorage.removeItem('showReportModalOnLoad');
      
      // 少し待ってからモーダルを表示（ページ読み込み完了を待つ）
      setTimeout(() => {
        const productInfo = extractProductInfo();
        showReportModal(productInfo);
      }, 1000);
    }
  } else {
    // 商品一覧ページ
    injectReportButtonsToListPage();
    
    // 動的に読み込まれる商品カードに対応するためのMutationObserver
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          injectReportButtonsToListPage();
        }
      });
    });
    
    // 監視対象の設定
    const targetNode = document.querySelector('#item-grid') || 
                      document.querySelector('.items-box-content');
    if (targetNode) {
      observer.observe(targetNode, { childList: true, subtree: true });
    }
  }
}

// メッセージリスナーの設定
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'settingsUpdated') {
    loadSettings();
  }
});

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
});

// ページ内容が変更された場合に再初期化
window.addEventListener('load', () => {
  loadSettings();
});

// SPAサイト対応のためのURLの変更検知
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    loadSettings();
  }
}).observe(document, { subtree: true, childList: true });
