#!/usr/bin/env bash
# EACO AI Gateway - Multi-platform deploy script
# Usage: bash deploy-mirrors.sh
# 
# Prerequisites:
#   1. Set environment variables:
#      export GITLAB_TOKEN="your-gitlab-token"
#      export GITEE_TOKEN="your-gitee-token"
#   2. Or add them to your shell profile (~/.bashrc / ~/.zshrc)

set -e
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

echo "🚀 EACO AI Gateway - Multi-platform Deploy"
echo "============================================"

# --- GitHub (primary) ---
echo ""
echo "📦 Pushing to GitHub..."
if git remote | grep -q "^github$"; then
    git push github main
else
    git remote add github https://github.com/ucoingroup/eaco-ai-gateway.git
    git push github main
fi
echo "✅ GitHub: https://github.com/ucoingroup/eaco-ai-gateway"

# --- GitLab ---
echo ""
if [ -n "$GITLAB_TOKEN" ]; then
    echo "📦 Pushing to GitLab..."
    GITLAB_REPO="https://oauth2:${GITLAB_TOKEN}@gitlab.com/ucoingroup/eaco-ai-gateway.git"
    if git remote | grep -q "^gitlab$"; then
        git remote set-url gitlab "$GITLAB_REPO"
    else
        git remote add gitlab "$GITLAB_REPO"
    fi
    git push gitlab main --force 2>/dev/null || {
        echo "⚠️  GitLab repo not found. Create it first at https://gitlab.com/projects/new"
        echo "   Then re-run this script."
    }
    echo "✅ GitLab: https://gitlab.com/ucoingroup/eaco-ai-gateway"
else
    echo "⚠️  GITLAB_TOKEN not set. Skipping GitLab."
    echo "   Set it with: export GITLAB_TOKEN='your-token'"
fi

# --- Gitee ---
echo ""
if [ -n "$GITEE_TOKEN" ]; then
    echo "📦 Pushing to Gitee..."
    GITEE_REPO="https://oauth2:${GITEE_TOKEN}@gitee.com/ucoingroup/eaco-ai-gateway.git"
    if git remote | grep -q "^gitee$"; then
        git remote set-url gitee "$GITEE_REPO"
    else
        git remote add gitee "$GITEE_REPO"
    fi
    git push gitee main --force 2>/dev/null || {
        echo "⚠️  Gitee repo not found. Create it first at https://gitee.com/projects/create"
        echo "   Then re-run this script."
    }
    echo "✅ Gitee: https://gitee.com/ucoingroup/eaco-ai-gateway"
else
    echo "⚠️  GITEE_TOKEN not set. Skipping Gitee."
    echo "   Set it with: export GITEE_TOKEN='your-token'"
fi

echo ""
echo "============================================"
echo "🎉 Deploy complete!"
echo ""
echo "Repositories:"
echo "  🔹 GitHub: https://github.com/ucoingroup/eaco-ai-gateway"
echo "  🔹 GitLab: https://gitlab.com/ucoingroup/eaco-ai-gateway (if configured)"
echo "  🔹 Gitee:  https://gitee.com/ucoingroup/eaco-ai-gateway (if configured)"
