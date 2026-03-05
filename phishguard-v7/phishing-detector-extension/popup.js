// popup.js - Handle popup interactions and settings

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadStats();
  await loadBlockedSenders();
  await loadWhitelistedSenders();
  await loadActionLogs();
  setupEventListeners();
});

// Load saved settings
async function loadSettings() {
  chrome.storage.sync.get(['claudeApiKey', 'autoDetect', 'notifications', 'debugMode', 'compactMode'], (result) => {
    if (result.claudeApiKey) {
      document.getElementById('apiKey').value = result.claudeApiKey;
    }
    
    if (result.autoDetect !== undefined) {
      document.getElementById('autoDetect').checked = result.autoDetect;
    }
    
    if (result.notifications !== undefined) {
      document.getElementById('notifications').checked = result.notifications;
    }

    if (result.debugMode !== undefined) {
      document.getElementById('debugMode').checked = result.debugMode;
    }

    if (result.compactMode !== undefined) {
      document.getElementById('compactMode').checked = result.compactMode;
    } else {
      document.getElementById('compactMode').checked = true; // Default compact
    }
  });
}

// Load statistics
async function loadStats() {
  chrome.storage.local.get(['phishingCount', 'safeCount'], (result) => {
    document.getElementById('phishingCount').textContent = result.phishingCount || 0;
    document.getElementById('safeCount').textContent = result.safeCount || 0;
  });
}

// Setup event listeners
function setupEventListeners() {
  // Save button
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  
  // Auto-save toggles
  document.getElementById('autoDetect').addEventListener('change', saveSettings);
  document.getElementById('notifications').addEventListener('change', saveSettings);
  document.getElementById('debugMode').addEventListener('change', saveSettings);
  document.getElementById('compactMode').addEventListener('change', saveSettings);

  // Clear buttons
  document.getElementById('clearBlockedBtn').addEventListener('click', clearBlockedSenders);
  document.getElementById('clearWhitelistBtn').addEventListener('click', clearWhitelistedSenders);
  document.getElementById('clearLogsBtn').addEventListener('click', clearActionLogs);

  // Test button
  document.getElementById('testPhishingBtn').addEventListener('click', testPhishingDetection);
}

// Save settings
async function saveSettings() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const autoDetect = document.getElementById('autoDetect').checked;
  const notifications = document.getElementById('notifications').checked;
  const debugMode = document.getElementById('debugMode').checked;
  const compactMode = document.getElementById('compactMode').checked;
  
  try {
    // Validate API key format if provided
    if (apiKey && !apiKey.startsWith('sk-ant-api')) {
      showMessage('error', 'API key không hợp lệ. Key phải bắt đầu với "sk-ant-api"');
      return;
    }
    
    // Save to storage
    await chrome.storage.sync.set({
      claudeApiKey: apiKey,
      autoDetect: autoDetect,
      notifications: notifications,
      debugMode: debugMode,
      compactMode: compactMode
    });
    
    showMessage('success', 'Đã lưu cấu hình thành công!');
    
  } catch (error) {
    console.error('Error saving settings:', error);
    showMessage('error', 'Có lỗi xảy ra. Vui lòng thử lại.');
  }
}

// Show success/error message
function showMessage(type, message) {
  const successMsg = document.getElementById('successMsg');
  const errorMsg = document.getElementById('errorMsg');
  
  // Hide both messages first
  successMsg.style.display = 'none';
  errorMsg.style.display = 'none';
  
  // Show appropriate message
  if (type === 'success') {
    successMsg.textContent = '✓ ' + message;
    successMsg.style.display = 'block';
    
    setTimeout(() => {
      successMsg.style.display = 'none';
    }, 3000);
  } else {
    errorMsg.textContent = '✗ ' + message;
    errorMsg.style.display = 'block';
    
    setTimeout(() => {
      errorMsg.style.display = 'none';
    }, 3000);
  }
}

// Update statistics
function updateStats(isPhishing) {
  chrome.storage.local.get(['phishingCount', 'safeCount'], (result) => {
    const phishingCount = (result.phishingCount || 0) + (isPhishing ? 1 : 0);
    const safeCount = (result.safeCount || 0) + (isPhishing ? 0 : 1);
    
    chrome.storage.local.set({
      phishingCount: phishingCount,
      safeCount: safeCount
    });
    
    loadStats();
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateStats') {
    updateStats(request.isPhishing);
  }
});

// Load blocked senders
async function loadBlockedSenders() {
  chrome.runtime.sendMessage({ action: 'getBlockedSenders' }, (response) => {
    const container = document.getElementById('blockedList');
    const senders = response.senders || [];
    
    if (senders.length === 0) {
      container.innerHTML = '<p class="empty-message">Chưa có người gửi bị chặn</p>';
    } else {
      container.innerHTML = senders.map(email => `
        <div class="email-item">
          <span class="email-address">${email}</span>
          <button class="remove-btn" data-email="${email}" data-list="blocked">✕</button>
        </div>
      `).join('');
      
      // Add event listeners to remove buttons
      container.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const email = e.target.getAttribute('data-email');
          removeSender(email, 'blocked');
        });
      });
    }
  });
}

// Load whitelisted senders
async function loadWhitelistedSenders() {
  chrome.runtime.sendMessage({ action: 'getWhitelistedSenders' }, (response) => {
    const container = document.getElementById('whitelistedList');
    const senders = response.senders || [];
    
    if (senders.length === 0) {
      container.innerHTML = '<p class="empty-message">Chưa có người gửi được đánh dấu an toàn</p>';
    } else {
      container.innerHTML = senders.map(email => `
        <div class="email-item">
          <span class="email-address">${email}</span>
          <button class="remove-btn" data-email="${email}" data-list="whitelist">✕</button>
        </div>
      `).join('');
      
      // Add event listeners to remove buttons
      container.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const email = e.target.getAttribute('data-email');
          removeSender(email, 'whitelist');
        });
      });
    }
  });
}

// Load action logs
async function loadActionLogs() {
  chrome.storage.local.get(['actionLogs'], (result) => {
    const container = document.getElementById('actionLogs');
    const logs = result.actionLogs || [];
    
    if (logs.length === 0) {
      container.innerHTML = '<p class="empty-message">Chưa có hành động nào</p>';
    } else {
      // Show last 10 logs in reverse order
      const recentLogs = logs.slice(-10).reverse();
      container.innerHTML = recentLogs.map(log => {
        const actionNames = {
          delete: 'XÓA EMAIL',
          spam: 'BÁO CÁO SPAM',
          block: 'CHẶN NGƯỜI GỬI',
          quarantine: 'QUARANTINE',
          whitelist: 'ĐÁNH DẤU AN TOÀN'
        };
        
        const date = new Date(log.timestamp);
        const timeStr = date.toLocaleString('vi-VN');
        
        return `
          <div class="log-item">
            <div class="log-action">${actionNames[log.action] || log.action}</div>
            <div class="log-details">
              <strong>Từ:</strong> ${log.sender}<br>
              <strong>Tiêu đề:</strong> ${log.subject || 'N/A'}
            </div>
            <div class="log-time">${timeStr}</div>
          </div>
        `;
      }).join('');
    }
  });
}

// Remove sender from list
function removeSender(email, listType) {
  const storageKey = listType === 'blocked' ? 'blockedSenders' : 'whitelistedSenders';
  
  chrome.storage.sync.get([storageKey], (result) => {
    let senders = result[storageKey] || [];
    senders = senders.filter(e => e !== email);
    
    chrome.storage.sync.set({ [storageKey]: senders }, () => {
      if (listType === 'blocked') {
        loadBlockedSenders();
      } else {
        loadWhitelistedSenders();
      }
      showMessage('success', `Đã xóa ${email} khỏi danh sách`);
    });
  });
}

// Clear all blocked senders
function clearBlockedSenders() {
  if (confirm('Bạn có chắc muốn xóa tất cả người gửi bị chặn?')) {
    chrome.storage.sync.set({ blockedSenders: [] }, () => {
      loadBlockedSenders();
      showMessage('success', 'Đã xóa tất cả người gửi bị chặn');
    });
  }
}

// Clear all whitelisted senders
function clearWhitelistedSenders() {
  if (confirm('Bạn có chắc muốn xóa tất cả người gửi an toàn?')) {
    chrome.storage.sync.set({ whitelistedSenders: [] }, () => {
      loadWhitelistedSenders();
      showMessage('success', 'Đã xóa tất cả người gửi an toàn');
    });
  }
}

// Clear action logs
function clearActionLogs() {
  if (confirm('Bạn có chắc muốn xóa lịch sử hành động?')) {
    chrome.storage.local.set({ actionLogs: [] }, () => {
      loadActionLogs();
      showMessage('success', 'Đã xóa lịch sử hành động');
    });
  }
}

// Test phishing detection
async function testPhishingDetection() {
  const testBtn = document.getElementById('testPhishingBtn');
  const resultDiv = document.getElementById('testResult');
  
  testBtn.disabled = true;
  testBtn.textContent = '🔄 Đang test...';
  
  // Create a test phishing email
  const testEmail = {
    sender: 'support@paypal-secure-verify.com',
    displayName: 'PayPal Security Team',
    subject: 'URGENT: Verify Your Account Now - Action Required!',
    body: `
      Dear Valued Customer,
      
      Your PayPal account has been temporarily suspended due to unusual activity.
      
      You must verify your identity immediately to avoid permanent account closure.
      
      Click here to verify: http://bit.ly/verify-now
      
      Please update your payment information and confirm your credit card details.
      
      This is urgent! Act now or your account will be closed within 24 hours.
      
      Enter your password and security code to continue.
      
      Best regards,
      PayPal Security Department
    `,
    links: [
      'http://bit.ly/verify-now',
      'http://paypal-secure-verify.com/login'
    ]
  };
  
  try {
    // Send test email to background for analysis
    chrome.runtime.sendMessage({
      action: 'analyzeEmail',
      emailData: testEmail
    }, (result) => {
      testBtn.disabled = false;
      testBtn.textContent = '🧪 Test với email giả phishing';
      
      if (result) {
        resultDiv.style.display = 'block';
        resultDiv.className = result.isPhishing ? 'test-result danger' : 'test-result safe';
        
        const icon = result.isPhishing ? '🔴' : '🟢';
        const status = result.isPhishing ? 'PHÁT HIỆN PHISHING!' : 'Không phát hiện (Có thể cần cải thiện)';
        
        resultDiv.innerHTML = `
          <div style="text-align: center; margin-bottom: 10px;">
            <span style="font-size: 32px;">${icon}</span>
          </div>
          <div style="font-weight: bold; margin-bottom: 8px;">${status}</div>
          <div style="margin-bottom: 8px;"><strong>Độ tin cậy:</strong> ${result.confidence}%</div>
          <div style="margin-bottom: 8px;"><strong>Lý do phát hiện:</strong></div>
          <ul style="margin: 0; padding-left: 20px; text-align: left;">
            ${result.reasons.map(r => `<li>${r}</li>`).join('')}
          </ul>
          <div style="margin-top: 8px; font-size: 11px; opacity: 0.8;">
            Phương pháp: ${result.method}
          </div>
        `;
        
        if (result.isPhishing) {
          showMessage('success', '✅ Extension hoạt động tốt! Đã phát hiện email test phishing.');
        } else {
          showMessage('error', '⚠️ Cần cải thiện! Email test phishing không được phát hiện.');
        }
      }
    });
  } catch (error) {
    testBtn.disabled = false;
    testBtn.textContent = '🧪 Test với email giả phishing';
    showMessage('error', 'Lỗi khi test: ' + error.message);
  }
}
