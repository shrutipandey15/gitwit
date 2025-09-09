export function getAutomatedReviewPrompt(
  content: string,
  persona: string,
  isDiff: boolean = false
): string {
  const contentType = isDiff ? 'code changes (diff)' : 'code';
  const baseInstruction = `
    You are performing an automated code review on ${contentType}.
    Analyze and provide feedback in pure JSON format with these keys:
    1. "review": Object with "summary", "critique", "suggestions" strings
    2. "productionRisk": Array of objects with "risk" string and "isSafe" boolean
    3. "severity": String - "low", "medium", or "high" based on issues found

    Focus on:
    - Code quality and maintainability
    - Potential bugs or logic errors
    - Performance concerns
    - Security vulnerabilities
    - Best practices violations

    Keep feedback concise but actionable.
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

export function getCommitMessagePrompt(diff: string): string {
  return `
    Your primary task is to generate a clear, conventional commit message for the following code diff.
    The format must be: <type>(<scope>): <short summary>.

    - Analyze the changes to understand their intent (e.g., adding a feature, fixing a bug, refactoring).
    - If the changes are reasonable, ALWAYS generate a commit message.
    - ONLY if the code diff shows extremely low quality, like syntax errors, large blocks of commented-out code, or only whitespace changes, should you decide it's not ready.

    Respond in a pure JSON format.
    - If you generate a message, the JSON should be: { "ready": true, "commitMessage": "..." }
    - ONLY in cases of extremely poor quality, the JSON should be: { "ready": false, "reason": "..." }

    Diff:
    \`\`\`
    ${diff}
    \`\`\`
  `;
}