# Hướng dẫn cài đặt và phát triển với Visual Studio

## 🎯 Yêu cầu

- **Visual Studio 2022** (Community/Professional/Enterprise)
- **Chrome** hoặc **Edge** browser
- **Node.js** (tùy chọn - nếu muốn dùng npm packages)

## 📋 Bước 1: Setup Visual Studio

### 1.1. Cài đặt Visual Studio 2022

1. Tải Visual Studio 2022 từ [visualstudio.microsoft.com](https://visualstudio.microsoft.com/)
2. Chọn workload:
   - ✅ **ASP.NET and web development**
   - ✅ **Node.js development** (tùy chọn)

### 1.2. Extensions khuyến nghị

Cài đặt các extension hữu ích:
- **JavaScript and TypeScript**: Đã có sẵn
- **Web Essentials**: Tăng cường HTML/CSS/JS
- **Prettier**: Code formatter

## 📂 Bước 2: Mở Project

### Cách 1: Mở thư mục trực tiếp

1. Mở Visual Studio 2022
2. File → Open → **Folder**
3. Chọn thư mục `phishing-detector-extension`
4. Visual Studio sẽ tự nhận diện các file JavaScript, HTML, CSS

### Cách 2: Tạo Solution (khuyến nghị cho dự án lớn)

1. File → New → Project
2. Chọn "Blank Solution"
3. Đặt tên: `PhishingDetectorExtension`
4. Right-click Solution → Add → Existing Web Site
5. Chọn thư mục extension

## 🛠️ Bước 3: Cấu trúc Solution

```
PhishingDetectorExtension (Solution)
└── phishing-detector-extension (Web Site)
    ├── 📄 manifest.json
    ├── 📄 background.js
    ├── 📄 content.js
    ├── 📄 popup.html
    ├── 📄 popup.js
    ├── 📄 styles.css
    ├── 📁 icons/
    └── 📄 README.md
```

## ⚙️ Bước 4: Cấu hình Debug

### 4.1. Cài đặt Chrome Debugging

1. Tools → Options → Debugging
2. Enable: "Enable JavaScript debugging for ASP.NET (Chrome, Edge and IE)"

### 4.2. Debug với Chrome

1. Mở Chrome → `chrome://extensions/`
2. Bật "Developer mode"
3. Click "Load unpacked"
4. Chọn thư mục project
5. Trong Visual Studio:
   - Debug → Attach to Process
   - Chọn Chrome process
   - Hoặc dùng F12 DevTools trong Chrome

### 4.3. Live Reload (tự động reload khi code thay đổi)

Tạo file `watch.js` (tùy chọn):

```javascript
const fs = require('fs');
const path = require('path');

const watchDir = __dirname;

fs.watch(watchDir, { recursive: true }, (eventType, filename) => {
  if (filename && filename.endsWith('.js')) {
    console.log(`File changed: ${filename}`);
    console.log('Please reload extension in Chrome');
  }
});

console.log('Watching for changes...');
```

Chạy: `node watch.js`

## 🔨 Bước 5: Build và Package

### 5.1. Chuẩn bị file

1. Kiểm tra tất cả file cần thiết:
   - ✅ manifest.json
   - ✅ background.js
   - ✅ content.js
   - ✅ popup.html, popup.js
   - ✅ styles.css
   - ✅ icons/ (3 files PNG)

2. Xóa các file không cần:
   - ❌ .vs/
   - ❌ node_modules/ (nếu có)
   - ❌ .git/

### 5.2. Tạo package (.zip)

**Cách 1: Dùng Visual Studio**
1. Right-click project folder
2. Send to → Compressed (zipped) folder
3. Đổi tên: `phishing-detector-v1.0.zip`

**Cách 2: Dùng script PowerShell**

Tạo file `build.ps1`:

```powershell
# Build Extension Package

$extensionName = "phishing-detector-extension"
$version = "1.0.0"
$outputFile = "$extensionName-v$version.zip"

# Files to include
$files = @(
    "manifest.json",
    "background.js",
    "content.js",
    "popup.html",
    "popup.js",
    "styles.css",
    "icons/*",
    "README.md"
)

# Create zip
Compress-Archive -Path $files -DestinationPath $outputFile -Force

Write-Host "✅ Created: $outputFile" -ForegroundColor Green
```

Chạy trong PowerShell:
```powershell
.\build.ps1
```

## 🧪 Bước 6: Testing

### 6.1. Unit Testing (tùy chọn)

Tạo file `tests/test.js`:

```javascript
// Simple tests for phishing detection

const testCases = [
  {
    name: "Phishing email - urgent keywords",
    email: {
      subject: "URGENT: Verify your account NOW",
      sender: "support@random-domain.com",
      body: "Click here to verify your password immediately"
    },
    expected: true
  },
  {
    name: "Safe email",
    email: {
      subject: "Meeting reminder",
      sender: "colleague@company.com",
      body: "Don't forget our meeting tomorrow"
    },
    expected: false
  }
];

// Run tests
testCases.forEach(test => {
  console.log(`Testing: ${test.name}`);
  // Add actual test logic here
});
```

### 6.2. Integration Testing

1. Load extension vào Chrome
2. Mở Gmail với test emails
3. Kiểm tra:
   - ✅ Warning banner hiển thị đúng
   - ✅ Phát hiện chính xác
   - ✅ Popup hoạt động
   - ✅ Settings lưu đúng

### 6.3. Performance Testing

Mở Chrome DevTools:
- Performance tab → Record
- Mở vài email
- Stop recording
- Kiểm tra thời gian phân tích < 2 seconds

## 📝 Bước 7: Code Style & Best Practices

### 7.1. EditorConfig

Tạo `.editorconfig`:

```ini
root = true

[*]
charset = utf-8
indent_style = space
indent_size = 2
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.{js,json}]
indent_size = 2

[*.md]
trim_trailing_whitespace = false
```

### 7.2. JSDoc Comments

```javascript
/**
 * Analyze email content for phishing indicators
 * @param {Object} emailData - Email data object
 * @param {string} emailData.sender - Sender email address
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.body - Email body text
 * @returns {Promise<Object>} Analysis result
 */
async function analyzeEmail(emailData) {
  // Implementation
}
```

## 🚀 Bước 8: Deploy

### 8.1. Local Testing
1. Đã hoàn tất ở bước trước

### 8.2. Submit to Chrome Web Store (tùy chọn)

1. Đăng ký Chrome Web Store Developer ($5 one-time fee)
2. Upload file .zip
3. Điền thông tin extension
4. Screenshot (1280x800 hoặc 640x400)
5. Privacy policy (nếu dùng API)
6. Submit for review

### 8.3. Submit to Edge Add-ons (tùy chọn)

1. Đăng ký Microsoft Partner Center (Free)
2. Upload file .zip
3. Tương tự Chrome

## 🔧 Troubleshooting

### Lỗi thường gặp

**1. Extension không load**
- ✅ Kiểm tra manifest.json syntax (dùng JSONLint)
- ✅ Check console errors

**2. Content script không chạy**
- ✅ Kiểm tra permissions trong manifest
- ✅ Reload extension
- ✅ Hard refresh page (Ctrl+Shift+R)

**3. API không hoạt động**
- ✅ Kiểm tra API key
- ✅ Check network tab trong DevTools
- ✅ Verify CORS settings

**4. Icons không hiển thị**
- ✅ Đảm bảo có đủ 3 sizes: 16, 48, 128
- ✅ Check file paths trong manifest

### Debug Tips

```javascript
// Thêm logging
console.log('[Phishing Detector]', data);

// Breakpoints trong VS
debugger;

// Check extension status
chrome.management.getSelf(info => console.log(info));
```

## 📚 Tài liệu tham khảo

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/)
- [Visual Studio Docs](https://docs.microsoft.com/visualstudio/)
- [Claude API Docs](https://docs.anthropic.com/)

## 💡 Tips & Tricks

### Tăng tốc development

1. **Shortcuts hữu ích**
   - `Ctrl+K, Ctrl+D`: Format document
   - `Ctrl+K, Ctrl+C`: Comment
   - `Ctrl+K, Ctrl+U`: Uncomment
   - `F5`: Start debugging

2. **Multi-cursor editing**
   - `Alt+Click`: Thêm cursor
   - `Ctrl+Alt+Up/Down`: Multi-line cursor

3. **Snippets**
   - Tools → Code Snippets Manager
   - Tạo snippets cho code thường dùng

### Git Integration

```bash
# Initialize git
git init
git add .
git commit -m "Initial commit"

# .gitignore
.vs/
*.zip
node_modules/
```

## ✅ Checklist trước khi deploy

- [ ] Tất cả chức năng hoạt động
- [ ] Không có console errors
- [ ] Code đã format đẹp
- [ ] Comments đầy đủ
- [ ] README updated
- [ ] Version number updated
- [ ] Icons đúng size
- [ ] Manifest đúng format
- [ ] Privacy policy (nếu cần)
- [ ] Screenshots (nếu publish)

---

## 🎓 Kết luận

Bạn đã có:
- ✅ Extension phishing detector hoàn chỉnh
- ✅ Setup Visual Studio professional
- ✅ Debug workflow hiệu quả
- ✅ Build & deploy process

**Next steps:**
1. Thêm nhiều rules phát hiện
2. Tích hợp thêm AI models
3. Hỗ trợ nhiều email platforms
4. Tối ưu performance

Good luck! 🚀
