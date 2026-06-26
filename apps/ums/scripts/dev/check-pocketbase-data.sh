#!/bin/bash

echo "🔍 Checking PocketBase Data Persistence..."
echo ""

# Check if PocketBase is running
if pgrep -f "pocketbase serve" > /dev/null; then
    echo "✅ PocketBase is running"
    
    # Get the command line
    POCKETBASE_CMD=$(ps aux | grep "pocketbase serve" | grep -v grep)
    echo ""
    echo "📋 PocketBase command:"
    echo "$POCKETBASE_CMD"
    echo ""
    
    # Check for data directory
    if echo "$POCKETBASE_CMD" | grep -q "\-\-dir"; then
        DATA_DIR=$(echo "$POCKETBASE_CMD" | grep -oP '\-\-dir[= ]\K[^ ]+' || echo "$POCKETBASE_CMD" | grep -oP '\-\-dir=[^ ]+' | cut -d= -f2)
        echo "📁 Data directory: $DATA_DIR"
    else
        echo "⚠️  No --dir flag found! PocketBase may be using default location"
        echo "   Default location: ./pb_data"
    fi
else
    echo "❌ PocketBase is NOT running"
fi

echo ""
echo "🔍 Searching for PocketBase data files..."
echo ""

# Search for pb_data directories
find . -name "pb_data" -type d 2>/dev/null | while read dir; do
    echo "📁 Found: $dir"
    ls -lh "$dir" 2>/dev/null | head -10
    echo ""
done

# Search for .db files
find . -name "*.db" -type f 2>/dev/null | grep -v node_modules | while read file; do
    echo "💾 Found database: $file"
    ls -lh "$file"
    echo ""
done

echo ""
echo "💡 Recommendation:"
echo "   PocketBase should be started with: ./bin/pocketbase serve --dir=./data/pb_data"
echo "   This ensures data is stored in a persistent location."
