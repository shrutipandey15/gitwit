export function getAutomatedReviewPrompt(
  content: string,
  persona: string,
  isDiff: boolean = false,
  projectContext: string = ''
): string {
  const contentType = isDiff ? 'code changes (diff)' : 'code';
  const baseInstruction = `
    You are performing an automated code review.
    Analyze the ${contentType} below and populate the response fields:
    - "issues": list each problem with its 1-indexed line number, a severity of "high", "medium", or "low", and a clear message.
    - "isClean": set to true ONLY when there are genuinely no significant issues.
    Focus on correctness, potential bugs, and best practices. Do not invent issues.
  `;

  const contextBlock = projectContext
    ? `\n\nPROJECT CONTEXT (exported types and interfaces from local imports):\n${projectContext}`
    : '';

  return `${getPersonaContext(persona)} ${baseInstruction}${contextBlock}\n\n${contentType.toUpperCase()}:\n\`\`\`\n${content}\n\`\`\``;
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
      return 'You are a Rubber Duck debugging assistant. You MUST still return valid JSON in the exact format specified. Identify real issues in the code, but phrase each "message" as an insightful question that prompts the developer to think (e.g., "What happens if this value is null?" or "Have you considered what occurs when the list is empty?"). Still assign a proper severity of "high", "medium", or "low" based on the issue\'s actual impact.';
    default:
      return 'You are an experienced code reviewer.';
  }
}

export function getPrompt(persona: string, code: string): string {
  const baseInstruction = `
    Analyze the code below and populate the response fields:
    - "review": provide a "summary" (overall assessment), "critique" (specific problems), and "suggestions" (concrete improvements).
    - "productionRisk": list each potential production concern with a "risk" description and "isSafe" boolean.
  `;

  const personaContext = getPersonaContext(persona);
  return `${personaContext} ${baseInstruction}\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
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
    You are an expert at writing conventional git commit messages.

    The changes were made in: \`${filePath}\`
    Use the file path to infer the correct scope (e.g. 'src/auth/utils.ts' → scope 'auth').

    Commit message format: \`<type>(<scope>): <short summary>\`
    Examples: feat(auth): add password reset, fix(parser): handle null values, refactor(ui): simplify button

    Populate the response fields:
    - "ready": always true when a commit message can be generated
    - "commitMessage": one high-quality conventional commit message based on the diff
    - "reason": only populate if you cannot determine intent from the diff

    Code diff:
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

export function getTestGenerationPrompt(
  code: string,
  framework: string = 'Jest',
  symbolsContext: string = ''
): string {
  if (symbolsContext) {
    return `You are an expert software engineer writing comprehensive ${framework} tests.

The following are the testable functions and classes extracted from the file, with their exact resolved type signatures and implementations:

${symbolsContext}

Generate a complete, runnable ${framework} test file that:
- Tests each function/method listed above
- Uses the exact type signatures above to construct accurate test inputs and expected outputs
- Covers normal cases, edge cases (empty inputs, nulls, boundary values), and error/exception conditions
- Includes appropriate mocks/stubs for external dependencies (HTTP calls, databases, file system, etc.)
- Follows ${framework} best practices and conventions

Output ONLY the complete test file code. No explanation, no markdown fences around the file.`;
  }

  return `You are an expert software engineer specializing in testing.
Generate a complete ${framework} test file for the code below.
Include all necessary imports, mocks, and test cases covering normal behavior, edge cases, and errors.
Output ONLY the test file code — no explanation, no markdown fences around the file.

Code to test:
\`\`\`
${code}
\`\`\``;
}

export function getRefactorAnalysisPrompt(code: string, languageId: string): string {
  const languageName = languageId.charAt(0).toUpperCase() + languageId.slice(1);
  return `You are an expert ${languageName} code analyst. Your ONLY job is to identify specific, actionable code quality issues. Do NOT fix anything.

For each issue found, populate:
- "line": the 1-indexed line number where the issue occurs
- "issue": a concise, specific description of the problem (e.g., "uses var instead of const", "missing error handling on async call", "magic number should be a named constant")
- "category": one of: naming, async-patterns, error-handling, type-safety, dead-code, performance, readability, best-practices

Rules:
- Report REAL issues only — do not invent problems.
- Be specific about line numbers. Do not report vague concerns.
- Focus on clearly improvable issues, not minor stylistic opinions.
- If the code is already clean and idiomatic, return an empty "issues" array.

${languageName} code to analyze:
\`\`\`${languageId}
${code}
\`\`\``;
}

export function getIntelligentRefactorPrompt(
  code: string,
  languageId: string,
  issues: { line: number; issue: string; category: string }[],
  projectContext: string = ''
): string {
  const languageName = languageId.charAt(0).toUpperCase() + languageId.slice(1);
  const issueList = issues
    .map((i, idx) => `${idx + 1}. Line ${i.line} [${i.category}]: ${i.issue}`)
    .join('\n');

  const contextBlock = projectContext
    ? `\nPROJECT CONTEXT (exported types and interfaces from local imports — align fixes with these):\n${projectContext}\n`
    : '';

  return `You are an expert software architect specializing in ${languageName}.
Fix ONLY the specific issues listed below. Do NOT make any other changes to the code.
${contextBlock}
Issues to fix:
${issueList}

Rules:
- Output code MUST be 100% valid, runnable ${languageName} — no syntax from other languages.
- "refactoredCode" must be complete and syntactically correct — no placeholders or "[...]" omissions.
- Preserve ALL code unrelated to the listed issues exactly as-is.
- Preserve complex literals (regex, SQL queries, etc.) exactly unless they are the reported issue.

Populate the response fields:
- "refactoredCode": the full, complete fixed ${languageName} code.
- "explanation": one concise sentence summarizing the fixes applied.
- "alternativeSuggestion": optionally, a more optimal architectural approach (also valid ${languageName}).

Original ${languageName} code:
\`\`\`${languageId}
${code}
\`\`\``;
}

export function getIntelligentSelectionRefactorPrompt(
  selection: string,
  fullCode: string,
  languageId: string,
  issues: { line: number; issue: string; category: string }[]
): string {
  const languageName = languageId.charAt(0).toUpperCase() + languageId.slice(1);
  const issueList = issues
    .map((i, idx) => `${idx + 1}. Line ${i.line} [${i.category}]: ${i.issue}`)
    .join('\n');

  return `You are an expert software architect specializing in ${languageName}.
Fix ONLY the specific issues listed below in the 'Code to Refactor' snippet. Use 'Full File Context' only to match existing patterns and style.

Issues to fix (line numbers are relative to the snippet):
${issueList}

Rules:
- Output code MUST be valid, runnable ${languageName}.
- "refactoredCode" must be 100% complete and syntactically correct — no placeholders.
- Preserve ALL code in the snippet unrelated to the listed issues exactly as-is.
- Preserve complex literals (regex, etc.) exactly as they are.

Populate the response fields:
- "refactoredCode": the complete fixed snippet only (not the full file).
- "explanation": one concise sentence summarizing the fixes applied.
- "alternativeSuggestion": optionally, a more optimal architectural approach (also valid ${languageName}).

Full File Context:
\`\`\`${languageId}
${fullCode}
\`\`\`

Code to Refactor:
\`\`\`${languageId}
${selection}
\`\`\``;
}

export function getReadmeGenerationPrompt(
  packageJson: string | null,
  fileTree: string,
  fileSummaries: string[],
  existingReadme: string | null
): string {
  let projectContext = `
**1. Project File Structure:**
\`\`\`
${fileTree}
\`\`\`
`;

  if (packageJson) {
    projectContext += `
**2. package.json Content (if applicable):**
\`\`\`json
${packageJson}
\`\`\`
`;
  }

  if (fileSummaries.length > 0) {
    projectContext += `
**3. Architectural Overview (Summaries of Key Files):**
${fileSummaries.join('\n')}
`;
  }

  if (existingReadme) {
    return `
      You are an expert technical writer updating a project's README.md.
      Your task is to intelligently merge the fresh 'Project Context' into the 'Existing README'.

      **CRITICAL RULES:**
      1.  **Preserve User Content:** Retain valuable, user-written sections from the 'Existing README' that cannot be auto-generated (e.g., 'License', 'Contributing Guidelines', 'Acknowledgements').
      2.  **Update and Enrich:** Your primary goal is to replace or enrich the 'Features' and 'Architecture' sections of the 'Existing README' using the new, detailed information from the 'Project Context'.
      3.  **Replace if Generic:** If the 'Existing README' is just a generic template (contains placeholders like "Project Title Placeholder"), you should ignore it and generate a completely new, high-quality README from the 'Project Context'.
      4.  **Full Output:** Your final output MUST be the full, complete markdown for the updated README.md file. Do not output only the changed sections.

      ---
      **EXISTING README.md CONTENT TO UPDATE:**
      \`\`\`markdown
      ${existingReadme}
      \`\`\`
      ---
      **FRESH PROJECT CONTEXT TO INCORPORATE:**
      ${projectContext}
    `;
  } else {
    return `
      You are an expert technical writer creating a README.md file from scratch for a software project.
      Your response MUST be based ONLY on the detailed project context provided below.
      Do NOT use placeholder text or invent features. Your task is to synthesize the context into a specific and accurate README.

      **README Structure Requirements:**
      - **Project Title & Description:** Derive from the package.json and architectural overview.
      - **Features Section:** Derive from the file summaries and package.json.
      - **Architecture Section:** Use the file summaries to explain the role of each key component.
      - **Installation & Usage Sections:** Reference scripts from the package.json.

      Begin generating ONLY the raw Markdown content now.

      ---
      **DETAILED PROJECT CONTEXT:**
      ${projectContext}
    `;
  }
}

export function getIssueFixPrompt(
  contextCode: string,
  issueMessage: string,
  issueLineInContext: number,
  languageId: string
): string {
  const languageName = languageId.charAt(0).toUpperCase() + languageId.slice(1);
  return `You are a precise code repair assistant specializing in ${languageName}.

A code review found this issue on line ${issueLineInContext + 1} (1-indexed):
"${issueMessage}"

Code snippet (${languageName}):
\`\`\`${languageId}
${contextCode}
\`\`\`

Populate the response fields:
- "fixedCode": the COMPLETE snippet with the minimal fix applied — all same lines, same indentation, no unrelated changes.
- "explanation": one concise sentence describing exactly what was changed and why.

Do NOT add comments, docstrings, or improvements beyond the reported issue.`;
}

export function getFileSummaryPrompt(content: string, languageId: string): string {
  const languageName = languageId.charAt(0).toUpperCase() + languageId.slice(1);
  return `
    Analyze the following ${languageName} code.
    In a single, concise sentence, describe the primary purpose or responsibility of this module.
    Do not explain the code line-by-line. Focus on the high-level role of the file.
    Example: "This module handles communication with the Google Generative AI API and includes retry/circuit breaker logic."

    Code:
    \`\`\`${languageId}
    ${content}
    \`\`\`
  `;
}