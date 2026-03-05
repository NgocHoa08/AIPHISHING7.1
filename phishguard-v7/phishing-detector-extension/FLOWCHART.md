# 🔄 SƠ ĐỒ LUỒNG VÀ CÁCH HOẠT ĐỘNG CỦA EXTENSION

## 📊 1. KIẾN TRÚC TỔNG QUAN

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHROME/EDGE BROWSER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐ │
│  │   POPUP      │      │   CONTENT    │      │  BACKGROUND  │ │
│  │   (UI)       │◄────►│   SCRIPT     │◄────►│   WORKER     │ │
│  └──────────────┘      └──────────────┘      └──────────────┘ │
│       │                      │                      │          │
│       │ Settings            │ DOM                  │ API      │
│       │                      │ Monitoring           │ Calls    │
│       ▼                      ▼                      ▼          │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐ │
│  │   Chrome     │      │   Gmail/     │      │   Claude     │ │
│  │   Storage    │      │   Outlook    │      │   API        │ │
│  └──────────────┘      └──────────────┘      └──────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 2. LUỒNG HOẠT ĐỘNG CHÍNH

### A. KHỞI ĐỘNG EXTENSION

```
[Người dùng cài Extension]
         │
         ▼
[Browser load manifest.json]
         │
         ├─► [Đăng ký Background Service Worker]
         │         └─► background.js khởi động
         │
         ├─► [Inject Content Script vào Gmail/Outlook]
         │         └─► content.js chạy trên trang web
         │
         └─► [Tạo Popup UI]
                   └─► popup.html sẵn sàng
```

### B. LUỒNG PHÁT HIỆN EMAIL (Chi tiết)

```
┌──────────────────────────────────────────────────────────────┐
│ BƯỚC 1: NGƯỜI DÙNG MỞ EMAIL                                  │
└──────────────────────────────────────────────────────────────┘
                        │
                        ▼
         [Gmail/Outlook render email]
                        │
                        ▼
         ┌──────────────────────────────┐
         │  MutationObserver phát hiện  │
         │  (content.js line 15-30)     │
         └──────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ BƯỚC 2: TRÍCH XUẤT DỮ LIỆU EMAIL                            │
└──────────────────────────────────────────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         │                             │
         ▼                             ▼
   [Gmail Platform]            [Outlook Platform]
         │                             │
   extractGmailData()          extractOutlookData()
         │                             │
         │  - Sender email             │
         │  - Display name             │
         │  - Subject                  │
         │  - Body text                │
         │  - All links                │
         │                             │
         └──────────────┬──────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │   emailData     │
              │   {             │
              │     sender,     │
              │     subject,    │
              │     body,       │
              │     links[]     │
              │   }             │
              └─────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ BƯỚC 3: GỬI DỮ LIỆU ĐẾN BACKGROUND WORKER                   │
└──────────────────────────────────────────────────────────────┘
                        │
         chrome.runtime.sendMessage({
           action: 'analyzeEmail',
           emailData: emailData
         })
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ BƯỚC 4: PHÂN TÍCH ĐA TẦNG (background.js)                   │
└──────────────────────────────────────────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         │                             │
         ▼                             ▼
┌─────────────────────┐    ┌─────────────────────┐
│ RULE-BASED         │    │ AI-BASED (nếu có   │
│ DETECTION          │    │ API key)            │
│                    │    │                     │
│ detectPhishing     │    │ analyzeEmailWithAI  │
│ Rules()            │    │ ()                  │
└─────────────────────┘    └─────────────────────┘
         │                             │
         │  Check:                     │  AI Analysis:
         │  • Sender mismatch          │  • Claude API
         │  • Urgent words             │  • Context
         │  • Suspicious links         │  • Patterns
         │  • Sensitive info           │  • Language
         │                             │
         │  Tính điểm:                 │  Nhận response:
         │  score = 0-100              │  {isPhishing,
         │                             │   confidence,
         │  ├─ Domain mismatch: +20   │   reasons[]}
         │  ├─ Urgent words: +25      │
         │  ├─ Bad links: +30          │
         │  └─ Sensitive: +25          │
         │                             │
         └──────────────┬──────────────┘
                        │
                        ▼
         ┌─────────────────────────────┐
         │   KẾT HỢP KẾT QUẢ          │
         │                             │
         │   Max(AI score, Rule score) │
         │   Merge reasons             │
         │   Final recommendation      │
         └─────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ BƯỚC 5: TRẢ KẾT QUẢ VỀ CONTENT SCRIPT                       │
└──────────────────────────────────────────────────────────────┘
                        │
         sendResponse({
           isPhishing: true/false,
           confidence: 0-100,
           reasons: [...],
           recommendation: "...",
           method: "AI + Rules"
         })
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ BƯỚC 6: HIỂN THỊ CẢNH BÁO (content.js)                      │
└──────────────────────────────────────────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         │                             │
         ▼                             ▼
   [isPhishing = true]         [isPhishing = false]
         │                             │
         ▼                             ▼
┌──────────────────┐          ┌──────────────────┐
│ 🔴 RED BANNER   │          │ 🟢 GREEN BANNER │
│                 │          │                 │
│ ⚠️ CẢNH BÁO!   │          │ ✅ AN TOÀN      │
│                 │          │                 │
│ Confidence: 85% │          │ Confidence: 20% │
│                 │          │                 │
│ Lý do:          │          │ Lý do:          │
│ • Domain giả    │          │ • Sender hợp lệ │
│ • Link nguy     │          │ • Không có dấu  │
│   hiểm          │          │   hiệu đáng ngờ │
│                 │          │                 │
│ Khuyến nghị:    │          │ Khuyến nghị:    │
│ KHÔNG MỞ LINK!  │          │ Vẫn cẩn thận    │
└──────────────────┘          └──────────────────┘
         │                             │
         └──────────────┬──────────────┘
                        │
                        ▼
         [Banner xuất hiện đầu email]
```

---

## 🔍 3. LUỒNG CHI TIẾT TỪNG THÀNH PHẦN

### 3.1. CONTENT SCRIPT (content.js)

```
┌─────────────────────────────────────────────┐
│  CONTENT SCRIPT - Chạy trong Gmail/Outlook │
└─────────────────────────────────────────────┘
         │
         ▼
    init() function
         │
         ├─► Kiểm tra platform
         │   │
         │   ├─► if (mail.google.com) → monitorGmail()
         │   └─► if (outlook.com) → monitorOutlook()
         │
         ▼
    MutationObserver setup
         │
         └─► Lắng nghe thay đổi DOM
             │
             ├─► Email mới được mở
             ├─► Chuyển sang email khác
             └─► UI refresh
                 │
                 ▼
         analyzeCurrentEmail()
                 │
                 ├─► Đang analyze? → Skip
                 ├─► Cùng email? → Skip
                 └─► Email mới → Tiếp tục
                     │
                     ▼
         extractEmailData()
                     │
                     └─► {sender, subject, body, links}
                         │
                         ▼
         chrome.runtime.sendMessage()
                         │
                         └─► Gửi đến background.js
                             │
                             ▼
         Nhận response ←─────┘
                 │
                 ▼
         displayWarningBanner(result)
                 │
                 ├─► Xóa banner cũ
                 ├─► Tạo banner mới
                 └─► Insert vào đầu email
```

### 3.2. BACKGROUND SERVICE WORKER (background.js)

```
┌──────────────────────────────────────┐
│  BACKGROUND WORKER - Always Running  │
└──────────────────────────────────────┘
         │
         ▼
    chrome.runtime.onMessage
         │
         └─► Nhận request từ content.js
             │
             ▼
         analyzeEmail(emailData)
             │
             ├──────────────────────────────┐
             │                              │
             ▼                              ▼
    detectPhishingRules()        analyzeEmailWithAI()
             │                              │
             │ 1. Check sender              │ 1. Get API key
             │    mismatch                  │    from storage
             │                              │
             │ 2. Count urgent              │ 2. Build prompt
             │    keywords                  │    với email data
             │                              │
             │ 3. Scan links                │ 3. Call Claude API
             │    - URL shorteners          │    fetch(...)
             │    - Suspicious domains      │
             │                              │ 4. Parse JSON
             │ 4. Check sensitive           │    response
             │    data requests             │
             │                              │ 5. Return AI result
             │ 5. Calculate score           │
             │    score = Σ violations      │
             │                              │
             └──────────────┬───────────────┘
                            │
                            ▼
             Merge results (AI + Rules)
                            │
                            ├─► isPhishing = max logic
                            ├─► confidence = max score
                            ├─► reasons = merge arrays
                            └─► recommendation
                                │
                                ▼
             sendResponse(finalResult)
                                │
                                └─► Gửi về content.js
```

### 3.3. POPUP INTERFACE (popup.html/js)

```
┌─────────────────────────────┐
│  POPUP - Click icon mở UI   │
└─────────────────────────────┘
         │
         ▼
    DOMContentLoaded
         │
         ├─► loadSettings()
         │   └─► chrome.storage.sync.get()
         │       └─► Hiển thị API key (nếu có)
         │
         ├─► loadStats()
         │   └─► chrome.storage.local.get()
         │       └─► Hiển thị số liệu thống kê
         │
         └─► setupEventListeners()
             │
             ├─► Save button click
             │   └─► saveSettings()
             │       ├─► Validate API key format
             │       ├─► chrome.storage.sync.set()
             │       └─► Show success message
             │
             └─► Toggle switches
                 └─► Auto-save settings
```

---

## ⚙️ 4. LUỒNG XỬ LÝ API (Chi tiết)

```
┌───────────────────────────────────────────────────┐
│  CLAUDE AI API INTEGRATION                        │
└───────────────────────────────────────────────────┘

User config API key
         │
         ▼
chrome.storage.sync.set({ claudeApiKey: "sk-..." })
         │
         └─► Lưu encrypted trong Chrome

Email cần analyze
         │
         ▼
background.js: analyzeEmailWithAI()
         │
         ├─► 1. Get API key from storage
         │      getApiKey() → Promise
         │
         ├─► 2. Build request body
         │      {
         │        model: "claude-3-haiku-20240307",
         │        max_tokens: 500,
         │        messages: [{
         │          role: "user",
         │          content: "Phân tích email..."
         │        }]
         │      }
         │
         ├─► 3. Fetch API
         │      fetch("https://api.anthropic.com/v1/messages", {
         │        method: "POST",
         │        headers: {
         │          "x-api-key": apiKey,
         │          "anthropic-version": "2023-06-01"
         │        },
         │        body: JSON.stringify(...)
         │      })
         │
         ├─► 4. Parse response
         │      response.json()
         │      │
         │      └─► {
         │            content: [{
         │              type: "text",
         │              text: "{\"isPhishing\": true, ...}"
         │            }]
         │          }
         │
         ├─► 5. Extract JSON từ text
         │      const aiResponse = data.content[0].text
         │      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
         │      const result = JSON.parse(jsonMatch[0])
         │
         └─► 6. Return kết quả
             {
               isPhishing: boolean,
               confidence: 0-100,
               reasons: string[],
               recommendation: string
             }
```

---

## 📂 5. LUỒNG DỮ LIỆU (Data Flow)

```
┌─────────────┐
│   Gmail/    │  Email hiển thị
│   Outlook   │
└──────┬──────┘
       │
       │ DOM Extract
       ▼
┌─────────────┐
│  emailData  │  {sender, subject, body, links}
└──────┬──────┘
       │
       │ chrome.runtime.sendMessage
       ▼
┌─────────────┐
│ Background  │  Phân tích
│   Worker    │
└──────┬──────┘
       │
       ├──────────────────┬──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────┐    ┌──────────────┐    ┌──────────┐
│  Rules   │    │  Claude API  │    │ Storage  │
│  Engine  │    │              │    │          │
└──────┬───┘    └──────┬───────┘    └──────┬───┘
       │                │                    │
       │ score          │ AI result          │ stats
       └────────┬───────┴────────────────────┘
                │
                ▼
        ┌───────────────┐
        │ Final Result  │  {isPhishing, confidence, reasons}
        └───────┬───────┘
                │
                │ sendResponse
                ▼
        ┌───────────────┐
        │ Content Script│  Display banner
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ User sees     │  🔴 hoặc 🟢
        │ Warning       │
        └───────────────┘
```

---

## 🕐 6. TIMELINE THỰC TẾ (Thời gian xử lý)

```
t=0ms    User mở email
         │
t=50ms   MutationObserver detect
         │
t=100ms  Extract email data
         │  └─► 50ms DOM parsing
         │
t=150ms  Send message to background
         │
t=200ms  Background nhận message
         │
         ├─► Rule-based analysis (200ms)
         │
         └─► AI analysis (1000-2000ms nếu có API)
         │
t=1200ms Nhận kết quả phân tích
         │
t=1250ms Tạo warning banner
         │
t=1300ms Banner hiển thị trên UI
         │
         ✅ DONE - User thấy cảnh báo
```

---

## 🔄 7. SƠ ĐỒ TUẦN TỰ (Sequence Diagram)

```
User          Gmail      Content.js    Background.js    Claude API    Chrome Storage
 │              │             │              │               │              │
 │ Open Email   │             │              │               │              │
 ├─────────────►│             │              │               │              │
 │              │ DOM Change  │              │               │              │
 │              ├────────────►│              │               │              │
 │              │             │ Extract Data │               │              │
 │              │             ├──────────┐   │               │              │
 │              │             │          │   │               │              │
 │              │             │◄─────────┘   │               │              │
 │              │             │ Send Message │               │              │
 │              │             ├─────────────►│               │              │
 │              │             │              │ Get API Key   │              │
 │              │             │              ├──────────────────────────────►│
 │              │             │              │◄──────────────────────────────┤
 │              │             │              │ Analyze Rules │              │
 │              │             │              ├──────────┐    │              │
 │              │             │              │          │    │              │
 │              │             │              │◄─────────┘    │              │
 │              │             │              │ Call AI API   │              │
 │              │             │              ├──────────────►│              │
 │              │             │              │               │ Processing   │
 │              │             │              │               ├─────────┐    │
 │              │             │              │               │         │    │
 │              │             │              │               │◄────────┘    │
 │              │             │              │◄──────────────┤              │
 │              │             │              │ Merge Results │              │
 │              │             │              ├──────────┐    │              │
 │              │             │              │          │    │              │
 │              │             │              │◄─────────┘    │              │
 │              │             │ Response     │               │              │
 │              │             │◄─────────────┤               │              │
 │              │             │ Display      │               │              │
 │              │             ├──────────┐   │               │              │
 │              │             │          │   │               │              │
 │              │ Banner      │◄─────────┘   │               │              │
 │              │◄────────────┤              │               │              │
 │ See Warning  │             │              │               │              │
 │◄─────────────┤             │              │               │              │
 │              │             │              │               │              │
```

---

## 🎯 8. CÁC TRƯỜNG HỢP ĐẶC BIỆT

### Case 1: Không có API Key
```
Email mới
  │
  └─► Rule-based ONLY
      │
      └─► Kết quả: method = "Rules Only"
```

### Case 2: API Key sai/hết hạn
```
Email mới
  │
  ├─► Try AI analysis
  │   └─► API Error (401/403)
  │       └─► Fallback to rules
  │
  └─► Kết quả: method = "Rules Only"
```

### Case 3: Email đã phân tích
```
Email đã mở
  │
  └─► Check currentEmailData
      │
      └─► Same? → Skip analysis
```

### Case 4: Offline
```
No Internet
  │
  └─► Rule-based works normally
      └─► AI analysis skipped
```

---

## 💾 9. STORAGE STRUCTURE

```
chrome.storage.sync (Settings - Sync across devices)
├── claudeApiKey: "sk-ant-api03-..."
├── autoDetect: true
└── notifications: true

chrome.storage.local (Stats - Local only)
├── phishingCount: 5
└── safeCount: 23
```

---

## 🎬 10. TỔNG KẾT QUY TRÌNH

1. **Khởi động**: Extension load → Inject scripts → Ready
2. **Theo dõi**: MutationObserver lắng nghe DOM changes
3. **Trích xuất**: Parse email data từ Gmail/Outlook
4. **Phân tích**: Rules + AI (nếu có) → Score & Reasons
5. **Hiển thị**: Banner màu đỏ/xanh với chi tiết
6. **Thống kê**: Lưu số liệu vào storage

**Thời gian**: ~1-2 giây từ lúc mở email đến khi thấy cảnh báo
