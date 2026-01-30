# 🚀 Railway Deployment Guide

## What Was Fixed

✅ Changed `puppeteer-core` → `puppeteer` (includes Chromium)  
✅ Simplified server.js for Railway compatibility  
✅ Added Dockerfile for reliable cloud deployment  
✅ Created railway.json configuration  
✅ Added nixpacks.toml as alternative  
✅ Updated README with instructions  

## Deploy Steps

### 1. Initialize Git (if not already done)

```bash
cd C:\Users\David\.gemini\antigravity\playground\eternal-oort
git init
git add .
git commit -m "Railway deployment ready"
```

### 2. Push to GitHub

```bash
# Create a new repository on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### 3. Deploy on Railway

1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository
6. Railway will auto-detect the Dockerfile and build

### 4. Get Your URL

1. Click on your deployment
2. Go to Settings → Networking
3. Click "Generate Domain"
4. Your dashboard will be live at: `https://your-project.up.railway.app`

## Testing Locally First

```bash
npm install
npm start
# Open http://localhost:3000
```

## Railway Will Use

- **Dockerfile** (recommended) - most reliable for Puppeteer
- OR **nixpacks.toml** - simpler but may need tweaking

Railway will automatically choose the best option.

## Expected Result

✅ Server starts successfully  
✅ Puppeteer launches with bundled Chromium  
✅ Dashboard loads at Railway URL  
✅ Amazon scraping works in cloud  

## Troubleshooting

**Build fails:**
- Check Railway logs in dashboard
- Ensure GitHub repo is public or Railway has access

**Puppeteer errors:**
- Dockerfile includes all Chrome dependencies
- Check if memory limits are hit (upgrade Railway plan)

**Can't access dashboard:**
- Make sure domain is generated in Railway settings
- Check if server is running in Railway logs

## Cost

Railway free tier includes:
- $5 credit per month
- Should be enough for testing/light use
- Monitor usage in Railway dashboard
