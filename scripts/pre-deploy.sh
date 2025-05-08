
#!/bin/bash
# Pre-deployment setup script

echo "Configuring for HTTP-only mode..."

# Ensure dist directory exists
mkdir -p dist

# Create production HTTP-only entry point
cat > dist/production-http-only.js << 'EOF'
import { app } from './index.js';

const HOST = '0.0.0.0';
const PORT = process.env.PORT || 5000;

app.listen(PORT, HOST, () => {
  console.log(`Production server running on ${HOST}:${PORT}`);
});
EOF

echo "✅ Created production HTTP-only entry point"
echo "✅ Pre-deployment configuration complete"
