# Server Monitor

A comprehensive AWS EC2 server monitoring application with authentication, real-time metrics tracking, and visual alerts for CPU, RAM, and disk usage.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Node](https://img.shields.io/badge/node-18+-green)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- 🔐 **Secure Authentication** - JWT-based authentication with bcrypt password hashing
- 🖥️ **AWS EC2 Integration** - Monitor EC2 instances via CloudWatch and SSH
- 🐳 **Docker Monitoring** - Monitor Docker containers on the host (NEW!)
- 📊 **Real-time Metrics** - Track CPU, RAM, and disk usage with auto-refresh
- 🔄 **Background Monitoring** - Continuous monitoring even when logged out
- 📄 **Public Status Page** - Share server status without authentication
- 🚨 **Visual Alerts** - Color-coded warnings (yellow) and critical alerts (red)
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

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | production |
| `ADMIN_USERNAME` | Initial admin username | admin |
| `ADMIN_PASSWORD` | Initial admin password | admin123 |
| `AWS_REGION` | AWS region | us-east-1 |
| `AWS_ACCESS_KEY_ID` | AWS access key | - |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | - |
| `JWT_SECRET` | JWT signing secret | random |
| `SESSION_SECRET` | Session encryption key | random |
| `MONITOR_INTERVAL` | Auto-refresh interval (ms) | 30000 |
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
