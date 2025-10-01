# 🎯 LectureScript - Real-time Transcription PWA

> AI-powered real-time audio transcription with bilingual support (Cantonese + English)

## 🚀 **Current Status: OPERATIONAL** ✅

- **Frontend**: http://localhost:3013/ (Working)
- **Backend**: http://localhost:3001/ (Working)
- **Last Updated**: 2025-09-21

---

## 📋 **Quick Start**

### Start the Application
```bash
# 1. Start Backend Server
cd C:/Users/sonic/lecture-transcription-backend/
node ultimate-server.js

# 2. Start Frontend (new terminal)
cd C:/Users/sonic/lecture-transcription-pwa/
npm run dev -- --force
```

### Access URLs
- **Application**: http://localhost:3013/
- **Backend API**: http://localhost:3001/api/health

---

## 📚 **Complete Documentation**

All project documentation is organized in the `/docs` folder:

### 🎯 **Start Here for New Developers**
- **[📋 Project Status](./docs/PROJECT_STATUS.md)** - Complete project overview, setup guide, current working URLs
- **[📝 Development Log](./docs/DEVELOPMENT_LOG.md)** - Recent session logs and issue resolutions
- **[✅ TODO List](./docs/TODO.md)** - Current tasks, priorities, and future features

### 🔧 **Backend Documentation**
- **[🏗️ Backend Overview](../lecture-transcription-backend/docs/PROJECT_OVERVIEW.md)** - Backend-specific information and API details

---

## 🎯 **Key Features**

- ✅ **Real-time Voice Activity Detection** - Smart audio chunking
- ✅ **Universal Audio Processing** - Supports all major formats
- ✅ **Bilingual Transcription** - Optimized for Cantonese + English
- ✅ **OpenAI Whisper Integration** - High-accuracy AI transcription
- ✅ **Progressive Browser Support** - Works across all modern browsers
- ✅ **Smart Error Handling** - User-friendly error messages

---

## 🏗️ **Project Structure**

```
📁 lecture-transcription-pwa/          # FRONTEND (React + TypeScript)
├── 📁 docs/                           # 📚 DOCUMENTATION
│   ├── 📄 PROJECT_STATUS.md           # Complete project status
│   ├── 📄 DEVELOPMENT_LOG.md          # Development session logs
│   └── 📄 TODO.md                     # Task list and priorities
├── 📁 src/
│   ├── 📄 IntelligentRealtimeApp.tsx  # Main application
│   └── 📁 services/                   # Core services
└── 📄 README.md                       # This file

📁 lecture-transcription-backend/      # BACKEND (Node.js + Express)
├── 📁 docs/                           # 📚 BACKEND DOCS
│   └── 📄 PROJECT_OVERVIEW.md         # Backend overview
├── 📄 ultimate-server.js              # Main production server
└── [other server variants]
```

---

## 🆘 **Need Help?**

### For New Team Members
1. **Start with**: `docs/PROJECT_STATUS.md` - Complete context and setup
2. **Recent fixes**: `docs/DEVELOPMENT_LOG.md` - Latest issue resolutions
3. **Current work**: `docs/TODO.md` - Tasks and priorities

### Common Issues
- **White page**: Run `npm run dev -- --force` to clear cache
- **CORS errors**: Verify backend is running on port 3001
- **Import errors**: Check for type-only imports in React components

### Emergency Reset
```bash
# Kill all processes and restart clean
pkill -f "node.*server" && pkill -f "npm.*dev"

# Restart (follow Quick Start above)
```

---

## 🎯 **Technical Stack**

- **Frontend**: React, TypeScript, Vite, Web Audio API
- **Backend**: Node.js, Express, OpenAI Whisper API
- **Audio**: Voice Activity Detection, Universal format conversion
- **AI**: Bilingual transcription optimization

---

**📞 For detailed documentation, troubleshooting, and development guides, see the `/docs` folder.**