# GitHub Actions Workflows

## docker-publish.yml

Automatically builds and publishes Docker images to Docker Hub.

### Triggers

- **Push to main/master:** Builds and pushes with `latest` tag
- **Version tags (v*.*.*):** Builds and pushes with version tags
- **Pull requests:** Builds only (doesn't push)
- **Manual:** Can be triggered from GitHub Actions tab

### Image Tags

The workflow automatically creates multiple tags:

- `latest` - Latest commit on main/master branch
- `v0.3.1` - Specific version from git tag
- `0.3` - Major.minor version
- `0` - Major version only
- `main-abc1234` - Branch name with commit SHA
- Pull requests get `pr-123` tags

### Required Secrets

Set these in **GitHub Repository Settings → Secrets and variables → Actions**:

1. **DOCKER_USERNAME**
   - Your Docker Hub username (e.g., `thelouie`)
   
2. **DOCKER_PASSWORD**
   - Docker Hub access token (NOT your password!)
   - Generate at: https://hub.docker.com/settings/security
   - Click **New Access Token**
   - Name: `github-actions`
   - Permissions: `Read, Write, Delete`

### Setup Instructions

1. **Create Docker Hub access token:**
   ```
   https://hub.docker.com/settings/security → New Access Token
   ```

2. **Add secrets to GitHub:**
   ```
   GitHub repo → Settings → Secrets and variables → Actions → New repository secret
   ```
   - Name: `DOCKER_USERNAME`, Value: `thelouie`
   - Name: `DOCKER_PASSWORD`, Value: (paste your access token)

3. **Push a tag to trigger build:**
   ```bash
   git tag -a v0.3.1 -m "Release v0.3.1"
   git push origin v0.3.1
   ```

### Multi-Platform Support

Builds for:
- `linux/amd64` - Intel/AMD 64-bit
- `linux/arm64` - ARM 64-bit (Apple Silicon, Raspberry Pi, etc.)

### Caching

Uses GitHub Actions cache to speed up builds:
- First build: ~5-10 minutes
- Subsequent builds: ~2-3 minutes

### Manual Trigger

To manually trigger a build:
1. Go to **Actions** tab in GitHub
2. Select **Docker Build and Publish**
3. Click **Run workflow**
4. Choose branch and click **Run workflow**

### Monitoring

View build status:
- **GitHub:** Actions tab
- **Docker Hub:** https://hub.docker.com/r/thelouie/file-drop/tags

### Example Usage

After the workflow runs, users can pull your image:

```bash
docker pull thelouie/file-drop:latest
docker pull thelouie/file-drop:0.3.1
```

### Troubleshooting

**Build fails with authentication error:**
- Verify `DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets are set correctly
- Regenerate Docker Hub access token if expired

**Build succeeds but doesn't push:**
- Check if running on pull request (PRs only build, don't push)
- Verify branch is main/master

**Multi-platform build fails:**
- QEMU and buildx are automatically set up
- Check GitHub Actions logs for specific error

