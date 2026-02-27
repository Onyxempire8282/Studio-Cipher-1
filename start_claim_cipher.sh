#!/bin/bash

echo "Starting Claim Cipher Application Server..."
echo ""

# Navigate to the application directory
cd "$(dirname "$0")/claim_cipher_app"

echo "Access your application at: http://localhost:5500"
echo "Press Ctrl+C to stop the server"
echo ""

# Start the Python HTTP server
python3 -m http.server 5500
