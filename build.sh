#!/usr/bin/env bash
# exit on error
set -o errexit

echo "[Build] Starting optimized build..."
npm install --no-audit --no-fund

echo "[Build] Installing Chrome into local cache..."
# Use puppeteer-core to install the browser manually
npx @puppeteer/browsers install chrome@stable --path ./.cache/puppeteer

echo "[Build] Verifying installation..."
ls -R ./.cache/puppeteer | grep chrome || echo "[Build] Warning: Chrome not found in expected cache!"

echo "[Build] Finished!"
