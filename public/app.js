// State
let currentUser = null;
let servers = [];
let containers = [];
let refreshInterval = null;

// Constants (hardcoded for browser)
const CPU_THRESHOLD = 80;
const RAM_THRESHOLD = 80;
const DISK_THRESHOLD = 90;
const MONITOR_INTERVAL = 30000;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Login form
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    
    // Logout button
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    
    // Add server button
    document.getElementById('add-server-btn')?.addEventListener('click', openAddServerModal);
    
    // Add server form
    document.getElementById('add-server-form')?.addEventListener('submit', handleAddServer);
    
    // Refresh button
    document.getElementById('refresh-btn')?.addEventListener('click', loadServers);
}

// Check authentication status
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            showDashboard();
            loadServers();
            startAutoRefresh();
        } else {
            showLogin();
        }
    } catch (error) {
        showLogin();
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            showDashboard();
            loadServers();
            startAutoRefresh();
        } else {
            errorDiv.textContent = data.error || 'Login failed';
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please try again.';
    }
}

// Handle logout
async function handleLogout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    stopAutoRefresh();
    currentUser = null;
    showLogin();
}

// Show login screen
function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('dashboard-screen').classList.add('hidden');
}

// Show dashboard
function showDashboard() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard-screen').classList.remove('hidden');
    document.getElementById('username-display').textContent = currentUser.username;
}

// Load servers
async function loadServers() {
    try {
        const response = await fetch('/api/monitor/all', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showLogin();
                return;
            }
            throw new Error('Failed to load servers');
        }
        
        const data = await response.json();
        servers = data.servers || [];
        containers = data.containers || [];
        renderServers();
        renderContainers();
        updateStats();
        updateLastUpdated();
    } catch (error) {
        console.error('Error loading servers:', error);
    }
}

// Render servers
function renderServers() {
    const container = document.getElementById('servers-container');
    const noServers = document.getElementById('no-servers');
    
    if (servers.length === 0) {
        container.innerHTML = '';
        noServers.classList.remove('hidden');
        return;
    }
    
    noServers.classList.add('hidden');
    
    container.innerHTML = servers.map(server => {
        const hasIssues = checkForIssues(server);
        const cardClass = hasIssues.critical ? 'error' : hasIssues.warning ? 'warning' : '';
        
        return `
            <div class="server-card ${cardClass}">
                <div class="server-header">
                    <div class="server-name">${escapeHtml(server.name)}</div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="server-status ${getStatusClass(server.status)}">
                            ${server.status}
                        </div>
                        <button class="delete-btn" onclick="deleteServer('${server.id}')" title="Delete server">🗑️</button>
                    </div>
                </div>
                
                ${server.metrics ? renderMetrics(server.metrics) : ''}
                ${server.error ? `<div style="color: var(--danger); margin-top: 10px;">⚠️ ${escapeHtml(server.error)}</div>` : ''}
                
                ${server.details ? `
                    <div class="server-info">
                        ${server.details.instanceId ? `<div>Instance ID: ${escapeHtml(server.details.instanceId)}</div>` : ''}
                        ${server.details.type ? `<div>Type: ${escapeHtml(server.details.type)}</div>` : ''}
                        ${server.details.publicIp ? `<div>Public IP: ${escapeHtml(server.details.publicIp)}</div>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Render metrics
function renderMetrics(metrics) {
    if (!metrics) return '';
    
    return `
        <div class="server-metrics">
            ${renderMetric('CPU Usage', metrics.cpu, '%', 80, 95)}
            ${renderMetric('RAM Usage', metrics.ram, '%', 80, 90)}
            ${renderMetric('Disk Usage', metrics.disk, '%', 80, 90)}
            ${metrics.diskTotal && metrics.diskTotal !== 'N/A' ? `
                <div style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 10px;">
                    💾 ${metrics.diskUsed} used / ${metrics.diskTotal} total (${metrics.diskFree} free)
                </div>
            ` : ''}
        </div>
    `;
}

// Render individual metric
function renderMetric(label, value, unit, warningThreshold, criticalThreshold) {
    if (value === 'N/A') {
        return `
            <div class="metric">
                <div class="metric-header">
                    <span class="metric-label">${label}</span>
                    <span class="metric-value">${value}</span>
                </div>
            </div>
        `;
    }
    
    const numValue = parseFloat(value);
    const status = numValue >= criticalThreshold ? 'critical' : 
                   numValue >= warningThreshold ? 'warning' : 'normal';
    
    return `
        <div class="metric">
            <div class="metric-header">
                <span class="metric-label">${label}</span>
                <span class="metric-value ${status}">${value}${unit}</span>
            </div>
            <div class="metric-bar">
                <div class="metric-fill ${status}" style="width: ${Math.min(numValue, 100)}%"></div>
            </div>
        </div>
    `;
}

// Check for issues
function checkForIssues(server) {
    if (!server.metrics) return { critical: false, warning: false };
    
    const cpu = parseFloat(server.metrics.cpu);
    const ram = parseFloat(server.metrics.ram);
    const disk = parseFloat(server.metrics.disk);
    
    const critical = cpu >= 95 || ram >= 90 || disk >= 90;
    const warning = cpu >= 80 || ram >= 80 || disk >= 80;
    
    return { critical, warning };
}

// Get status class
function getStatusClass(status) {
    if (status === 'running') return 'running';
    if (status === 'stopped') return 'stopped';
    return 'error';
}

// Render containers
function renderContainers() {
    const container = document.getElementById('containers-list');
    const noContainers = document.getElementById('no-containers');
    
    if (!container) return; // Element might not exist yet
    
    if (containers.length === 0) {
        container.innerHTML = '';
        if (noContainers) noContainers.classList.remove('hidden');
        return;
    }
    
    if (noContainers) noContainers.classList.add('hidden');
    
    container.innerHTML = containers.map(cont => {
        const statusClass = cont.state === 'running' ? 'running' : 
                          cont.state === 'exited' ? 'stopped' : 'error';
        
        return `
            <div class="container-item">
                <div class="container-info">
                    <div class="container-name">🐳 ${escapeHtml(cont.name)}</div>
                    <div class="container-details">
                        <span style="color: var(--text-secondary); font-size: 0.85rem;">${escapeHtml(cont.image)}</span>
                        ${cont.stats ? `
                            <div style="display: flex; gap: 15px; margin-top: 8px; font-size: 0.9rem;">
                                <span style="color: var(--text-secondary);">CPU: <span style="color: ${parseFloat(cont.stats.cpu) > 80 ? 'var(--warning)' : 'var(--success)'}; font-weight: 600;">${cont.stats.cpu}%</span></span>
                                <span style="color: var(--text-secondary);">MEM: <span style="color: ${parseFloat(cont.stats.memory) > 80 ? 'var(--warning)' : 'var(--success)'}; font-weight: 600;">${cont.stats.memory}%</span></span>
                                <span style="color: var(--text-secondary);">${cont.stats.memoryUsage}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="server-status ${statusClass}">
                    ${cont.state}
                </div>
            </div>
        `;
    }).join('');
}

// Update stats
function updateStats() {
    const total = servers.length;
    const running = servers.filter(s => s.status === 'running').length;
    const issues = servers.filter(s => checkForIssues(s).warning || checkForIssues(s).critical).length;
    
    // Add container stats
    const containerIssues = containers.filter(c => c.state !== 'running').length;
    const totalIssues = issues + containerIssues;
    
    document.getElementById('total-servers').textContent = total;
    document.getElementById('running-servers').textContent = running;
    document.getElementById('issue-servers').textContent = totalIssues;
}

// Update last updated time
function updateLastUpdated() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    document.getElementById('last-updated').textContent = timeString;
}

// Auto refresh
function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    refreshInterval = setInterval(loadServers, 30000); // Refresh every 30 seconds
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Modal functions
function openAddServerModal() {
    document.getElementById('add-server-modal').classList.remove('hidden');
}

function closeAddServerModal() {
    document.getElementById('add-server-modal').classList.add('hidden');
    document.getElementById('add-server-form').reset();
}

// Handle add server
async function handleAddServer(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const serverData = {
        name: formData.get('name'),
        instanceId: formData.get('instanceId') || null,
        host: formData.get('host'),
        username: formData.get('username'),
        privateKey: formData.get('privateKey')
    };
    
    try {
        const response = await fetch('/api/servers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(serverData)
        });
        
        if (response.ok) {
            closeAddServerModal();
            loadServers();
        } else {
            const data = await response.json();
            alert('Error: ' + (data.error || 'Failed to add server'));
        }
    } catch (error) {
        alert('Connection error. Please try again.');
        console.error('Error adding server:', error);
    }
}

// Delete server
async function deleteServer(serverId) {
    if (!confirm('Are you sure you want to delete this server? This cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/servers/${serverId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            loadServers(); // Refresh the list
        } else {
            const data = await response.json();
            alert('Error: ' + (data.error || 'Failed to delete server'));
        }
    } catch (error) {
        alert('Connection error. Please try again.');
        console.error('Error deleting server:', error);
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

