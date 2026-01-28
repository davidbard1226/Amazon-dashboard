const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(__dirname));

// Memory-safe concurrency queue for Render
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
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--single-process',
            '--disable-canvas-aa',
            '--disable-2d-canvas-clip-aa',
            '--disable-gl-drawing-for-tests',
            '--hide-scrollbars',
            '--disable-notifications'
        ]
    };

    // If on Render, find the locally installed chrome
    if (process.env.RENDER) {
        console.log(`[Puppeteer] RENDER detected. CWD: ${process.cwd()}, Dirname: ${__dirname}`);
        const cachePath = path.join(__dirname, '.cache', 'puppeteer');

        const findExecutable = (dir, depth = 0) => {
            if (depth > 5) return null; // Avoid too deep recursion
            if (!fs.existsSync(dir)) return null;

            const files = fs.readdirSync(dir);
            console.log(`[Puppeteer] Searching ${dir}: ${files.join(', ')}`);

            for (const file of files) {
                const fullPath = path.join(dir, file);
                try {
                    const stat = fs.statSync(fullPath);
                    if (stat.isDirectory()) {
                        const found = findExecutable(fullPath, depth + 1);
                        if (found) return found;
                    } else if (file === 'chrome' || file === 'chromium' || file === 'google-chrome') {
                        // Check if it's executable
                        try {
                            fs.accessSync(fullPath, fs.constants.X_OK);
                            return fullPath;
                        } catch (e) {
                            console.log(`[Puppeteer] Found ${file} but it's not executable. Fixing...`);
                            fs.chmodSync(fullPath, 0o755);
                            return fullPath;
                        }
                    }
                } catch (e) { }
            }
            return null;
        };

        try {
            console.log(`[Puppeteer] Checking for local browser in: ${cachePath}`);
            options.executablePath = findExecutable(cachePath);
            if (options.executablePath) {
                console.log(`[Puppeteer] SUCCESS: Found browser at: ${options.executablePath}`);
            } else {
                console.warn(`[Puppeteer] WARNING: Browser executable not found in cache.`);
            }
        } catch (e) {
            console.error(`[Puppeteer] Error during browser search: ${e.message}`);
        }

        // Fallback to standard path if search fails
        if (!options.executablePath) {
            options.executablePath = '/usr/bin/google-chrome';
            console.log(`[Puppeteer] Falling back to: ${options.executablePath}`);
        }
    }

    launchPromise = puppeteer.launch(options).then(b => {
        browser = b;
        launchPromise = null;
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
