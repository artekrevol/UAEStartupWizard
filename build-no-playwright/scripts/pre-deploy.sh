
#!/bin/bash
# Pre-deployment script

# Ensure HTTP-only mode is used
echo "Configuring for HTTP-only mode..."
export SCRAPER_HTTP_ONLY_MODE=true
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Create screenshots directory (if needed by HTTP-only scraper)
mkdir -p screenshots

echo "✅ Pre-deployment configuration complete"
