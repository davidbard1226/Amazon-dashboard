const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
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

// LIGHTWEIGHT CHECK: Just use fetch for quick seller detection
async function lightweightCheck(targetUrl) {
    console.log('[Lightweight] Checking:', targetUrl);
    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
            timeout: 15000
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        
        // Quick regex check for "Bonolo" in seller info
        const hasBonolo = html.toLowerCase().includes('bonolo');
        
        console.log(`[Lightweight] ${hasBonolo ? 'WINNING' : 'LOSING'} - ${targetUrl}`);
        
        return {
            needsPuppeteer: !hasBonolo, // Only use Puppeteer if NOT winning
            html: html
        };
    } catch (error) {
        console.error('[Lightweight] Error:', error.message);
        // On error, default to Puppeteer for accuracy
        return { needsPuppeteer: true, html: null };
    }
}

// HEAVY CHECK: Full Puppeteer for accurate data when losing
async function heavyCheck(targetUrl) {
    console.log('[Puppeteer] Full check:', targetUrl);
    let page = null;
    try {
        const b = await getBrowser();
        page = await b.newPage();

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1280, height: 720 });

        await page.goto(targetUrl, {
            waitUntil: 'networkidle2',
            timeout: 45000
        });

        // Extra wait for dynamic prices
        await new Promise(r => setTimeout(r, 2000));

        const content = await page.content();
        console.log(`[Puppeteer] Success (${content.length} bytes)`);
        
        return content;

    } catch (error) {
        console.error(`[Puppeteer] Error:`, error.message);
        throw error;
    } finally {
        if (page) await page.close().catch(() => {});
    }
}

console.log('[Server] Initializing OPTIMIZED server...');

app.get('/health', (req, res) => res.send('OK'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// SMART PROXY: Lightweight first, Puppeteer only if needed
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Missing url');

    requestQueue = requestQueue.then(async () => {
        try {
            // Step 1: Try lightweight check first
            const lightResult = await lightweightCheck(targetUrl);
            
            if (!lightResult.needsPuppeteer && lightResult.html) {
                // You're winning! Use lightweight result
                console.log('[Smart] ✓ Using lightweight check (WINNING)');
                res.send(lightResult.html);
            } else {
                // You're losing or error - use Puppeteer for accuracy
                console.log('[Smart] → Using Puppeteer (LOSING or ERROR)');
                const heavyResult = await heavyCheck(targetUrl);
                res.send(heavyResult);
            }

        } catch (error) {
            console.error(`[Proxy] Error:`, error.message);
            if (!res.headersSent) {
                res.status(500).send(`Proxy Error: ${error.message}`);
            }
        }
    }).catch(err => {
        console.error('[Queue] Error:', err.message);
    });
});

// NEW: Batch endpoint for efficient checking
app.post('/batch-check', async (req, res) => {
    const { asins } = req.body;
    if (!asins || !Array.isArray(asins)) {
        return res.status(400).json({ error: 'Missing asins array' });
    }

    console.log(`[Batch] Processing ${asins.length} ASINs...`);
    
    const results = {
        winning: [],
        losing: [],
        errors: []
    };

    for (const asin of asins) {
        const url = `https://www.amazon.co.za/dp/${asin}`;
        try {
            const check = await lightweightCheck(url);
            if (check.needsPuppeteer) {
                results.losing.push(asin);
            } else {
                results.winning.push(asin);
            }
        } catch (error) {
            results.errors.push(asin);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
    }

    console.log(`[Batch] Results - Winning: ${results.winning.length}, Losing: ${results.losing.length}, Errors: ${results.errors.length}`);
    res.json(results);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ OPTIMIZED Amazon Dashboard Server running at port ${PORT}`);
    console.log(`✓ Environment: ${process.env.RAILWAY_ENVIRONMENT ? 'Railway' : 'Local'}`);
    console.log(`✓ Smart Mode: Lightweight check first, Puppeteer only when losing`);
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

