#!/bin/bash

# CodeCritter Installation Script
# This script helps you build and install the CodeCritter extension

echo "🚀 CodeCritter Installation Script"
echo "=============================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Compile TypeScript
echo "🔨 Compiling TypeScript..."
npm run compile

if [ $? -ne 0 ]; then
    echo "❌ Failed to compile TypeScript"
    exit 1
fi

echo "✅ TypeScript compiled successfully"

# Check if vsce is installed
if ! command -v vsce &> /dev/null; then
    echo "📦 Installing vsce (VS Code Extension Manager)..."
    npm install -g vsce
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install vsce"
        exit 1
    fi
fi

echo "✅ vsce is available"

# Package the extension
echo "📦 Packaging extension..."
vsce package

if [ $? -ne 0 ]; then
    echo "❌ Failed to package extension"
    exit 1
fi

echo "✅ Extension packaged successfully"

# Find the generated .vsix file
VSIX_FILE=$(find . -name "*.vsix" -type f | head -1)

if [ -z "$VSIX_FILE" ]; then
    echo "❌ No .vsix file found"
    exit 1
fi

echo "📁 Extension package created: $VSIX_FILE"

# Install the extension
echo "🔧 Installing extension in VS Code..."
code --install-extension "$VSIX_FILE"

if [ $? -ne 0 ]; then
    echo "❌ Failed to install extension in VS Code"
    echo "💡 You can manually install it by:"
    echo "   1. Open VS Code"
    echo "   2. Press Ctrl+Shift+P (or Cmd+Shift+P on Mac)"
    echo "   3. Type 'Extensions: Install from VSIX...'"
    echo "   4. Select the file: $VSIX_FILE"
    exit 1
fi

echo "✅ Extension installed successfully!"
echo ""
echo "🎉 GitWit is now ready to use!"
echo ""
echo "📖 Next steps:"
echo "1. Open VS Code"
echo "2. Press Ctrl+Shift+P (or Cmd+Shift+P on Mac)"
echo "3. Type 'GitWit: Start Review'"
echo "4. Get your Gemini API key from: https://makersuite.google.com/app/apikey"
echo "5. Add your API key in the Settings section"
echo "6. Start reviewing your code!"
echo ""
echo "📚 For more help, visit: https://github.com/shrutipandey15/gitwit"