# Server Monitor - Functionality Documentation

## Overview
Server Monitor is a Node.js application that provides basic server monitoring capabilities through a REST API.

## Features and Functions

### 1. Web Server
- **Express Server**: Runs on port 3000 (configurable via PORT environment variable)
- **Host Binding**: Listens on 0.0.0.0 for container compatibility
- **JSON API**: All endpoints return JSON responses

### 2. API Endpoints

#### GET /
- **Description**: Root endpoint providing API information
- **Response**: JSON object with API version and available endpoints
- **Status Code**: 200 OK

#### GET /health
- **Description**: Health check endpoint for monitoring and container orchestration
- **Response**: JSON object with health status, timestamp, and uptime
- **Status Code**: 200 OK
- **Fields**:
  - `status`: Health status string
  - `timestamp`: ISO 8601 timestamp
  - `uptime`: Process uptime in seconds

#### GET /status
- **Description**: Detailed server status information
- **Response**: JSON object with server metrics
- **Status Code**: 200 OK
- **Fields**:
  - `server`: Running status
  - `memory`: Node.js memory usage statistics
  - `uptime`: Process uptime in seconds
  - `timestamp`: ISO 8601 timestamp

### 3. Operational Features

#### Graceful Shutdown
- **SIGTERM Handler**: Properly handles termination signals
- **SIGINT Handler**: Properly handles interrupt signals (Ctrl+C)
- **Cleanup**: Ensures graceful shutdown of HTTP server

#### Middleware
- **express.json()**: Parses incoming JSON request bodies

### 4. Docker Support

#### Dockerfile Features
- **Base Image**: Node.js 18 Alpine (lightweight)
- **Production Build**: Uses `npm ci` for reproducible builds
- **Security**: Runs as non-root user
- **Health Check**: Built-in Docker health check using /health endpoint
- **Port**: Exposes port 3000

#### .dockerignore
- Excludes development files, node_modules, and unnecessary files from Docker build

### 5. CI/CD Pipeline

#### GitHub Actions Workflow
- **Trigger**: Automatic build on push to main branch
- **Registry**: Publishes to GitHub Container Registry (ghcr.io)
- **Image**: ghcr.io/hivemindnet/server-monitor:latest
- **Authentication**: Uses GitHub token for GHCR authentication
- **Tagging**: Creates 'latest' tag and SHA-based tags
- **Permissions**: Configured for package write access

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Node environment (default: development, set to production in Docker)

## Dependencies

- **express**: ^4.18.2 - Web framework for Node.js

## Version
Current version: 1.0.0

