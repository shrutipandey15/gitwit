import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import {
  isCircuitBreakerOpen,
  recordFailure,
  recordSuccess,
} from "../utils/circuitBreaker";
import { retryWithBackoff } from "../utils/retry";
import {
  getAutomatedReviewPrompt,
  getCommitMessagePrompt,
  getDocstringPrompt,
  getPrompt,
  getExplanationPrompt,
  getTestGenerationPrompt,
  getRefactorAnalysisPrompt,
  getIntelligentRefactorPrompt,
  getIntelligentSelectionRefactorPrompt,
  getReadmeGenerationPrompt,
  getFileSummaryPrompt,
  getIssueFixPrompt
} from "./prompts";
import { IntelligentRefactorResponse, RefactorIssue } from "../types";

const AUTOMATED_REVIEW_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    issues: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          lineNumber: { type: SchemaType.NUMBER, description: "1-indexed line number of the issue" },
          severity:   { type: SchemaType.STRING, description: "Severity level: high, medium, or low" },
          message:    { type: SchemaType.STRING, description: "Clear description of the issue" },
        },
        required: ["lineNumber", "severity", "message"],
      },
    },
    isClean: { type: SchemaType.BOOLEAN, description: "true only when the code has no significant issues" },
  },
  required: ["issues", "isClean"],
};

const MANUAL_REVIEW_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    review: {
      type: SchemaType.OBJECT,
      properties: {
        summary:     { type: SchemaType.STRING },
        critique:    { type: SchemaType.STRING },
        suggestions: { type: SchemaType.STRING },
      },
      required: ["summary", "critique", "suggestions"],
    },
    productionRisk: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          risk:   { type: SchemaType.STRING },
          isSafe: { type: SchemaType.BOOLEAN },
        },
        required: ["risk", "isSafe"],
      },
    },
  },
  required: ["review", "productionRisk"],
};

const COMMIT_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    ready:         { type: SchemaType.BOOLEAN },
    commitMessage: { type: SchemaType.STRING },
    reason:        { type: SchemaType.STRING },
  },
  required: ["ready"],
};

const REFACTOR_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    refactoredCode: { type: SchemaType.STRING },
    explanation:    { type: SchemaType.STRING },
    alternativeSuggestion: {
      type: SchemaType.OBJECT,
      properties: {
        explanation: { type: SchemaType.STRING },
        code:        { type: SchemaType.STRING },
      },
      required: ["explanation", "code"],
    },
  },
  required: ["refactoredCode", "explanation"],
};

const ISSUE_FIX_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    fixedCode:   { type: SchemaType.STRING },
    explanation: { type: SchemaType.STRING },
  },
  required: ["fixedCode", "explanation"],
};

const REFACTOR_ANALYSIS_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    issues: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          line:     { type: SchemaType.NUMBER, description: "1-indexed line number where the issue occurs" },
          issue:    { type: SchemaType.STRING, description: "Concise description of the specific problem" },
          category: { type: SchemaType.STRING, description: "Category: naming, async-patterns, error-handling, type-safety, dead-code, performance, readability, or best-practices" },
        },
        required: ["line", "issue", "category"],
      },
    },
  },
  required: ["issues"],
};

function getJsonModel(apiKey: string, schema: object) {
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema as any,
    },
  });
}

function getTextModel(apiKey: string) {
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: "gemini-2.5-flash" });
}

export async function generateReview(
  code: string,
  persona: string,
  apiKey: string
): Promise<any> {
  if (isCircuitBreakerOpen()) {
    throw new Error("Service is currently unavailable. Please try again later.");
  }
  try {
    const result = await retryWithBackoff(async () => {
      const { response } = await getJsonModel(apiKey, MANUAL_REVIEW_SCHEMA).generateContent(getPrompt(persona, code));
      return JSON.parse(response.text());
    });
    recordSuccess();
    return result;
  } catch (error) {
    recordFailure();
    throw error;
  }
}

export async function generateAutomatedReview(
  content: string,
  persona: string,
  apiKey: string,
  isDiff: boolean = false,
  projectContext: string = ''
): Promise<any> {
  if (isCircuitBreakerOpen()) {
    throw new Error("Service is currently unavailable. Please try again later.");
  }
  try {
    const result = await retryWithBackoff(async () => {
      const { response } = await getJsonModel(apiKey, AUTOMATED_REVIEW_SCHEMA).generateContent(getAutomatedReviewPrompt(content, persona, isDiff, projectContext));
      return JSON.parse(response.text());
    });
    recordSuccess();
    return result;
  } catch (error) {
    recordFailure();
    console.error("CodeCritter: [AI] Failed to get automated review.", error);
    throw error;
  }
}

export async function generateDocstring(
  code: string,
  apiKey: string
): Promise<string> {
  if (isCircuitBreakerOpen()) {
    throw new Error("Service is currently unavailable. Please try again later.");
  }
  try {
    const result = await retryWithBackoff(async () => {
      const { response } = await getTextModel(apiKey).generateContent(getDocstringPrompt(code));
      return response.text();
    });
    recordSuccess();
    return result;
  } catch (error) {
    recordFailure();
    throw error;
  }
}

export async function analyzeAndSuggestCommit(
  diff: string,
  filePath: string,
  apiKey: string
): Promise<any> {
  if (isCircuitBreakerOpen()) {
    throw new Error("Service is currently unavailable. Please try again later.");
  }
  try {
    const result = await retryWithBackoff(async () => {
      const { response } = await getJsonModel(apiKey, COMMIT_SCHEMA).generateContent(getCommitMessagePrompt(diff, filePath));
      return JSON.parse(response.text());
    });
    recordSuccess();
    return result;
  } catch (error) {
    recordFailure();
    throw error;
  }
}

export async function generateExplanation(
  code: string,
  apiKey: string
): Promise<string> {
  if (isCircuitBreakerOpen()) {
    throw new Error("Service is currently unavailable. Please try again later.");
  }
  try {
    const result = await retryWithBackoff(async () => {
      const { response } = await getTextModel(apiKey).generateContent(getExplanationPrompt(code));
      return response.text();
    });
    recordSuccess();
    return result;
  } catch (error) {
    recordFailure();
    throw error;
  }
}

export async function generateTests(
  code: string,
  apiKey: string,
  framework: string = "Jest",
  symbolsContext: string = ""
): Promise<string> {
  if (isCircuitBreakerOpen()) {
    throw new Error("Service is currently unavailable.");
  }
  try {
    const result = await retryWithBackoff(async () => {
      const { response } = await getTextModel(apiKey).generateContent(getTestGenerationPrompt(code, framework, symbolsContext));
      return response.text().replace(/```(javascript|typescript)?\n?/g, "").replace(/```$/g, "").trim();
    });
    recordSuccess();
    return result;
  } catch (error) {
    recordFailure();
    throw error;
  }
}

export async function generateIntelligentRefactoring(
  code: string,
  apiKey: string,
  languageId: string,
  projectContext: string = ''
): Promise<IntelligentRefactorResponse> {
  if (isCircuitBreakerOpen()) {
    throw new Error("Service is currently unavailable.");
  }
  try {
    const { issues } = await retryWithBackoff(async () => {
      const { response } = await getJsonModel(apiKey, REFACTOR_ANALYSIS_SCHEMA).generateContent(getRefactorAnalysisPrompt(code, languageId));
      return JSON.parse(response.text()) as { issues: RefactorIssue[] };
    });

    if (issues.length === 0) {
      recordSuccess();
      return { refactoredCode: code, explanation: "No refactoring needed — the code already follows best practices." };
    }

    const result = await retryWithBackoff(async () => {
      const { response } = await getJsonModel(apiKey, REFACTOR_SCHEMA).generateContent(getIntelligentRefactorPrompt(code, languageId, issues, projectContext));
      return JSON.parse(response.text()) as IntelligentRefactorResponse;
    });
    recordSuccess();
    return result;
  } catch (error) {
    recordFailure();
    console.error("CodeCritter: [AI] Failed to get intelligent refactoring.", error);
    throw error;
  }
}

export async function generateIntelligentSelectionRefactoring(
  selection: string,
  fullCode: string,
  apiKey: string,
  languageId: string
): Promise<IntelligentRefactorResponse> {
  if (isCircuitBreakerOpen()) {
    throw new Error("Service is currently unavailable.");
  }
  try {
    const { issues } = await retryWithBackoff(async () => {
      const { response } = await getJsonModel(apiKey, REFACTOR_ANALYSIS_SCHEMA).generateContent(getRefactorAnalysisPrompt(selection, languageId));
      return JSON.parse(response.text()) as { issues: RefactorIssue[] };
    });

    if (issues.length === 0) {
      recordSuccess();
      return { refactoredCode: selection, explanation: "No refactoring needed — the selection already follows best practices." };
    }

    const result = await retryWithBackoff(async () => {
      const { response } = await getJsonModel(apiKey, REFACTOR_SCHEMA).generateContent(getIntelligentSelectionRefactorPrompt(selection, fullCode, languageId, issues));
      return JSON.parse(response.text()) as IntelligentRefactorResponse;
    });
    recordSuccess();
    return result;
  } catch (error) {
    recordFailure();
    console.error("CodeCritter: [AI] Failed to get intelligent selection refactoring.", error);
    throw error;
  }
}

export async function generateIssueFix(
  contextCode: string,
  issueMessage: string,
  issueLineInContext: number,
  languageId: string,
  apiKey: string
): Promise<{ fixedCode: string; explanation: string }> {
  if (isCircuitBreakerOpen()) {
    throw new Error("Service is currently unavailable.");
  }
  try {
    const result = await retryWithBackoff(async () => {
      const { response } = await getJsonModel(apiKey, ISSUE_FIX_SCHEMA).generateContent(getIssueFixPrompt(contextCode, issueMessage, issueLineInContext, languageId));
      return JSON.parse(response.text()) as { fixedCode: string; explanation: string };
    });
    recordSuccess();
    return result;
  } catch (error) {
    recordFailure();
    throw error;
  }
}

export async function summarizeFileContent(
  content: string,
  apiKey: string,
  languageId: string
): Promise<string> {
  try {
    const result = await retryWithBackoff(async () => {
      const { response } = await getTextModel(apiKey).generateContent(getFileSummaryPrompt(content, languageId));
      return response.text().replace(/["']/g, "").trim();
    });
    return result;
  } catch (error) {
    console.error("CodeCritter: [AI] Failed to summarize file.", error);
    return "Could not be summarized due to an API error.";
  }
}

export async function generateReadme(
  packageJson: string | null,
  fileTree: string,
  fileSummaries: string[],
  existingReadme: string | null,
  apiKey: string
): Promise<string> {
  if (isCircuitBreakerOpen()) {
    throw new Error("Service is currently unavailable.");
  }
  try {
    const result = await retryWithBackoff(async () => {
      const { response } = await getTextModel(apiKey).generateContent(getReadmeGenerationPrompt(packageJson, fileTree, fileSummaries, existingReadme));
      return response.text().replace(/^```markdown\n|```$/g, "");
    });
    recordSuccess();
    return result;
  } catch (error) {
    recordFailure();
    console.error("CodeCritter: [AI] Failed to generate README.", error);
    throw error;
  }
}
