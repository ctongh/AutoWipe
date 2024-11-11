// 初始化設定
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['cleanInterval', 'cleaningOptions'], function(result) {
    const interval = result.cleanInterval || 60;
    setupAlarm(interval);
  });
});

// 設定定時器
function setupAlarm(interval) {
  chrome.alarms.clear('cleanHistory', () => {
    chrome.alarms.create('cleanHistory', {
      periodInMinutes: parseInt(interval)
    });
  });
}

// 監聽定時器事件
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanHistory') {
    cleanHistory();
  }
});

// 監聽來自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'manualClean') {
    cleanHistory().then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('手動清理時發生錯誤:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  else if (request.action === 'updateInterval') {
    setupAlarm(request.interval);
    sendResponse({ success: true });
    return true;
  }
});

// 監聽標籤頁關閉事件
chrome.tabs.onRemoved.addListener(() => {
  chrome.tabs.query({}, (tabs) => {
    if (tabs.length === 1) { // 只剩最後一個標籤頁時
      chrome.storage.sync.get(['autoCleanOnClose'], function(result) {
        if (result.autoCleanOnClose !== false) { // 預設為開啟
          cleanHistory();
        }
      });
    }
  });
});

// 監聽視窗關閉事件
chrome.windows.onRemoved.addListener(() => {
  chrome.windows.getAll((windows) => {
    if (windows.length === 1) { // 只剩最後一個視窗時
      chrome.storage.sync.get(['autoCleanOnClose'], function(result) {
        if (result.autoCleanOnClose !== false) { // 預設為開啟
          cleanHistory();
        }
      });
    }
  });
});


// 清理歷史紀錄
async function cleanHistory() {
  console.log('開始清理歷史記錄...');
  
  try {
    // 獲取需要清理的網站列表和關鍵字列表
    const result = await chrome.storage.sync.get(['sites', 'searchKeywords']);
    const sites = result.sites || [];
    const searchKeywords = result.searchKeywords || [];
    
    if (sites.length === 0 && searchKeywords.length === 0) {
      console.log('無需清理的網站和關鍵字');
      return;
    }

    // 獲取過去24小時的時間戳記
    // const oneDayAgo = new Date().getTime() - (24 * 60 * 60 * 1000);
    
    // 清理特定網站的歷史記錄
    for (const site of sites) {
      try {
        // 搜尋符合的歷史記錄
        const items = await chrome.history.search({
          text: '',
          startTime: 0,
          maxResults: 100000
        });

        // 過濾並刪除符合的記錄
        for (const item of items) {
          try {
            const itemUrl = new URL(item.url);
            const targetUrl = new URL(site);
            
            if (itemUrl.hostname === targetUrl.hostname && 
                itemUrl.pathname.startsWith(targetUrl.pathname)) {
              await chrome.history.deleteUrl({ url: item.url });
              console.log('已刪除網站:', item.url);
            }
          } catch (urlError) {
            console.error('處理 URL 時發生錯誤:', urlError);
            continue;
          }
        }
      } catch (error) {
        console.error(`清理 ${site} 的歷史記錄時發生錯誤:`, error);
      }
    }

    // 清理包含特定關鍵字的歷史記錄
    for (const keyword of searchKeywords) {
      try {
        console.log(`開始搜尋標題關鍵字: ${keyword}`);
        
        // 獲取歷史記錄
        const items = await chrome.history.search({
          text: '',  
          startTime: 0,
          maxResults: 10000
        });

        console.log(`總共找到 ${items.length} 筆記錄`);
        
        // 將關鍵字轉換為小寫
        const lowercaseKeyword = keyword.toLowerCase();
        
        // 分類記錄
        let matchedByTitle = [];
        let potentialDeadLinks = [];

        items.forEach(item => {
          // 如果有標題且包含關鍵字
          if (item.title && item.title.toLowerCase().includes(lowercaseKeyword)) {
            matchedByTitle.push(item);
          }
          // 如果沒有標題或標題為空，但 URL 包含關鍵字
          else if ((!item.title || item.title.trim() === '') && 
                   item.url.toLowerCase().includes(lowercaseKeyword)) {
            potentialDeadLinks.push(item);
          }
        });

        // 記錄匹配情況
        console.log(`找到 ${matchedByTitle.length} 筆標題符合的記錄`);
        console.log(`找到 ${potentialDeadLinks.length} 筆可能的失效連結`);

        // 顯示標題匹配的記錄
        matchedByTitle.forEach((item, index) => {
          console.log(`標題符合的記錄 #${index + 1}:`, {
            title: item.title,
            url: item.url,
            lastVisitTime: new Date(item.lastVisitTime)
          });
        });

        // 顯示可能的失效連結
        potentialDeadLinks.forEach((item, index) => {
          console.log(`可能的失效連結 #${index + 1}:`, {
            url: item.url,
            lastVisitTime: new Date(item.lastVisitTime)
          });
        });

        // 合併所有需要刪除的記錄
        const allItemsToDelete = [...matchedByTitle, ...potentialDeadLinks];

        // 刪除所有符合的記錄
        for (const item of allItemsToDelete) {
          await chrome.history.deleteUrl({ url: item.url });
          console.log('已刪除記錄:', {
            title: item.title || '(無標題)',
            url: item.url,
            type: item.title ? '標題匹配' : '可能的失效連結'
          });
        }
        
        console.log(`清理完成，共刪除 ${allItemsToDelete.length} 筆記錄`);
        
      } catch (error) {
        console.error(`清理關鍵字 ${keyword} 的搜尋記錄時發生錯誤:`, error);
      }
    }
    
    console.log('歷史記錄清理完成');
    return Date.now();
  } catch (error) {
    console.error('清理過程中發生錯誤:', error);
    throw error;
  }
}