const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Create necessary directories
const createDirs = async () => {
  const dirs = ['./data', './data/projects', './data/assets', './data/videos', './data/calibrations', './data/calibrations/hand_tool'];
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (err) {
      console.log(`Directory ${dir} already exists or error creating:`, err.message);
    }
  }
};

// Storage configuration for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './data/assets/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'Scribe Animator API' });
});

// Project CRUD operations
app.get('/api/projects', async (req, res) => {
  try {
    const projectsDir = './data/projects';
    const files = await fs.readdir(projectsDir);
    const projects = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(projectsDir, file), 'utf8');
        const project = JSON.parse(content);
        projects.push(project);
      }
    }
    
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const project = {
      id: Date.now().toString(),
      name: req.body.name || 'Untitled Project',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scenes: [],
      assets: [],
      settings: {
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 10
      }
    };
    
    await fs.writeFile(
      `./data/projects/${project.id}.json`,
      JSON.stringify(project, null, 2)
    );
    
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const content = await fs.readFile(`./data/projects/${req.params.id}.json`, 'utf8');
    const project = JSON.parse(content);
    res.json(project);
  } catch (error) {
    res.status(404).json({ error: 'Project not found' });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const project = req.body;
    project.updatedAt = new Date().toISOString();
    
    await fs.writeFile(
      `./data/projects/${req.params.id}.json`,
      JSON.stringify(project, null, 2)
    );
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    await fs.unlink(`./data/projects/${req.params.id}.json`);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Asset management endpoints
app.get('/api/assets', async (req, res) => {
  try {
    const assetsDir = './data/assets';
    const files = await fs.readdir(assetsDir);
    const assets = [];
    
    for (const file of files) {
      if (!file.startsWith('.')) {
        const filePath = path.join(assetsDir, file);
        const stats = await fs.stat(filePath);
        
        const asset = {
          id: file,
          filename: file,
          originalName: file.split('-').slice(1).join('-'), // Remove timestamp prefix
          path: `/api/assets/${file}`,
          size: stats.size,
          uploadedAt: stats.birthtime.toISOString(),
          category: 'custom'
        };
        
        assets.push(asset);
      }
    }
    
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load assets' });
  }
});

// Serve asset files
app.get('/api/assets/:filename', (req, res) => {
  const filePath = path.join('./data/assets', req.params.filename);
  res.sendFile(path.resolve(filePath));
});

// Asset upload
app.post('/api/upload', upload.single('asset'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const asset = {
    id: req.file.filename,
    originalName: req.file.originalname,
    filename: req.file.filename,
    path: `/api/assets/${req.file.filename}`,
    size: req.file.size,
    mimeType: req.file.mimetype,
    uploadedAt: new Date().toISOString(),
    category: 'custom'
  };
  
  res.json(asset);
});

// Upload hand/tool assets with specific names (overwrites existing)
app.post('/api/upload-hand-asset', upload.single('asset'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const { assetType } = req.body; // 'hand_bg', 'hand_fg', 'tool'
  const validTypes = ['hand_bg', 'hand_fg', 'tool'];
  
  if (!validTypes.includes(assetType)) {
    return res.status(400).json({ error: 'Invalid asset type. Must be: hand_bg, hand_fg, or tool' });
  }
  
  try {
    const targetPath = path.join('./data/assets/', `${assetType}.png`);
    
    // Move uploaded file to specific name
    await fs.rename(req.file.path, targetPath);
    
    const asset = {
      id: `${assetType}.png`,
      originalName: req.file.originalname,
      filename: `${assetType}.png`,
      path: `/api/assets/${assetType}.png`,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      category: 'hand-tool',
      assetType
    };
    
    res.json(asset);
  } catch (error) {
    console.error('Error saving hand asset:', error);
    res.status(500).json({ error: 'Failed to save hand asset' });
  }
});

// Delete asset
app.delete('/api/assets/:filename', async (req, res) => {
  try {
    const filePath = path.join('./data/assets', req.params.filename);
    await fs.unlink(filePath);
    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// Rename asset (update originalName in metadata)
app.put('/api/assets/:id/rename', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // In a real implementation, you'd store metadata in a database
    // For now, we'll just return success since filename stays the same
    res.json({ message: 'Asset renamed successfully', name: name.trim() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rename asset' });
  }
});

// Video rendering endpoint (placeholder for now)
app.post('/api/render/:id', async (req, res) => {
  try {
    // This will be implemented with Puppeteer + FFmpeg
    res.json({ 
      message: 'Video rendering started', 
      jobId: `job-${Date.now()}`,
      status: 'processing' 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start rendering' });
  }
});

// Calibration persistence (hand + tool pair)
// Files stored at ./data/calibrations/hand_tool/<handId>__<toolId>.json
app.get('/api/calibration/hand-tool/:handId/:toolId', async (req, res) => {
  try {
    const { handId, toolId } = req.params;
    const file = path.join('./data/calibrations/hand_tool', `${handId}__${toolId}.json`);
    const data = await fs.readFile(file, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    // Return 200 with exists:false so the frontend doesn't get red 404 noise
    return res.status(200).json({ exists: false });
  }
});

app.post('/api/calibration/hand-tool', async (req, res) => {
  try {
    const { handId, toolId, calibration } = req.body || {};
    if (!handId || !toolId || typeof calibration !== 'object') {
      return res.status(400).json({ error: 'handId, toolId and calibration object are required' });
    }
    const safeHand = String(handId).replace(/[^a-zA-Z0-9_\-]/g, '');
    const safeTool = String(toolId).replace(/[^a-zA-Z0-9_\-]/g, '');
    const file = path.join('./data/calibrations/hand_tool', `${safeHand}__${safeTool}.json`);
    const payload = {
      handId: safeHand,
      toolId: safeTool,
      savedAt: new Date().toISOString(),
      version: 1,
      ...calibration,
    };
    await fs.writeFile(file, JSON.stringify(payload, null, 2), 'utf8');
    res.json(payload);
  } catch (err) {
    console.error('Failed to save calibration', err);
    return res.status(500).json({ error: 'Failed to save calibration' });
  }
});

// Initialize and start server
const startServer = async () => {
  await createDirs();
  app.listen(PORT, () => {
    console.log(`Scribe Animator API running on port ${PORT}`);
  });
};

startServer().catch(console.error);
