#!/bin/bash

# BMI UMS Repository Cleanup Script
# This script removes files that should not be committed to the repository

echo "🧹 Cleaning up BMI UMS repository..."

# Remove Excel files (student data, exports)
echo "Removing Excel files..."
find . -maxdepth 1 -type f \( -name "*.xlsx" -o -name "*.xls" \) -delete

# Remove Zone.Identifier files (Windows metadata)
echo "Removing Zone.Identifier files..."
find . -type f -name "*Zone.Identifier" -delete

# Remove PDF files (transcripts, certificates)
echo "Removing PDF files..."
find . -maxdepth 1 -type f -name "*.pdf" -delete

# Remove temporary/summary markdown files
echo "Removing temporary documentation files..."
rm -f *_SUMMARY.md
rm -f *_COMPLETE.md
rm -f TASK_*.md
rm -f BACKEND_INTEGRATION_*.md
rm -f STUDENT_ADMISSION_*.md
rm -f TRANSCRIPT_*.md
rm -f FILES_CREATED_*.md
rm -f MANUAL_ENTRY_*.md
rm -f README_EXAM_*.md

# Remove specific files
echo "Removing specific excluded files..."
rm -f "BMI SEAL.png"
rm -f "BMIUniversity (2).jsx"
rm -f export-students.html
rm -f test-backend-connection.sh
rm -f COURSE_CODES_VISUAL_MAP.txt

# Remove build artifacts if they exist
echo "Removing build artifacts..."
rm -rf dist/ 2>/dev/null
rm -rf backend/dist/ 2>/dev/null

# Remove logs
echo "Removing logs..."
rm -rf logs/ 2>/dev/null
rm -rf backend/logs/ 2>/dev/null

# Remove runtime data
echo "Removing runtime data..."
rm -rf bin/ 2>/dev/null
rm -rf data/ 2>/dev/null

echo "✅ Cleanup complete!"
echo ""
echo "Files that will be committed:"
git status --short
