# 🐾 CodeCritter: Your AI Code Review Companion

Ever wish you had a second pair of eyes on your code before the real, human code review? Tired of those little nitpicks that always seem to slip through, or that sinking feeling when you push code you're not 100% confident in?

That's exactly why I built CodeCritter. It's an AI-powered sidekick that lives in your VS Code editor and acts as your personal code reviewer, documentation assistant, and refactoring partner. It's here to help you ship better code with less stress.

## 🎬 See It in Action

![CodeCritter Demo](https://github.com/shrutipandey15/gitwit/blob/main/final_demo.gif?raw=true)

## ✨ What's in the Toolbox?

CodeCritter isn't just a linter; it's a full suite of tools designed to automate the tedious parts of coding so you can focus on the fun parts.

**The Hybrid Reviewer** 🤖 The moment you save a file, you get the best of both worlds. An instant ESLint check catches common mistakes, followed by a deeper AI analysis that looks at logic, potential bugs, and architecture.

**The Persona Selector** 🎭 Tired of dry, robotic feedback? Click the persona name in the status bar and choose who reviews your code. Get roasted by the Sarcastic Reviewer, get a lesson from the Strict Tech Lead, or get some encouragement from the Supportive Mentor.

**The Docstring Drone** 📝 Stop writing boilerplate docs. Paste a function into the CodeCritter panel and get a professional docstring generated for you instantly.

**The Code Explainer** 🤔 Highlight a confusing block of legacy code, right-click, and select CodeCritter: Explain This Code. Get a simple, plain-English explanation in seconds.

**The Commit Assistant** ✅ When you've made some changes, CodeCritter will analyze your work and suggest a commit message. If you like it, one click stages and commits your work.

## 🚀 A Developer's Guide to Using CodeCritter

Meet Alex. Alex is a developer who loves to code but gets bogged down by repetitive tasks and the dread of upcoming code reviews. This is the story of how CodeCritter became her AI sidekick.

### ☕ Morning Coffee & Setup (5 minutes)

**Install the Tool** Alex opens the Extensions view in VS Code (Ctrl+Shift+X), searches for CodeCritter, and hits Install. Easy.

**Grab the API Key** She heads over to [Google AI Studio](https://makersuite.google.com/app/apikey) and grabs her free Gemini API key.

**Plug it In** In VS Code, she opens the Command Palette (Ctrl+Shift+P) and runs CodeCritter: Start Review. In the panel that opens, she pastes her key into the API Settings section and clicks Save. Setup is done before her coffee cools.

### 💻 Mid-day: The Coding Session

**The Magic Happens on Save** As Alex works on a file and saves it, ESLint instantly flags an unused variable, which she fixes. A moment later, the AI Reviewer suggests a small logical improvement right in her editor. It feels like a mini code review happening in real-time.

### 🔍 Afternoon: Tackling a Tricky Function

**"What Does This Even Do?"** Alex finds a confusing block of legacy code, highlights it, and right-clicks to use CodeCritter: Explain This Code. A simple explanation appears, and she's back on track in seconds.

**Time to Document** She pastes the function into the CodeCritter panel and clicks Generate Docstring. A perfect, professional docstring appears.

**Getting a Second Opinion** Before moving on, she clicks Get Manual Review. The AI provides a full report with a "Production Risk" assessment. ✅ All clear!

### 🌙 End of Day: Wrapping Up

**A Perfect Commit, Every Time** Just as Alex is about to type git commit, CodeCritter suggests a perfectly formatted message. She clicks the "Commit" button, and her work is staged and committed instantly.

**Bonus: A Change of Pace** For fun, Alex clicks the persona name in the status bar. Tomorrow, she's rolling with the Sarcastic Reviewer. Code reviews just got a lot more interesting.

## 🎯 The Vision (Our Roadmap)

CodeCritter is just getting started. The goal is to evolve it into a full "Code-Forge" that actively helps you write and refactor code, not just review it.

- [ ] **The Refactor-Bot 9000**: Programmatically refactor code to modernize JavaScript and extract clean functions.
- [ ] **The Boilerplate Obliterator**: Generate unit tests, create TypeScript types from JSON, and kill repetitive setup.
- [ ] **The Documentation Drone**: Generate full-file documentation, not just snippets.
- [ ] **Support for More AIs**: Add OpenAI's GPT, Anthropic's Claude, and others.

## 🤝 Want to Help Build It?

This is an open-source project, and contributions are always welcome!

1. Fork the repo.

2. Create a feature branch:
    ```bash
     `git checkout -b feature/amazing-feature`

3. Commit your changes: 
    ```bash
    `git commit -m 'Add some amazing feature'`

4. Push to the branch: 
    ```bash
    `git push origin feature/amazing-feature`
    
5. Open a Pull Request!

## 📄 License

This project is licensed under the MIT License. See the [LICENSE]() file for details.

---

Made with ❤️ by Shruti Pandey

**CodeCritter** – Making code reviews a little less painful, and a lot more fun :)
