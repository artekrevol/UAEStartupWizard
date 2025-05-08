
#!/bin/bash

echo "Configuring for HTTP-only mode..."

# Create HTTP-only marker file
touch .http-only-mode
echo $(date -u) > .http-only-mode

# Set environment variables for build
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export SCRAPER_HTTP_ONLY_MODE=true
export NODE_ENV=production

# Create .npmrc to prevent Playwright installation
echo "playwright_skip_browser_download=1" > .npmrc
echo "playwright_browser_path=0" >> .npmrc

echo -e "\n✅ Pre-deployment configuration complete\n"
