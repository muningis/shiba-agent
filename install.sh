#!/bin/bash
set -e

REPO="muningis/agent-tools"
INSTALL_DIR="$HOME/.agent-tools"
AGENTS_DIR="$HOME/.claude/agents"

echo "Installing Agent Tools..."

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

# Link CLI tools globally
echo "Linking CLI tools..."
cd "$INSTALL_DIR/src/tools/gitlab-cli"
bun link
cd "$INSTALL_DIR/src/tools/jira-cli"
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

echo ""
echo "Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Add the following environment variables to your shell profile:"
echo ""
echo "     # GitLab"
echo "     export GITLAB_HOST=https://gitlab.example.com"
echo "     export GITLAB_TOKEN=glpat-xxxxxxxxxxxx"
echo ""
echo "     # Jira"
echo "     export JIRA_HOST=https://your-domain.atlassian.net"
echo "     export JIRA_EMAIL=you@example.com"
echo "     export JIRA_TOKEN=your-api-token"
echo ""
echo "  2. Restart your terminal or run: source ~/.bashrc (or ~/.zshrc)"
echo ""
echo "  3. Verify installation:"
echo "     gitlab-cli --help"
echo "     jira-cli --help"
echo ""
