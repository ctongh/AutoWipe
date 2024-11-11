const i18n = {
  en: {
    title: 'AutoWipe',
    cleanInterval: 'Auto Clean Interval',
    nextCleanTime: 'Next Clean Time',
    timeRemaining: 'Time Remaining',
    autoCleanOnClose: 'Auto clean when closing last tab',
    autoCleanEnabled: 'Auto clean on close enabled',
    autoCleanDisabled: 'Auto clean on close disabled',
    cleanSettings: 'Browse History Settings',
    enterUrl: 'Enter URL (e.g., https://example.com)',
    add: 'Add',
    delete: 'Delete',
    deleteSuccess: 'Item deleted successfully',
    searchSettings: 'Search History Settings',
    urlDescription: "Add URLs that you want to automatically delete from your browsing history.",
    searchDescription: "Add keywords that you want to automatically delete from your search history.",
    enterKeyword: 'Enter search keyword',
    cleanNow: 'Clean Now',
    feedback: 'If you like AutoWipe, please give us a star on ',
    feedbackThanks: ', and leave your comments. Thank you for your feedback!',
    confirmDelete: 'Are you sure you want to delete this item?',
    cleanComplete: 'Cleaning complete!',
    error: 'An error occurred. Please check the console log.',
    invalidUrl: 'Please enter a complete URL including https:// or http://'
  },
  zh: {
    title: 'AutoWipe',
    cleanInterval: '自動清理間隔',
    nextCleanTime: '下次清理時間',
    timeRemaining: '剩餘時間',
    autoCleanOnClose: '關閉最後分頁時自動清理',
    autoCleanEnabled: '已啟用關閉時自動清理',
    autoCleanDisabled: '已停用關閉時自動清理',
    cleanSettings: '瀏覽紀錄設定',
    enterUrl: '輸入網址 (例如：https://example.com)',
    add: '新增',
    delete: '刪除',
    deleteSuccess: '刪除成功',
    searchSettings: '搜尋紀錄設定',
    urlDescription: "加入你想要自動刪除的網站網址。",
    searchDescription: "加入你想要自動刪除的搜尋關鍵字。",
    enterKeyword: '輸入搜尋關鍵字',
    cleanNow: '立即清理',
    feedback: '如果您喜歡 AutoWipe，請在 ',
    feedbackThanks: ' 給予一個星星並留下您的意見。感謝您的回饋！',
    confirmDelete: '確定要刪除這個項目嗎？',
    cleanComplete: '清理完成！',
    error: '發生錯誤，請查看 console 記錄。',
    invalidUrl: '請輸入完整的網址，包含 https:// 或 http://'
  }
};

let currentLanguage = 'en';

function setLanguage(lang) {
  currentLanguage = lang;
  document.querySelectorAll('.i18n').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      element.textContent = i18n[lang][key];
    }
    const placeholderKey = element.getAttribute('data-i18n-placeholder');
    if (placeholderKey) {
      element.placeholder = i18n[lang][placeholderKey];
    }
  });
  chrome.storage.sync.set({ language: lang });
}

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['language'], result => {
    const lang = result.language || 'en';
    document.getElementById('languageSelect').value = lang;
    setLanguage(lang);
  });

  document.getElementById('languageSelect').addEventListener('change', (e) => {
    setLanguage(e.target.value);
  });
});