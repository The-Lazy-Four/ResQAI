# Google OAuth Setup for ResQAI

## Step 1: Create Google Cloud Project
1. Go to console.cloud.google.com
2. Create new project: "ResQAI"
3. Enable Google+ API / People API

## Step 2: Create OAuth Credentials
1. APIs & Services → Credentials
2. Create Credentials → OAuth 2.0 Client ID
3. Application type: Web application
4. Name: ResQAI Admin Auth

## Step 3: Add Authorized URLs
Authorized JavaScript origins:
  http://localhost:3000

Authorized redirect URIs:
  http://localhost:3000/api/google-auth/callback
  https://resqai-mdo4.onrender.com/api/google-auth/callback

## Step 4: Copy Credentials
Copy Client ID and Client Secret to .env:
  GOOGLE_CLIENT_ID=your_client_id_here
  GOOGLE_CLIENT_SECRET=your_client_secret_here
  GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-auth/callback

The app now derives the callback host at runtime, so the same client can work for both localhost and Render as long as both redirect URIs are added in Google Cloud.

## Step 5: Restart Server
  npm start
