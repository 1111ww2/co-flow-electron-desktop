#!/bin/bash
# Open Co-Flow as an Electron desktop application.
# This shortcut is for macOS users who prefer double-clicking instead of typing commands.

cd "$(dirname "$0")"

echo "Opening Co-Flow Electron desktop prototype..."
echo "This is not the browser preview mode."

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install || exit 1
fi

echo "Resetting local demo database..."
npm run seed || exit 1

echo "Starting Electron desktop app..."
npm start
