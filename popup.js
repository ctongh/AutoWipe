document.addEventListener('DOMContentLoaded', function() {
  // 載入已儲存的網站列表、搜尋關鍵字和設定
  loadSites();
  loadKeywords();
  loadInterval();
  loadAutoCleanSetting();
  setupCollapsible();
  setupFeedbackBox();
  
  // 更新倒計時
  updateNextCleanTime();
  setInterval(updateNextCleanTime, 1000);

  // 新增網站按鈕事件
  document.getElementById('addSite').addEventListener('click', addSite);
  
  // 新增關鍵字按鈕事件
  document.getElementById('addKeyword').addEventListener('click', addKeyword);
  
  // 清理間隔選擇事件
  document.getElementById('cleanInterval').addEventListener('change', function(e) {
    const interval = parseInt(e.target.value);
    chrome.storage.sync.set({ cleanInterval: interval }, function() {
      chrome.runtime.sendMessage({ 
        action: 'updateInterval', 
        interval: interval 
      }, function() {
        updateNextCleanTime();
      });
    });
  });
  
  // 監聽開關變更
  document.getElementById('autoCleanOnClose').addEventListener('change', function(e) {
    const enabled = e.target.checked;
    chrome.storage.sync.set({ autoCleanOnClose: enabled }, function() {
      showNotification(
        i18n[currentLanguage][enabled ? 'autoCleanEnabled' : 'autoCleanDisabled'],
        'info'
      );
    });
  });

  // 手動清理按鈕事件
  document.getElementById('manualClean').addEventListener('click', function() {
    chrome.runtime.sendMessage({ 
      action: 'manualClean'
    }, function(response) {
      if (response && response.success) {
        showNotification(i18n[currentLanguage].cleanComplete, 'success');
      } else {
        showNotification(i18n[currentLanguage].error, 'error');
      }
    });
  });

  // Enter 鍵綁定
  document.getElementById('siteInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      addSite();
    }
  });

  document.getElementById('searchKeywordInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      addKeyword();
    }
  });
});

// 載入自動清理設定
function loadAutoCleanSetting() {
  chrome.storage.sync.get(['autoCleanOnClose'], function(result) {
    const checkbox = document.getElementById('autoCleanOnClose');
    checkbox.checked = result.autoCleanOnClose !== false; // 預設為開啟
  });
}

function setupCollapsible() {
  const collapsibles = document.querySelectorAll('.collapsible');
  collapsibles.forEach(collapsible => {
    const header = collapsible.querySelector('.collapsible-header');
    const content = collapsible.querySelector('.collapsible-content');
    
    // 設定初始狀態
    chrome.storage.sync.get(['collapsibleStates'], function(result) {
      const states = result.collapsibleStates || {};
      if (states[header.textContent]) {
        collapsible.classList.add('active');
        content.style.display = 'block';
      }
    });

    header.addEventListener('click', () => {
      collapsible.classList.toggle('active');
      content.style.display = collapsible.classList.contains('active') ? 'block' : 'none';
      
      // 保存狀態
      chrome.storage.sync.get(['collapsibleStates'], function(result) {
        const states = result.collapsibleStates || {};
        states[header.textContent] = collapsible.classList.contains('active');
        chrome.storage.sync.set({ collapsibleStates: states });
      });
    });
  });
}

function setupFeedbackBox() {
  const feedbackBox = document.getElementById('feedbackBox');
  
  chrome.storage.sync.get(['feedbackClosed'], function(result) {
    if (result.feedbackClosed) {
      feedbackBox.style.display = 'none';
    }
  });
}

function loadInterval() {
  chrome.storage.sync.get(['cleanInterval'], function(result) {
    // 載入清理間隔
    const interval = result.cleanInterval || 60;
    document.getElementById('cleanInterval').value = interval.toString();
  });
}

function loadSites() {
  chrome.storage.sync.get(['sites'], function(result) {
    const sites = result.sites || [];
    const siteList = document.getElementById('siteList');
    siteList.innerHTML = '';
    
    sites.forEach(site => {
      const div = document.createElement('div');
      div.className = 'site-item';
      div.innerHTML = `
        <span>${site}</span>
        <button class="remove-site" data-site="${site}">${i18n[currentLanguage].delete}</button>
      `;
      siteList.appendChild(div);
    });

    // 修改刪除按鈕的事件監聽器
    document.querySelectorAll('.remove-site').forEach(button => {
      button.addEventListener('click', function() {
        const site = this.dataset.site;
        const button = this;
        
        // 禁用按鈕防止重複點擊
        button.disabled = true;
        button.style.opacity = '0.5';
        
        showNotification(i18n[currentLanguage].confirmDelete, 'info');
        
        // 立即執行刪除
        removeSite(site); 
        showNotification(i18n[currentLanguage].deleteSuccess, 'success'); 
      });
    });
  });
}

function loadKeywords() {
  chrome.storage.sync.get(['searchKeywords'], function(result) {
    const keywords = result.searchKeywords || [];
    const keywordList = document.getElementById('keywordList');
    keywordList.innerHTML = '';
    
    keywords.forEach(keyword => {
      const div = document.createElement('div');
      div.className = 'keyword-item';
      div.innerHTML = `
        <span>${keyword}</span>
        <button class="remove-keyword" data-keyword="${keyword}">${i18n[currentLanguage].delete}</button>
      `;
      keywordList.appendChild(div);
    });

    // 刪除按鈕的事件監聽器
    document.querySelectorAll('.remove-keyword').forEach(button => {
      button.addEventListener('click', function() {
        const keyword = this.dataset.keyword;
        const button = this;
        
        // 禁用按鈕防止重複點擊
        button.disabled = true;
        button.style.opacity = '0.5';
        
        
        // 立即執行刪除
        removeKeyword(keyword);
        showNotification(i18n[currentLanguage].deleteSuccess, 'success');
      });
    });
  });
}

function addSite() {
  const input = document.getElementById('siteInput');
  const site = input.value.trim();
  
  if (!site) return;

  try {
    new URL(site);
  } catch (e) {
    showNotification(i18n[currentLanguage].invalidUrl, 'error');
    return;
  }

  chrome.storage.sync.get(['sites'], function(result) {
    const sites = result.sites || [];
    if (!sites.includes(site)) {
      sites.push(site);
      chrome.storage.sync.set({ sites: sites }, function() {
        loadSites();
        input.value = '';
      });
    }
  });
}

function addKeyword() {
  const input = document.getElementById('searchKeywordInput');
  const keyword = input.value.trim();
  
  if (!keyword) return;

  chrome.storage.sync.get(['searchKeywords'], function(result) {
    const keywords = result.searchKeywords || [];
    if (!keywords.includes(keyword)) {
      keywords.push(keyword);
      chrome.storage.sync.set({ searchKeywords: keywords }, function() {
        loadKeywords();
        input.value = '';
      });
    }
  });
}

function removeSite(site) {
  chrome.storage.sync.get(['sites'], function(result) {
    const sites = result.sites || [];
    const newSites = sites.filter(s => s !== site);
    chrome.storage.sync.set({ sites: newSites }, loadSites);
  });
}

function removeKeyword(keyword) {
  chrome.storage.sync.get(['searchKeywords'], function(result) {
    const keywords = result.searchKeywords || [];
    const newKeywords = keywords.filter(k => k !== keyword);
    chrome.storage.sync.set({ searchKeywords: newKeywords }, loadKeywords);
  });
}

function updateNextCleanTime() {
  chrome.alarms.get('cleanHistory', alarm => {
    if (alarm) {
      const nextCleanTime = new Date(alarm.scheduledTime);
      const now = new Date();
      const timeRemaining = nextCleanTime - now;
      
      const nextTimeElement = document.getElementById('nextCleanTime');
      const remainingElement = document.getElementById('timeRemaining');
      
      nextTimeElement.textContent = nextCleanTime.toLocaleString(
        currentLanguage === 'zh' ? 'zh-TW' : 'en-US',
        { hour: '2-digit', minute: '2-digit', hour12: false }
      );
      
      const minutes = Math.floor(timeRemaining / 60000);
      const seconds = Math.floor((timeRemaining % 60000) / 1000);
      
      remainingElement.textContent = currentLanguage === 'zh' 
        ? `${minutes} 分 ${seconds} 秒`
        : `${minutes}m ${seconds}s`;
    }
  });
}

function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type}`;
  
  // 重置可能的正在進行的動畫
  notification.classList.remove('show');
  
  // 強制重繪
  notification.offsetHeight;
  
  // 顯示通知
  notification.classList.add('show');
  
  // 3秒後隱藏
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}