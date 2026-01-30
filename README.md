# Amazon Buy Box Dashboard

A real-time Amazon South Africa Buy Box monitoring dashboard with smart request queue and Puppeteer-based scraping.

## Features

- **Auto-Queue**: Processes requests one-by-one to prevent server overload
- **Dynamic Proxy**: Automatically switches between local and cloud URLs
- **Bulk Import**: Support for CSV-based product lists
- **Real-time Stats**: Track Win/Loss ratios and Market Share
- **Cloud-Ready**: Optimized for Railway deployment

## Deployment to Railway

### Quick Deploy (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Railway deployment ready"
   git push
   ```

2. **Deploy on Railway**:
   - Go to [Railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect the Dockerfile and deploy

3. **Generate Domain**:
   - Go to your project Settings → Networking
   - Click "Generate Domain"
   - Your dashboard will be live at `https://your-project.up.railway.app`

### Manual Configuration (if needed)

If Railway doesn't auto-detect:

**Build Command**: `npm install`  
**Start Command**: `npm start`

**Environment Variables** (Usually not needed, but available):
- `PORT`: Railway sets this automatically
- `RAILWAY_ENVIRONMENT`: Auto-detected by the app

### Expected Behavior

- ✅ Browser launches in headless mode with Chromium
- ✅ Requests are queued to prevent overload
- ✅ Graceful shutdown on deployment updates
- ✅ Works on both Windows (local) and Linux (Railway)

## Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Locally**:
   ```bash
   npm start
   ```

3. **Access Dashboard**:
   Open `http://localhost:3000` in your browser

## Troubleshooting

### Railway Issues

**Puppeteer fails to launch:**
- Railway uses the Dockerfile which includes all Chrome dependencies
- Check deployment logs for specific errors

**Memory issues:**
- Consider upgrading your Railway plan for more RAM
- Reduce concurrent scraping by limiting ASINs

**Timeout errors:**
- Amazon may be blocking requests - try reducing request frequency
- Check if your Railway IP is rate-limited

### Local Issues

**Chrome not found on Windows:**
- Server auto-detects Chrome/Edge in standard locations
- Manually install Chrome if needed

## Project Structure

```
├── server.js           # Main Express server with Puppeteer
├── index.html          # Dashboard UI
├── package.json        # Dependencies (using 'puppeteer' not 'puppeteer-core')
├── Dockerfile          # Railway deployment config
├── railway.json        # Railway settings
└── README.md           # This file
```

## Tech Stack

- **Backend**: Node.js + Express
- **Scraping**: Puppeteer (full package with bundled Chromium)
- **Hosting**: Railway (Dockerfile-based deployment)
- **Frontend**: Vanilla HTML/CSS/JavaScript

## Notes

- Uses full `puppeteer` package (includes Chromium) for cloud compatibility
- Request queue prevents server overload
- Supports both local development and cloud deployment
- Chromium runs in headless mode for efficiency
