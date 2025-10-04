import { GoogleGenerativeAI } from "@google/generative-ai";
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
  getIntelligentRefactorPrompt,
  getIntelligentSelectionRefactorPrompt,
  getReadmeGenerationPrompt
} from "./prompts";
import { IntelligentRefactorResponse } from "../types";

export function parseAndValidateJsonResponse(rawText: string): any {
  const jsonRegex = /\{[\s\S]*\}/;
  const match = rawText.match(jsonRegex);
  if (!match) {
    throw new Error("AI response did not contain a valid JSON object.");
  }

  const jsonString = match[0];
  let parsedJson;
  try {
    parsedJson = JSON.parse(jsonString);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to parse AI response as JSON: ${message}`);
  }

  if (
    Array.isArray(parsedJson.issues) &&
    parsedJson.hasOwnProperty("isClean")
  ) {
    return parsedJson;
  }

  if (parsedJson.review && Array.isArray(parsedJson.productionRisk)) {
    const requiredReviewKeys = ["summary", "critique", "suggestions"];
    if (requiredReviewKeys.every((key) => key in parsedJson.review)) {
      return parsedJson;
    }
  }

  if (parsedJson.hasOwnProperty("ready")) {
    if (parsedJson.ready && parsedJson.commitMessage) {
      return parsedJson;
    }
    if (!parsedJson.ready && parsedJson.reason) {
      return parsedJson;
    }
  }
  throw new Error("Invalid or incomplete AI response format.");
}

export async function generateReview(
  code: string,
  persona: string,
  apiKey: string
): Promise<any> {
  if (isCircuitBreakerOpen()) {
    throw new Error(
      "Service is currently unavailable. Please try again later."
    );
  }

  try {
    const prompt = getPrompt(persona, code);
    const result = await retryWithBackoff(async () => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return parseAndValidateJsonResponse(text);
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
  isDiff: boolean = false
): Promise<any> {
  if (isCircuitBreakerOpen()) {
    console.log("CodeCritter: [AI] Circuit breaker is open. Blocking call.");

    throw new Error(
      "Service is currently unavailable. Please try again later."
    );
  }

  try {
    const prompt = getAutomatedReviewPrompt(content, persona, isDiff);
    console.log(
      `CodeCritter: [AI] Sending prompt for automated review (Persona: ${persona}).`
    );

    const result = await retryWithBackoff(async () => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log("CodeCritter: [AI] Raw response from API:", text);

      return parseAndValidateJsonResponse(text);
    });

    recordSuccess();
    console.log("CodeCritter: [AI] Successfully parsed AI response.");

    return result;
  } catch (error) {
    recordFailure();
    console.error(
      "CodeCritter: [AI] Failed to get or parse AI response.",
      error
    );

    throw error;
  }
}

export async function generateDocstring(
  code: string,
  apiKey: string
): Promise<string> {
  if (isCircuitBreakerOpen()) {
    throw new Error(
      "Service is currently unavailable. Please try again later."
    );
  }

  try {
    const prompt = getDocstringPrompt(code);
    const result = await retryWithBackoff(async () => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
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
    const prompt = getCommitMessagePrompt(diff, filePath); 

    const result = await retryWithBackoff(async () => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("AI response did not contain a valid JSON object.");
      }
      return JSON.parse(jsonMatch[0]);
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
    throw new Error(
      "Service is currently unavailable. Please try again later."
    );
  }

  try {
    const prompt = getExplanationPrompt(code);
    const result = await retryWithBackoff(async () => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
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
  apiKey: string
): Promise<string> {
  if (isCircuitBreakerOpen()) {
    throw new Error("Service is currently unavailable.");
  }

  try {
    const prompt = getTestGenerationPrompt(code);
    const result = await retryWithBackoff(async () => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```(javascript|typescript)?/g, '').trim();
      return text;
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
  languageId: string
): Promise<IntelligentRefactorResponse> {
  console.log("CodeCritter: [AI] Starting intelligent file refactoring.");

  try {
    const prompt = getIntelligentRefactorPrompt(code, languageId);
    const result = await retryWithBackoff(async () => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return JSON.parse(text.match(/\{[\s\S]*\}/)![0]);
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
  console.log("CodeCritter: [AI] Starting intelligent selection refactoring.");

  if (isCircuitBreakerOpen()) {
    throw new Error("Service is currently unavailable.");
  }

  try {
    const prompt = getIntelligentSelectionRefactorPrompt(selection, fullCode, languageId);
    const result = await retryWithBackoff(async () => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("AI response did not contain a valid JSON object.");
      }
      return JSON.parse(jsonMatch[0]);
    });

    recordSuccess();
    return result;
  } catch (error) {
    recordFailure();
    console.error("CodeCritter: [AI] Failed to get intelligent selection refactoring.", error);
    throw error;
  }
}

export async function generateReadme(
  packageJson: string | null,
  entryPointCode: string | null,
  fileTree: string,
  apiKey: string
): Promise<string> {
  console.log("CodeCritter: [AI] Starting README generation.");
  if (isCircuitBreakerOpen()) {
    throw new Error("Service is currently unavailable.");
  }

  try {
    const prompt = getReadmeGenerationPrompt(packageJson, entryPointCode, fileTree);
    const result = await retryWithBackoff(async () => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().replace(/^```markdown\n|```$/g, '');
    });

    recordSuccess();
    return result;
  } catch (error) {
    recordFailure();
    console.error("CodeCritter: [AI] Failed to generate README.", error);
    throw error;
  }
}