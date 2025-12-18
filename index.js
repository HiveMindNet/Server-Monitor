require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const { initializeAdmin, verifyUser, generateToken, authMiddleware } = require('./config/auth');
const { getServers, addServer, updateServer, deleteServer } = require('./config/servers');
const { monitorServer } = require('./services/awsMonitor');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: true,
  credentials: true
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize admin user on startup
initializeAdmin().catch(console.error);

// ============ Authentication Routes ============

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const user = await verifyUser(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = generateToken(user);
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.json({
      success: true,
      user: { id: user.id, username: user.username },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// Check auth status
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ============ Server Management Routes ============

// Get all servers
app.get('/api/servers', authMiddleware, (req, res) => {
  try {
    const servers = getServers();
    // Don't send sensitive data like private keys
    const safeServers = servers.map(({ privateKey, ...server }) => server);
    res.json({ servers: safeServers });
  } catch (error) {
    console.error('Error getting servers:', error);
    res.status(500).json({ error: 'Failed to get servers' });
  }
});

// Add server
app.post('/api/servers', authMiddleware, (req, res) => {
  try {
    const server = addServer(req.body);
    const { privateKey, ...safeServer } = server;
    res.json({ success: true, server: safeServer });
  } catch (error) {
    console.error('Error adding server:', error);
    res.status(500).json({ error: 'Failed to add server' });
  }
});

// Update server
app.put('/api/servers/:id', authMiddleware, (req, res) => {
  try {
    const server = updateServer(req.params.id, req.body);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    const { privateKey, ...safeServer } = server;
    res.json({ success: true, server: safeServer });
  } catch (error) {
    console.error('Error updating server:', error);
    res.status(500).json({ error: 'Failed to update server' });
  }
});

// Delete server
app.delete('/api/servers/:id', authMiddleware, (req, res) => {
  try {
    const success = deleteServer(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Server not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting server:', error);
    res.status(500).json({ error: 'Failed to delete server' });
  }
});

// ============ Monitoring Routes ============

// Get metrics for all servers
app.get('/api/monitor/all', authMiddleware, async (req, res) => {
  try {
    const servers = getServers();
    const results = await Promise.all(
      servers.map(server => monitorServer(server))
    );
    res.json({ servers: results });
  } catch (error) {
    console.error('Error monitoring servers:', error);
    res.status(500).json({ error: 'Failed to monitor servers' });
  }
});

// Get metrics for a specific server
app.get('/api/monitor/:id', authMiddleware, async (req, res) => {
  try {
    const servers = getServers();
    const server = servers.find(s => s.id === req.params.id);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    const result = await monitorServer(server);
    res.json(result);
  } catch (error) {
    console.error('Error monitoring server:', error);
    res.status(500).json({ error: 'Failed to monitor server' });
  }
});

// ============ Health Check ============

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server Monitor running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Access the dashboard at: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
