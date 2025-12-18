# Server Monitor

A lightweight Node.js server monitoring application with Docker support and automated CI/CD.

## Features

- 🚀 Express-based REST API
- 🏥 Health check endpoints
- 📊 Server status monitoring
- 🐳 Docker support with multi-stage build
- 🔄 Automated GitHub Actions CI/CD
- 📦 Automatic publishing to GitHub Container Registry

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start the server
npm start
```

The server will start on `http://localhost:3000`

### Docker

```bash
# Build the image
docker build -t server-monitor .

# Run the container
docker run -p 3000:3000 server-monitor
```

### Pull from GitHub Container Registry

```bash
docker pull ghcr.io/hivemindnet/server-monitor:latest
docker run -p 3000:3000 ghcr.io/hivemindnet/server-monitor:latest
```

## API Endpoints

### `GET /`
Returns API information and available endpoints.

### `GET /health`
Health check endpoint returning server status and uptime.

### `GET /status`
Detailed server status including memory usage and metrics.

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Node environment (default: development)

## CI/CD

This project uses GitHub Actions to automatically:
- Build Docker images on push to main branch
- Push images to GitHub Container Registry
- Tag images with `latest` and commit SHA

## License

MIT

