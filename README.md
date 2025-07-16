# CodeCritter: Your AI Code Review Companion

CodeCritter is a VS Code extension that acts as an AI-powered code reviewer, helping you improve your code's quality, style, and security. With multiple reviewer personas, you can get tailored feedback, from a strict architectural analysis to supportive mentorship.

## 🎬 Demo

![CodeCritter Demo](https://github.com/shrutipandey15/gitwit/blob/main/final_demo.gif?raw=true)

## ✨ Features

- **🤖 AI-Powered Code Review**: Get comprehensive code analysis with summary, critique, and suggestions
- **👥 Multiple Reviewer Personas**: Choose from 5 distinct personalities:
  - **Strict Tech Lead** - Architectural focus and best practices
  - **Supportive Mentor** - Encouraging feedback with learning opportunities
  - **Sarcastic Reviewer** - Witty and direct feedback
  - **Code Poet** - Artistic and elegant code suggestions
  - **Paranoid Security Engineer** - Security-focused analysis
- **🔒 Security Analysis**: Production risk assessment with safety indicators
- **📝 Docstring Generation**: Auto-generate professional documentation
- **📋 Copy to Clipboard**: Export reviews as Markdown for PRs
- **🔑 Secure API Key Storage**: Your Gemini API key is stored locally in VS Code settings

## 🚀 Quick Start

1. **Install the extension** from the VS Code Marketplace
2. **Get a Gemini API key** from [Google AI Studio](https://makersuite.google.com/app/apikey)
3. **Open Command Palette** (`Ctrl+Shift+P` or `Cmd+Shift+P`)
4. **Run** `CodeCritter: Start Review`
5. **Add your API key** in the Settings section
6. **Paste your code** and get instant feedback!

## 🛠️ How It Works

CodeCritter is now a **standalone extension** that communicates directly with Google's Gemini AI API. No separate backend server needed!

### The Extension Architecture

- **Direct API Integration**: The extension communicates directly with Gemini AI
- **Circuit Breaker Pattern**: Handles API failures gracefully with automatic recovery
- **Retry Logic**: Implements exponential backoff for reliable service
- **Secure Storage**: API keys are stored securely in VS Code's configuration

### Key Components

1. **Webview Interface**: Modern React + Tailwind CSS UI
2. **AI Service**: Direct integration with Google Gemini 1.5 Flash
3. **Prompt Engineering**: Specialized prompts for each reviewer persona
4. **Error Handling**: Robust error handling and user feedback

## 🔧 Installation & Setup

### Method 1: VS Code Marketplace (Recommended)
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "GitWit"
4. Click "Install"

### Method 2: Manual Installation
1. Download the `.vsix` file from releases
2. Open VS Code
3. Run `Extensions: Install from VSIX...` from Command Palette
4. Select the downloaded file

### Getting Your API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key and paste it in GitWit's settings

## 📖 Usage Guide

### Basic Review Process
1. **Open GitWit**: Use Command Palette → `CodeCritter: Start Review`
2. **Add API Key**: Go to Settings section and save your Gemini API key
3. **Paste Code**: Add your code snippet in the text area
4. **Select Persona**: Choose your preferred reviewer style
5. **Get Review**: Click "Get Review" for comprehensive analysis
6. **Copy Results**: Use "Copy Review as Markdown" for documentation

### Reviewer Personas Explained

#### 🏗️ Strict Tech Lead
- Focus on architecture and scalability
- Emphasizes best practices and patterns
- Identifies potential technical debt

#### 🤝 Supportive Mentor
- Encouraging and educational approach
- Explains the "why" behind suggestions
- Great for learning and improvement

#### 😏 Sarcastic Reviewer
- Witty and direct feedback
- Points out obvious issues with humor
- Keeps reviews entertaining

#### 🎨 Code Poet
- Focuses on code elegance and readability
- Artistic approach to code structure
- Emphasizes beautiful, clean code

#### 🔒 Paranoid Security Engineer
- Security-first analysis
- Identifies vulnerabilities and risks
- Focuses on production safety

### Production Risk Assessment
Each review includes a "Production Risk Watch" section that:
- ✅ **Safe**: No production concerns
- ⚠️ **Risk**: Potential production issues identified
- Lists specific risks with safety indicators

## 🔒 Privacy & Security

- **Local Storage**: API keys are stored locally in VS Code settings
- **No Data Collection**: GitWit doesn't collect or store your code
- **Direct API Calls**: Your code is sent directly to Google's Gemini API
- **Secure Transport**: All API calls use HTTPS encryption

## 🛠️ Development

### Building from Source
```bash
git clone https://github.com/shrutipandey15/gitwit.git
cd gitwit
npm install
npm run compile
```

### Testing the Extension
```bash
npm run test
```

### Packaging
```bash
npm install -g vsce
vsce package
```

## 🤝 Contributing

I welcome contributions! Please see my [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Report bugs on [GitHub Issues](https://github.com/shrutipandey15/gitwit/issues)
- **Discussions**: Ask questions in [GitHub Discussions](https://github.com/shrutipandey15/gitwit/discussions)
- **Email**: Contact the maintainer at [email]

## 🎯 Roadmap

- [ ] Support for more AI providers (OpenAI, Claude)
- [ ] Custom prompt templates
- [ ] Integration with GitHub Pull Requests
- [ ] Code quality metrics
- [ ] Team collaboration features

## 📊 Stats

- **Languages Supported**: All programming languages
- **AI Model**: Google Gemini 1.5 Flash
- **VS Code Version**: 1.85.0+
- **License**: MIT

---

Made with ❤️ by [Shruti Pandey](https://github.com/shrutipandey15)

*CodeCritter - Making code reviews intelligent, one line at a time.*