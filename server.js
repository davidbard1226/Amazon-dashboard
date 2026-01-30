const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(__dirname));

// Memory-safe concurrency queue
let requestQueue = Promise.resolve();
let browser = null;
let launchPromise = null;

async function getBrowser() {
    if (browser && browser.connected) {
        return browser;
    }

    if (launchPromise) {
        return await launchPromise;
    }

    console.log('[Puppeteer] Launching browser...');
    
    const options = {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu',
            '--disable-canvas-aa',
            '--disable-2d-canvas-clip-aa',
            '--disable-gl-drawing-for-tests',
            '--hide-scrollbars',
            '--disable-notifications',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
        ]
    };

    // Railway/Cloud-specific optimizations
    if (process.env.RAILWAY_ENVIRONMENT || process.platform === 'linux') {
        console.log('[Puppeteer] Cloud environment detected');
        options.args.push(
            '--single-process',
            '--no-zygote'
        );
    }

    // Windows-specific: Try to find local Chrome
    if (process.platform === 'win32' && !process.env.RAILWAY_ENVIRONMENT) {
        const paths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
        ];
        for (const p of paths) {
            if (fs.existsSync(p)) {
                options.executablePath = p;
                console.log(`[Puppeteer] Local Windows: Found browser at ${p}`);
                break;
            }
        }
    }

    launchPromise = puppeteer.launch(options).then(b => {
        browser = b;
        launchPromise = null;

        browser.on('disconnected', () => {
            console.log('[Puppeteer] Browser disconnected.');
            browser = null;
        });

        console.log('[Puppeteer] Browser ready.');
        return browser;
    }).catch(err => {
        console.error('[Puppeteer] Launch FAILED:', err.message);
        launchPromise = null;
        throw err;
    });

    return launchPromise;
}

console.log('[Server] Initializing...');

app.get('/health', (req, res) => res.send('OK'));

// Serve the dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Missing url');

    // Add to queue
    requestQueue = requestQueue.then(async () => {
        console.log(`[Proxy] Processing: ${targetUrl}`);
        let page = null;
        try {
            const b = await getBrowser();
            page = await b.newPage();

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
            await page.setViewport({ width: 1280, height: 720 });

            // High-reliability navigation
            await page.goto(targetUrl, {
                waitUntil: 'networkidle2',
                timeout: 45000
            });

            // Extra wait for dynamic prices
            await new Promise(r => setTimeout(r, 2000));

            const content = await page.content();
            res.send(content);
            console.log(`[Proxy] Success (${content.length} bytes)`);

        } catch (error) {
            console.error(`[Proxy] Error:`, error.message);
            if (!res.headersSent) {
                res.status(500).send(`Proxy Error: ${error.message}`);
            }
        } finally {
            if (page) await page.close().catch(() => { });
        }
    }).catch(err => {
        console.error('[Queue] Error:', err.message);
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Amazon Dashboard Server running at port ${PORT}`);
    console.log(`Environment: ${process.env.RAILWAY_ENVIRONMENT ? 'Railway' : 'Local'}`);
});

// Graceful Shutdown
const cleanup = async () => {
    console.log('[Server] Shutting down...');
    if (browser) {
        await browser.close();
        console.log('[Puppeteer] Browser closed.');
    }
    process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
