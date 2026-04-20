# ResQAI
### AI-Powered Emergency Response System
Compact, multi-module crisis platform that helps users report emergencies, trigger SOS, and receive AI-guided response actions in real time.

---

## Project Summary
ResQAI solves a critical gap in emergencies: people need clear action, fast context, and reliable coordination.
It combines AI guidance, SOS escalation, nearby risk awareness, and admin operations in one system.
What makes it unique is its multi-module design for different domains plus multi-tenant isolation by system.
This matters because faster decisions and cleaner coordination can directly improve safety outcomes.

---

## Visual System Showcase (Grid)

| Screenshot | Description |
|---|---|
| ![Landing](docs/images/Screenshot%202026-04-18%20091308.png) | **What user sees:** cinematic entry experience for emergency intelligence.<br>**Functionality:** introduces mission and routes users into the right module quickly.<br>**Why important:** strong onboarding improves response readiness. |
| ![Selection](docs/images/Screenshot%202026-04-18%20091338.png) | **What user sees:** module selector for personal, hospitality, and custom rescue flows.<br>**Functionality:** sends users to the correct workflow by use case.<br>**Why important:** one platform supports multiple emergency environments. |
| ![Dashboard](docs/images/Screenshot%202026-04-18%20091401.png) | **What user sees:** operational dashboard with incidents, risk indicators, and response context.<br>**Functionality:** live monitoring and quick decision support.<br>**Why important:** central visibility during crisis handling. |
| ![EcoPlus](docs/images/Screenshot%202026-04-18%20091448.png) | **What user sees:** hospitality-focused emergency workspace.<br>**Functionality:** guest/admin safety coordination and scenario-based response.<br>**Why important:** domain-specific emergency handling for hotels and resorts. |
| ![Admin Panel](docs/images/Screenshot%202026-04-18%20091523.png) | **What user sees:** control/admin panel for alert orchestration.<br>**Functionality:** trigger emergency states, supervise updates, and manage response flow.<br>**Why important:** transforms alerts into coordinated action. |

---

## Module Breakdown

| Module | Purpose | Key Features | Workflow |
|---|---|---|---|
| **Rapid Crisis Protocol** | Main emergency response module for broad/public scenarios | Incident intake, nearby alerts, AI guidance/chat, dashboard summaries | Report/Detect -> Classify -> Guide -> Track |
| **EcoPlus (Hotel/Resort)** | Hospitality emergency management | Guest/admin split, floor-aware guidance, hotel scenario engine | Select context -> Trigger scenario -> Guide guests -> Monitor admin view |
| **SQBitain (Custom Builder)** | Build organization-specific rescue systems | Wizard setup, system cards, admin/user separation, system-scoped SOS events | Create -> Build -> Save -> Open panel |

---

## Key Features

### Core
- SOS system with escalation flow
- AI guidance for emergency scenarios
- Multi-tenant isolation using systemID scoping

### Advanced
- Voice assistance and spoken guidance
- Map integration with nearby incident awareness
- Admin dashboards for coordinated response

---

## System Flow
Create -> Build -> Save -> Card -> Open -> Admin/User -> SOS -> AI Response

---

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript, Leaflet |
| Backend | Node.js, Express |
| AI | Gemini + OpenRouter + Groq fallback chain |
| Database | SQLite (local) with MySQL-ready path |

---

## Why This Project Stands Out
- AI-based emergency response turns panic into structured action steps.
- Multi-system isolation prevents cross-system alert leakage.
- Built for real-world usability across public, hospitality, and custom organization contexts.

---

## Conclusion
ResQAI demonstrates a practical, scalable emergency intelligence platform with real-world utility.
Its modular architecture and isolation model make it hackathon-strong and production-extensible.
With further hardening and integrations, it can evolve into a deployable crisis response stack.
