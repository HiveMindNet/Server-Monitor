const fs = require('fs');
const path = require('path');
const { getServers } = require('../config/servers');
const { monitorServer } = require('./awsMonitor');

const CACHE_FILE = path.join(__dirname, '../data/metrics-cache.json');
const MONITOR_INTERVAL = parseInt(process.env.MONITOR_INTERVAL || '30000'); // 30 seconds

let monitoringInterval = null;
let latestMetrics = { servers: [], lastUpdate: null };

// Load cached metrics on startup
function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      latestMetrics = JSON.parse(data);
      console.log('Loaded cached metrics from disk');
    }
  } catch (error) {
    console.error('Error loading metrics cache:', error.message);
  }
}

// Save metrics to cache
function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(latestMetrics, null, 2));
  } catch (error) {
    console.error('Error saving metrics cache:', error.message);
  }
}

// Run monitoring check
async function runMonitoring() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting background monitoring...`);
  
  try {
    const servers = getServers();
    
    if (servers.length === 0) {
      console.log('No servers configured for monitoring');
      latestMetrics = { servers: [], lastUpdate: new Date().toISOString() };
      saveCache();
      return;
    }
    
    // Monitor all servers in parallel
    const results = await Promise.all(
      servers.map(server => monitorServer(server).catch(err => ({
        id: server.id,
        name: server.name,
        status: 'error',
        error: err.message
      })))
    );
    
    latestMetrics = {
      servers: results,
      lastUpdate: new Date().toISOString()
    };
    
    // Save to disk
    saveCache();
    
    const duration = Date.now() - startTime;
    const issueCount = results.filter(s => s.status === 'error' || s.status === 'unreachable').length;
    
    console.log(`[${new Date().toISOString()}] Monitoring complete: ${results.length} servers checked in ${duration}ms (${issueCount} issues)`);
  } catch (error) {
    console.error('Error in background monitoring:', error);
  }
}

// Start background monitoring
function startBackgroundMonitoring() {
  if (monitoringInterval) {
    console.log('Background monitoring already running');
    return;
  }
  
  console.log(`Starting background monitoring (interval: ${MONITOR_INTERVAL}ms)`);
  
  // Load cached data
  loadCache();
  
  // Run immediately on start
  runMonitoring();
  
  // Then run on interval
  monitoringInterval = setInterval(runMonitoring, MONITOR_INTERVAL);
}

// Stop background monitoring
function stopBackgroundMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    console.log('Background monitoring stopped');
  }
}

// Get latest metrics
function getLatestMetrics() {
  return latestMetrics;
}

module.exports = {
  startBackgroundMonitoring,
  stopBackgroundMonitoring,
  getLatestMetrics,
  runMonitoring
};

