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
  const dirs = ['./data', './data/projects', './data/assets', './data/videos'];
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

// Initialize and start server
const startServer = async () => {
  await createDirs();
  app.listen(PORT, () => {
    console.log(`Scribe Animator API running on port ${PORT}`);
  });
};

startServer().catch(console.error);
