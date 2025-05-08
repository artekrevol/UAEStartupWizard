
#!/bin/bash

# Set environment variables to skip Playwright browser installation
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export SCRAPER_HTTP_ONLY_MODE=true

echo "Configuring for HTTP-only mode..."

# Create .npmrc file to ensure Playwright is never installed
echo "playwright_skip_browser_download=1" > .npmrc
echo "playwright_browser_path=0" >> .npmrc

echo -e "\n✅ Pre-deployment configuration complete\n"
