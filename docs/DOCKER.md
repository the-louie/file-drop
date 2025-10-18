# Docker Guide

Complete guide for running File Drop in Docker.

## Quick Start

**Using pre-built image from Docker Hub:**

```bash
# 1. Pull image
docker pull thelouie/file-drop:latest

# 2. Create config
cp config_example.json config.json
# Edit: set ip="0.0.0.0", db_name="/data/memory.db"

# 3. Run with docker-compose
SESSION_SECRET=$(openssl rand -hex 32) \
NODE_ENV=production \
docker-compose up -d
```

Access at: http://localhost:9898

## Installation Methods

### Method 1: Docker Hub Image (Recommended)

**Pros:**
- No build time
- Multi-platform (amd64, arm64)
- Automatically updated
- Smaller download

**Setup:**
```bash
# docker-compose.yml already configured for this
docker-compose up -d
```

### Method 2: Build Locally

**Pros:**
- Full control
- Can modify source before build
- Good for development

**Setup:**
Edit `docker-compose.yml`:
```yaml
# Comment out:
# image: thelouie/file-drop:latest

# Uncomment:
build: .
```

Then run:
```bash
docker-compose up -d --build
```

## Configuration

### Required Files

**config.json:**
```bash
cp config_example.json config.json
nano config.json
```

Required settings:
- `"ip": "0.0.0.0"` - Listen on all interfaces
- `"db_name": "/data/memory.db"` - Persistent database path
- `"authdetails.password": "$2b$..."` - Bcrypt hashed password

### Environment Variables

**Required:**
```bash
SESSION_SECRET=$(openssl rand -hex 32)
```

**Optional:**
```bash
NODE_ENV=production  # Enables secure cookies for HTTPS
```

### Volumes

Three volumes are mounted:

1. **config.json** - Read-only configuration
   ```yaml
   ./config.json:/app/config.json:ro
   ```

2. **uploads** - Uploaded files storage
   ```yaml
   ./uploads:/app/uploads
   ```

3. **db-data** - Database persistence (Docker volume)
   ```yaml
   db-data:/data
   ```

## Common Commands

### Basic Operations

```bash
# Start
docker-compose up -d

# Stop
docker-compose stop

# Restart (after config changes)
docker-compose restart

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### Maintenance

```bash
# Update to latest image
docker-compose pull
docker-compose up -d

# Rebuild from source
docker-compose up -d --build

# Remove everything (including data!)
docker-compose down -v
```

### User Management

**Add user to database:**
```bash
# Generate password hash
docker exec -it file-drop node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('newpassword', 10).then(console.log);
"

# Access database
docker exec -it file-drop sqlite3 /data/memory.db
sqlite> INSERT INTO users (username, password_hash, is_admin) VALUES ('newuser', '$2b$...', 0);
sqlite> .exit
```

## Building and Publishing

### For Developers

**Build script:**
```bash
./build-and-push.sh
```

This builds for multiple platforms and pushes to Docker Hub.

**Manual build:**
```bash
# Login
docker login

# Build and push
docker build -t thelouie/file-drop:2025.1-42 .
docker build -t thelouie/file-drop:latest .
docker push thelouie/file-drop:2025.1-42
docker push thelouie/file-drop:latest
```

**Multi-platform build:**
```bash
docker buildx create --name multiarch --use
docker buildx build --platform linux/amd64,linux/arm64 \
  -t thelouie/file-drop:latest \
  --push .
```

### GitHub Actions (Automated)

Pushing to GitHub automatically builds and publishes:

```bash
# Release new version
git tag -a v2025.1-43 -m "Release v2025.1-43"
git push origin v2025.1-43
```

GitHub Actions will:
1. Build for amd64 and arm64
2. Tag with version and 'latest'
3. Push to Docker Hub
4. Complete in ~5 minutes

See [.github/workflows/README.md](../.github/workflows/README.md) for setup.

## Troubleshooting

### Container won't start

**Check logs:**
```bash
docker-compose logs
```

**Common issues:**
- Missing `config.json`
- Missing `SESSION_SECRET` environment variable
- Port 9898 already in use

### Database locked errors

SQLite doesn't support concurrent writes well:
```bash
# Check if multiple containers are running
docker ps | grep file-drop

# Ensure only one instance
docker-compose down
docker-compose up -d
```

### Permission errors

**Fix upload directory permissions:**
```bash
chmod -R 755 uploads/
chown -R 1000:1000 uploads/  # node user in container
```

### Out of disk space

**Check Docker disk usage:**
```bash
docker system df
```

**Clean up:**
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (CAUTION: loses data!)
docker volume prune
```

### Configuration not loading

Verify volume mount:
```bash
docker exec file-drop cat /app/config.json
# Should show your configuration
```

If empty or wrong:
```bash
# Ensure config.json exists before starting
ls -la config.json

# Recreate container
docker-compose down
docker-compose up -d
```

## Platform-Specific Notes

### Linux
Works on all distributions with Docker installed.

### macOS (Apple Silicon)
Use arm64 image for better performance:
```bash
docker pull --platform linux/arm64 thelouie/file-drop:latest
```

### Windows (WSL2)
Ensure WSL2 backend is enabled in Docker Desktop.

### Raspberry Pi
Supports arm64 (Raspberry Pi 4, 5):
```bash
docker-compose up -d  # Auto-selects arm64 image
```

## Production Deployment

### Reverse Proxy Setup

**nginx example:**
```nginx
server {
    listen 443 ssl http2;
    server_name files.yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:9898;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # For large file uploads
        client_max_body_size 10G;
        proxy_request_buffering off;
    }
}
```

### Health Checks

Add to `docker-compose.yml`:
```yaml
services:
  file-drop:
    # ... other settings ...
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:9898/login"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

### Backup Strategy

**Automated backup script:**
```bash
#!/bin/bash
BACKUP_DIR=/backups/file-drop
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
docker exec file-drop sqlite3 /data/memory.db ".backup /tmp/backup.db"
docker cp file-drop:/tmp/backup.db ${BACKUP_DIR}/memory_${DATE}.db

# Backup uploads
tar czf ${BACKUP_DIR}/uploads_${DATE}.tar.gz uploads/

echo "Backup complete: ${DATE}"
```

## Security

### Environment Variables

Never commit secrets:
```bash
# Add to .env file (not tracked in git)
SESSION_SECRET=your_secret_here
NODE_ENV=production
```

Update docker-compose.yml:
```yaml
env_file:
  - .env
```

### Network Isolation

Run on custom network:
```yaml
services:
  file-drop:
    networks:
      - file-drop-net

networks:
  file-drop-net:
    driver: bridge
```

### Resource Limits

Prevent resource exhaustion:
```yaml
services:
  file-drop:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

**Copyright © 2025 the_louie**

