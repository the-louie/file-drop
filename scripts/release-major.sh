#!/bin/bash
# Release a new major version
# This script:
# - Increments the major version number
# - Resets the build number to 1
# - Commits and tags the release
# - Pushes to git
# - Builds and pushes Docker images to Docker Hub
#
# Usage: ./scripts/release-major.sh

set -e

echo "🚀 Major Version Release"
echo ""

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: ${CURRENT_VERSION}"

# Extract year and major version
YEAR=$(echo $CURRENT_VERSION | cut -d'.' -f1)
MAJOR=$(echo $CURRENT_VERSION | cut -d'-' -f1 | cut -d'.' -f2)

# Increment major version, reset build to 1
NEW_MAJOR=$((MAJOR + 1))
NEW_VERSION="${YEAR}.${NEW_MAJOR}-1"

echo "New version: ${NEW_VERSION}"
echo ""

# Confirm with user
read -p "Proceed with major version release ${NEW_VERSION}? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Release cancelled"
    exit 1
fi

echo ""
echo "📝 Step 1/5: Updating version..."
./scripts/update-version.sh ${NEW_VERSION}

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
echo "✅ Major version release complete!"
echo ""
echo "Released version: ${NEW_VERSION}"
echo "Git: https://github.com/the-louie/file-drop/releases/tag/v${NEW_VERSION}"
echo "Docker Hub: https://hub.docker.com/r/thelouie/file-drop/tags"
echo ""

