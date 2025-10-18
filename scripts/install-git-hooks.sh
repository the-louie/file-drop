#!/bin/bash
# Install git hooks for File Drop project

set -e

HOOKS_DIR=".git/hooks"
SCRIPTS_DIR="scripts"

echo "Installing git hooks..."

# Pre-commit hook - Auto-increment build number on version tag commits
cat > "${HOOKS_DIR}/pre-commit" << 'EOF'
#!/bin/bash
# Pre-commit hook: Ensure version is synced across files

# Check if this is a version bump commit
if git diff --cached --name-only | grep -q "package.json"; then
    # Get current version from package.json
    STAGED_VERSION=$(git show :package.json | grep '"version"' | sed 's/.*"version": "\(.*\)".*/\1/')
    
    # Check package-lock.json
    if [ -f "package-lock.json" ]; then
        LOCK_VERSION=$(grep -m1 '"version":' package-lock.json | sed 's/.*"version": "\(.*\)".*/\1/')
        if [ "$STAGED_VERSION" != "$LOCK_VERSION" ]; then
            echo "⚠️  Version mismatch detected!"
            echo "   package.json: $STAGED_VERSION"
            echo "   package-lock.json: $LOCK_VERSION"
            echo ""
            echo "Run: ./scripts/update-version.sh $STAGED_VERSION"
            exit 1
        fi
    fi
    
    # Check tools/lib/__init__.py
    if [ -f "tools/lib/__init__.py" ]; then
        LIB_VERSION=$(grep "__version__" tools/lib/__init__.py | sed "s/__version__ = '\(.*\)'/\1/")
        if [ "$STAGED_VERSION" != "$LIB_VERSION" ]; then
            echo "⚠️  Version mismatch detected!"
            echo "   package.json: $STAGED_VERSION"
            echo "   tools/lib/__init__.py: $LIB_VERSION"
            echo ""
            echo "Run: ./scripts/update-version.sh $STAGED_VERSION"
            exit 1
        fi
    fi
fi

exit 0
EOF

chmod +x "${HOOKS_DIR}/pre-commit"
echo "✓ Installed pre-commit hook"

# Post-commit hook - Show next steps after version commit
cat > "${HOOKS_DIR}/post-commit" << 'EOF'
#!/bin/bash
# Post-commit hook: Show release instructions after version bump

# Check if this was a version bump
if git log -1 --pretty=%B | grep -q "bump version"; then
    VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
    
    echo ""
    echo "📦 Version bumped to ${VERSION}"
    echo ""
    echo "To create release:"
    echo "  git tag -a v${VERSION} -m \"Release v${VERSION}\""
    echo "  git push origin main --tags"
    echo ""
    echo "To build Docker image:"
    echo "  ./build-and-push.sh"
    echo ""
fi
EOF

chmod +x "${HOOKS_DIR}/post-commit"
echo "✓ Installed post-commit hook"

echo ""
echo "✅ Git hooks installed successfully!"
echo ""
echo "Hooks installed:"
echo "  - pre-commit: Validates version consistency"
echo "  - post-commit: Shows release instructions"

