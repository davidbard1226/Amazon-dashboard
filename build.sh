#!/usr/bin/env bash
# exit on error
set -o errexit

npm install
# Store the browser in a predictable place
npx puppeteer browsers install chrome --path ./.cache/puppeteer
