#!/bin/bash
# Update version number across all project files
# Usage: ./scripts/update-version.sh [new-version]
# Example: ./scripts/update-version.sh 2025.1-43

set -e

if [ -z "$1" ]; then
    # Auto-increment build number
    CURRENT_VERSION=$(node -p "require('./package.json').version")

    # Extract year, major, and build
    YEAR=$(echo $CURRENT_VERSION | cut -d'.' -f1)
    MAJOR=$(echo $CURRENT_VERSION | cut -d'-' -f1 | cut -d'.' -f2)
    BUILD=$(echo $CURRENT_VERSION | cut -d'-' -f2)

    # Increment build number
    NEW_BUILD=$((BUILD + 1))
    NEW_VERSION="${YEAR}.${MAJOR}-${NEW_BUILD}"

    echo "Auto-incrementing: ${CURRENT_VERSION} → ${NEW_VERSION}"
else
    NEW_VERSION="$1"
    echo "Setting version to: ${NEW_VERSION}"
fi

# Validate version format (YYYY.M-B)
if ! echo "$NEW_VERSION" | grep -qE '^[0-9]{4}\.[0-9]+-[0-9]+$'; then
    echo "Error: Version must match format YYYY.M-B (e.g., 2025.1-42)"
    exit 1
fi

echo "Updating version to ${NEW_VERSION}..."

# Update package.json and package-lock.json using npm
npm version "${NEW_VERSION}" --no-git-tag-version
echo "✓ Updated package.json and package-lock.json"

# Update lib version
if [ -f "tools/lib/__init__.py" ]; then
    sed -i "s/__version__ = '.*'/__version__ = '${NEW_VERSION}'/" tools/lib/__init__.py
    echo "✓ Updated tools/lib/__init__.py"
fi

# Stage the changes
git add package.json package-lock.json tools/lib/__init__.py 2>/dev/null || true

echo ""
echo "✅ Version updated to ${NEW_VERSION}"
echo ""
echo "Next steps:"
echo "1. Review changes: git diff --staged"
echo "2. Commit: git commit -m \"bump version to ${NEW_VERSION}\""
echo "3. Tag release: git tag -a v${NEW_VERSION} -m \"Release v${NEW_VERSION}\""
echo "4. Push: git push && git push --tags"

