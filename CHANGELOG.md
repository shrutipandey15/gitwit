# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-07-17

### Added

* **Initial Release of GitWit**: The first version of the AI-powered code review assistant for VS Code.
* **AI-Powered Code Review**: Core functionality to analyze code snippets and provide a detailed review including a summary, critique, and suggestions.
* **Multiple Reviewer Personas**: Choose from five distinct reviewer personas to tailor the feedback style: `Strict Tech Lead`, `Supportive Mentor`, `Sarcastic Reviewer`, `Code Poet`, and `Paranoid Security Engineer`.
* **Production Risk Analysis**: The AI assesses the code for potential production risks and presents them in a "Production Risk Watch" section.
* **Docstring Generation**: Functionality to automatically generate professional docstrings for your code.
* **VS Code Extension Interface**: A user-friendly webview panel built with React and Tailwind CSS for a modern and responsive experience inside VS Code.
* **Node.js Backend Server**: A robust backend powered by Express.js to handle AI requests.
* **Resilient AI Service**: The backend implements a Circuit Breaker pattern and retry-with-backoff logic to ensure service reliability.
* **Custom API Key Support**: A settings section allows users to securely save their own Google AI API key in their VS Code configuration.
* **Copy to Clipboard**: A "Copy Review as Markdown" button to easily export the review for use in pull requests or documentation.