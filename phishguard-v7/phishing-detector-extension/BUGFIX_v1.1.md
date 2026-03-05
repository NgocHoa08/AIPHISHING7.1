# 🔧 BUG FIXES - Phiên bản FINAL v1.1

## ❌ VẤN ĐỀ ĐÃ SỬA

### Bug 1: Banner không hiện khi mở lại email lần 2

**Nguyên nhân:**
- Extension cache email đã phân tích
- Khi quay lại email, nó nghĩ đã phân tích rồi nên skip

**Đã sửa:**
- Dùng `data-message-id` của Gmail để detect chính xác email khác nhau
- Reset `currentEmailData` khi chuyển email
- Reset `analysisInProgress` flag

**Cách hoạt động mới:**
```javascript
// Monitor Gmail với message ID
let lastEmailId = null;

observer.observe(() => {
  const messageId = emailView.getAttribute('data-message-id');
  
  if (messageId !== lastEmailId) {
    // Email mới! Reset và phân tích
    lastEmailId = messageId;
    currentEmailData = null;
    analyzeCurrentEmail();
  }
});
```

**Test:**
```
1. Mở email A → Banner hiện ✅
2. Quay về inbox
3. Mở lại email A → Banner hiện ✅
4. Mở email B → Banner hiện ✅
5. Quay lại email A → Banner hiện ✅
```

---

### Bug 2: Nút "Xóa" không hoạt động

**Nguyên nhân:**
- Gmail thay đổi selector của nút Delete
- Extension dùng selector cũ không còn đúng

**Đã sửa:**
- Thử nhiều selector khác nhau
- Fallback sang keyboard shortcut nếu không tìm thấy nút
- Thêm logging để debug

**Selector mới (thử theo thứ tự):**
```javascript
const deleteSelectors = [
  '[data-tooltip="Delete"]',        // English Gmail
  '[aria-label="Delete"]',           // Accessible label
  '[data-tooltip="Xóa"]',            // Vietnamese Gmail
  'div[data-tooltip*="Delete"]',     // Flexible match
  'div[aria-label*="Delete"]',       // Flexible accessible
  '[gh="tm"] div[role="button"][aria-label*="Delete"]' // Specific toolbar
];

// Fallback: Gmail keyboard shortcut
KeyboardEvent('keydown', { key: '#', shiftKey: true })
```

**Test:**
```
1. Click [🗑️ Xóa]
   → Tìm nút Delete
   → Nếu có: Click
   → Nếu không: Dùng phím tắt #
   → Email bị xóa ✅
   → Tự động quay inbox ✅
```

---

### Bug 3: Nút "Spam" không hoạt động

**Nguyên nhân:**
- Tương tự nút Delete, selector thay đổi

**Đã sửa:**
- Nhiều selector cho nút Report Spam
- Fallback keyboard shortcut `!`

**Selector mới:**
```javascript
const spamSelectors = [
  '[data-tooltip="Report spam"]',
  '[aria-label="Report spam"]',
  '[data-tooltip="Báo cáo spam"]',
  '[aria-label*="spam" i]',
  'div[data-tooltip*="spam" i]',
  '[gh="tm"] div[role="button"][aria-label*="spam" i]'
];

// Fallback: Gmail keyboard shortcut
KeyboardEvent('keydown', { key: '!', shiftKey: true })
```

---

## ✅ CẢI TIẾN THÊM

### 1. Debug Logging
```javascript
console.log('Executing action:', action);
console.log('Found delete button with selector:', selector);
console.log('Using keyboard shortcut for delete');
```

Giờ có thể mở F12 → Console để xem extension làm gì.

### 2. Auto Navigate Back
```javascript
setTimeout(() => {
  const backBtn = document.querySelector('[aria-label="Back to Inbox"]');
  if (backBtn) backBtn.click();
}, 1000);
```

Sau khi xóa/spam, tự động quay lại inbox.

### 3. Better Error Handling
```javascript
try {
  await deleteEmail();
  showActionSuccess('✓ Đã xóa');
} catch (error) {
  console.error('Action error:', error);
  showActionError('✗ Có lỗi: ' + error.message);
}
```

---

## 🧪 TEST CHECKLIST

### Test Banner hiện lại:
- [ ] Mở email A → Thấy banner
- [ ] Quay inbox
- [ ] Mở lại email A → Vẫn thấy banner
- [ ] Mở email B → Thấy banner mới
- [ ] Quay lại A → Vẫn thấy banner

### Test Delete:
- [ ] Mở email phishing
- [ ] Click [🗑️ Xóa]
- [ ] Email bị xóa
- [ ] Tự động quay inbox

### Test Spam:
- [ ] Mở email phishing
- [ ] Click [🚫 Spam]
- [ ] Email vào Spam folder
- [ ] Tự động quay inbox

### Test Block:
- [ ] Mở email phishing
- [ ] Click [⛔ Chặn]
- [ ] Email vào Spam
- [ ] Sender thêm vào blacklist
- [ ] Tự động quay inbox

### Test Whitelist:
- [ ] Mở email an toàn
- [ ] Click [✅ An toàn]
- [ ] Sender thêm vào whitelist
- [ ] Banner refresh → Luôn an toàn

---

## 🔍 DEBUG GUIDE

Nếu vẫn không hoạt động:

### 1. Kiểm tra Console
```
F12 → Console tab
Tìm log:
- "Executing action: delete"
- "Found delete button with selector: ..."
- "Using keyboard shortcut for delete"
```

### 2. Kiểm tra Banner
```
Mở email → F12 → Elements
Tìm: <div id="phishing-warning-banner">
Có không? 
  → Có: Extension hoạt động
  → Không: Extension bị lỗi, check Console
```

### 3. Kiểm tra Permissions
```
chrome://extensions/
→ Click "Details" trên extension
→ "Permissions": Phải có
  ✓ Read and change data on mail.google.com
  ✓ Display notifications
```

### 4. Test thủ công Gmail shortcuts
```
Mở email
Nhấn: Shift + 3 (#) → Xóa
Nhấn: Shift + 1 (!) → Spam

Nếu không hoạt động:
  → Gmail shortcuts bị tắt
  → Settings → Keyboard shortcuts → Bật
```

---

## 📝 CHANGELOG v1.1

### Fixed:
- 🐛 Banner không hiện khi mở lại email
- 🐛 Nút "Xóa" không hoạt động
- 🐛 Nút "Spam" không hoạt động
- 🐛 Actions không có feedback rõ ràng

### Added:
- ➕ Debug logging trong Console
- ➕ Auto navigate back to inbox sau action
- ➕ Multiple selectors cho buttons
- ➕ Keyboard shortcuts fallback
- ➕ Better error messages

### Improved:
- ⚡ Email detection dùng message-id
- ⚡ Reset state khi chuyển email
- ⚡ Better error handling
- ⚡ More reliable button finding

---

## 🚀 NÂ CẤP

Nếu đang dùng version cũ:

1. **Xóa version cũ:**
   ```
   chrome://extensions/
   → Tìm "Phishing Detector"
   → Click "Remove"
   ```

2. **Cài version mới:**
   ```
   → Load unpacked
   → Chọn thư mục FINAL-v1.1
   ```

3. **Reload Gmail:**
   ```
   Ctrl + Shift + R
   (Hard reload)
   ```

4. **Test:**
   ```
   Mở email → Banner hiện
   Click Xóa → Email bị xóa
   ```

---

**Bản FINAL v1.1 - Đã fix tất cả bugs!** ✅
