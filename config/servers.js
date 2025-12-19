const fs = require('fs');
const path = require('path');

const SERVERS_FILE = path.join(__dirname, '../data/servers.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize servers file if it doesn't exist
if (!fs.existsSync(SERVERS_FILE)) {
  fs.writeFileSync(SERVERS_FILE, JSON.stringify({ servers: [] }));
}

// Load servers
function loadServers() {
  try {
    const data = fs.readFileSync(SERVERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { servers: [] };
  }
}

// Save servers
function saveServers(data) {
  fs.writeFileSync(SERVERS_FILE, JSON.stringify(data, null, 2));
}

// Get all servers
function getServers() {
  return loadServers().servers;
}

// Add server
function addServer(server) {
  const data = loadServers();
  const newServer = {
    id: Date.now().toString(),
    ...server,
    createdAt: new Date().toISOString()
  };
  data.servers.push(newServer);
  saveServers(data);
  return newServer;
}

// Update server
function updateServer(id, updates) {
  const data = loadServers();
  const index = data.servers.findIndex(s => s.id === id);
  
  if (index === -1) {
    return null;
  }
  
  data.servers[index] = { ...data.servers[index], ...updates };
  saveServers(data);
  return data.servers[index];
}

// Delete server
function deleteServer(id) {
  const data = loadServers();
  const index = data.servers.findIndex(s => s.id === id);
  
  if (index === -1) {
    return false;
  }
  
  data.servers.splice(index, 1);
  saveServers(data);
  return true;
}

module.exports = {
  getServers,
  addServer,
  updateServer,
  deleteServer
};



