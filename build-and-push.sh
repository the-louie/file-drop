#!/bin/bash
set -e

# Configuration
DOCKER_USERNAME="thelouie"
IMAGE_NAME="file-drop"
VERSION=$(node -p "require('./package.json').version")

echo "🐳 Building File Drop v${VERSION}..."
echo ""

# Check if logged in to Docker Hub
if ! docker info | grep -q "Username: ${DOCKER_USERNAME}"; then
    echo "⚠️  Not logged in to Docker Hub. Running 'docker login'..."
    docker login
fi

# Check if buildx is available for multi-platform builds
if docker buildx version &>/dev/null; then
    echo "✅ Using buildx for multi-platform build (amd64, arm64)"
    
    # Create builder if it doesn't exist
    if ! docker buildx ls | grep -q multiarch; then
        echo "Creating buildx builder..."
        docker buildx create --name multiarch --use
    else
        docker buildx use multiarch
    fi
    
    # Build and push for multiple platforms
    docker buildx build --platform linux/amd64,linux/arm64 \
        -t ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION} \
        -t ${DOCKER_USERNAME}/${IMAGE_NAME}:latest \
        --push .
else
    echo "⚠️  buildx not available. Building for current platform only."
    
    # Build for current platform
    docker build -t ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION} .
    docker build -t ${DOCKER_USERNAME}/${IMAGE_NAME}:latest .
    
    # Push
    echo "Pushing to Docker Hub..."
    docker push ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}
    docker push ${DOCKER_USERNAME}/${IMAGE_NAME}:latest
fi

echo ""
echo "✅ Successfully pushed to Docker Hub:"
echo "   docker pull ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}"
echo "   docker pull ${DOCKER_USERNAME}/${IMAGE_NAME}:latest"
echo ""
echo "📦 Image size:"
docker images ${DOCKER_USERNAME}/${IMAGE_NAME}:latest --format "{{.Size}}"

