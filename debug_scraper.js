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

        // Check for specific keywords
        console.log('--- SEARCHING FOR "Raion" ---');
        const raionMatch = html.match(/.{0,100}Raion.{0,100}/gi);
        if (raionMatch) {
            raionMatch.forEach(m => console.log(`MATCH: ${m}`));
        } else {
            console.log('NO MATCH FOR "Raion"');
        }

        console.log('--- SEARCHING FOR "seller=" ---');
        const sellerMatch = html.match(/.{0,100}seller=.{0,100}/gi);
        if (sellerMatch) {
            sellerMatch.slice(0, 5).forEach(m => console.log(`MATCH: ${m}`));
        }

        console.log('--- SEARCHING FOR "aria-label" ---');
        const ariaMatch = html.match(/.{0,100}aria-label.{0,100}/gi);
        if (ariaMatch) {
            ariaMatch.slice(0, 5).forEach(m => console.log(`MATCH: ${m}`));
        }

    } catch (e) {
        console.error(e);
    }
}

debug();
