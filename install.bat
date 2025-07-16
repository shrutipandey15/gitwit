@echo off
cls

echo 🚀 CodeCritter Installation Script
echo ==============================

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo    Visit: https://nodejs.org/
    pause
    exit /b 1
)

:: Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ Node.js and npm are installed

:: Install dependencies
echo 📦 Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

:: Compile TypeScript
echo 🔨 Compiling TypeScript...
npm run compile
if %errorlevel% neq 0 (
    echo ❌ Failed to compile TypeScript
    pause
    exit /b 1
)

echo ✅ TypeScript compiled successfully

:: Check if vsce is installed
vsce --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Installing vsce (VS Code Extension Manager)...
    npm install -g vsce
    if %errorlevel% neq 0 (
        echo ❌ Failed to install vsce
        pause
        exit /b 1
    )
)

echo ✅ vsce is available

:: Package the extension
echo 📦 Packaging extension...
vsce package
if %errorlevel% neq 0 (
    echo ❌ Failed to package extension
    pause
    exit /b 1
)

echo ✅ Extension packaged successfully

:: Find the generated .vsix file
for %%f in (*.vsix) do set VSIX_FILE=%%f

if not defined VSIX_FILE (
    echo ❌ No .vsix file found
    pause
    exit /b 1
)

echo 📁 Extension package created: %VSIX_FILE%

:: Install the extension
echo 🔧 Installing extension in VS Code...
code --install-extension "%VSIX_FILE%"
if %errorlevel% neq 0 (
    echo ❌ Failed to install extension in VS Code
    echo 💡 You can manually install it by:
    echo    1. Open VS Code
    echo    2. Press Ctrl+Shift+P
    echo    3. Type 'Extensions: Install from VSIX...'
    echo    4. Select the file: %VSIX_FILE%
    pause
    exit /b 1
)

echo ✅ Extension installed successfully!
echo.
echo 🎉 CodeCritter is now ready to use!
echo.
echo 📖 Next steps:
echo 1. Open VS Code
echo 2. Press Ctrl+Shift+P
echo 3. Type 'CodeCritter: Start Review'
echo 4. Get your Gemini API key from: https://makersuite.google.com/app/apikey
echo 5. Add your API key in the Settings section
echo 6. Start reviewing your code!
echo.
echo 📚 For more help, visit: https://github.com/shrutipandey15/gitwit

pause