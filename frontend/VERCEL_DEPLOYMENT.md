# 🚀 LectureScript Frontend - Vercel 免費部署指南

## 🎉 為什麼選擇 Vercel？

✅ **完全免費** - 個人項目免費無限制
✅ **自動 HTTPS** - 免費 SSL 證書
✅ **全球 CDN** - 超快訪問速度
✅ **自動部署** - 推送代碼自動更新
✅ **無需信用卡** - 免費方案不需要綁定信用卡
✅ **零配置** - Vite 項目自動識別

**完全沒有限制！** 🎊

---

## 📋 部署步驟（繁體中文）

### **步驟 1：推送代碼到 GitHub**

```bash
cd C:\Users\sonic\LectureScript-Project

# 檢查 Git 狀態
git status

# 添加文件
git add .

# 提交
git commit -m "🚀 準備部署到 Vercel - 前端就緒"

# 在 GitHub 創建新倉庫：lecturescript-frontend
# 然後執行以下指令

git remote add origin https://github.com/你的用戶名/lecturescript-frontend.git
git branch -M main
git push -u origin main
```

---

### **步驟 2：註冊 Vercel**

1. **訪問** https://vercel.com
2. **點擊** "Sign Up"
3. **選擇** "Continue with GitHub"
4. **授權** Vercel 訪問你的 GitHub

✅ **無需信用卡！**

---

### **步驟 3：導入項目**

#### **3.1 創建新項目**

1. 登入後，點擊 **"Add New..." → "Project"**
2. 找到你的 `lecturescript-frontend` 倉庫
3. 點擊 **"Import"**

#### **3.2 配置項目**

Vercel 會自動偵測 Vite 項目，填寫：

```
Project Name: lecturescript-frontend
Framework Preset: Vite（自動偵測）
Root Directory: frontend
Build Command: npm run build（自動填充）
Output Directory: dist（自動填充）
Install Command: npm install（自動填充）
```

#### **3.3 添加環境變數**

點擊 **"Environment Variables"** 展開：

添加以下變數：

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://你的後端網址.onrender.com` |

⚠️ **重要：**
- 等後端部署完成後再添加這個變數
- 或先用 `http://localhost:3001` 測試

**示例：**
```
VITE_API_URL=https://lecturescript-backend.onrender.com
```

#### **3.4 開始部署**

點擊底部的 **"Deploy"** 按鈕

---

### **步驟 4：等待部署完成**

1. Vercel 會自動開始構建
2. 看到實時構建日誌
3. 等待 **2-3 分鐘**
4. 看到 **"Congratulations!"** 表示成功

---

### **步驟 5：測試部署**

#### **5.1 獲取你的網址**

部署成功後，你會看到網址，例如：
```
https://lecturescript-frontend.vercel.app
```

#### **5.2 測試前端**

在瀏覽器訪問你的網址，應該看到：
- ✅ LectureScript 上傳界面
- ✅ 漂亮的 UI

⚠️ **此時上傳功能還不能用，因為需要連接後端**

---

## 🔗 連接前後端

### **步驟 1：更新前端環境變數**

後端部署完成後：

1. 在 Vercel Dashboard 找到你的項目
2. 點擊 **"Settings"** 標籤
3. 點擊 **"Environment Variables"**
4. 更新 `VITE_API_URL` 為你的 Render.com 後端網址：
   ```
   https://lecturescript-backend.onrender.com
   ```
5. 點擊 **"Save"**
6. Vercel 會自動重新部署（1-2 分鐘）

### **步驟 2：更新後端 CORS**

在 Render.com：

1. 找到你的後端服務
2. 點擊 **"Environment"**
3. 找到 `ALLOWED_ORIGINS`
4. 更新為：
   ```
   https://lecturescript-frontend.vercel.app,http://localhost:3000
   ```
5. 保存，等待 Render 重新部署

---

## 🧪 完整測試

### **測試清單：**

1. **訪問前端** → `https://你的前端.vercel.app`
2. **上傳音頻** → 測試文件上傳
3. **查看轉錄** → 等待 AI 轉錄
4. **搜索功能** → 測試搜索
5. **導出功能** → 測試 HTML 導出

✅ **全部通過！你的應用已上線！** 🎉

---

## 📁 Vercel 配置文件

### **vercel.json（已存在）**

你的項目已經有 `vercel.json`：

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

✅ **無需修改！**

---

## 🎨 自定義域名（可選）

### **添加自己的域名**

1. 在 Vercel Dashboard 找到你的項目
2. 點擊 **"Settings" → "Domains"**
3. 輸入你的域名（例如：`lecturescript.com`）
4. 按照提示設置 DNS 記錄
5. 等待 DNS 生效（通常 5-10 分鐘）

✅ **免費 SSL 證書會自動配置**

---

## 🔧 前端服務配置

### **檢查 API 連接設定**

確認 `uploadService.ts` 使用環境變數：

```typescript
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

✅ **已經正確配置！**

### **構建腳本**

確認 `package.json`：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

✅ **已經正確！**

---

## 📊 Vercel 功能

### **自動部署**

- 每次推送到 `main` 分支
- Vercel 自動構建和部署
- 約 2-3 分鐘完成

### **預覽部署**

- 每個 Pull Request 自動創建預覽
- 獨立的預覽網址
- 方便測試新功能

### **分析和監控**

1. **Analytics** - 訪問統計
2. **Speed Insights** - 性能分析
3. **Logs** - 構建和運行日誌

---

## 🔍 故障排除

### **問題：構建失敗**

**查看日誌：**
1. Vercel Dashboard → 你的項目
2. 點擊失敗的部署
3. 查看 **"Build Logs"**

**常見錯誤：**

#### **錯誤 1：npm install 失敗**
```
解決：檢查 package.json 和 package-lock.json
```

#### **錯誤 2：TypeScript 錯誤**
```
解決：本地運行 npm run build 檢查錯誤
```

#### **錯誤 3：環境變數未設定**
```
解決：確認 VITE_API_URL 已在 Vercel 設定
```

---

### **問題：無法連接後端**

**檢查清單：**
1. ✅ `VITE_API_URL` 是否正確？
2. ✅ 後端是否正常運行？
3. ✅ 後端 CORS 是否包含前端網址？
4. ✅ 打開瀏覽器開發工具查看網絡請求

---

### **問題：上傳失敗**

**檢查：**
1. 後端健康檢查：`https://後端網址/api/health`
2. 查看瀏覽器 Console 錯誤訊息
3. 確認後端 CORS 設定正確

---

## 🎯 部署清單

### **前端部署清單：**

- [ ] 代碼推送到 GitHub
- [ ] 在 Vercel 創建項目
- [ ] 設定 Root Directory: `frontend`
- [ ] 添加環境變數 `VITE_API_URL`
- [ ] 等待構建完成
- [ ] 測試前端訪問

### **前後端連接清單：**

- [ ] 更新前端 `VITE_API_URL` 為後端網址
- [ ] 更新後端 `ALLOWED_ORIGINS` 包含前端網址
- [ ] 測試文件上傳
- [ ] 測試音頻轉錄
- [ ] 測試 PDF 顯示
- [ ] 測試搜索功能
- [ ] 測試導出功能

---

## 💡 Pro Tips

### **1. 環境變數管理**

```bash
# 本地開發
VITE_API_URL=http://localhost:3001

# Vercel 生產環境
VITE_API_URL=https://your-backend.onrender.com
```

### **2. 快速重新部署**

在 Vercel Dashboard：
1. 找到最新的部署
2. 點擊 **"..." → "Redeploy"**
3. 選擇 **"Use existing Build Cache"** 加快速度

### **3. 分支部署**

- `main` 分支 → 生產環境
- 其他分支 → 自動預覽部署

---

## 📞 需要幫助？

- **Vercel 文檔：** https://vercel.com/docs
- **Vercel 社群：** https://github.com/vercel/vercel/discussions
- **LectureScript 問題：** 查看瀏覽器 Console

---

## 🎊 成功部署！

恭喜！你現在有：

✅ **後端** - Render.com（免費）
✅ **前端** - Vercel（免費）
✅ **HTTPS** - 自動 SSL
✅ **全球 CDN** - 快速訪問
✅ **自動部署** - 推送即更新

**總費用：$0！** 🆓

---

**建立者：** Claude Code Assistant
**項目：** LectureScript Frontend
**平台：** Vercel（免費）
**狀態：** 準備就緒 ✨

**開始部署吧！完全免費！** 🚀
