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

export function getIntelligentRefactorPrompt(
  code: string,
  languageId: string
): string {
  const languageName = languageId.charAt(0).toUpperCase() + languageId.slice(1);

  return `
    You are an expert software architect specializing in the ${languageName} programming language.
    Your task is to analyze and refactor the provided code snippet to align with modern best practices for ${languageName}.

    **CRITICAL RULES:**
    1.  **LANGUAGE-SPECIFIC:** The output code MUST be 100% valid, runnable ${languageName}. Do NOT use syntax from other languages.
    2.  **COMPLETE & VALID CODE:** The "refactoredCode" MUST be complete and syntactically correct. It cannot contain placeholders, omissions, or comments like "[...]".
    3.  **PRESERVE LITERALS:** You MUST preserve complex literals (especially regular expressions, SQL queries, etc.) exactly as they are unless the refactoring is specifically about improving that literal.

    **Output Format:**
    Respond in a pure JSON format:
    {
      "refactoredCode": "...",
      "explanation": "...",
      "alternativeSuggestion": { "explanation": "...", "code": "..." }
    }

    **Instructions:**
    1.  **refactoredCode**: The full, complete, and syntactically valid refactored ${languageName} code.
    2.  **explanation**: A brief summary of the main improvement.
    3.  **alternativeSuggestion**: An optional, more optimal architectural pattern, also written in valid ${languageName}.

    Original ${languageName} Code:
    \`\`\`${languageId}
    ${code}
    \`\`\`
  `;
}

export function getIntelligentSelectionRefactorPrompt(
  selection: string,
  fullCode: string,
  languageId: string
): string {
  const languageName = languageId.charAt(0).toUpperCase() + languageId.slice(1);
  return `
    You are an expert software architect specializing in ${languageName}. Your primary task is to refactor the selected code snippet ('Code to Refactor').
    Use the 'Full File Context' to understand the existing architectural patterns and coding style.

    **CRITICAL RULES:**
    1.  **LANGUAGE-SPECIFIC:** The output code MUST be valid, runnable ${languageName}.
    2.  **COMPLETE & VALID SYNTAX:** The "refactoredCode" must be 100% complete and syntactically correct.
    3.  **PRESERVE LITERALS:** You MUST preserve complex literals (like regular expressions) exactly as they are.

    **Output Format:**
    Respond in a pure JSON format:
    {
      "refactoredCode": "...",
      "explanation": "...",
      "alternativeSuggestion": { "explanation": "...", "code": "..." }
    }

    ---
    **Full File Context:**
    \`\`\`${languageId}
    ${fullCode}
    \`\`\`
    ---
    **Code to Refactor:**
    \`\`\`${languageId}
    ${selection}
    \`\`\`
  `;
}

export function getReadmeGenerationPrompt(packageJson: string | null, entryPointCode: string | null, fileTree: string): string {
  // Conditionally build the context string
  let projectContext = `
    **Project File Structure:**
    \`\`\`
    ${fileTree}
    \`\`\`
  `;

  if (packageJson) {
    projectContext += `
    **package.json:**
    \`\`\`json
    ${packageJson}
    \`\`\`
    `;
  }

  if (entryPointCode) {
    projectContext += `
    **Main Entry Point Code:**
    \`\`\`
    ${entryPointCode}
    \`\`\`
    `;
  }

  return `
    You are an expert technical writer creating a README.md file.
    Use the provided project context to generate a comprehensive and user-friendly README in Markdown format.

    **Project Context:**
    ${projectContext}

    **README Structure:**
    - A project title and a short, engaging description.
    - A "Features" or "Purpose" section based on the code and file structure.
    - An "Installation" or "Setup" section with general instructions.
    - A "Usage" section explaining how to run or use the project.
    - If package.json was provided, mention key scripts or dependencies.

    Your response must be ONLY the raw Markdown content for the README.md file.
  `;
}