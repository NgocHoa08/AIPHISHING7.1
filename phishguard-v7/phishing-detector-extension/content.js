// content.js - Content script to monitor and analyze emails

let currentEmailData = null;
let analysisInProgress = false;

// Initialize the extension
function init() {
  console.log('Phishing Detector Extension initialized');
  
  if (window.location.hostname.includes('mail.google.com')) {
    monitorGmail();
  } else if (window.location.hostname.includes('outlook')) {
    monitorOutlook();
  }
}

// Monitor Gmail emails - only when opened
function monitorGmail() {
  let lastEmailId = null;

  // Observer for Gmail interface changes
  const observer = new MutationObserver((mutations) => {
    // Check if an email is currently open (not just inbox view)
    const emailView = document.querySelector('[role="main"] [data-message-id]');
    
    if (emailView) {
      const messageId = emailView.getAttribute('data-message-id');
      
      // Only analyze if it's a different email
      if (messageId && messageId !== lastEmailId) {
        lastEmailId = messageId;
        // Reset current email data for fresh analysis
        currentEmailData = null;
        analysisInProgress = false;
        
        // Wait a bit for email to fully load
        setTimeout(() => {
          if (!analysisInProgress) {
            analyzeCurrentEmail();
          }
        }, 500);
      }
    } else {
      // Back to inbox - reset
      lastEmailId = null;
      currentEmailData = null;
      analysisInProgress = false;
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Also check on load
  setTimeout(() => {
    const emailView = document.querySelector('[role="main"] [data-message-id]');
    if (emailView) {
      lastEmailId = emailView.getAttribute('data-message-id');
      analyzeCurrentEmail();
    }
  }, 2000);
}

// Monitor Outlook emails
function monitorOutlook() {
  const observer = new MutationObserver((mutations) => {
    if (!analysisInProgress) {
      analyzeCurrentEmail();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  setTimeout(() => analyzeCurrentEmail(), 2000);
}

// Extract email data from Gmail
function extractGmailData() {
  try {
    const emailData = {
      sender: '',
      displayName: '',
      subject: '',
      body: '',
      links: []
    };

    // Get sender info
    const senderElement = document.querySelector('[email]');
    if (senderElement) {
      emailData.sender = senderElement.getAttribute('email');
      emailData.displayName = senderElement.getAttribute('name') || '';
    }

    // Get subject
    const subjectElement = document.querySelector('h2.hP');
    if (subjectElement) {
      emailData.subject = subjectElement.textContent.trim();
    }

    // Get email body
    const bodyElement = document.querySelector('.a3s.aiL');
    if (bodyElement) {
      emailData.body = bodyElement.textContent.trim();
      
      // Extract links
      const links = bodyElement.querySelectorAll('a[href]');
      emailData.links = Array.from(links).map(a => a.href).filter(href => 
        href.startsWith('http')
      );
    }

    return emailData;
  } catch (error) {
    console.error('Error extracting Gmail data:', error);
    return null;
  }
}

// Extract email data from Outlook
function extractOutlookData() {
  try {
    const emailData = {
      sender: '',
      displayName: '',
      subject: '',
      body: '',
      links: []
    };

    // Get sender
    const senderElement = document.querySelector('[aria-label*="From"]');
    if (senderElement) {
      const text = senderElement.textContent;
      const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        emailData.sender = emailMatch[0];
      }
      emailData.displayName = text.split('<')[0].trim();
    }

    // Get subject
    const subjectElement = document.querySelector('[aria-label*="Subject"]');
    if (subjectElement) {
      emailData.subject = subjectElement.textContent.trim();
    }

    // Get body
    const bodyElement = document.querySelector('[role="document"]');
    if (bodyElement) {
      emailData.body = bodyElement.textContent.trim();
      
      const links = bodyElement.querySelectorAll('a[href]');
      emailData.links = Array.from(links).map(a => a.href).filter(href => 
        href.startsWith('http')
      );
    }

    return emailData;
  } catch (error) {
    console.error('Error extracting Outlook data:', error);
    return null;
  }
}

// Analyze current email
async function analyzeCurrentEmail() {
  if (analysisInProgress) return;
  
  analysisInProgress = true;

  try {
    // Extract email data based on platform
    let emailData;
    if (window.location.hostname.includes('mail.google.com')) {
      emailData = extractGmailData();
    } else if (window.location.hostname.includes('outlook')) {
      emailData = extractOutlookData();
    }

    if (!emailData || !emailData.sender) {
      analysisInProgress = false;
      return;
    }

    // Create unique ID for this email
    const emailId = `${emailData.sender}-${emailData.subject}`;
    const currentEmailId = currentEmailData ? 
      `${currentEmailData.sender}-${currentEmailData.subject}` : null;

    // Check if this is the same email we just analyzed
    if (currentEmailId === emailId) {
      analysisInProgress = false;
      return;
    }

    currentEmailData = emailData;

    // Send to background script for analysis
    chrome.runtime.sendMessage({
      action: 'analyzeEmail',
      emailData: emailData
    }, (result) => {
      if (result && !result.error) {
        displayWarningBanner(result);
      }
      analysisInProgress = false;
    });

  } catch (error) {
    console.error('Analysis error:', error);
    analysisInProgress = false;
  }
}

// Display warning banner with clear percentage
function displayWarningBanner(result) {
  // Remove existing banner
  const existingBanner = document.getElementById('phishing-warning-banner');
  if (existingBanner) {
    existingBanner.remove();
  }

  // Check settings
  chrome.storage.sync.get(['debugMode', 'compactMode'], (settings) => {
    const debugMode = settings.debugMode || false;
    const compactMode = settings.compactMode !== false; // Default true

    // Create warning banner
    const banner = document.createElement('div');
    banner.id = 'phishing-warning-banner';
    banner.className = result.isPhishing ? 'phishing-warning danger' : 'phishing-warning safe';
    if (compactMode) {
      banner.classList.add('compact');
    }
    
    // Determine risk level and styling
    const riskLevel = getRiskLevel(result.confidence, result.isPhishing);
    const icon = riskLevel.icon;
    const title = riskLevel.title;
    const subtitle = riskLevel.subtitle;
    
    // Compact header with prominent percentage
    const compactHeader = `
      <div class="warning-header-compact" onclick="this.parentElement.classList.toggle('expanded')">
        <div class="header-main">
          <span class="warning-icon-large">${icon}</span>
          <div class="header-text">
            <div class="warning-title-main">${title}</div>
            <div class="warning-subtitle">${subtitle}</div>
          </div>
        </div>
        <div class="header-right">
          <div class="risk-percentage ${result.isPhishing ? 'danger-percent' : 'safe-percent'}">
            <div class="percentage-number">${result.confidence}%</div>
            <div class="percentage-label">${result.isPhishing ? 'Nguy hiểm' : 'An toàn'}</div>
          </div>
          <button class="expand-btn" onclick="event.stopPropagation()">
            <span class="expand-icon">▼</span>
          </button>
          <button class="close-btn-new" onclick="event.stopPropagation(); this.closest('#phishing-warning-banner').remove()">✕</button>
        </div>
      </div>
    `;
    
    // Quick action buttons (always visible in compact mode)
    const quickActions = result.isPhishing ? `
      <div class="quick-actions">
        <button class="quick-action-btn delete" data-action="delete" title="Xóa email ngay">
          <span class="action-icon">🗑️</span>
          <span class="action-label">Xóa</span>
        </button>
        <button class="quick-action-btn spam" data-action="spam" title="Báo cáo spam">
          <span class="action-icon">🚫</span>
          <span class="action-label">Spam</span>
        </button>
        <button class="quick-action-btn block" data-action="block" title="Chặn người gửi">
          <span class="action-icon">⛔</span>
          <span class="action-label">Chặn</span>
        </button>
      </div>
    ` : `
      <div class="quick-actions safe-actions">
        <button class="quick-action-btn whitelist" data-action="whitelist" title="Đánh dấu an toàn">
          <span class="action-icon">✅</span>
          <span class="action-label">An toàn</span>
        </button>
      </div>
    `;
    
    // Debug info
    const debugInfo = debugMode ? `
      <div class="debug-info-new">
        <details>
          <summary>🔍 Debug Information</summary>
          <div class="debug-content">
            <div class="debug-row"><strong>Sender:</strong> ${currentEmailData?.sender || 'N/A'}</div>
            <div class="debug-row"><strong>Display Name:</strong> ${currentEmailData?.displayName || 'N/A'}</div>
            <div class="debug-row"><strong>Subject:</strong> ${currentEmailData?.subject || 'N/A'}</div>
            <div class="debug-row"><strong>Links:</strong> ${currentEmailData?.links?.length || 0}</div>
            <div class="debug-row"><strong>Score:</strong> ${result.confidence}/100</div>
            <div class="debug-row"><strong>Method:</strong> ${result.method}</div>
          </div>
        </details>
      </div>
    ` : '';
    
    // Expandable details
    const expandableContent = `
      <div class="warning-details-new">
        <div class="details-section">
          <h4>📋 Chi tiết phân tích</h4>
          <ul class="reasons-list">
            ${result.reasons.map((reason, idx) => `
              <li class="reason-item">
                <span class="reason-number">${idx + 1}</span>
                <span class="reason-text">${reason}</span>
              </li>
            `).join('')}
          </ul>
        </div>
        
        <div class="details-section recommendation-section">
          <h4>💡 Khuyến nghị</h4>
          <p class="recommendation-text">${result.recommendation}</p>
        </div>
        
        ${result.isPhishing ? `
        <div class="details-section actions-section">
          <h4>⚡ Hành động nhanh</h4>
          <div class="full-actions">
            <button class="full-action-btn quarantine" data-action="quarantine">
              <span class="action-icon">📁</span>
              <span class="action-text">Chuyển vào Quarantine</span>
            </button>
            <button class="full-action-btn reanalyze" data-action="reanalyze">
              <span class="action-icon">🔄</span>
              <span class="action-text">Phân tích lại</span>
            </button>
          </div>
        </div>
        ` : ''}
        
        ${debugInfo}
        
        <div class="details-footer">
          <small>Phương pháp phát hiện: ${result.method}</small>
        </div>
      </div>
    `;
    
    banner.innerHTML = compactHeader + quickActions + expandableContent;

    // Add event listeners to all action buttons
    banner.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.currentTarget.getAttribute('data-action');
        handleEmailAction(action);
      });
    });

    // Add expand button listener
    const expandBtn = banner.querySelector('.expand-btn');
    if (expandBtn) {
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        banner.classList.toggle('expanded');
      });
    }

    // Insert banner at the top of the email view
    const emailContainer = document.querySelector('[role="main"]') || 
                           document.querySelector('.ReadingPaneContents') ||
                           document.body;
    
    if (emailContainer) {
      emailContainer.insertBefore(banner, emailContainer.firstChild);
      
      // Auto-expand if very dangerous (>80%)
      if (result.confidence >= 80 && result.isPhishing) {
        setTimeout(() => banner.classList.add('expanded'), 500);
      }
    }
  });
}

// Get risk level information
function getRiskLevel(confidence, isPhishing) {
  if (!isPhishing) {
    return {
      icon: '✅',
      title: 'Email An Toàn',
      subtitle: 'Không phát hiện dấu hiệu lừa đảo'
    };
  }
  
  if (confidence >= 90) {
    return {
      icon: '🚨',
      title: 'NGUY HIỂM CỰC KỲ CAO',
      subtitle: 'Rất có khả năng là email lừa đảo'
    };
  } else if (confidence >= 70) {
    return {
      icon: '⚠️',
      title: 'CẢNH BÁO NGUY HIỂM',
      subtitle: 'Email có nhiều dấu hiệu lừa đảo'
    };
  } else if (confidence >= 50) {
    return {
      icon: '⚠️',
      title: 'Email Đáng Ngờ',
      subtitle: 'Cần cẩn thận khi xử lý'
    };
  } else {
    return {
      icon: '⚠',
      title: 'Email Cần Chú Ý',
      subtitle: 'Có một số dấu hiệu cần cảnh giác'
    };
  }
}

// Handle email actions
async function handleEmailAction(action) {
  if (!currentEmailData) {
    console.log('[ACTION] No email data available for action:', action);
    return;
  }

  const actionMessages = {
    delete: 'Đang xóa email...',
    spam: 'Đang báo cáo spam...',
    block: 'Đang chặn người gửi...',
    quarantine: 'Đang chuyển vào Quarantine...',
    whitelist: 'Đang thêm vào danh sách an toàn...',
    reanalyze: 'Đang phân tích lại...'
  };

  console.log('[ACTION] Executing:', action, 'for email:', currentEmailData.sender);
  showActionProgress(actionMessages[action]);

  try {
    switch(action) {
      case 'delete':
        const deleteSuccess = await deleteEmail();
        if (deleteSuccess) {
          showActionSuccess('✓ Đã xóa email thành công');
          logAction('delete');
          // Wait a bit then try to go back
          setTimeout(() => {
            const backBtn = document.querySelector('[aria-label="Back to Inbox"]') || 
                           document.querySelector('[gh="l"] a[href*="inbox"]');
            if (backBtn) {
              backBtn.click();
            } else {
              // Fallback: reload Gmail
              window.location.href = 'https://mail.google.com/mail/u/0/#inbox';
            }
          }, 1500);
        } else {
          showActionError('✗ Không thể xóa email. Thử bật Gmail shortcuts trong Settings.');
        }
        break;
        
      case 'spam':
        const spamSuccess = await moveToSpam();
        if (spamSuccess) {
          showActionSuccess('✓ Đã báo cáo spam');
          logAction('spam');
          setTimeout(() => {
            const backBtn = document.querySelector('[aria-label="Back to Inbox"]') || 
                           document.querySelector('[gh="l"] a[href*="inbox"]');
            if (backBtn) {
              backBtn.click();
            } else {
              window.location.href = 'https://mail.google.com/mail/u/0/#inbox';
            }
          }, 1500);
        } else {
          showActionError('✗ Không thể báo cáo spam. Thử bật Gmail shortcuts.');
        }
        break;
        
      case 'block':
        const blockResult = await chrome.runtime.sendMessage({
          action: 'blockSender',
          email: currentEmailData.sender
        });
        if (blockResult && blockResult.success) {
          const spamSuccess = await moveToSpam();
          if (spamSuccess) {
            showActionSuccess('✓ Đã chặn người gửi và chuyển email vào spam');
            logAction('block');
            setTimeout(() => {
              const backBtn = document.querySelector('[aria-label="Back to Inbox"]') || 
                             document.querySelector('[gh="l"] a[href*="inbox"]');
              if (backBtn) {
                backBtn.click();
              } else {
                window.location.href = 'https://mail.google.com/mail/u/0/#inbox';
              }
            }, 1500);
          } else {
            showActionSuccess('✓ Đã chặn người gửi (nhưng không thể tự động spam)');
          }
        } else {
          showActionInfo(blockResult?.message || 'Email này đã bị chặn');
        }
        break;
        
      case 'quarantine':
        const quarantineSuccess = await moveToQuarantine();
        if (quarantineSuccess) {
          showActionSuccess('✓ Đã chuyển vào Quarantine');
          logAction('quarantine');
          setTimeout(() => {
            const backBtn = document.querySelector('[aria-label="Back to Inbox"]') || 
                           document.querySelector('[gh="l"] a[href*="inbox"]');
            if (backBtn) {
              backBtn.click();
            } else {
              window.location.href = 'https://mail.google.com/mail/u/0/#inbox';
            }
          }, 1500);
        }
        // Error message already shown in moveToQuarantine
        break;
        
      case 'whitelist':
        const whitelistResult = await chrome.runtime.sendMessage({
          action: 'whitelistSender',
          email: currentEmailData.sender
        });
        if (whitelistResult && whitelistResult.success) {
          showActionSuccess('✓ Đã thêm vào danh sách an toàn');
          logAction('whitelist');
          // Refresh analysis
          currentEmailData = null;
          setTimeout(() => analyzeCurrentEmail(), 1000);
        } else {
          showActionInfo(whitelistResult?.message || 'Email này đã trong danh sách an toàn');
        }
        break;
        
      case 'reanalyze':
        currentEmailData = null;
        analysisInProgress = false;
        await analyzeCurrentEmail();
        showActionSuccess('✓ Đã phân tích lại');
        break;
    }
  } catch (error) {
    console.error('[ACTION] Error:', error);
    showActionError('✗ Có lỗi xảy ra: ' + error.message);
  }
}

// Delete email - Find and click actual Gmail delete button
async function deleteEmail() {
  console.log('[DELETE] Starting delete process...');
  
  if (window.location.hostname.includes('mail.google.com')) {
    // Step 1: Make sure we're focused on the email
    const emailBody = document.querySelector('[role="main"]');
    if (emailBody) emailBody.focus();
    
    // Step 2: Find the toolbar with action buttons
    const toolbar = document.querySelector('[gh="tm"]'); // Gmail toolbar
    console.log('[DELETE] Toolbar found:', !!toolbar);
    
    if (toolbar) {
      // Method 1: Find delete button in toolbar by multiple methods
      let deleteBtn = null;
      
      // Try data-tooltip first (most reliable)
      deleteBtn = toolbar.querySelector('[data-tooltip="Delete"]') || 
                  toolbar.querySelector('[data-tooltip="Xóa"]') ||
                  toolbar.querySelector('[data-tooltip*="elete"]');
      
      if (!deleteBtn) {
        // Try aria-label
        deleteBtn = toolbar.querySelector('[aria-label="Delete"]') ||
                    toolbar.querySelector('[aria-label="Xóa"]') ||
                    toolbar.querySelector('[aria-label*="elete"]');
      }
      
      if (!deleteBtn) {
        // Try by icon (Gmail uses specific class for delete icon)
        const allButtons = toolbar.querySelectorAll('div[role="button"]');
        for (const btn of allButtons) {
          const tooltip = btn.getAttribute('data-tooltip') || 
                         btn.getAttribute('aria-label') || '';
          if (tooltip.toLowerCase().includes('delete') || 
              tooltip.toLowerCase().includes('xóa') ||
              tooltip.toLowerCase().includes('trash')) {
            deleteBtn = btn;
            break;
          }
        }
      }
      
      if (deleteBtn) {
        console.log('[DELETE] Found delete button, clicking...');
        deleteBtn.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('[DELETE] Delete button clicked successfully');
        return true;
      }
    }
    
    // Method 2: Use Gmail keyboard shortcut as fallback
    console.log('[DELETE] Button not found, using keyboard shortcut...');
    
    // Focus on email first
    if (emailBody) emailBody.click();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Send keyboard event for # (delete in Gmail)
    const event = new KeyboardEvent('keydown', {
      key: '#',
      code: 'Digit3',
      keyCode: 51,
      which: 51,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
      view: window
    });
    
    document.body.dispatchEvent(event);
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('[DELETE] Keyboard shortcut sent');
    return true;
    
  } else if (window.location.hostname.includes('outlook')) {
    // Outlook delete
    const deleteBtn = document.querySelector('[aria-label*="Delete"]');
    if (deleteBtn) {
      deleteBtn.click();
      return new Promise(resolve => setTimeout(() => resolve(true), 500));
    }
  }
  
  return false;
}

// Move to spam - Find and click actual Gmail spam button
async function moveToSpam() {
  console.log('[SPAM] Starting spam process...');
  
  if (window.location.hostname.includes('mail.google.com')) {
    // Step 1: Focus on email
    const emailBody = document.querySelector('[role="main"]');
    if (emailBody) emailBody.focus();
    
    // Step 2: Find toolbar
    const toolbar = document.querySelector('[gh="tm"]');
    console.log('[SPAM] Toolbar found:', !!toolbar);
    
    if (toolbar) {
      let spamBtn = null;
      
      // Try data-tooltip
      spamBtn = toolbar.querySelector('[data-tooltip="Report spam"]') ||
                toolbar.querySelector('[data-tooltip="Báo cáo spam"]') ||
                toolbar.querySelector('[data-tooltip*="spam"]');
      
      if (!spamBtn) {
        // Try aria-label
        spamBtn = toolbar.querySelector('[aria-label="Report spam"]') ||
                  toolbar.querySelector('[aria-label="Báo cáo spam"]') ||
                  toolbar.querySelector('[aria-label*="spam" i]');
      }
      
      if (!spamBtn) {
        // Try by searching all buttons
        const allButtons = toolbar.querySelectorAll('div[role="button"]');
        for (const btn of allButtons) {
          const tooltip = (btn.getAttribute('data-tooltip') || 
                          btn.getAttribute('aria-label') || '').toLowerCase();
          if (tooltip.includes('spam') || tooltip.includes('báo cáo')) {
            spamBtn = btn;
            break;
          }
        }
      }
      
      if (spamBtn) {
        console.log('[SPAM] Found spam button, clicking...');
        spamBtn.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('[SPAM] Spam button clicked successfully');
        return true;
      }
    }
    
    // Fallback: Keyboard shortcut (!)
    console.log('[SPAM] Button not found, using keyboard shortcut...');
    
    if (emailBody) emailBody.click();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const event = new KeyboardEvent('keydown', {
      key: '!',
      code: 'Digit1',
      keyCode: 49,
      which: 49,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
      view: window
    });
    
    document.body.dispatchEvent(event);
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('[SPAM] Keyboard shortcut sent');
    return true;
    
  } else if (window.location.hostname.includes('outlook')) {
    const junkBtn = document.querySelector('[aria-label*="Junk"]');
    if (junkBtn) {
      junkBtn.click();
      return new Promise(resolve => setTimeout(() => resolve(true), 500));
    }
  }
  
  return false;
}

// Move to quarantine (create/use Quarantine label in Gmail)
async function moveToQuarantine() {
  console.log('[QUARANTINE] Starting quarantine process...');
  
  if (window.location.hostname.includes('mail.google.com')) {
    // Step 1: Find Move to button
    const toolbar = document.querySelector('[gh="tm"]');
    
    if (toolbar) {
      // Find "Move to" button
      let moveBtn = null;
      
      moveBtn = toolbar.querySelector('[data-tooltip="Move to"]') ||
                toolbar.querySelector('[data-tooltip="Di chuyển đến"]') ||
                toolbar.querySelector('[aria-label="Move to"]');
      
      if (!moveBtn) {
        const allButtons = toolbar.querySelectorAll('div[role="button"]');
        for (const btn of allButtons) {
          const tooltip = (btn.getAttribute('data-tooltip') || 
                          btn.getAttribute('aria-label') || '').toLowerCase();
          if (tooltip.includes('move') || tooltip.includes('di chuyển')) {
            moveBtn = btn;
            break;
          }
        }
      }
      
      if (moveBtn) {
        console.log('[QUARANTINE] Found move button, clicking...');
        moveBtn.click();
        
        // Wait for menu to appear
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Look for Quarantine label in the menu
        const menu = document.querySelector('[role="menu"]');
        if (menu) {
          const menuItems = menu.querySelectorAll('[role="menuitem"]');
          let quarantineItem = null;
          
          for (const item of menuItems) {
            const text = item.textContent.toLowerCase();
            if (text.includes('quarantine') || text.includes('cách ly')) {
              quarantineItem = item;
              break;
            }
          }
          
          if (quarantineItem) {
            console.log('[QUARANTINE] Found Quarantine label, clicking...');
            quarantineItem.click();
            await new Promise(resolve => setTimeout(resolve, 500));
            return true;
          } else {
            // Close menu first
            document.body.click();
            await new Promise(resolve => setTimeout(resolve, 200));
            
            console.log('[QUARANTINE] Quarantine label not found');
            showActionInfo('⚠️ Chưa có label "Quarantine". Tạo label "Quarantine" trong Gmail Settings → Labels để sử dụng tính năng này.');
            return false;
          }
        }
      }
    }
    
    // If move button not found, suggest manual creation
    console.log('[QUARANTINE] Move button not found');
    showActionInfo('💡 Tạo label "Quarantine" trong Gmail (Settings → Labels) để sử dụng tính năng này. Hoặc dùng nút "Spam" để báo cáo.');
    return false;
    
  } else if (window.location.hostname.includes('outlook')) {
    // Outlook: Try to move to folder
    const moveBtn = document.querySelector('[aria-label*="Move"]');
    if (moveBtn) {
      moveBtn.click();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Look for Quarantine folder
      const folders = document.querySelectorAll('[role="menuitem"]');
      for (const folder of folders) {
        if (folder.textContent.toLowerCase().includes('quarantine')) {
          folder.click();
          return new Promise(resolve => setTimeout(() => resolve(true), 500));
        }
      }
    }
    
    showActionInfo('💡 Tạo folder "Quarantine" trong Outlook để sử dụng tính năng này.');
    return false;
  }
  
  return false;
}

// Log action
function logAction(actionType) {
  chrome.runtime.sendMessage({
    action: 'logAction',
    actionType: actionType,
    emailData: currentEmailData
  });
}

// Show action progress
function showActionProgress(message) {
  const existing = document.getElementById('action-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.id = 'action-notification';
  notification.className = 'action-notification progress';
  notification.innerHTML = `
    <div class="notification-content">
      <span class="spinner">⏳</span>
      <span>${message}</span>
    </div>
  `;
  document.body.appendChild(notification);
}

// Show action success
function showActionSuccess(message) {
  const existing = document.getElementById('action-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.id = 'action-notification';
  notification.className = 'action-notification success';
  notification.innerHTML = `
    <div class="notification-content">
      <span>${message}</span>
    </div>
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Show action error
function showActionError(message) {
  const existing = document.getElementById('action-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.id = 'action-notification';
  notification.className = 'action-notification error';
  notification.innerHTML = `
    <div class="notification-content">
      <span>${message}</span>
    </div>
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Show action info
function showActionInfo(message) {
  const existing = document.getElementById('action-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.id = 'action-notification';
  notification.className = 'action-notification info';
  notification.innerHTML = `
    <div class="notification-content">
      <span>${message}</span>
    </div>
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 4000);
}

// Handle context menu actions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'contextMenuAction') {
    const actionMap = {
      'delete-email': 'delete',
      'move-to-spam': 'spam',
      'block-sender': 'block',
      'move-to-quarantine': 'quarantine',
      'whitelist-sender': 'whitelist',
      'analyze-again': 'reanalyze'
    };
    
    const action = actionMap[request.menuItemId];
    if (action) {
      handleEmailAction(action);
    }
  }
});

// Start monitoring
init();
