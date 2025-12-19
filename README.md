# Server Monitor

A comprehensive AWS EC2 server monitoring application with authentication, real-time metrics tracking, and visual alerts for CPU, RAM, and disk usage.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Node](https://img.shields.io/badge/node-18+-green)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- 🔐 **Secure Authentication** - JWT-based authentication with bcrypt password hashing
- 🖥️ **AWS EC2 Integration** - Monitor EC2 instances via CloudWatch and SSH
- 🐳 **Docker Monitoring** - Monitor Docker containers on the host
- 📊 **Real-time Metrics** - Track CPU, RAM, and disk usage with auto-refresh
- 🔄 **Background Monitoring** - Continuous monitoring even when logged out
- 📄 **Public Status Page** - Share server status without authentication
- 📧 **Email Alerts** - Automatic notifications for critical issues (NEW!)
- 🚨 **Smart Status System** - 5-state system that's backup-aware
- 🎨 **Beautiful UI** - Modern, responsive dashboard with dark theme
- 🐳 **Docker Ready** - Fully containerized with automated CI/CD
- 🔄 **Auto-deployment** - GitHub Actions workflow for GHCR

## Quick Start

### Prerequisites

- Node.js 18+ or Docker
- AWS Account with EC2 access (optional)
- SSH access to your servers

### Local Development

1. **Clone and install dependencies:**
```bash
git clone https://github.com/HiveMindNet/Server-Monitor.git
cd Server-Monitor
npm install
```

2. **Create environment file:**
```bash
cp .env.example .env
```

3. **Configure environment variables:**
Edit `.env` and set:
- `ADMIN_USERNAME` and `ADMIN_PASSWORD` (for initial login)
- AWS credentials (if monitoring EC2 instances)
- Other configuration as needed

4. **Start the server:**
```bash
npm start
```

5. **Access the dashboard:**
Open http://localhost:3000 and login with your admin credentials

### Docker Deployment

```bash
docker pull ghcr.io/hivemindnet/Server-Monitor:latest

docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your-secure-password \
  -e AWS_ACCESS_KEY_ID=your-key \
  -e AWS_SECRET_ACCESS_KEY=your-secret \
  -e AWS_REGION=us-east-1 \
  ghcr.io/hivemindnet/Server-Monitor:latest
```

## Configuration

### Environment Variables

#### Core Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | production |
| `ADMIN_USERNAME` | Initial admin username | admin |
| `ADMIN_PASSWORD` | Initial admin password | admin123 |
| `JWT_SECRET` | JWT signing secret | random |
| `SESSION_SECRET` | Session encryption key | random |
| `MONITOR_INTERVAL` | Auto-refresh interval (ms) | 30000 |

#### AWS Settings (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_REGION` | AWS region | us-east-1 |
| `AWS_ACCESS_KEY_ID` | AWS access key | - |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | - |

**Note:** AWS credentials are optional. You can use IAM Instance Profiles instead (recommended for EC2).

#### Email Alert Settings (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | smtp.gmail.com |
| `SMTP_PORT` | SMTP server port | 587 |
| `SMTP_SECURE` | Use SSL/TLS | false |
| `SMTP_USER` | SMTP username | your-email@gmail.com |
| `SMTP_PASS` | SMTP password/app password | your-app-password |
| `SMTP_FROM` | From address | Server Monitor <alerts@example.com> |
| `ALERT_EMAIL_TO` | Alert recipient email | admin@example.com |

#### Alert Thresholds

| Variable | Description | Default |
|----------|-------------|---------|
| `CPU_THRESHOLD` | CPU warning threshold (%) | 80 |
| `RAM_THRESHOLD` | RAM warning threshold (%) | 80 |
| `DISK_THRESHOLD` | Disk warning threshold (%) | 90 |

### Alert Thresholds

- **Normal** (Green): Below warning threshold
- **Warning** (Yellow): 80-90% utilization
- **Critical** (Red): Above 90-95% utilization

## Adding Servers

1. Click "Add Server" in the dashboard
2. Fill in the server details:
   - **Server Name**: Friendly name for identification
   - **EC2 Instance ID**: Optional, for AWS integration
   - **Host/IP**: Server hostname or IP address
   - **SSH Username**: Username for SSH access (e.g., ec2-user)
   - **SSH Private Key**: Your private SSH key for authentication

3. Click "Add Server" to start monitoring

## Monitoring Methods

### SSH-based Monitoring (Recommended)
Provides detailed metrics for CPU, RAM, and disk usage by connecting directly to the server via SSH.

**Requirements:**
- SSH access to the server
- Private key authentication

**Metrics provided:**
- CPU utilization percentage
- RAM utilization percentage
- Disk usage percentage for /
- Disk space details (total, used, free)

### Docker Container Monitoring (NEW!)
Monitors Docker containers running on the same host as the monitoring application.

**Requirements:**
- Docker socket mounted to container: `-v /var/run/docker.sock:/var/run/docker.sock`

**Metrics provided:**
- Container state (running, exited, restarting, etc.)
- CPU utilization percentage
- Memory utilization percentage
- Memory usage (used/total)
- Container image and name

### CloudWatch Monitoring (EC2 Only)
Uses AWS CloudWatch for basic EC2 metrics when SSH is not available.

**Requirements:**
- AWS credentials configured
- EC2 Instance ID provided
- CloudWatch monitoring enabled

**Metrics provided:**
- CPU utilization (from CloudWatch)
- Instance state and metadata

## Email Alert Notifications

Server Monitor can automatically send email notifications when critical issues are detected. This ensures you're always aware of problems even when you're not actively monitoring the dashboard.

### Alert Levels

Email alerts are sent for the following severity levels:

- **🚨 Down** - Server or container is offline/unreachable
- **🔥 Critical** - Disk ≥90%, RAM ≥95%, or CPU 100% with RAM ≥90%
- **⚠️ Warning** - RAM 90-94% or multiple metrics elevated

**Note:** "Heavily Loaded" (high CPU only) does NOT trigger emails, as this is normal during backups.

### Features

- **Smart Deduplication** - Won't spam you with duplicate alerts for the same issue within 1 hour
- **Automatic Resolution** - Tracks when issues are resolved
- **Beautiful HTML Emails** - Professional-looking emails with color-coded alerts
- **Actionable Information** - Includes specific metrics and recommended actions
- **Test Button** - Send a test email to verify your configuration

### Setup

1. **Add SMTP settings to your `.env` file:**

```bash
# SMTP Server Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Email Addresses
SMTP_FROM=Server Monitor <your-email@gmail.com>
ALERT_EMAIL_TO=admin@example.com
```

2. **Restart the container:**

```bash
docker compose restart server-monitor
```

3. **Test the configuration:**
   - Login to the admin dashboard
   - Click "📧 Email Alerts" in the header
   - Click "Send Test Email"
   - Check your inbox!

### Common SMTP Providers

#### Gmail
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```
**Note:** Must use an [App Password](https://support.google.com/accounts/answer/185833), not your regular Gmail password.

#### Outlook/Office 365
```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

#### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### Mailgun
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
```

### Troubleshooting

**"Email not configured" error:**
- Verify all SMTP_* variables are set in your `.env` file
- Check that `ALERT_EMAIL_TO` is set
- Restart the container after making changes

**Test email not arriving:**
- Check your spam folder
- Verify SMTP credentials are correct
- For Gmail, ensure you're using an App Password, not your regular password
- Check container logs for error messages: `docker compose logs server-monitor`

**Authentication errors:**
- Gmail: Use an App Password (Settings → Security → 2-Step Verification → App passwords)
- Outlook: May need to enable "SMTP AUTH" in your account settings
- Check if your email provider requires SSL/TLS (set `SMTP_SECURE=true` and try port 465)

## API Endpoints

### Public Endpoints (No Authentication)
- `GET /status` - Public status page
- `GET /api/status/public` - Public API for status data

### Authentication
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/logout` - Logout current user
- `GET /api/auth/me` - Get current user info

### Server Management
- `GET /api/servers` - List all servers
- `POST /api/servers` - Add new server
- `PUT /api/servers/:id` - Update server
- `DELETE /api/servers/:id` - Delete server

### Monitoring
- `GET /api/monitor/all` - Get cached metrics for all servers and Docker containers
- `GET /api/monitor/:id` - Get cached metrics for specific server

### Email Alerts
- `GET /api/email/status` - Check if email is configured
- `POST /api/email/test` - Send a test email

All API endpoints (except login and public status) require authentication via JWT token.

## Data Persistence

Server data is stored in JSON files:
- `data/users.json` - User accounts
- `data/servers.json` - Server configurations

**Important:** When running in Docker, mount a volume to `/app/data` to persist data:
```bash
-v /path/to/data:/app/data
```

## Security Notes

- Passwords are hashed using bcrypt
- SSH private keys are stored server-side only
- JWT tokens expire after 24 hours
- Use HTTPS in production
- Regularly rotate AWS credentials
- Use strong admin passwords
- Consider using AWS Secrets Manager for credentials in production

## CI/CD

This project includes GitHub Actions for automatic Docker builds:

- **Trigger**: Push to main branch
- **Registry**: GitHub Container Registry (GHCR)
- **Image**: `ghcr.io/hivemindnet/Server-Monitor:latest`

## Development

```bash
# Install dependencies
npm install

# Run in development mode with auto-reload
npm run dev

# Run in production mode
npm start
```

## Troubleshooting

### SSH Connection Fails
- Verify the private key is correct
- Ensure SSH access is allowed from your server
- Check firewall rules and security groups
- Verify the username is correct for your OS

### AWS Metrics Not Showing
- Verify AWS credentials are configured
- Ensure EC2 Instance ID is correct
- Check IAM permissions for EC2 and CloudWatch
- Verify the region is correct

### Login Issues
- Check `data/users.json` exists
- Verify environment variables are set
- Try deleting `data/users.json` to recreate admin user

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on GitHub.
