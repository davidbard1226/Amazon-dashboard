const fetch = require('node-fetch');

async function debug() {
    const asin = 'B00006B7XB';
    const targetUrl = `https://www.amazon.co.za/gp/offer-listing/${asin}`;
    const proxyUrl = `http://localhost:3000/proxy?url=${encodeURIComponent(targetUrl)}`;

    console.log(`Fetching: ${proxyUrl}`);

    try {
        const resp = await fetch(proxyUrl);
        const html = await resp.text();

        console.log(`Length: ${html.length}`);

        // Look for "Bonolo"
        console.log('--- SEARCH FOR BONOLO ---');
        const bonolo = html.match(/Bonolo[^<]*/gi);
        if (bonolo) console.log(bonolo);

        // Print a chunk of HTML around a "Details" link to see context
        const detailsIdx = html.indexOf('Details about delivery costs and methods');
        if (detailsIdx > -1) {
            console.log('--- CONTEXT AROUND DETAILS ---');
            console.log(html.substring(detailsIdx - 500, detailsIdx + 500));
        }

        // Look for "Details" links
        console.log('--- DETAILS LINKS ---');
        const detailsLinks = html.match(/<a[^>]*>[^<]*Details[^<]*<\/a>/gi);
        if (detailsLinks) {
            detailsLinks.forEach(l => console.log(l));
        }

        // Look for potential seller containers
        console.log('--- POTENTIAL SELLERS ---');
        const sellerContainers = html.match(/Sold by[^<]*<span[^>]*>[^<]+<\/span>/gi);
        if (sellerContainers) console.log(sellerContainers);

        // Simple regex to find prices
        console.log('--- PRICES ---');
        const prices = html.match(/R\s?[\d,.]+/g);
        if (prices) console.log(prices.slice(0, 15));

        // Simple regex to find potential sellers (anchors in offer lists)
        console.log('--- SELLERS (Heuristic) ---');
        // Look for profile links
        const profiles = html.match(/\/sp\?_encoding=UTF8&seller=[^"]+/g);
        if (profiles) {
            profiles.forEach(p => console.log(p));
        } else {
            console.log("No seller profile links found.");
        }

        // Look for "Sold by"
        const soldBy = html.match(/Sold by[^<]*<a[^>]*>([^<]+)/g);
        if (soldBy) console.log(soldBy);

    } catch (e) {
        console.error(e);
    }
}

debug();
