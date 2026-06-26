#!/bin/bash

# BMI UMS - Prepare Repository for Push
# This script prepares the repository for a clean first push to GitHub

set -e

echo "🚀 Preparing BMI UMS repository for GitHub push..."
echo ""

# Step 1: Make cleanup script executable
chmod +x cleanup-repo.sh

# Step 2: Run cleanup
echo "Step 1: Running cleanup..."
./cleanup-repo.sh
echo ""

# Step 3: Add all files
echo "Step 2: Staging files..."
git add .
echo ""

# Step 4: Show what will be committed
echo "Step 3: Files to be committed:"
git status --short
echo ""

# Step 5: Create initial commit
echo "Step 4: Creating initial commit..."
read -p "Enter commit message (or press Enter for default): " commit_msg
if [ -z "$commit_msg" ]; then
    commit_msg="Initial commit: BMI University Management System v1.0.0"
fi

git commit -m "$commit_msg"
echo ""

# Step 6: Show commit info
echo "✅ Repository prepared!"
echo ""
echo "Commit created:"
git log -1 --oneline
echo ""
echo "Next steps:"
echo "1. Review the commit: git show"
echo "2. Push to GitHub: git push -u origin main"
echo ""
