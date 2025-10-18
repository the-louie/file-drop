# Versioning System

File Drop uses a custom versioning format: **YEAR.MAJOR-BUILD**

## Format

```
YYYY.M-B
```

**Components:**
- `YYYY` - Year (e.g., 2025)
- `M` - Major version (incremented for breaking changes or major features)
- `B` - Build number (auto-incremented for each release)

**Examples:**
- `2025.1-42` - Year 2025, major version 1, build 42
- `2025.1-43` - Same major version, next build
- `2025.2-1` - New major version, reset build to 1
- `2026.1-1` - New year, reset to version 1

## Why This Format?

1. **Year-based** - Immediately shows age of release
2. **Major version** - Groups related releases
3. **Build number** - Sequential, easy to track
4. **No semantic versioning confusion** - Simpler for users

## Updating Version

### Automatic (Recommended)

```bash
# Auto-increment build number
./scripts/update-version.sh

# This updates:
# - package.json
# - package-lock.json
# - tools/lib/__init__.py
```

### Manual

```bash
# Set specific version
./scripts/update-version.sh 2025.1-50

# Or edit files directly (then run update script to sync)
nano package.json
./scripts/update-version.sh $(node -p "require('./package.json').version")
```

### Major Version Bump

When making breaking changes:

```bash
# Increment major version, reset build to 1
./scripts/update-version.sh 2025.2-1
```

### New Year

At the start of each year:

```bash
# Reset to new year
./scripts/update-version.sh 2026.1-1
```

## Git Hooks

Automatic validation is enabled via git hooks (installed by `scripts/install-git-hooks.sh`).

### Pre-Commit Hook

Validates version consistency before commit:
- Checks `package.json` ↔ `package-lock.json`
- Checks `package.json` ↔ `tools/lib/__init__.py`
- Prevents commit if versions don't match

**If validation fails:**
```bash
# Sync all versions
./scripts/update-version.sh $(node -p "require('./package.json').version")
git add package.json package-lock.json tools/lib/__init__.py
```

### Post-Commit Hook

Shows release instructions after version bump commits.

## Version Display

Version is visible in multiple places:

### 1. Web UI Footer
```
File Drop v2025.1-42 by Louie
```

Automatically fetched from `/api/version` endpoint.

### 2. API Endpoint

```bash
curl https://your-server.com/api/version
# {"version":"2025.1-42"}
```

### 3. Docker Tags

```bash
docker pull thelouie/file-drop:2025.1-42
docker pull thelouie/file-drop:latest
```

### 4. Git Tags

```bash
git tag -l
# v2025.1-42
# v2025.1-43
```

### 5. Python Library

```python
from filedrop_client import __version__
print(__version__)  # 2025.1-42
```

## Release Workflow

### Complete Release Process

```bash
# 1. Ensure working directory clean
git status

# 2. Update version
./scripts/update-version.sh
# Auto-increments: 2025.1-42 → 2025.1-43

# 3. Review changes
git diff --staged

# 4. Commit (triggers post-commit hook with instructions)
git commit -m "bump version to 2025.1-43"

# 5. Tag release
git tag -a v2025.1-43 -m "Release v2025.1-43"

# 6. Push (triggers GitHub Actions Docker build)
git push origin main --tags

# 7. Wait for GitHub Actions
# Builds and pushes to Docker Hub automatically
# View: https://github.com/the-louie/file-drop/actions

# 8. Verify Docker Hub
# Check: https://hub.docker.com/r/thelouie/file-drop/tags
```

### Quick Release

For minor builds:
```bash
./scripts/update-version.sh && \
git commit -m "bump version to $(node -p require('./package.json').version)" && \
git tag -a v$(node -p "require('./package.json').version") -m "Release v$(node -p "require('./package.json').version")" && \
git push origin main --tags
```

## Manual Docker Build

If you want to build locally instead of waiting for GitHub Actions:

```bash
# After version bump and tag
./build-and-push.sh
```

This builds for amd64 and arm64, then pushes to Docker Hub.

## Version History Examples

```
v2025.1-1   - Initial 2025 release
v2025.1-42  - Current version
v2025.1-43  - Next build
v2025.2-1   - Breaking changes (new major version)
v2026.1-1   - 2026 release (new year)
```

## Troubleshooting

### Hook validation fails

```bash
# Check versions
grep version package.json
grep version package-lock.json
grep __version__ tools/lib/__init__.py

# Sync if needed
./scripts/update-version.sh $(node -p "require('./package.json').version")
```

### Can't run update script on Windows

Use Git Bash or WSL:
```bash
# Git Bash
bash scripts/update-version.sh

# WSL
wsl bash scripts/update-version.sh
```

### Version not showing in UI

- Check browser console for errors
- Verify `/api/version` endpoint: `curl http://localhost:9898/api/version`
- Clear browser cache

---

**Copyright © 2025 the_louie**

