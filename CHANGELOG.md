# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [2.2.0] - 2025-10-03

### Added
- **AI-Powered Test Generation**: Added a context menu command ("CodeCritter: Generate Tests") to automatically generate a complete test file for a selected code block or an entire file.
- **Unified Intelligent Refactoring**: Implemented a single, powerful command ("CodeCritter: Intelligently Refactor") that refactors either a selection or an entire file, providing a detailed report on the changes and suggesting alternative architectural patterns.
- **Full-File Documentation Generation**: Added a "CodeCritter: Generate File Documentation" command to create comprehensive Markdown documentation for the active file.
- **Project-Aware README Generation**: Added a "CodeCritter: Generate Project README" command to the Command Palette, which analyzes the project's `package.json`, file structure, and entry point to generate a complete `README.md`.

### Changed
- **Smarter Commit Assistant**: The commit assistant is now more precise, staging only the specific changed file (`git add <file>`) instead of all files (`git add .`).
- **Improved Commit Quality Gate**: The commit assistant now includes a quality gate and will not trigger if the saved file contains any diagnostics with an "Error" severity, preventing suggestions for broken code.

## [1.2.0] - 2025-09-17

### Added
- **Hybrid Review System**: Implemented a revolutionary dual-layer code review that combines instant ESLint checks with deeper AI analysis
- **Real-time Code Review on Save**: Automatic code review triggers every time you save a file, providing instant feedback
- **Interactive Persona Selector**: Click the persona name in the status bar to dynamically switch between different reviewer personalities
- **New Rubber Duck Persona**: Added the classic "Rubber Duck" reviewer persona for rubber duck debugging-style code reviews
- **Code Explanation Feature**: New right-click context menu option "CodeCritter: Explain This Code" to get plain-English explanations of complex code blocks
- **Smart Commit Assistant**: AI-powered commit message generation with one-click stage and commit functionality
- **Enhanced Status Bar Integration**: Real-time status updates and persona display in the VS Code status bar
- **Inline Diagnostics**: Code review feedback now appears directly in the editor as inline diagnostics and suggestions
- **Manual Review on Demand**: Get comprehensive code reviews anytime with the "Get Manual Review" button
- **Production Risk Assessment**: Enhanced risk analysis with clear visual indicators for production readiness

### Changed
- **Improved User Experience**: Streamlined the entire workflow from a developer's perspective, following Alex's journey from morning setup to end-of-day commits
- **Enhanced Documentation Generation**: More sophisticated docstring generation with better context awareness
- **Refactored Extension Logic**: Major code refactoring for better maintainability and performance
- **Modern UI/UX**: Updated interface design for better visual feedback and user interaction

### Fixed
- **Web Bundling Issues**: Resolved compatibility issues with hybrid review system using ESLint
- **Extension Stability**: Multiple bug fixes and performance improvements for more reliable operation
- **Gamification Features**: Added positive reinforcement system to make code reviews more engaging

### Technical Improvements
- **Architecture Modernization**: Complete overhaul of the extension architecture for better scalability
- **Performance Optimization**: Improved response times and reduced resource usage
- **Error Handling**: Enhanced error handling and user feedback mechanisms

## [1.1.0] - 2025-07-17

### Added
- **Demo GIF**: Added visual demonstration of the extension in action to the README

### Changed
- **🚀 Standalone Extension**: CodeCritter is now a fully standalone extension that no longer requires a separate backend server
- **Direct API Integration**: The extension now communicates directly with Google's Gemini AI API from within the VS Code extension
- **Simplified Architecture**: All AI processing logic has been integrated into the extension.ts file, eliminating the need for external dependencies
- **Enhanced User Experience**: Users can now install and use CodeCritter immediately without any additional setup or server configuration

### Removed
- **Backend Server Dependency**: Removed the requirement for a separate Node.js Express.js backend server
- **Complex Setup Process**: Eliminated the need for users to run and maintain a separate backend service

### Fixed
- **Command Not Found Error**: Fixed a critical bug where the Start Review command would fail after the project was renamed.

### Technical Details
- Migrated AI service calls from external backend to embedded extension logic
- Integrated Circuit Breaker pattern and retry logic directly into the extension
- Streamlined the installation and setup process for end users

## [1.0.0] - 2025-07-17

### Added

* **Initial Release of CodeCritter**: The first version of the AI-powered code review assistant for VS Code.
* **AI-Powered Code Review**: Core functionality to analyze code snippets and provide a detailed review including a summary, critique, and suggestions.
* **Multiple Reviewer Personas**: Choose from five distinct reviewer personas to tailor the feedback style: `Strict Tech Lead`, `Supportive Mentor`, `Sarcastic Reviewer`, `Code Poet`, and `Paranoid Security Engineer`.
* **Production Risk Analysis**: The AI assesses the code for potential production risks and presents them in a "Production Risk Watch" section.
* **Docstring Generation**: Functionality to automatically generate professional docstrings for your code.
* **VS Code Extension Interface**: A user-friendly webview panel built with React and Tailwind CSS for a modern and responsive experience inside VS Code.
* **Node.js Backend Server**: A robust backend powered by Express.js to handle AI requests.
* **Resilient AI Service**: The backend implements a Circuit Breaker pattern and retry-with-backoff logic to ensure service reliability.
* **Custom API Key Support**: A settings section allows users to securely save their own Google AI API key in their VS Code configuration.
* **Copy to Clipboard**: A "Copy Review as Markdown" button to easily export the review for use in pull requests or documentation.