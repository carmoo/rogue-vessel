#!/bin/bash
# Simple local server for AI Arena
# Run this script, then open http://localhost:8080 in your browser
cd "$(dirname "$0")"
echo "🎮 AI Arena server running at: http://localhost:8080"
echo "Press Ctrl+C to stop"
python3 -m http.server 8080
