# Amazon Buy Box Dashboard (v4.2)

A real-time Amazon South Africa Buy Box monitoring dashboard with a smart request queue and Puppeteer-based scraping.

## Deployment to Render

1.  **Repository**: Connect this GitHub repository to Render.
2.  **Build Command**: `npm install`
3.  **Start Command**: `npm start`
4.  **Environment Variables**:
    *   `RENDER`: `true` (automatically set by Render)
    *   `PUPPETEER_EXECUTABLE_PATH`: (Optional, usually handled by the `postinstall` script)

## Key Features

- **Auto-Queue**: Processes requests one-by-one to prevent server overload.
- **Dynamic Proxy**: Automatically switches between local and cloud URLs.
- **Bulk Import**: Support for CSV-based product lists.
- **Real-time Stats**: Track Win/Loss ratios and Market Share.
