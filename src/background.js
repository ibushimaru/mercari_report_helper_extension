// バックグラウンドスクリプト

// インストール時の初期設定
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // デフォルト設定を保存
    chrome.storage.sync.set({
      enabled: true,
      defaultReportText: 'Nintendo Switch 2の転売品のため'
    });
  }
});

// コンテンツスクリプトからのメッセージリスナー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showNotification') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'メルカリ通報支援',
      message: message.text
    });
  }
});
