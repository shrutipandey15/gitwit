# GitWit: Your AI Code Review Companion

GitWit is a VS Code extension that acts as an AI-powered code reviewer, helping you improve your code's quality, style, and security. With multiple reviewer personas, you can get tailored feedback, from a strict architectural analysis to supportive mentorship.

## How It Works

GitWit's architecture consists of a VS Code extension that communicates with a backend Node.js server to provide AI-powered code analysis.

## GitWit in Action
![GitWit Demo](https://raw.githubusercontent.com/shrutipandey15/gitwit/main/final_demo.gif)
### The VS Code Extension

The frontend of the extension is built with TypeScript and manages the user interaction within VS Code.

* **Activation**: The extension activates when a user runs the `gitwit.start` command from the command palette.
* **Webview Interface**: Upon activation, GitWit opens a webview panel titled "GitWit Review". This interface, built with React and Tailwind CSS, allows you to paste code, select a reviewer persona, and view the feedback.
* **API Key Management**: You can provide your own Google AI API key, which the extension saves into your VS Code configuration. The extension retrieves this key to use for backend requests.
* **Backend Communication**: The extension sends the user's code and selected persona to a local backend server running on `http://localhost:3001`. It then receives the generated review or docstring and displays it in the webview.

### The Backend Server

The backend is a Node.js application using Express.js to handle the core logic and AI communication.

* **API Endpoints**: The server exposes several endpoints:
    * `POST /review`: Accepts code and a persona to generate a code review.
    * `POST /generate-docstring`: Takes a code snippet and returns a generated docstring.
    * `POST /api/keys`: Allows for updating the API keys for the AI services.
* **AI Service Integration**: The backend is primarily configured to use the Google Gemini model (`gemini-1.5-flash`) for generating content. It is also structured to potentially support OpenAI and Anthropic as fallback options.
* **Prompt Engineering**: Based on the selected persona (e.g., "Strict Tech Lead", "Supportive Mentor", "Paranoid Security Engineer"), the server constructs a specific prompt to guide the AI's response format and focus. The AI is instructed to return a pure JSON object with `review` and `productionRisk` keys.
* **Resilience and Fallbacks**: To ensure reliability, the backend implements a **circuit breaker pattern**. If an AI service fails more than a set threshold (3 failures), the circuit breaker trips, and the service is bypassed for a timeout period (60 seconds). It also employs a **retry-with-backoff** mechanism for retryable API errors.

## Key Features

* **Multiple Reviewer Personas**: Choose from a variety of personas like "Strict Tech Lead," "Supportive Mentor," "Sarcastic Reviewer," "Code Poet," and "Paranoid Security Engineer" to get feedback in a specific style.
* **In-Depth Code Analysis**: Receive a comprehensive review that includes a "summary," "critique," and "suggestions" for your code.
* **Production Risk Assessment**: The AI analyzes potential production risks, indicating whether each identified risk is considered safe or not.
* **Docstring Generation**: Automatically create professional docstrings for your code snippets.
* **Copy as Markdown**: The extension provides a button to copy the full review to your clipboard in a Markdown format, ready to be pasted into pull requests or other documents.
* **Bring Your Own API Key**: Users can provide their own Gemini API key through the settings in the webview to ensure consistent access.

## Getting Started

1.  **Install the GitWit extension** from the VS Code Marketplace.
2.  **Run the backend server** as described in the project's repository. The extension expects the server to be running on `http://localhost:3001`.
3.  **Open the command palette** (`Ctrl+Shift+P` or `Cmd+Shift+P`) and run the `GitWit: Start Review` command.
4.  Optionally, go to the **Settings** section within the GitWit panel to save your Google AI API key.
5.  **Paste your code** into the text area.
6.  **Choose a reviewer persona** from the dropdown menu.
7.  Click **"Get Review"** or **"Generate Docstring"** to receive AI-powered feedback.