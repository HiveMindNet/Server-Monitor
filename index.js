require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const { initializeAdmin, verifyUser, generateToken, authMiddleware } = require('./config/auth');
const { getServers, addServer, updateServer, deleteServer } = require('./config/servers');
const { monitorServer } = require('./services/awsMonitor');
const { startBackgroundMonitoring, getLatestMetrics } = require('./services/backgroundMonitor');

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

// Start background monitoring
startBackgroundMonitoring();

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

// Get metrics for all servers (uses cached data from background monitoring)
app.get('/api/monitor/all', authMiddleware, async (req, res) => {
  try {
    const metrics = getLatestMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// Get metrics for a specific server (uses cached data)
app.get('/api/monitor/:id', authMiddleware, async (req, res) => {
  try {
    const metrics = getLatestMetrics();
    const server = metrics.servers.find(s => s.id === req.params.id);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    res.json(server);
  } catch (error) {
    console.error('Error getting server metrics:', error);
    res.status(500).json({ error: 'Failed to get server metrics' });
  }
});

// ============ Public Status Page ============

// Public status endpoint (no authentication required)
app.get('/api/status/public', (req, res) => {
  try {
    const metrics = getLatestMetrics();
    // Don't expose sensitive server details in public view
    const publicData = {
      servers: metrics.servers.map(server => ({
        id: server.id,
        name: server.name,
        status: server.status,
        metrics: server.metrics,
        error: server.error
      })),
      lastUpdate: metrics.lastUpdate
    };
    res.json(publicData);
  } catch (error) {
    console.error('Error getting public status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Serve public status page
app.get('/status', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'status.html'));
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
