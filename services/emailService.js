const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Path to store email alert state
const ALERT_STATE_PATH = path.join(__dirname, '..', 'data', 'alert-state.json');

// Initialize alert state tracking
let alertState = {};
try {
    if (fs.existsSync(ALERT_STATE_PATH)) {
        alertState = JSON.parse(fs.readFileSync(ALERT_STATE_PATH, 'utf8'));
    }
} catch (error) {
    console.error('Error loading alert state:', error);
    alertState = {};
}

// Save alert state to disk
function saveAlertState() {
    try {
        fs.writeFileSync(ALERT_STATE_PATH, JSON.stringify(alertState, null, 2));
    } catch (error) {
        console.error('Error saving alert state:', error);
    }
}

// Create reusable transporter
function createTransporter() {
    const config = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    };

    return nodemailer.createTransport(config);
}

// Check if email is configured
function isEmailConfigured() {
    return !!(
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS &&
        process.env.ALERT_EMAIL_TO
    );
}

// Send test email
async function sendTestEmail() {
    if (!isEmailConfigured()) {
        throw new Error('Email not configured. Please set SMTP settings in environment variables.');
    }

    const transporter = createTransporter();
    
    const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: process.env.ALERT_EMAIL_TO,
        subject: '✅ Server Monitor - Test Email',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">✅ Test Email Successful</h1>
                </div>
                
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
                    <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                        Your email notifications are configured correctly!
                    </p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                        <h3 style="margin-top: 0; color: #059669;">Configuration Details:</h3>
                        <p style="margin: 5px 0; color: #64748b;">
                            <strong>SMTP Host:</strong> ${process.env.SMTP_HOST}<br>
                            <strong>SMTP Port:</strong> ${process.env.SMTP_PORT || '587'}<br>
                            <strong>From:</strong> ${process.env.SMTP_FROM || process.env.SMTP_USER}<br>
                            <strong>To:</strong> ${process.env.ALERT_EMAIL_TO}
                        </p>
                    </div>
                    
                    <p style="font-size: 14px; color: #64748b; margin-top: 20px;">
                        You will now receive alerts when servers reach <strong>Warning</strong>, <strong>Critical</strong>, or <strong>Down</strong> states.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    
                    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
                        HiveMind Server Monitor<br>
                        ${new Date().toLocaleString()}
                    </p>
                </div>
            </div>
        `
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
}

// Send alert email for critical issues
async function sendAlertEmail(alerts) {
    if (!isEmailConfigured()) {
        console.log('Email not configured, skipping alert email');
        return null;
    }

    if (!alerts || alerts.length === 0) {
        return null;
    }

    const transporter = createTransporter();
    
    // Determine severity level
    const hasDown = alerts.some(a => a.severity === 'down');
    const hasCritical = alerts.some(a => a.severity === 'critical');
    const hasWarning = alerts.some(a => a.severity === 'warning');
    
    let subject, emoji, color;
    if (hasDown) {
        subject = '🚨 URGENT: Server(s) Down';
        emoji = '🚨';
        color = '#64748b';
    } else if (hasCritical) {
        subject = '🔥 CRITICAL: Server Alert';
        emoji = '🔥';
        color = '#dc2626';
    } else if (hasWarning) {
        subject = '⚠️ WARNING: Server Alert';
        emoji = '⚠️';
        color = '#f59e0b';
    } else {
        return null; // No alerts to send
    }

    // Generate alert rows
    const alertRows = alerts.map(alert => {
        const icon = alert.type === 'container' ? '🐳' : '🖥️';
        const statusEmoji = alert.severity === 'down' ? '❌' : 
                           alert.severity === 'critical' ? '🔥' : '⚠️';
        
        return `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
                    <strong style="color: #1e293b;">${icon} ${alert.name}</strong>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
                    <span style="background: ${color}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                        ${statusEmoji} ${alert.status}
                    </span>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
                    ${alert.message}
                </td>
            </tr>
        `;
    }).join('');

    const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: process.env.ALERT_EMAIL_TO,
        subject: subject,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: ${color}; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">${emoji} ${subject}</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">
                        ${new Date().toLocaleString()}
                    </p>
                </div>
                
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
                    <p style="font-size: 16px; color: #334155; margin-top: 0;">
                        The following systems require immediate attention:
                    </p>
                    
                    <table style="width: 100%; background: white; border-radius: 8px; overflow: hidden; margin: 20px 0;">
                        <thead>
                            <tr style="background: #f1f5f9;">
                                <th style="padding: 12px; text-align: left; color: #475569; font-size: 14px;">System</th>
                                <th style="padding: 12px; text-align: left; color: #475569; font-size: 14px;">Status</th>
                                <th style="padding: 12px; text-align: left; color: #475569; font-size: 14px;">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${alertRows}
                        </tbody>
                    </table>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${color};">
                        <h3 style="margin-top: 0; color: #1e293b;">Recommended Actions:</h3>
                        <ul style="color: #64748b; line-height: 1.8; margin-bottom: 0;">
                            ${hasDown ? '<li><strong>Check connectivity</strong> - Verify servers are online and accessible</li>' : ''}
                            ${hasCritical ? '<li><strong>Check disk space</strong> - Free up storage if disk is at 90%+</li>' : ''}
                            ${hasCritical ? '<li><strong>Check memory usage</strong> - Restart services or upgrade RAM if needed</li>' : ''}
                            ${hasWarning ? '<li><strong>Monitor trends</strong> - Watch for escalating resource usage</li>' : ''}
                            <li><strong>Review logs</strong> - Check application and system logs for errors</li>
                        </ul>
                    </div>
                    
                    <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
                        <a href="https://server-monitor.grid.hivemindnetwork.com" 
                           style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                            View Dashboard
                        </a>
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    
                    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
                        HiveMind Server Monitor Alert System<br>
                        You will not receive duplicate alerts for the same issue unless it resolves and occurs again.
                    </p>
                </div>
            </div>
        `
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
}

// Check if we should send an alert (prevent spam)
function shouldSendAlert(itemId, severity) {
    const key = `${itemId}_${severity}`;
    const lastAlert = alertState[key];
    
    // If we haven't sent this alert before, or it was resolved, send it
    if (!lastAlert || lastAlert.resolved) {
        return true;
    }
    
    // Don't send duplicate alerts within 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    if (lastAlert.timestamp > oneHourAgo) {
        return false;
    }
    
    return true;
}

// Mark alert as sent
function markAlertSent(itemId, severity) {
    const key = `${itemId}_${severity}`;
    alertState[key] = {
        timestamp: Date.now(),
        resolved: false
    };
    saveAlertState();
}

// Mark alert as resolved
function markAlertResolved(itemId, severity) {
    const key = `${itemId}_${severity}`;
    if (alertState[key]) {
        alertState[key].resolved = true;
        saveAlertState();
    }
}

// Process monitoring data and send alerts if needed
async function checkAndSendAlerts(servers, containers) {
    if (!isEmailConfigured()) {
        return;
    }

    const alerts = [];
    const resolvedAlerts = [];
    
    // Check servers
    for (const server of servers) {
        const serverId = server.id;
        let severity = null;
        let status = 'Healthy';
        let message = '';
        
        if (server.status !== 'running') {
            severity = 'down';
            status = 'Down';
            message = 'Server is not responding';
        } else if (server.metrics) {
            const cpu = parseFloat(server.metrics.cpu);
            const ram = parseFloat(server.metrics.ram);
            const disk = parseFloat(server.metrics.disk);
            
            // Check for critical
            if (disk >= 90 || ram >= 95 || (cpu >= 100 && ram >= 90)) {
                severity = 'critical';
                status = 'Critical';
                const issues = [];
                if (disk >= 90) issues.push(`Disk: ${disk.toFixed(1)}%`);
                if (ram >= 95) issues.push(`RAM: ${ram.toFixed(1)}%`);
                if (cpu >= 100) issues.push(`CPU: ${cpu.toFixed(1)}%`);
                message = issues.join(', ');
            }
            // Check for warning
            else if ((ram >= 90 && ram < 95) || (cpu >= 95 && ram >= 80) || (disk >= 85 && ram >= 80)) {
                severity = 'warning';
                status = 'Warning';
                const issues = [];
                if (ram >= 90) issues.push(`RAM: ${ram.toFixed(1)}%`);
                if (cpu >= 95) issues.push(`CPU: ${cpu.toFixed(1)}%`);
                if (disk >= 85) issues.push(`Disk: ${disk.toFixed(1)}%`);
                message = issues.join(', ');
            }
        }
        
        if (severity) {
            if (shouldSendAlert(serverId, severity)) {
                alerts.push({
                    type: 'server',
                    id: serverId,
                    name: server.displayName || server.name || server.host,
                    severity,
                    status,
                    message
                });
                markAlertSent(serverId, severity);
            }
        } else {
            // Mark as resolved if it was previously in alert state
            ['down', 'critical', 'warning'].forEach(sev => {
                const key = `${serverId}_${sev}`;
                if (alertState[key] && !alertState[key].resolved) {
                    markAlertResolved(serverId, sev);
                    resolvedAlerts.push(serverId);
                }
            });
        }
    }
    
    // Check containers
    for (const container of containers || []) {
        const containerId = container.id;
        let severity = null;
        let status = 'Healthy';
        let message = '';
        
        if (container.state !== 'running') {
            severity = 'down';
            status = 'Down';
            message = `Container state: ${container.state}`;
        } else if (container.stats) {
            const cpu = parseFloat(container.stats.cpu);
            const mem = parseFloat(container.stats.memory);
            
            // Check for critical
            if (mem >= 95 || (cpu >= 100 && mem >= 90)) {
                severity = 'critical';
                status = 'Critical';
                const issues = [];
                if (mem >= 95) issues.push(`Memory: ${mem.toFixed(1)}%`);
                if (cpu >= 100) issues.push(`CPU: ${cpu.toFixed(1)}%`);
                message = issues.join(', ');
            }
            // Check for warning
            else if ((mem >= 90 && mem < 95) || (cpu >= 95 && mem >= 80)) {
                severity = 'warning';
                status = 'Warning';
                const issues = [];
                if (mem >= 90) issues.push(`Memory: ${mem.toFixed(1)}%`);
                if (cpu >= 95) issues.push(`CPU: ${cpu.toFixed(1)}%`);
                message = issues.join(', ');
            }
        }
        
        if (severity) {
            if (shouldSendAlert(containerId, severity)) {
                alerts.push({
                    type: 'container',
                    id: containerId,
                    name: container.displayName || container.name,
                    severity,
                    status,
                    message
                });
                markAlertSent(containerId, severity);
            }
        } else {
            // Mark as resolved
            ['down', 'critical', 'warning'].forEach(sev => {
                const key = `${containerId}_${sev}`;
                if (alertState[key] && !alertState[key].resolved) {
                    markAlertResolved(containerId, sev);
                    resolvedAlerts.push(containerId);
                }
            });
        }
    }
    
    // Send alerts if any
    if (alerts.length > 0) {
        try {
            await sendAlertEmail(alerts);
            console.log(`✅ Sent alert email for ${alerts.length} issue(s)`);
        } catch (error) {
            console.error('Error sending alert email:', error);
        }
    }
}

module.exports = {
    isEmailConfigured,
    sendTestEmail,
    sendAlertEmail,
    checkAndSendAlerts
};

