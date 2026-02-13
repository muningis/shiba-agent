#!/bin/bash
set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTS_DIR="$HOME/.claude/agents"
DATA_DIR="$HOME/.shiba-agent/data"

echo "Setting up Shiba Agent..."

# Check for bun, install if missing
if ! command -v bun &> /dev/null; then
    echo "Bun not found. Installing bun..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi

# Install dependencies
echo "Installing dependencies..."
cd "$SCRIPT_DIR"
bun install

# Build packages
echo "Building packages..."
bun run build

# Link CLI tool globally
echo "Linking CLI tool..."
cd "$SCRIPT_DIR/src/tools/shiba-cli"
bun link

# Verify installed version matches source
EXPECTED_VERSION=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$SCRIPT_DIR/src/tools/shiba-cli/package.json','utf-8')).version)")
INSTALLED_VERSION=$(shiba --version 2>/dev/null || echo "unknown")
if [ "$EXPECTED_VERSION" != "$INSTALLED_VERSION" ]; then
  echo ""
  echo "WARNING: Version mismatch!"
  echo "  Expected: $EXPECTED_VERSION"
  echo "  Installed: $INSTALLED_VERSION"
  echo "  Try: cd $SCRIPT_DIR/src/tools/shiba-cli && bun link"
fi

# Create agents directory if it doesn't exist
mkdir -p "$AGENTS_DIR"

# Symlink agent definitions
echo "Symlinking agent definitions..."
for agent in "$SCRIPT_DIR/src/agents"/*.md; do
    name=$(basename "$agent")
    target="$AGENTS_DIR/$name"
    if [ -L "$target" ] || [ -f "$target" ]; then
        rm "$target"
    fi
    ln -s "$agent" "$target"
    echo "  Linked: $name"
done

# Create skills directory if it doesn't exist
SKILLS_DIR="$HOME/.claude/skills"
mkdir -p "$SKILLS_DIR"

# Symlink skill definitions
echo "Symlinking skill definitions..."
for skill_dir in "$SCRIPT_DIR/src/skills"/*; do
    if [ -d "$skill_dir" ]; then
        name=$(basename "$skill_dir")
        target="$SKILLS_DIR/$name"
        if [ -L "$target" ] || [ -d "$target" ]; then
            rm -rf "$target"
        fi
        ln -s "$skill_dir" "$target"
        echo "  Linked: $name"
    fi
done

# Initialize data directory (for environment isolation)
if [ ! -d "$DATA_DIR/.git" ]; then
    echo "Initializing data directory..."
    mkdir -p "$DATA_DIR"
    cd "$DATA_DIR"
    git init
    git commit --allow-empty -m "Initialize shiba data repository"

    # Create directory structure
    mkdir -p oapi issues figma glab jira
    echo "  Created: $DATA_DIR"
fi

echo ""
echo "Setup complete! (shiba v$INSTALLED_VERSION)"
echo ""
echo "Next steps:"
echo "  1. Create your first environment:"
echo "     shiba env create work"
echo "     shiba env use work"
echo ""
echo "  2. Configure GitLab and Jira CLIs for this environment:"
echo "     glab auth login"
echo "     jira init"
echo ""
echo "  3. Verify installation:"
echo "     shiba --help"
echo "     shiba env --help"
echo ""
echo "To update later, run: git pull && ./setup.sh"
echo ""
