# ResQAI - Emergency Intelligence & Response System

## 📋 Quick Links
- **Features**: See [FEATURES.md](./FEATURES.md)
- **Project Structure**: See [STRUCTURE.md](./STRUCTURE.md)
- **Setup Guide**: See [SETUP.md](./SETUP.md)

---

## 🎯 What is ResQAI?

ResQAI is an **AI-powered real-time emergency detection, prediction & response system** built for the Indian crisis response landscape. It combines:

- 🤖 **AI Intelligence** - Gemini API for smart emergency classification & guidance
- 📍 **Location Services** - Real-time nearby incident detection
- 🎤 **Voice Integration** - Voice commands for hands-free operation
- 💬 **Chatbot Assistance** - 24/7 multilingual emergency guidance
- 📊 **Visual Dashboard** - Real-time analytics and incident tracking

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Add your GEMINI_API_KEY to .env

# 3. Start the server
npm start

# 4. Open browser
http://localhost:3000
```

---

## 🏗️ Architecture

### Frontend (Single Page App)
- **HTML/CSS/JavaScript** - Pure vanilla, no frameworks
- **Responsive Design** - Works on desktop, tablet, mobile
- **Module-based** - Clean separation of concerns

### Backend (Express.js)
- **RESTful API** - Clean endpoint structure
- **Database** - SQLite for persistence
- **AI Integration** - Google Gemini for classification & guidance

### State Flow
```
Loading Screen (0-100%)
        ↓
Selection Screen (Choose Rescue System)
        ↓
Main Dashboard (Active Emergency Response)
```

---

## 📁 Project Structure

See [STRUCTURE.md](./STRUCTURE.md) for detailed breakdown.

```
ResQAI/
├── public/
│   ├── pages/          # HTML pages
│   ├── styles/         # CSS stylesheets
│   ├── scripts/        # JavaScript modules
│   └── assets/         # Images, icons, fonts
├── src/
│   ├── api/routes/     # Express endpoints
│   ├── db/             # Database models
│   ├── utils/          # Helper utilities
│   └── server.js       # Express app
├── docs/               # Documentation
└── package.json        # Dependencies
```

---

## 🚀 Features

### 🟢 Core System
- ✅ Emergency Detection & Classification
- ✅ Real-time Incident Dashboards
- ✅ SOS Alert System
- ✅ AI Emergency Chatbot

### 🟡 In Development
- 🔄 Hotel/Resort Emergency Management
- 🔄 Custom Rescue Builder
- 🔄 Government API Integration

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite |
| **AI** | Google Gemini API |
| **Maps** | Leaflet.js |
| **Icons** | Font Awesome 6 |

---

## 📝 Environment Setup

Create `.env` file with:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_PATH=./emergencies.db

# AI Services
GEMINI_API_KEY=your_gemini_api_key_here

# Coordinates (India)
DEFAULT_LAT=28.7041
DEFAULT_LNG=77.1025
```

---

## 🎯 Use Cases

### Personal Emergency Response
- One-click SOS activation
- AI guidance for any disaster type
- Location sharing with emergency contacts
- Real-time safety score calculation

### Organizational Deployment
- Hotel/resort emergency management
- Campus/office building response
- Public event crisis coordination
- Custom emergency protocols

---

## 📊 Performance

- **Load Time**: ~2-3 seconds (with liquid fill animation)
- **API Response**: <500ms average
- **Database**: Optimized SQLite queries
- **Mobile**: Fully responsive, <50MB footprint

---

## 🔐 Security

- CORS protection enabled
- Environment variables for secrets
- SQLite file permissions
- Input validation on all endpoints

---

## 🤝 Contributing

For Hackathons:
1. Pick a feature from `docs/FEATURES.md`
2. Create a feature branch
3. Follow the modular structure
4. Test before pushing
5. Submit PR with clear description

---

## 📞 Support

**Current Maintainer**: Hackathon Team  
**Last Updated**: April 2026

### Troubleshooting
- Port 3000 in use? → Change `PORT` in `.env`
- Missing Gemini APIs? → Check `GEMINI_API_KEY` in console
- Module not found? → Run `npm install` again
- Database locked? → Delete `emergencies.db` and restart

---

## 📄 License

Built for **Hackathon 2026** - Open for educational use.

---

**Happy Hacking! 🚀**
