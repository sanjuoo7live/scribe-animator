# Hand with Wrist - Setup Instructions

## ✅ Completed:
1. Created `/frontend/public/assets/hands/hand_with_wrist/` directory
2. Added `preset.json` with proper configuration for a right-handed photoreal hand with wrist
3. Copied `tool.png` from pen_black_slim tool
4. Updated `index.json` to include the new hand preset
5. Created thumbnail generation script

## 📋 TODO - Manual Steps Required:

### Step 1: Save the Hand Images
You need to manually save the attached images to:

**First Image (horizontal hand):**
```
/Users/dudeja/scrribe animator/frontend/public/assets/hands/hand_with_wrist/bg.png
```

**Second Image (grasping hand):**
```
/Users/dudeja/scrribe animator/frontend/public/assets/hands/hand_with_wrist/fg.png
```

### Step 2: Generate Thumbnail
After saving the images, run:
```bash
cd "/Users/dudeja/scrribe animator"
./generate_hand_wrist_thumbnail.sh
```

### Step 3: Test the New Hand Preset
1. Restart your frontend dev server if needed
2. Open the Hand & Tool Selector
3. Look for "Right · Photoreal · Medium · Wrist" in the hand library

## 🔧 Configuration Details:
- **Hand Type**: Right-handed with wrist extended
- **Style**: Photoreal
- **Skin Tone**: Medium
- **Tool**: Black pen (copied from pen_black_slim)
- **Anchors**: Configured for wrist at (400, 950) and grip at (250, 350)

## 📂 Final Directory Structure:
```
hand_with_wrist/
├── bg.png          # Background hand image (you need to add)
├── fg.png          # Foreground hand image (you need to add)  
├── tool.png        # Tool image (✅ added)
├── preset.json     # Configuration (✅ added)
└── thumbnail.png   # Generated thumbnail (run script)
```

## ⚙️ Anchor Point Calibration:
The anchor points in preset.json are estimated. You may need to use the calibration modal to fine-tune:
- Wrist anchor: Currently set to (400, 950)
- Grip anchor: Currently set to (250, 350)
- Tool tip: Currently set to (120, 200)

These can be adjusted through the Hand Follower Calibration modal once the preset is loaded.
