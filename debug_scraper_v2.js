const fetch = require('node-fetch');

async function debug() {
    const asin = 'B07N24G1V8';
    const targetUrl = `https://www.amazon.co.za/gp/offer-listing/${asin}`;
    const proxyUrl = `http://localhost:3000/proxy?url=${encodeURIComponent(targetUrl)}`;

    console.log(`Fetching: ${proxyUrl}`);

    try {
        const resp = await fetch(proxyUrl);
        const html = await resp.text();

        console.log(`Length: ${html.length}`);

        // Search for the price "4,187"
        console.log('--- SEARCHING FOR "4,187" ---');
        // Find indices
        const priceIndex = html.indexOf('4,187');
        if (priceIndex !== -1) {
            const start = Math.max(0, priceIndex - 1000);
            const end = Math.min(html.length, priceIndex + 1000);
            console.log(html.substring(start, end));
        } else {
            console.log("Price not found.");
        }

    } catch (e) {
        console.error(e);
    }
}

debug();
