# 🛡️ Phishing Email Detector Extension

Extension Chrome/Edge phát hiện và cảnh báo email lừa đảo (phishing) sử dụng AI và các thuật toán phân tích thông minh.

## ✨ Tính năng

### 🤖 Phát hiện thông minh đa tầng
- **Phân tích bằng AI**: Sử dụng Claude API để phân tích ngữ cảnh và phát hiện các dấu hiệu tinh vi
- **Quy tắc phát hiện**: Kiểm tra các mẫu phishing phổ biến (domain giả mạo, từ khóa cấp bách, link đáng ngờ)
- **Phân tích liên kết**: Kiểm tra URL rút gọn và domain giả mạo
- **Xác thực người gửi**: So sánh tên hiển thị với domain email

### 🎯 Cảnh báo trực quan
- Banner cảnh báo rõ ràng với mã màu
- Hiển thị độ tin cậy (confidence score)
- Liệt kê chi tiết các dấu hiệu phát hiện được
- Khuyến nghị hành động cụ thể

### 📊 Thống kê và quản lý
- Theo dõi số lượng email phishing và an toàn
- Tùy chỉnh cài đặt phát hiện
- Bật/tắt thông báo đẩy

### 🌐 Hỗ trợ nền tảng
- Gmail (mail.google.com)
- Outlook Web (outlook.live.com, outlook.office.com)

## 🚀 Cài đặt

### Phương pháp 1: Cài đặt từ source code

1. **Tải extension**
   ```bash
   # Giải nén file phishing-detector-extension.zip
   # Hoặc clone repository
   ```

2. **Mở Chrome/Edge**
   - Truy cập `chrome://extensions/` (Chrome) hoặc `edge://extensions/` (Edge)
   - Bật "Developer mode" (Chế độ nhà phát triển)

3. **Load extension**
   - Click "Load unpacked" (Tải tiện ích đã giải nén)
   - Chọn thư mục `phishing-detector-extension`

4. **Hoàn tất!**
   - Extension sẽ xuất hiện trên thanh công cụ
   - Icon: 🛡️

### Phương pháp 2: Sử dụng Visual Studio (nếu muốn chỉnh sửa)

1. **Mở Visual Studio 2022**
   - File → Open → Folder
   - Chọn thư mục `phishing-detector-extension`

2. **Chỉnh sửa code**
   - Các file chính:
     - `background.js`: Logic phân tích AI và API
     - `content.js`: Theo dõi email và hiển thị cảnh báo
     - `popup.html/js`: Giao diện cài đặt
     - `manifest.json`: Cấu hình extension

3. **Test extension**
   - Sau khi chỉnh sửa, reload extension trong Chrome
   - Nhấn nút "Reload" trong chrome://extensions/

## ⚙️ Cấu hình

### 1. API Key (Tùy chọn - khuyến nghị)

Để sử dụng AI phát hiện nâng cao:

1. Lấy Claude API key từ [console.anthropic.com](https://console.anthropic.com/)
2. Click vào icon extension → Settings
3. Nhập API key vào ô "Claude API Key"
4. Click "💾 Lưu cấu hình"

**Lưu ý**: Không có API key, extension vẫn hoạt động với quy tắc phát hiện cơ bản.

### 2. Tính năng

- **Phát hiện tự động**: Bật/tắt phân tích tự động khi mở email
- **Thông báo đẩy**: Hiển thị notification khi phát hiện phishing

## 📖 Cách sử dụng

1. **Mở Gmail hoặc Outlook**
   - Truy cập mail.google.com hoặc outlook.com
   - Đăng nhập tài khoản của bạn

2. **Đọc email**
   - Extension tự động phân tích mỗi email bạn mở
   - Quá trình phân tích diễn ra trong vài giây

3. **Xem kết quả**
   - **Banner đỏ**: Email có dấu hiệu phishing ⚠️
   - **Banner xanh**: Email có vẻ an toàn ✅
   - Đọc chi tiết lý do và khuyến nghị

4. **Hành động**
   - Email phishing: **KHÔNG** click link, không cung cấp thông tin
   - Xóa hoặc báo cáo spam
   - Nếu nghi ngờ, liên hệ trực tiếp tổ chức qua kênh chính thức

## 🔍 Các dấu hiệu phishing được phát hiện

### 1. Người gửi đáng ngờ
- Domain email không khớp với tên hiển thị
- Ví dụ: "PayPal Support" nhưng email từ @random-domain.com

### 2. Nội dung cấp bách
- Từ khóa: "urgent", "verify now", "suspended", "immediate action"
- Tạo áp lực để bạn hành động vội vàng

### 3. Liên kết độc hại
- URL rút gọn (bit.ly, tinyurl)
- Domain giả mạo (paypal-secure.com, amazon-verify.com)
- Link không khớp với văn bản hiển thị

### 4. Yêu cầu thông tin nhạy cảm
- Mật khẩu, số thẻ tín dụng, số CMND/CCCD
- Tổ chức hợp pháp **KHÔNG BAO GIỜ** yêu cầu qua email

### 5. Ngữ pháp và chính tả
- Lỗi chính tả, ngữ pháp kém
- Định dạng email không chuyên nghiệp

## 🛠️ Cấu trúc dự án

```
phishing-detector-extension/
├── manifest.json          # Cấu hình extension
├── background.js          # Service worker - AI & API logic
├── content.js            # Content script - Email monitoring
├── popup.html            # Giao diện popup
├── popup.js              # Logic popup
├── styles.css            # Styles cho warning banners
├── icons/                # Icons extension
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # Tài liệu này
```

## 🔧 Phát triển và tùy chỉnh

### Thêm nền tảng email mới

Chỉnh sửa `content.js`:

```javascript
function extractEmailData() {
  // Thêm logic extract cho nền tảng mới
  if (window.location.hostname.includes('your-email-platform.com')) {
    return extractYourPlatformData();
  }
}
```

### Tùy chỉnh quy tắc phát hiện

Chỉnh sửa `background.js`:

```javascript
const PHISHING_INDICATORS = {
  urgentWords: ['your', 'custom', 'keywords'],
  suspiciousDomains: ['your-suspicious-domain.com'],
  // Thêm quy tắc của bạn
};
```

### Thêm API phát hiện khác

```javascript
async function analyzeWithExternalAPI(emailData) {
  // Tích hợp VirusTotal, Google Safe Browsing, etc.
}
```

## 🔒 Bảo mật và quyền riêng tư

- Extension chỉ phân tích email **trên máy của bạn**
- API key được lưu **local** (chrome.storage.sync)
- Nếu dùng Claude API:
  - Chỉ gửi nội dung email cần phân tích
  - Anthropic không lưu trữ dữ liệu
  - Đọc [Privacy Policy](https://www.anthropic.com/privacy)

## ❓ FAQ

**Q: Extension có miễn phí không?**  
A: Extension hoàn toàn miễn phí. Claude API có gói miễn phí với quota giới hạn.

**Q: Làm sao để extension chính xác hơn?**  
A: Cấu hình Claude API key. AI sẽ phát hiện các dấu hiệu phishing tinh vi hơn.

**Q: Extension có hoạt động offline không?**  
A: Có, phần phát hiện bằng quy tắc hoạt động offline. Chỉ AI analysis cần internet.

**Q: Tại sao cần API key?**  
A: API key để truy cập Claude AI. Không có key, extension dùng quy tắc cơ bản.

**Q: Extension có đọc tất cả email không?**  
A: Chỉ đọc email bạn đang xem. Không đọc inbox hoặc lưu trữ email.

## 🐛 Báo lỗi

Nếu gặp lỗi:
1. Mở DevTools: F12
2. Chuyển tab Console
3. Chụp màn hình lỗi
4. Gửi feedback qua icon extension

## 📝 License

MIT License - Tự do sử dụng và chỉnh sửa

## 🙏 Credits

- AI Model: Claude (Anthropic)
- Icons: Custom designed
- Framework: Manifest V3

## 📞 Liên hệ

- Issues: [GitHub Issues]
- Email: support@yourextension.com

---

**⚠️ Lưu ý quan trọng**: Extension này là công cụ hỗ trợ. Luôn cẩn thận với mọi email đáng ngờ, ngay cả khi extension báo an toàn.

**🎯 Mục tiêu**: Bảo vệ người dùng khỏi email lừa đảo và tăng cường nhận thức về an ninh mạng.
