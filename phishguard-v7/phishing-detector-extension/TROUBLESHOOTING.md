# 🔧 HƯỚNG DẪN KHẮC PHỤC - Email luôn hiện "An toàn"

## ❓ Tại sao email của tôi luôn hiện "An toàn"?

Có thể do các lý do sau:

### 1️⃣ **Email thật sự an toàn**
- Nếu bạn đang test với email chính thống từ Google, Microsoft, Facebook... thì đúng là an toàn
- Extension được thiết kế để KHÔNG cảnh báo nhầm

### 2️⃣ **Thuật toán cần thời gian học**
- Phiên bản mới đã cải thiện với 10+ quy tắc phát hiện
- Ngưỡng phát hiện giảm từ 50 xuống 40 điểm

### 3️⃣ **Cần email test thực tế hơn**

---

## 🧪 CÁCH TEST EXTENSION

### **Phương pháp 1: Dùng nút Test trong Popup**

1. Click icon extension 🛡️
2. Kéo xuống phần "🧪 Test phát hiện"
3. Click "Test với email giả phishing"
4. Xem kết quả ngay lập tức

**Kết quả mong đợi:**
```
🔴 PHÁT HIỆN PHISHING!
Độ tin cậy: 85-95%
Lý do:
• Tên hiển thị không khớp với domain
• Chứa 5 từ khóa cấp bách
• Chứa 2 link đáng ngờ
• Yêu cầu thông tin nhạy cảm
```

### **Phương pháp 2: Gửi email test cho chính mình**

Tạo email test với các đặc điểm phishing:

**Email test 1 - Domain giả mạo:**
```
From: support@paypal-verify-account.com
Display Name: PayPal Security Team
Subject: URGENT: Verify Your PayPal Account

Dear Customer,

Your account has been suspended. Click here to verify:
http://bit.ly/verify123

Enter your password to continue.
```

**Email test 2 - Nhiều từ khóa cấp bách:**
```
From: security@amazon-alert.net
Display Name: Amazon Support
Subject: IMMEDIATE ACTION REQUIRED - Account Suspended

URGENT! Your Amazon account will be closed in 24 hours!

Verify now: http://tinyurl.com/amazon-verify
Update your credit card information immediately!

Act now before it's too late!
```

**Email test 3 - Yêu cầu thông tin:**
```
From: noreply@bank-security.info
Display Name: Your Bank
Subject: Confirm Your Banking Details

Please confirm your:
- Password
- Credit card number
- CVV code
- Social security number

Click here: http://192.168.1.1/verify
```

### **Phương pháp 3: Dùng email spam thật từ folder Spam**

1. Mở Gmail/Outlook
2. Vào folder **Spam**
3. Mở các email spam
4. Extension sẽ phân tích

---

## 🔍 BẬT CHỾ ĐỘ DEBUG

Để xem chi tiết tại sao email được đánh giá như vậy:

1. Click icon extension 🛡️
2. Kéo xuống "🔧 Tính năng"
3. Bật "Chế độ Debug (xem chi tiết)"
4. Mở lại email bất kỳ

**Khi Debug bật, banner sẽ hiện:**
```
🔍 Debug Info:
Sender: example@domain.com
Display Name: Example Inc
Subject: Hello World
Links Count: 2
Score: 25/100
Method: Rules Only
```

Điều này giúp bạn hiểu:
- Score bao nhiêu (cần ≥40 để phát hiện phishing)
- Email có những đặc điểm gì

---

## 📊 BẢNG ĐIỂM PHÁT HIỆN

Extension tính điểm dựa trên:

| Đặc điểm | Điểm |
|----------|------|
| Tên hiển thị khác domain | +35 |
| Domain có dấu hiệu giả mạo | +25 |
| 3+ từ khóa cấp bách | +30 |
| 2 từ khóa cấp bách | +15 |
| Cụm từ đáng ngờ (mỗi cụm) | +15 |
| Link rút gọn/IP address | +20 |
| Yêu cầu thông tin nhạy cảm | +35 |
| Lời chào chung chung | +10 |
| Lỗi định dạng nhiều | +15 |
| Email tạm/anonymous | +20 |
| Domain extension đáng ngờ (.tk, .xyz) | +15 |
| Cấp bách + tiền bạc | +20 |

**Ngưỡng phát hiện: ≥40 điểm = Phishing**

---

## ✅ CHECKLIST KHẮC PHỤC

Nếu extension không phát hiện email rõ ràng là phishing:

- [ ] Đã bật extension?
- [ ] Đã reload trang Gmail/Outlook? (Ctrl+Shift+R)
- [ ] Đã test với nút "🧪 Test phát hiện"?
- [ ] Đã bật Debug mode để xem score?
- [ ] Email test có đủ đặc điểm phishing? (xem bảng trên)
- [ ] Đã kiểm tra Console có lỗi? (F12 → Console tab)

---

## 🎯 CÁC TRƯỜNG HỢP ĐẶC BIỆT

### Case 1: Email từ công ty/bạn bè
```
Score: 5-10 điểm
→ AN TOÀN (đúng!)
```

### Case 2: Email spam nhẹ
```
Score: 20-35 điểm
→ AN TOÀN (cần cảnh giác nhưng chưa đến mức phishing)
```

### Case 3: Email phishing rõ ràng
```
Score: 40-100 điểm
→ CẢNH BÁO PHISHING
```

### Case 4: Email từ sender đã whitelist
```
→ Luôn AN TOÀN (bypass phát hiện)
```

### Case 5: Email từ sender đã blacklist
```
→ Luôn PHISHING 100%
```

---

## 🔬 DEBUG TRONG CHROME DEVTOOLS

Nếu vẫn không hoạt động:

1. Mở Gmail/Outlook
2. Nhấn **F12** (mở DevTools)
3. Tab **Console**
4. Mở một email
5. Xem log:

```javascript
[Phishing Detector] Email data: {...}
[Phishing Detector] Analysis result: {...}
```

Nếu không thấy log → Extension không chạy:
- Check Extensions page: extension có enabled?
- Check permissions: extension có quyền truy cập Gmail/Outlook?
- Reload extension: Click reload button trong chrome://extensions/

---

## 💡 MẸO NÂNG CAO

### Tăng độ nhạy (phát hiện nhiều hơn):

Chỉnh trong `background.js` dòng 234:
```javascript
isPhishing: score >= 40  // Giảm xuống 30 nếu muốn nhạy hơn
```

### Thêm từ khóa tùy chỉnh:

Thêm vào `background.js` dòng 6:
```javascript
urgentWords: [
  // ... existing words
  'your-custom-keyword',
  'another-keyword'
]
```

### Thêm domain đáng ngờ:

Thêm vào `background.js` dòng 14:
```javascript
suspiciousDomains: [
  // ... existing domains
  'your-suspicious-domain.com'
]
```

---

## 🆘 VẪN KHÔNG HOẠT ĐỘNG?

### Các bước cuối cùng:

1. **Gỡ extension và cài lại:**
   ```
   chrome://extensions/
   → Remove
   → Load unpacked lại
   ```

2. **Clear cache:**
   ```
   Ctrl+Shift+Delete
   → Chọn "Cached images and files"
   → Clear data
   ```

3. **Test với email mẫu đơn giản:**
   ```
   Subject: URGENT VERIFY NOW
   Body: Enter your password
   ```
   
   Nếu email này vẫn hiện "An toàn" → có bug, cần debug code

4. **Kiểm tra permissions:**
   ```
   chrome://extensions/
   → Click "Details" trên extension
   → Permissions: Phải có "Read and change data on mail.google.com"
   ```

5. **Check browser console cho errors:**
   ```
   F12 → Console
   Xem có error màu đỏ?
   ```

---

## 📧 BÁO LỖI

Nếu đã làm tất cả mà vẫn không được, gửi thông tin:

1. Screenshot banner (hoặc không có banner)
2. Chrome version: `chrome://version/`
3. Extension version
4. Console logs (F12 → Console tab)
5. Email test đã dùng (ẩn thông tin nhạy cảm)

---

## ✨ KẾT LUẬN

**Phiên bản mới đã cải thiện:**
- ✅ 10+ quy tắc phát hiện (thay vì 4)
- ✅ Ngưỡng giảm 50 → 40 điểm
- ✅ Thêm nút Test trong popup
- ✅ Debug mode để xem chi tiết
- ✅ Phát hiện thêm: IP trong URL, domain giả mạo, lỗi định dạng...

**Nếu vẫn thấy "An toàn" với email thật sự phishing:**
→ Có thể email đó rất tinh vi, hoặc cần thêm AI analysis (cần API key)

**Khuyến nghị:**
1. Dùng nút Test để verify extension hoạt động
2. Bật Debug mode khi dùng
3. Thêm Claude API key để AI phân tích sâu hơn
