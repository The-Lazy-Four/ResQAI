# ResQAI
### AI-Powered Emergency Response System
An AI-first, multi-module emergency platform for real-time crisis detection, SOS escalation, and coordinated response.

---

## Project Summary
ResQAI solves a core emergency challenge: people need clear instructions and fast coordination during high-stress events.
It combines incident reporting, AI guidance, nearby risk awareness, and admin monitoring in one integrated system.
Its standout capability is multi-module operation with multi-tenant isolation so one system's alerts do not leak into another.
This directly improves safety response quality for public, hospitality, and custom organizational use cases.

---

## Visual System Showcase

| Screenshot | Description |
|---|---|
| ![Landing Page](docs/images/Landing%20page.png) | **What users see:** cinematic project entry and mission-first introduction.<br>**What it does:** routes users into the right rescue flow quickly.<br>**Why it matters:** reduces onboarding friction in time-sensitive scenarios. |
| ![Main Page](docs/images/Main%20Page.png) | **What users see:** module selection and primary navigation experience.<br>**What it does:** gives access to rapid protocol, hotel module, and custom builder paths.<br>**Why it matters:** supports multiple emergency contexts from one platform. |
| ![Rapid Crisis Protocol Dashboard](docs/images/Rapid%20Crisis%20Protocol%20Dashboard.png) | **What users see:** active dashboard with alerts, incidents, and decision context.<br>**What it does:** centralizes monitoring and rapid action workflows.<br>**Why it matters:** provides operational clarity during emergencies. |
| ![Hotel Resort Module](docs/images/Hotel%20Resort%20Module.png) | **What users see:** hospitality-specific emergency operations interface.<br>**What it does:** coordinates guest/admin actions, floor-level guidance, and emergency procedures.<br>**Why it matters:** enables tailored response for hotels and resorts. |
| ![Custom Rescue Builder](docs/images/Custom%20Rescue%20Builder.png) | **What users see:** no-code rescue system creation interface.<br>**What it does:** builds organization-specific emergency systems with admin/user panels.<br>**Why it matters:** makes emergency readiness configurable for any organization. |

---

## Module Breakdown

| Module | Purpose | Key Features | Workflow |
|---|---|---|---|
| **Rapid Crisis Protocol** | Core crisis response experience for broad/public scenarios | Incident intake, AI support, nearby alerts, dashboard tracking | Report -> Classify -> Guide -> Monitor |
| **EcoPlus (Hotel/Resort)** | Hospitality emergency coordination | Guest/admin separation, floor-aware response, safety instructions | Select Hotel Context -> Trigger Scenario -> Guide Guests -> Track Status |
| **SQBitain (Custom Builder)** | Build custom rescue systems for organizations | Wizard setup, system cards, panel separation, systemID-scoped SOS | Create -> Build -> Save -> Open -> Operate |

---

## Key Features

### Core
- One-click SOS system with escalation flow
- AI emergency guidance with fallback logic
- Multi-tenant isolation using systemID event scoping

### Advanced
- Voice assistance and spoken emergency guidance
- Map integration for nearby risk and incident visibility
- Admin dashboards for coordinated emergency operations

---

## System Flow
Create -> Build -> Save -> Card -> Open -> Admin/User -> SOS -> AI Response

---

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript, Leaflet |
| Backend | Node.js, Express.js |
| AI | Google Gemini -> OpenRouter -> Groq fallback chain |
| Database | SQLite (local) with MySQL-ready architecture |

---

---

## 👥 Team

**Team Leader:**
- **Snehasis Chakraborty** – Idea Conceptualization & Developer

**Core Team:**
- **Souvik Dey** – Research Implementation, Lead Backend Developer
- **Partha Sarathi Sarkar** – Research, UI Design, Side Developer  
- **Samrat Chatterjee** – PPT Design Side Developer

---

## Why This Project Stands Out
- AI-driven emergency response turns panic into structured action.
- Multi-system isolation prevents cross-tenant emergency event leakage.
- Practical real-world design across personal, hospitality, and custom organizational workflows.

---

## License
This project is licensed under the **MIT License** (as defined in package metadata).

---

## Conclusion
ResQAI demonstrates real-world emergency impact with a scalable, modular architecture.
It is hackathon-ready for judges and presentations, while remaining extensible for production growth.
