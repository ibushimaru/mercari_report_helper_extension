// ポップアップ画面のJavaScript

// デフォルト設定
const DEFAULT_SETTINGS = {
  enabled: true,
  defaultReportText: 'Nintendo Switch 2の転売品のため'
};

// DOM要素
const reportTextArea = document.getElementById('report-text');
const enabledToggle = document.getElementById('enabled-toggle');
const saveButton = document.getElementById('save-button');
const statusDiv = document.getElementById('status');
const helpLink = document.getElementById('help-link');

// 設定を読み込む
function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
    reportTextArea.value = items.defaultReportText;
    enabledToggle.checked = items.enabled;
  });
}

// 設定を保存する
function saveSettings() {
  const settings = {
    defaultReportText: reportTextArea.value.trim() || DEFAULT_SETTINGS.defaultReportText,
    enabled: enabledToggle.checked
  };
  
  chrome.storage.sync.set(settings, () => {
    // 保存成功メッセージを表示
    showStatus('設定を保存しました', 'success');
    
    // コンテンツスクリプトに設定更新を通知
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'settingsUpdated' });
      }
    });
  });
}

// ステータスメッセージを表示
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  
  // 3秒後にメッセージを消す
  setTimeout(() => {
    statusDiv.className = 'status';
  }, 3000);
}

// ヘルプを表示
function showHelp() {
  chrome.tabs.create({
    url: 'help.html'
  });
}

// イベントリスナーを設定
document.addEventListener('DOMContentLoaded', loadSettings);
saveButton.addEventListener('click', saveSettings);
helpLink.addEventListener('click', (e) => {
  e.preventDefault();
  showHelp();
});
