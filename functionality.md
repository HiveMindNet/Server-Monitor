# Server Monitor - Functionality Documentation

## Overview
Server Monitor is a comprehensive AWS EC2 monitoring application with authentication that tracks CPU, RAM, and disk usage across multiple servers with real-time alerts.

## Version
Current version: 2.0.0

## Features and Functions

### 1. Authentication System

#### User Management
- **Secure Password Storage**: Uses bcryptjs for password hashing
- **JWT Token Authentication**: Stateless authentication with JSON Web Tokens
- **Cookie-based Sessions**: Secure HTTP-only cookies for token storage
- **Admin User Initialization**: Automatic admin account creation on first run
- **Credentials Storage**: User credentials stored in JSON file (data/users.json)

#### Authentication Endpoints
- **POST /api/auth/login**: User login with username/password
- **POST /api/auth/logout**: User logout and token clearing
- **GET /api/auth/me**: Check current authentication status

#### Security Features
- **Protected Routes**: authMiddleware guards all API endpoints
- **Token Expiration**: 24-hour token validity
- **Secure Cookies**: HttpOnly cookies in production mode

### 2. Server Management

#### Server Configuration
- **Server Storage**: Server configurations stored in data/servers.json
- **SSH Credentials**: Secure storage of SSH private keys
- **EC2 Integration**: Optional AWS EC2 instance ID association
- **Server Metadata**: Name, host, username, and connection details

#### Server Management Endpoints
- **GET /api/servers**: List all configured servers (protected)
- **POST /api/servers**: Add new server configuration (protected)
- **PUT /api/servers/:id**: Update server configuration (protected)
- **DELETE /api/servers/:id**: Remove server (protected)

### 3. AWS EC2 Monitoring

#### CloudWatch Integration
- **EC2 Instance Discovery**: Retrieve instance details via AWS SDK
- **CloudWatch Metrics**: CPU utilization from CloudWatch
- **Instance Metadata**: Instance type, IPs, state, and tags
- **Regional Support**: Configurable AWS region

#### SSH-based Monitoring
- **CPU Utilization**: Real-time CPU usage via SSH commands
- **RAM Utilization**: Memory usage statistics
- **Disk Space Monitoring**: Disk usage for root partition (/)
- **Disk Details**: Total, used, and free space reporting

#### Monitoring Endpoints
- **GET /api/monitor/all**: Get metrics for all servers (protected)
- **GET /api/monitor/:id**: Get metrics for specific server (protected)

#### Metrics Collected
- **CPU**: Percentage utilization
- **RAM**: Percentage utilization
- **Disk**: Percentage used on / partition
- **Disk Space**: Total, used, and free space in human-readable format
- **Timestamp**: ISO 8601 timestamp of measurement

### 4. Frontend Dashboard

#### User Interface Components
- **Login Screen**: Clean authentication interface
- **Dashboard Header**: Navigation with user info and actions
- **Statistics Bar**: Real-time overview of server fleet
  - Total servers count
  - Running servers count
  - Servers with issues count
  - Last update timestamp
- **Server Cards Grid**: Responsive grid layout of server status
- **Add Server Modal**: Form for configuring new servers

#### Visual Alert System
- **Normal State**: Green indicators for healthy metrics
- **Warning State**: Orange/yellow for metrics above warning threshold (80%)
- **Critical State**: Red alerts for metrics above critical threshold (90-95%)
- **Card Highlighting**: Server cards with red borders for critical issues
- **Status Badges**: Color-coded status indicators per server

#### Real-time Features
- **Auto-refresh**: Automatic data refresh every 30 seconds
- **Manual Refresh**: On-demand refresh button
- **Live Metrics**: Progress bars showing current utilization
- **Timestamp Display**: Last updated time shown

#### Metric Thresholds
- **CPU Warning**: 80% (configurable)
- **CPU Critical**: 95% (configurable)
- **RAM Warning**: 80% (configurable)
- **RAM Critical**: 90% (configurable)
- **Disk Warning**: 80% (configurable)
- **Disk Critical**: 90% (configurable)

### 5. Server Monitoring Service

#### Connection Methods
- **SSH Monitoring**: Direct SSH connection for detailed metrics
- **CloudWatch Fallback**: AWS CloudWatch for EC2 instances without SSH
- **Hybrid Mode**: Combines EC2 metadata with SSH metrics

#### Error Handling
- **Connection Failures**: Graceful error reporting
- **Timeout Management**: Proper SSH connection timeouts
- **Status Reporting**: Clear error messages in UI

### 6. Configuration

#### Environment Variables
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Node environment (default: development)
- `SESSION_SECRET`: Session encryption key
- `ADMIN_USERNAME`: Initial admin username (default: admin)
- `ADMIN_PASSWORD`: Initial admin password (default: admin123)
- `AWS_REGION`: AWS region (default: us-east-1)
- `AWS_ACCESS_KEY_ID`: AWS access key for API access
- `AWS_SECRET_ACCESS_KEY`: AWS secret key for API access
- `JWT_SECRET`: Secret key for JWT signing
- `MONITOR_INTERVAL`: Auto-refresh interval in ms (default: 30000)
- `CPU_THRESHOLD`: CPU warning threshold (default: 80)
- `RAM_THRESHOLD`: RAM warning threshold (default: 80)
- `DISK_THRESHOLD`: Disk warning threshold (default: 90)

### 7. API Endpoints

#### Public Endpoints
- **GET /health**: Health check endpoint
- **GET /**: Serves frontend application

#### Protected Endpoints (Require Authentication)
All `/api/*` endpoints except `/api/auth/login` require valid JWT token

#### Response Formats
- All responses in JSON format
- Consistent error message structure
- HTTP status codes for different scenarios

### 8. Data Persistence

#### File-based Storage
- **data/users.json**: User account information
- **data/servers.json**: Server configurations and credentials

#### Security Considerations
- Passwords hashed with bcrypt (10 rounds)
- Private keys stored securely server-side
- Never expose private keys in API responses
- Token-based authentication for all sensitive operations

### 9. Docker Support

#### Dockerfile Features
- **Base Image**: Node.js 18 Alpine (lightweight)
- **Production Build**: Uses `npm ci` for reproducible builds
- **Security**: Runs as non-root user
- **Port**: Exposes port 3000
- **Environment**: NODE_ENV set to production

#### Docker Considerations
- All data persisted in /app/data directory
- Consider volume mounting for data persistence
- Environment variables for configuration

### 10. CI/CD Pipeline

#### GitHub Actions Workflow
- **Trigger**: Automatic build on push to main branch
- **Registry**: Publishes to GitHub Container Registry (ghcr.io)
- **Image**: ghcr.io/hivemindnet/Server-Monitor:latest
- **Authentication**: Uses GitHub token for GHCR authentication
- **Tagging**: Creates 'latest' tag and SHA-based tags

## Dependencies

### Production Dependencies
- **express**: ^4.18.2 - Web framework
- **express-session**: ^1.17.3 - Session management
- **bcryptjs**: ^2.4.3 - Password hashing
- **jsonwebtoken**: ^9.0.2 - JWT authentication
- **dotenv**: ^16.3.1 - Environment variable management
- **@aws-sdk/client-ec2**: ^3.478.0 - AWS EC2 API client
- **@aws-sdk/client-cloudwatch**: ^3.478.0 - AWS CloudWatch client
- **node-ssh**: ^13.1.0 - SSH client for server monitoring
- **cookie-parser**: ^1.4.6 - Cookie parsing middleware
- **cors**: ^2.8.5 - CORS middleware

### Development Dependencies
- **nodemon**: ^3.0.2 - Development auto-reload

## Usage Workflow

1. **Initial Setup**: Set environment variables and start application
2. **First Login**: Use admin credentials from environment variables
3. **Add Servers**: Configure servers with SSH credentials and optional EC2 instance IDs
4. **Monitor**: View real-time metrics with automatic refresh
5. **Alert Response**: Red-highlighted cards indicate servers requiring attention

## Technical Architecture

- **Backend**: Node.js with Express
- **Frontend**: Vanilla JavaScript with modern CSS
- **Authentication**: JWT with HTTP-only cookies
- **Cloud Integration**: AWS SDK for EC2 and CloudWatch
- **Server Monitoring**: SSH-based metric collection
- **Data Storage**: JSON file-based persistence
- **Deployment**: Dockerized with CI/CD automation
