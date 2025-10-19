#!/bin/bash
# Release a new build version (auto-increment build number)
# This script:
# - Increments the build number
# - Commits and tags the release
# - Pushes to git
# - Builds and pushes Docker images to Docker Hub
#
# Usage: ./scripts/release.sh

set -e

echo "🚀 Build Version Release"
echo ""

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: ${CURRENT_VERSION}"

# Auto-increment will be done by update-version.sh
echo ""
echo "📝 Step 1/5: Updating version (auto-increment)..."
./scripts/update-version.sh

# Get the new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "New version: ${NEW_VERSION}"
echo ""

# Confirm with user
read -p "Proceed with build release ${NEW_VERSION}? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Release cancelled"
    # Restore files
    git restore package.json package-lock.json tools/lib/__init__.py
    exit 1
fi

echo ""
echo "💾 Step 2/5: Committing version bump..."
git commit -m "bump version to ${NEW_VERSION}"

echo ""
echo "🏷️  Step 3/5: Creating git tag..."
git tag -a v${NEW_VERSION} -m "Release v${NEW_VERSION}"

echo ""
echo "⬆️  Step 4/5: Pushing to git..."
git push origin main --tags

echo ""
echo "🐳 Step 5/5: Building and pushing Docker images..."
./build-and-push.sh

echo ""
echo "✅ Build version release complete!"
echo ""
echo "Released version: ${NEW_VERSION}"
echo "Git: https://github.com/the-louie/file-drop/releases/tag/v${NEW_VERSION}"
echo "Docker Hub: https://hub.docker.com/r/thelouie/file-drop/tags"
echo ""

