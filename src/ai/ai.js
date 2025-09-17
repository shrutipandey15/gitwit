"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAndValidateJsonResponse = parseAndValidateJsonResponse;
exports.generateReview = generateReview;
exports.generateAutomatedReview = generateAutomatedReview;
exports.generateDocstring = generateDocstring;
exports.analyzeAndSuggestCommit = analyzeAndSuggestCommit;
exports.generateExplanation = generateExplanation;
const generative_ai_1 = require("@google/generative-ai");
const circuitBreaker_1 = require("../utils/circuitBreaker");
const retry_1 = require("../utils/retry");
const prompts_1 = require("./prompts");
function parseAndValidateJsonResponse(rawText) {
    const jsonRegex = /\{[\s\S]*\}/;
    const match = rawText.match(jsonRegex);
    if (!match) {
        throw new Error("AI response did not contain a valid JSON object.");
    }
    const jsonString = match[0];
    let parsedJson;
    try {
        parsedJson = JSON.parse(jsonString);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to parse AI response as JSON: ${message}`);
    }
    if (Array.isArray(parsedJson.issues) &&
        parsedJson.hasOwnProperty("isClean")) {
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
async function generateReview(code, persona, apiKey) {
    if ((0, circuitBreaker_1.isCircuitBreakerOpen)()) {
        throw new Error("Service is currently unavailable. Please try again later.");
    }
    try {
        const prompt = (0, prompts_1.getPrompt)(persona, code);
        const result = await (0, retry_1.retryWithBackoff)(async () => {
            const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            return parseAndValidateJsonResponse(text);
        });
        (0, circuitBreaker_1.recordSuccess)();
        return result;
    }
    catch (error) {
        (0, circuitBreaker_1.recordFailure)();
        throw error;
    }
}
async function generateAutomatedReview(content, persona, apiKey, isDiff = false) {
    if ((0, circuitBreaker_1.isCircuitBreakerOpen)()) {
        console.log("CodeCritter: [AI] Circuit breaker is open. Blocking call.");
        throw new Error("Service is currently unavailable. Please try again later.");
    }
    try {
        const prompt = (0, prompts_1.getAutomatedReviewPrompt)(content, persona, isDiff);
        console.log(`CodeCritter: [AI] Sending prompt for automated review (Persona: ${persona}).`);
        const result = await (0, retry_1.retryWithBackoff)(async () => {
            const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            console.log("CodeCritter: [AI] Raw response from API:", text);
            return parseAndValidateJsonResponse(text);
        });
        (0, circuitBreaker_1.recordSuccess)();
        console.log("CodeCritter: [AI] Successfully parsed AI response.");
        return result;
    }
    catch (error) {
        (0, circuitBreaker_1.recordFailure)();
        console.error("CodeCritter: [AI] Failed to get or parse AI response.", error);
        throw error;
    }
}
async function generateDocstring(code, apiKey) {
    if ((0, circuitBreaker_1.isCircuitBreakerOpen)()) {
        throw new Error("Service is currently unavailable. Please try again later.");
    }
    try {
        const prompt = (0, prompts_1.getDocstringPrompt)(code);
        const result = await (0, retry_1.retryWithBackoff)(async () => {
            const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        });
        (0, circuitBreaker_1.recordSuccess)();
        return result;
    }
    catch (error) {
        (0, circuitBreaker_1.recordFailure)();
        throw error;
    }
}
async function analyzeAndSuggestCommit(diff, apiKey) {
    if ((0, circuitBreaker_1.isCircuitBreakerOpen)()) {
        throw new Error("Service is currently unavailable. Please try again later.");
    }
    try {
        const prompt = (0, prompts_1.getCommitMessagePrompt)(diff);
        const result = await (0, retry_1.retryWithBackoff)(async () => {
            const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            return parseAndValidateJsonResponse(text);
        });
        (0, circuitBreaker_1.recordSuccess)();
        return result;
    }
    catch (error) {
        (0, circuitBreaker_1.recordFailure)();
        throw error;
    }
}
async function generateExplanation(code, apiKey) {
    if ((0, circuitBreaker_1.isCircuitBreakerOpen)()) {
        throw new Error("Service is currently unavailable. Please try again later.");
    }
    try {
        const prompt = (0, prompts_1.getExplanationPrompt)(code);
        const result = await (0, retry_1.retryWithBackoff)(async () => {
            const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        });
        (0, circuitBreaker_1.recordSuccess)();
        return result;
    }
    catch (error) {
        (0, circuitBreaker_1.recordFailure)();
        throw error;
    }
}
//# sourceMappingURL=ai.js.map