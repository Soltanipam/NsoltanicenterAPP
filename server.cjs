// Express server for handling API requests to Google Sheets and Drive
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

// Import API routes from compiled JavaScript files
const { loginUser, checkConnection } = require('./dist-server/api/routes/auth');
const { getUsers, createUser, updateUser, deleteUser } = require('./dist-server/api/routes/users');
const { getCustomers, createCustomer, updateCustomer, deleteCustomer } = require('./dist-server/api/routes/customers');
const { getReceptions, createReception, updateReception, deleteReception } = require('./dist-server/api/routes/receptions');
const { getTasks, createTask, updateTask, deleteTask } = require('./dist-server/api/routes/tasks');
const { getMessages, createMessage, updateMessage, deleteMessage } = require('./dist-server/api/routes/messages');
const { uploadFile, uploadMultipleFiles, deleteFile } = require('./dist-server/api/routes/upload');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'نام کاربری و رمز عبور الزامی است' 
      });
    }

    const result = await loginUser(username, password);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('Login API error:', error);
    res.status(500).json({ 
      success: false, 
      error: `خطای سرور: ${error.message}` 
    });
  }
});

app.get('/api/auth/check-connection', async (req, res) => {
  try {
    const result = await checkConnection();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(503).json(result);
    }
  } catch (error) {
    console.error('Connection check API error:', error);
    res.status(500).json({ 
      success: false, 
      connected: false,
      error: `خطای سرور: ${error.message}` 
    });
  }
});

// User routes
app.get('/api/users', async (req, res) => {
  try {
    const result = await getUsers();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const result = await createUser(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const result = await updateUser(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const result = await deleteUser(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Customer routes
app.get('/api/customers', async (req, res) => {
  try {
    const result = await getCustomers();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const result = await createCustomer(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const result = await updateCustomer(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    const result = await deleteCustomer(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reception routes
app.get('/api/receptions', async (req, res) => {
  try {
    const result = await getReceptions();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/receptions', async (req, res) => {
  try {
    const result = await createReception(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/receptions/:id', async (req, res) => {
  try {
    const result = await updateReception(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/receptions/:id', async (req, res) => {
  try {
    const result = await deleteReception(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Task routes
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await getTasks();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const result = await createTask(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const result = await updateTask(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const result = await deleteTask(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Message routes
app.get('/api/messages', async (req, res) => {
  try {
    const result = await getMessages();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const result = await createMessage(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/messages/:id', async (req, res) => {
  try {
    const result = await updateMessage(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/messages/:id', async (req, res) => {
  try {
    const result = await deleteMessage(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// File upload routes
app.post('/api/upload/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    const result = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      req.body.folderName
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/upload/files', upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files provided' });
    }

    const files = req.files.map(file => ({
      buffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype
    }));

    const result = await uploadMultipleFiles(files, req.body.folderName);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/upload/file/:fileId', async (req, res) => {
  try {
    const result = await deleteFile(req.params.fileId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'خطای داخلی سرور' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
  console.log(`🌐 Frontend proxy configured for development`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});