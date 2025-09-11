#!/bin/bash

# Generate thumbnail for pen_black_angled tool
TOOL_DIR="/Users/dudeja/scrribe animator/frontend/public/assets/tools/pen_black_angled"

echo "Generating thumbnail from image.png..."
echo "$TOOL_DIR/image.png"

# Use macOS sips to resize the tool image to create a thumbnail
sips -Z 200 "$TOOL_DIR/image.png" --out "$TOOL_DIR/thumbnail.png"

echo "Thumbnail generated successfully!"

# List the files in the directory
echo "Files in pen_black_angled directory:"
ls -la "$TOOL_DIR"
