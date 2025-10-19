# Development Scripts

Utility scripts for File Drop development and release management.

## Version Management

### update-version.sh

Updates version number across all project files.

**Auto-increment build number:**
```bash
./scripts/update-version.sh
# 2025.1-42 → 2025.1-43
```

**Set specific version:**
```bash
./scripts/update-version.sh 2025.2-1
```

**Version format:** `YYYY.MAJOR-BUILD`
- `YYYY` - Year (e.g., 2025)
- `MAJOR` - Major version number (incremented for breaking changes)
- `BUILD` - Build number (auto-incremented for each release)

**Files updated:**
- `package.json`
- `package-lock.json`
- `tools/lib/__init__.py`

### Workflow

```bash
# 1. Update version
./scripts/update-version.sh

# 2. Review changes
git diff --staged

# 3. Commit
git commit -m "bump version to 2025.1-43"

# 4. Tag release
git tag -a v2025.1-43 -m "Release v2025.1-43"

# 5. Push
git push origin main --tags
```

## Git Hooks

### install-git-hooks.sh

Installs git hooks for automatic version validation.

**Installation:**
```bash
./scripts/install-git-hooks.sh
```

**Hooks installed:**

1. **pre-commit** - Validates version consistency
   - Checks `package.json` matches `package-lock.json`
   - Checks `package.json` matches `tools/lib/__init__.py`
   - Prevents commit if versions don't match

2. **post-commit** - Shows release instructions
   - Displays next steps after version bump
   - Shows tag and push commands

### Manual Hook Setup

If the install script doesn't work on your platform:

**Create `.git/hooks/pre-commit`:**
```bash
#!/bin/bash
# Check version consistency
STAGED_VERSION=$(git show :package.json | grep '"version"' | sed 's/.*"version": "\(.*\)".*/\1/')
LOCK_VERSION=$(grep -m1 '"version":' package-lock.json | sed 's/.*"version": "\(.*\)".*/\1/')

if [ "$STAGED_VERSION" != "$LOCK_VERSION" ]; then
    echo "Version mismatch! Run: ./scripts/update-version.sh $STAGED_VERSION"
    exit 1
fi
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Version Display

Version is displayed in:
- Web UI footer: "File Drop v2025.1-42 by Louie"
- API endpoint: `GET /api/version` → `{"version": "2025.1-42"}`
- Docker image tags: `thelouie/file-drop:2025.1-42`

## Release Scripts

### release.sh

Automated script for build releases (auto-increments build number).

**Usage:**
```bash
./scripts/release.sh
# Prompts for confirmation
# 2025.1-57 → 2025.1-58
```

**What it does:**
1. Auto-increments build number
2. Commits version bump
3. Creates git tag
4. Pushes to GitHub
5. Builds and pushes Docker images to Docker Hub

### release-major.sh

Automated script for major version releases (increments major version, resets build to 1).

**Usage:**
```bash
./scripts/release-major.sh
# Prompts for confirmation
# 2025.1-57 → 2025.2-1
```

**What it does:**
1. Increments major version number
2. Resets build number to 1
3. Commits version bump
4. Creates git tag
5. Pushes to GitHub
6. Builds and pushes Docker images to Docker Hub

## Release Process

### Quick Release (recommended)

For build releases:
```bash
./scripts/release.sh
```

For major version releases:
```bash
./scripts/release-major.sh
```

### Manual Release

Complete release checklist:

```bash
# 1. Ensure all changes committed
git status

# 2. Update version
./scripts/update-version.sh

# 3. Commit version bump
git commit -m "bump version to $(node -p require('./package.json').version)"

# 4. Tag release
VERSION=$(node -p "require('./package.json').version")
git tag -a v${VERSION} -m "Release v${VERSION}"

# 5. Push to GitHub
git push origin main --tags

# 6. Build and push Docker images
./build-and-push.sh

# 7. Verify Docker Hub
# Check: https://hub.docker.com/r/thelouie/file-drop/tags
```

## Troubleshooting

### "sed: command not found" on Windows
Use Git Bash or WSL instead of PowerShell.

### Hooks not executing
```bash
# Ensure executable
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/post-commit

# Check hook syntax
bash -n .git/hooks/pre-commit
```

### Version mismatch errors
```bash
# Manually sync versions
./scripts/update-version.sh $(node -p "require('./package.json').version")
```

---

**Copyright © 2025 the_louie**

