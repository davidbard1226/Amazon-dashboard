#!/usr/bin/env bash
# exit on error
set -o errexit

echo "[Build] Starting optimized build..."
npm install --no-audit --no-fund

echo "[Build] Installing Chrome into local cache..."
npx @puppeteer/browsers install chrome@stable --path "$(pwd)/.cache/puppeteer"

echo "[Build] Cleaning up to save space..."
# Remove zip files and intermediate downloads
find "$(pwd)/.cache/puppeteer" -name "*.zip" -delete
find "$(pwd)/.cache/puppeteer" -name "*.tar.bz2" -delete

echo "[Build] Verifying installation..."
ls -R "$(pwd)/.cache/puppeteer" | grep chrome || echo "[Build] Warning: Chrome not found!"

echo "[Build] Finished!"
