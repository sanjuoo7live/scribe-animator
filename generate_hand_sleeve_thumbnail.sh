#!/bin/bash

# Generate thumbnail for hand_with_sleeve preset
PRESET_DIR="/Users/dudeja/scrribe animator/frontend/public/assets/hands/hand_with_sleeve"

echo "Generating thumbnail from bg.png..."
echo "$PRESET_DIR/bg.png"

# Use macOS sips to resize the background image to create a thumbnail
sips -Z 200 "$PRESET_DIR/bg.png" --out "$PRESET_DIR/thumbnail.png"

echo "Thumbnail generated successfully!"

# List the files in the directory
echo "Files in hand_with_sleeve directory:"
ls -la "$PRESET_DIR"
