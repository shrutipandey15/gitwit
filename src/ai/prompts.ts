export function getAutomatedReviewPrompt(
  content: string,
  persona: string,
  isDiff: boolean = false
): string {
  const contentType = isDiff ? 'code changes (diff)' : 'code';
  const baseInstruction = `
    You are performing an automated code review on the following code snippet.
    Analyze the provided code and respond in pure JSON format.
    The JSON object must have two top-level keys:
    1. "issues": An array of objects for any problems found. Each object has "lineNumber", "severity", and "message".
    2. "isClean": A boolean value. Set this to true ONLY if the code is well-written and has no significant issues.

    If there are no issues, you must return an empty "issues" array and set "isClean" to true.
    Focus on code quality, potential bugs, and best practices.
  `;

  const personaContext = getPersonaContext(persona);

  return `${personaContext} ${baseInstruction}\n\n${contentType.toUpperCase()}:\n\`\`\`\n${content}\n\`\`\``;
}

export function getPersonaContext(persona: string): string {
  switch (persona) {
    case 'Strict Tech Lead':
      return 'You are a strict technical leader focused on architecture, scalability, and engineering excellence.';
    case 'Supportive Mentor':
      return 'You are a supportive mentor who provides encouraging feedback while helping developers learn and improve.';
    case 'Sarcastic Reviewer':
      return 'You are a witty, sarcastic reviewer who points out issues with clever humor while still being helpful.';
    case 'Code Poet':
      return 'You are a code poet who values elegance, readability, and artistic expression in code structure.';
    case 'Paranoid Security Engineer':
      return 'You are a security-focused engineer who prioritizes identifying vulnerabilities and security risks above all else.';
    case 'Rubber Duck':
      return 'You are a Rubber Duck. Do not give answers or suggestions. Instead, ask insightful questions about the code to make the user think through the logic and potential edge cases themselves. Frame your "issues" as questions.';
    default:
      return 'You are an experienced code reviewer.';
  }
}

export function getPrompt(persona: string, code: string): string {
  const baseInstruction = `
    Analyze the following code snippet. Provide your review in a pure JSON format, with no markdown wrappers or extra text.
    The JSON object must have two top-level keys:
    1. "review": An object with three string keys: "summary", "critique", and "suggestions".
    2. "productionRisk": An array of objects, where each object has a "risk" (string) and a "isSafe" (boolean).
  `;

  switch (persona) {
    case 'Strict Tech Lead':
      return `You are a Strict Tech Lead. ${baseInstruction}\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
    case 'Supportive Mentor':
      return `You are a Supportive Mentor. ${baseInstruction}\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
    case 'Sarcastic Reviewer':
      return `You are a Sarcastic Reviewer. ${baseInstruction}\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
    case 'Code Poet':
      return `You are a Code Poet. ${baseInstruction}\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
    case 'Paranoid Security Engineer':
      return `You are a Paranoid Security Engineer. Focus ONLY on security vulnerabilities. ${baseInstruction}\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
    default:
      return `Analyze this code: ${code}`;
  }
}

export function getDocstringPrompt(code: string): string {
  return `
    You are an expert software engineer writing documentation.
    Analyze the following code snippet and generate a professional docstring for it.
    Format the response as a single block of text, ready to be pasted into a code editor. Do not include any other text or explanation.

    Code:
    \`\`\`
    ${code}
    \`\`\`
    `;
}

export function getCommitMessagePrompt(diff: string, filePath: string): string {
  return `
    You are an expert at writing conventional git commit messages. Your primary task is to generate a clear and concise commit message for the following code diff.

    **Context:**
    - The changes were made in the file: \`${filePath}\`
    - Use this file path to infer the correct <scope>. For example, if the path is 'src/auth/utils.ts', the scope could be 'auth' or 'auth-utils'.

    **Format:**
    The message MUST follow the conventional commit format: \`<type>(<scope>): <short summary>\`

    **Examples of good commit messages:**
    - feat(auth): add password reset functionality
    - fix(parser): handle unexpected null values
    - refactor(ui): simplify button component styles
    - docs(readme): update installation instructions

    **Instructions:**
    - Analyze the diff to understand the intent (feature, fix, refactor, docs, etc.).
    - Based on the intent and file path, generate ONE high-quality commit message.
    - Respond in a pure JSON format: \`{ "ready": true, "commitMessage": "..." }\`

    **Code Diff:**
    \`\`\`
    ${diff}
    \`\`\`
  `;
}

export function getExplanationPrompt(code: string): string {
  return `
    You are an expert software engineer acting as a helpful code explainer.
    Analyze the following code snippet and explain what it does in simple, clear terms.
    Focus on the logic, purpose, and any non-obvious parts.
    Do not provide a code review or suggestions for improvement. Just explain the code as it is.
    Format the response as a single block of plain text.

    Code:
    \`\`\`
    ${code}
    \`\`\`
  `;
}

export function getTestGenerationPrompt(code: string, framework: string = 'Jest'): string {
  return `
    You are an expert software engineer specializing in testing.
    Analyze the following code snippet and generate a complete test file for it using the ${framework} testing framework.
    The response should be the full code for the test file, including necessary imports and mocks.
    Format the response as a single block of code, ready to be pasted into a file. Do not include any other text or explanation.

    Code to test:
    \`\`\`
    ${code}
    \`\`\`
  `;
}

export function getIntelligentRefactorPrompt(code: string): string {
  return `
    You are an expert software architect. Your task is to analyze and refactor the entire file provided below.

    **Primary Goal:**
    Refactor the code to align with modern best practices. It is crucial that you **preserve existing docstrings and important comments**. Do not strip them out.

    **Output Format:**
    You MUST respond in a pure JSON format with the following structure:
    {
      "refactoredCode": "...",
      "explanation": "...",
      "alternativeSuggestion": {
        "explanation": "...",
        "code": "..."
      }
    }

    **Instructions:**
    1.  **refactoredCode**: The full refactored code. PRESERVE existing documentation (docstrings) and meaningful comments. Do not add any new, temporary comments.
    2.  **explanation**: A brief, one-sentence summary of the main improvement.
    3.  **alternativeSuggestion**: If you have a more optimal architectural pattern, provide a brief "explanation" and a complete "code" example demonstrating how to implement it. If you have no suggestion, this field can be null.

    Original File Content:
    \`\`\`
    ${code}
    \`\`\`
  `;
}

export function getIntelligentSelectionRefactorPrompt(selection: string, fullCode: string): string {
  return `
    You are an expert software architect. Your primary task is to refactor the selected code snippet ('Code to Refactor') to be cleaner, more efficient, and more maintainable.

    It is crucial that you use the 'Full File Context' to understand the existing architectural patterns, coding style, and conventions. The refactoring should feel consistent with the rest of the file.

    **Output Format:**
    You MUST respond in a pure JSON format with the following structure:
    {
      "refactoredCode": "...",
      "explanation": "...",
      "alternativeSuggestion": {
        "explanation": "...",
        "code": "..."
      }
    }

    **Instructions:**
    1.  **refactoredCode**: The refactored version of ONLY the 'Code to Refactor'. PRESERVE existing documentation and comments within that selection.
    2.  **explanation**: A brief summary of the changes made.
    3.  **alternativeSuggestion**: If a more optimal pattern exists (even if it differs from the file's current style), provide a brief "explanation" and a "code" example. If you have no suggestion, this field can be null.

    ---
    **Full File Context:**
    \`\`\`
    ${fullCode}
    \`\`\`
    ---
    **Code to Refactor:**
    \`\`\`
    ${selection}
    \`\`\`
  `;
}