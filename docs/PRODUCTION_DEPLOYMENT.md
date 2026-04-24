# RESQAI - PRODUCTION DEPLOYMENT CHECKLIST

## Pre-Deployment

### Environment Variables
- [ ] Set `GEMINI_API_KEY`
- [ ] Set `OPENROUTER_API_KEY` if used
- [ ] Set `GROQ_API_KEY` if used
- [ ] Set `NODE_ENV=production`
- [ ] Set `PORT=3000` or use the platform default
- [ ] Keep `.env` out of version control

### Render Configuration
- [ ] Build Command: `npm install`
- [ ] Start Command: `npm start`
- [ ] Root Directory: project root
- [ ] Auto-deploy enabled

## Current Production Entry Flow

### Public Pages
- `public/pages/landing.html`
- `public/pages/module-selection.html`
- `public/pages/guest-crisis-portal.html`
- `public/modules/rescue-builder/pages/custom-builder-dashboard.html`
- `public/modules/rescue-builder/pages/custom-builder-org-select.html`

### Custom Builder Runtime
- `public/modules/rescue-builder/index.html`
- `public/modules/rescue-builder/js/builder.js`

## Backend Checks

### Server
- `src/server.js` serves static assets from `public/`
- `/dashboard` now points to `public/modules/rescue-builder/pages/custom-builder-dashboard.html`
- non-API routes fall back to `public/pages/landing.html`

### Health Check
```bash
curl https://your-app.onrender.com/api/health
```

## Frontend Checks

### API Usage
- Use relative API paths like `/api/...`
- Avoid hardcoded `localhost` URLs in shipped pages

### Custom Builder Persistence
- Systems are saved through `/api/custom-system`
- Standalone dashboard reads the same stored systems used by the builder flow
- Reopening a system routes back into the builder with `?systemID=...`

## Smoke Test

1. Open the landing page.
2. Enter the module selection page.
3. Open Custom Builder.
4. Create a new system.
5. Confirm it appears in `custom-builder-dashboard.html`.
6. Reopen it from the dashboard.
