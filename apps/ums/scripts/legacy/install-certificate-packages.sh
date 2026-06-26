#!/bin/bash

# Install packages for certificate download features
echo "======================================"
echo "Installing Certificate Download Packages"
echo "======================================"
echo ""

echo "Installing docx (Word document generation)..."
npm install docx

echo ""
echo "Installing file-saver (File download utility)..."
npm install file-saver

echo ""
echo "Installing type definitions..."
npm install --save-dev @types/file-saver

echo ""
echo "======================================"
echo "Installation Complete!"
echo "======================================"
echo ""
echo "Packages installed:"
echo "  ✓ docx - Word document generation"
echo "  ✓ file-saver - File download utility"
echo "  ✓ @types/file-saver - TypeScript definitions"
echo ""
echo "Features now available:"
echo "  ✓ Download certificates as PDF"
echo "  ✓ Download certificates as Word (.docx)"
echo "  ✓ Download certificates as SVG (vector graphics)"
echo "  ✓ Print certificates"
echo ""
echo "Next steps:"
echo "  1. Run: npm run dev"
echo "  2. Navigate to Certificates page"
echo "  3. Select a student and click 'Issue Certificate'"
echo "  4. Use the download buttons to export in your preferred format"
echo ""
