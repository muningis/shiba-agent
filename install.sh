#!/bin/bash
set -e

REPO="muningis/shiba-agent"
INSTALL_DIR="$HOME/.shiba-agent"
AGENTS_DIR="$HOME/.claude/agents"
CONFIG_DIR="$HOME/.shiba-agent"
CONFIG_FILE="$CONFIG_DIR/config.json"

echo "Installing Shiba Agent..."

# Check for bun, install if missing
if ! command -v bun &> /dev/null; then
    echo "Bun not found. Installing bun..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi

# Clone or update repository
if [ -d "$INSTALL_DIR" ]; then
    echo "Updating existing installation..."
    cd "$INSTALL_DIR"
    git pull origin main
else
    echo "Cloning repository..."
    git clone "https://github.com/$REPO.git" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Install dependencies
echo "Installing dependencies..."
bun install

# Build packages
echo "Building packages..."
bun run build

# Link CLI tool globally
echo "Linking CLI tool..."
cd "$INSTALL_DIR/src/tools/shiba-cli"
bun link

# Create agents directory if it doesn't exist
mkdir -p "$AGENTS_DIR"

# Symlink agent definitions
echo "Symlinking agent definitions..."
for agent in "$INSTALL_DIR/src/agents"/*.md; do
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
echo "Installation complete!"
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
