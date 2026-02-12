#!/bin/bash
set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTS_DIR="$HOME/.claude/agents"
CONFIG_FILE="$SCRIPT_DIR/config/config.json"

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

# Create config file if it doesn't exist
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Creating config file template..."
    cat > "$CONFIG_FILE" << 'EOF'
{
  "gitlab": {
    "host": "https://gitlab.example.com",
    "token": "glpat-xxxxxxxxxxxx"
  },
  "jira": {
    "host": "https://your-domain.atlassian.net",
    "email": "you@example.com",
    "token": "your-api-token"
  }
}
EOF
    echo "  Created: $CONFIG_FILE"
fi

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit the config file with your credentials:"
echo "     $CONFIG_FILE"
echo ""
echo "  2. Verify installation:"
echo "     shiba --help"
echo "     shiba gitlab --help"
echo "     shiba jira --help"
echo ""
echo "To update later, run: git pull && ./setup.sh"
echo ""
