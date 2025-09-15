import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  isCircuitBreakerOpen,
  recordFailure,
  recordSuccess,
} from '../utils/circuitBreaker';
import { retryWithBackoff } from '../utils/retry';
import {
  getAutomatedReviewPrompt,
  getCommitMessagePrompt,
  getDocstringPrompt,
  getPrompt,
  getExplanationPrompt,
} from './prompts';

export function parseAndValidateJsonResponse(rawText: string): any {
  const jsonRegex = /\{[\s\S]*\}/;
  const match = rawText.match(jsonRegex);
  if (!match) {
    throw new Error('AI response did not contain a valid JSON object.');
  }

  const jsonString = match[0];
  let parsedJson;
  try {
    parsedJson = JSON.parse(jsonString);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to parse AI response as JSON: ${message}`);
  }

  if (Array.isArray(parsedJson.issues) && parsedJson.hasOwnProperty('isClean')) {
    return parsedJson;
  }

  if (parsedJson.review && Array.isArray(parsedJson.productionRisk)) {
    const requiredReviewKeys = ['summary', 'critique', 'suggestions'];
    if (requiredReviewKeys.every(key => key in parsedJson.review)) {
      return parsedJson;
    }
  }

  if (parsedJson.hasOwnProperty('ready')) {
    if (parsedJson.ready && parsedJson.commitMessage) {
      return parsedJson;
    }
    if (!parsedJson.ready && parsedJson.reason) {
      return parsedJson;
    }
  }
  throw new Error('Invalid or incomplete AI response format.');
}
  
  export async function generateReview(
    code: string,
    persona: string,
    apiKey: string
  ): Promise<any> {
    if (isCircuitBreakerOpen()) {
      throw new Error('Service is currently unavailable. Please try again later.');
    }
  
    try {
      const prompt = getPrompt(persona, code);
      const result = await retryWithBackoff(async () => {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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
      throw new Error('Service is currently unavailable. Please try again later.');
    }
  
    try {
      const prompt = getAutomatedReviewPrompt(content, persona, isDiff);
      const result = await retryWithBackoff(async () => {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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
  
  export async function generateDocstring(
    code: string,
    apiKey: string
  ): Promise<string> {
    if (isCircuitBreakerOpen()) {
      throw new Error('Service is currently unavailable. Please try again later.');
    }
  
    try {
      const prompt = getDocstringPrompt(code);
      const result = await retryWithBackoff(async () => {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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
    apiKey: string
  ): Promise<any> {
    if (isCircuitBreakerOpen()) {
      throw new Error('Service is currently unavailable. Please try again later.');
    }
  
    try {
      const prompt = getCommitMessagePrompt(diff);
      const result = await retryWithBackoff(async () => {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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

  export async function generateExplanation(
  code: string,
  apiKey: string
): Promise<string> {
  if (isCircuitBreakerOpen()) {
    throw new Error('Service is currently unavailable. Please try again later.');
  }

  try {
    const prompt = getExplanationPrompt(code);
    const result = await retryWithBackoff(async () => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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