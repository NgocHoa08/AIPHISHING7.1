// background.js - Service Worker for handling API calls and AI analysis

const CLAUDE_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

// Phishing detection patterns - Enhanced version
const PHISHING_INDICATORS = {
  urgentWords: [
    'urgent', 'immediate', 'verify', 'suspend', 'suspended', 'confirm', 
    'click here', 'update now', 'action required', 'act now', 'limited time',
    'expire', 'expires', 'expired', 'locked', 'unusual activity', 'security alert',
    'verify your account', 'confirm your identity', 'update payment', 'suspended account',
    'cấp bách', 'khẩn cấp', 'xác nhận ngay', 'hết hạn', 'bị khóa', 'cập nhật ngay'
  ],
  suspiciousDomains: [
    'paypal-secure', 'amazon-verify', 'bankofamerica-alert', 'apple-support',
    'microsoft-security', 'google-verify', 'facebook-security', 'secure-login',
    'account-verify', 'payment-update', 'billing-support', 'customer-service',
    'bit.ly', 'tinyurl', 'goo.gl', 'ow.ly', 't.co', 'is.gd'
  ],
  dangerousPatterns: /password|credit card|social security|ssn|account.*verify|banking.*details|card.*number|cvv|pin.*code|security.*code|mật khẩu|thẻ.*tín.*dụng|số.*tài.*khoản/gi,
  
  // Suspicious phrases
  suspiciousPhrases: [
    'click here to verify',
    'confirm your account',
    'unusual sign-in activity',
    'your account will be closed',
    'update your information',
    're-enter your password',
    'confirm your payment method',
    'you have won',
    'congratulations',
    'claim your prize',
    'free money',
    'act now',
    'don\'t miss out'
  ],
  
  // Legitimate domains (common services)
  legitimateDomains: [
    'gmail.com', 'google.com', 'microsoft.com', 'outlook.com', 'apple.com',
    'facebook.com', 'linkedin.com', 'twitter.com', 'amazon.com', 'paypal.com',
    'netflix.com', 'spotify.com', 'dropbox.com', 'slack.com', 'zoom.us'
  ]
};

// Initialize context menus
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for detected phishing emails
  chrome.contextMenus.create({
    id: 'phishing-actions',
    title: '🛡️ Phishing Actions',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'delete-email',
    parentId: 'phishing-actions',
    title: '🗑️ Xóa email này',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'move-to-spam',
    parentId: 'phishing-actions',
    title: '🚫 Báo cáo spam',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'block-sender',
    parentId: 'phishing-actions',
    title: '⛔ Chặn người gửi',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'move-to-quarantine',
    parentId: 'phishing-actions',
    title: '📁 Chuyển vào Quarantine',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'whitelist-sender',
    parentId: 'phishing-actions',
    title: '✅ Đánh dấu an toàn',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'separator-1',
    parentId: 'phishing-actions',
    type: 'separator',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'analyze-again',
    parentId: 'phishing-actions',
    title: '🔄 Phân tích lại',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  chrome.tabs.sendMessage(tab.id, {
    action: 'contextMenuAction',
    menuItemId: info.menuItemId
  });
});

// Analyze email using AI (Claude API)
async function analyzeEmailWithAI(emailContent) {
  try {
    const response = await fetch(CLAUDE_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': await getApiKey(),
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Phân tích email sau và cho biết có phải email lừa đảo (phishing) không. Trả lời bằng JSON với format: {"isPhishing": true/false, "confidence": 0-100, "reasons": ["lý do 1", "lý do 2"], "recommendation": "khuyến nghị"}

Email content:
${emailContent}`
        }]
      })
    });

    if (!response.ok) {
      throw new Error('AI API error');
    }

    const data = await response.json();
    const aiResponse = data.content[0].text;
    
    // Parse AI response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return null;
  } catch (error) {
    console.error('AI Analysis Error:', error);
    return null;
  }
}

// Basic phishing detection using rules
function detectPhishingRules(emailData) {
  let score = 0;
  const reasons = [];
  const content = (emailData.subject + ' ' + emailData.body).toLowerCase();

  // 1. Check sender domain mismatch
  if (emailData.sender && emailData.displayName) {
    const senderDomain = emailData.sender.split('@')[1]?.toLowerCase();
    const displayNameLower = emailData.displayName.toLowerCase();
    
    if (senderDomain) {
      const domainName = senderDomain.split('.')[0];
      
      // Check if display name mentions a brand but domain doesn't match
      PHISHING_INDICATORS.legitimateDomains.forEach(legitDomain => {
        const brandName = legitDomain.split('.')[0];
        if (displayNameLower.includes(brandName) && !senderDomain.includes(brandName)) {
          score += 35;
          reasons.push(`Tên hiển thị "${emailData.displayName}" không khớp với domain "${senderDomain}"`);
        }
      });
      
      // Check for suspicious domain patterns
      if (senderDomain.includes('-') && (
          senderDomain.includes('verify') || 
          senderDomain.includes('secure') || 
          senderDomain.includes('account') ||
          senderDomain.includes('support')
      )) {
        score += 25;
        reasons.push('Domain chứa từ khóa đáng ngờ kết hợp với dấu gạch ngang');
      }
    }
  }

  // 2. Check urgent words
  const urgentCount = PHISHING_INDICATORS.urgentWords.filter(word => 
    content.includes(word.toLowerCase())
  ).length;
  
  if (urgentCount >= 3) {
    score += 30;
    reasons.push(`Chứa ${urgentCount} từ khóa tạo cảm giác cấp bách/khẩn cấp`);
  } else if (urgentCount >= 2) {
    score += 15;
    reasons.push('Chứa từ khóa tạo áp lực hành động ngay');
  }

  // 3. Check suspicious phrases
  const suspiciousPhraseCount = PHISHING_INDICATORS.suspiciousPhrases.filter(phrase =>
    content.includes(phrase.toLowerCase())
  ).length;
  
  if (suspiciousPhraseCount > 0) {
    score += suspiciousPhraseCount * 15;
    reasons.push(`Chứa ${suspiciousPhraseCount} cụm từ đáng ngờ thường gặp trong email lừa đảo`);
  }

  // 4. Check suspicious links
  if (emailData.links && emailData.links.length > 0) {
    let suspiciousLinkCount = 0;
    const linkIssues = [];
    
    emailData.links.forEach(link => {
      try {
        const url = new URL(link);
        
        // Check URL shorteners
        if (url.hostname.includes('bit.ly') || 
            url.hostname.includes('tinyurl') || 
            url.hostname.includes('goo.gl') ||
            url.hostname.includes('t.co')) {
          suspiciousLinkCount++;
          linkIssues.push('link rút gọn');
        }
        
        // Check suspicious domain patterns
        if (PHISHING_INDICATORS.suspiciousDomains.some(domain => 
          url.hostname.includes(domain)
        )) {
          suspiciousLinkCount++;
          linkIssues.push('domain giả mạo');
        }
        
        // Check for IP address in URL
        if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url.hostname)) {
          suspiciousLinkCount++;
          linkIssues.push('sử dụng địa chỉ IP thay vì tên miền');
        }
        
        // Check for excessive subdomains
        const subdomains = url.hostname.split('.');
        if (subdomains.length > 4) {
          suspiciousLinkCount++;
          linkIssues.push('quá nhiều subdomain');
        }
      } catch (error) {
        // Invalid URL
        suspiciousLinkCount++;
        linkIssues.push('URL không hợp lệ');
      }
    });

    if (suspiciousLinkCount > 0) {
      score += Math.min(suspiciousLinkCount * 20, 40);
      reasons.push(`Chứa ${suspiciousLinkCount} link đáng ngờ (${[...new Set(linkIssues)].join(', ')})`);
    }
    
    // Too many links might be spam
    if (emailData.links.length > 10) {
      score += 10;
      reasons.push(`Chứa quá nhiều link (${emailData.links.length} links)`);
    }
  }

  // 5. Check for dangerous patterns (sensitive info requests)
  const sensitiveMatches = content.match(PHISHING_INDICATORS.dangerousPatterns);
  if (sensitiveMatches && sensitiveMatches.length > 0) {
    score += 35;
    reasons.push('Yêu cầu thông tin nhạy cảm (mật khẩu, thẻ tín dụng, số tài khoản)');
  }

  // 6. Check for generic greetings (phishing often uses generic greetings)
  if (content.includes('dear customer') || 
      content.includes('dear user') || 
      content.includes('dear member') ||
      content.includes('valued customer')) {
    score += 10;
    reasons.push('Sử dụng lời chào chung chung thay vì tên cụ thể');
  }

  // 7. Check for spelling/grammar issues (simple check)
  const spellingIssues = [
    /\s{2,}/g, // Multiple spaces
    /\.{2,}/g, // Multiple periods
    /\!{2,}/g, // Multiple exclamation marks
  ];
  
  let spellingErrorCount = 0;
  spellingIssues.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) spellingErrorCount += matches.length;
  });
  
  if (spellingErrorCount > 3) {
    score += 15;
    reasons.push('Có dấu hiệu lỗi định dạng/chính tả');
  }

  // 8. Check sender domain reputation (basic check)
  if (emailData.sender) {
    const senderDomain = emailData.sender.split('@')[1]?.toLowerCase();
    if (senderDomain) {
      // Free email services used for phishing
      const freeEmailServices = ['temp-mail.org', 'guerrillamail.com', '10minutemail.com', 'mailinator.com'];
      if (freeEmailServices.some(service => senderDomain.includes(service))) {
        score += 20;
        reasons.push('Sử dụng dịch vụ email tạm/anonymous');
      }
      
      // Recently registered domains (common TLDs used in phishing)
      const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top'];
      if (suspiciousTLDs.some(tld => senderDomain.endsWith(tld))) {
        score += 15;
        reasons.push('Sử dụng domain extension đáng ngờ');
      }
    }
  }

  // 9. Check for urgency + money combination
  if ((content.includes('urgent') || content.includes('immediate')) &&
      (content.includes('payment') || content.includes('money') || content.includes('transfer') || content.includes('$'))) {
    score += 20;
    reasons.push('Kết hợp yếu tố cấp bách và tiền bạc - dấu hiệu lừa đảo cao');
  }

  // 10. Empty or very short body
  if (emailData.body && emailData.body.trim().length < 50) {
    score += 5;
    reasons.push('Nội dung email quá ngắn');
  }

  return {
    isPhishing: score >= 40, // Lowered threshold from 50 to 40
    confidence: Math.min(score, 100),
    reasons: reasons.length > 0 ? reasons : ['Không phát hiện dấu hiệu đáng ngờ rõ ràng'],
    ruleBasedScore: score
  };
}

// Combined analysis
async function analyzeEmail(emailData) {
  // First, run rule-based detection
  const rulesResult = detectPhishingRules(emailData);
  
  // If API key exists, also run AI analysis
  const apiKey = await getApiKey();
  let aiResult = null;
  
  if (apiKey) {
    const emailContent = `
Subject: ${emailData.subject || 'N/A'}
From: ${emailData.displayName || ''} <${emailData.sender || 'N/A'}>
Body: ${emailData.body?.substring(0, 1000) || 'N/A'}
Links: ${emailData.links?.join(', ') || 'None'}
    `.trim();
    
    aiResult = await analyzeEmailWithAI(emailContent);
  }

  // Combine results
  if (aiResult) {
    return {
      isPhishing: aiResult.isPhishing || rulesResult.isPhishing,
      confidence: Math.max(aiResult.confidence, rulesResult.confidence),
      reasons: [...new Set([...aiResult.reasons, ...rulesResult.reasons])],
      recommendation: aiResult.recommendation,
      method: 'AI + Rules'
    };
  }

  return {
    ...rulesResult,
    recommendation: rulesResult.isPhishing ? 
      'Không mở link hoặc cung cấp thông tin. Xóa email này.' : 
      'Email có vẻ an toàn nhưng vẫn nên cẩn thận.',
    method: 'Rules Only'
  };
}

// Get API key from storage
async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['claudeApiKey'], (result) => {
      resolve(result.claudeApiKey || '');
    });
  });
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeEmail') {
    analyzeEmail(request.emailData).then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({
        error: true,
        message: error.message
      });
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'saveApiKey') {
    chrome.storage.sync.set({ claudeApiKey: request.apiKey }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'blockSender') {
    blockSender(request.email).then(result => {
      sendResponse(result);
    });
    return true;
  }

  if (request.action === 'whitelistSender') {
    whitelistSender(request.email).then(result => {
      sendResponse(result);
    });
    return true;
  }

  if (request.action === 'getBlockedSenders') {
    getBlockedSenders().then(senders => {
      sendResponse({ senders });
    });
    return true;
  }

  if (request.action === 'getWhitelistedSenders') {
    getWhitelistedSenders().then(senders => {
      sendResponse({ senders });
    });
    return true;
  }

  if (request.action === 'logAction') {
    logEmailAction(request.actionType, request.emailData).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Block sender
async function blockSender(email) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['blockedSenders'], (result) => {
      const blocked = result.blockedSenders || [];
      if (!blocked.includes(email)) {
        blocked.push(email);
        chrome.storage.sync.set({ blockedSenders: blocked }, () => {
          resolve({ success: true, message: `Đã chặn ${email}` });
        });
      } else {
        resolve({ success: false, message: 'Email này đã bị chặn' });
      }
    });
  });
}

// Whitelist sender
async function whitelistSender(email) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['whitelistedSenders'], (result) => {
      const whitelist = result.whitelistedSenders || [];
      if (!whitelist.includes(email)) {
        whitelist.push(email);
        chrome.storage.sync.set({ whitelistedSenders: whitelist }, () => {
          resolve({ success: true, message: `Đã thêm ${email} vào danh sách an toàn` });
        });
      } else {
        resolve({ success: false, message: 'Email này đã trong danh sách an toàn' });
      }
    });
  });
}

// Get blocked senders
async function getBlockedSenders() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['blockedSenders'], (result) => {
      resolve(result.blockedSenders || []);
    });
  });
}

// Get whitelisted senders
async function getWhitelistedSenders() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['whitelistedSenders'], (result) => {
      resolve(result.whitelistedSenders || []);
    });
  });
}

// Log email actions
async function logEmailAction(actionType, emailData) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['actionLogs'], (result) => {
      const logs = result.actionLogs || [];
      logs.push({
        timestamp: new Date().toISOString(),
        action: actionType,
        sender: emailData.sender,
        subject: emailData.subject
      });
      
      // Keep only last 100 logs
      if (logs.length > 100) {
        logs.shift();
      }
      
      chrome.storage.local.set({ actionLogs: logs }, () => {
        resolve();
      });
    });
  });
}

// Show notification for phishing detection
function showPhishingAlert(result) {
  if (result.isPhishing) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '⚠️ Cảnh báo Email Lừa đảo!',
      message: `Độ tin cậy: ${result.confidence}%\n${result.reasons[0]}`,
      priority: 2
    });
  }
}
