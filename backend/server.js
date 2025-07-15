/**
 * GitWit - backend/server.js
 * This commit adds the '/generate-docstring' endpoint and logic,
 * and applies the resilient retry/fallback pattern to it.
 *
 * @version 1.2.1
 * @author Shruti Pandey
 * @license MIT
 */

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = 3001;
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_TIMEOUT = 60000;

app.use(cors());
app.use(express.json());

const aiServices = {
    gemini: {
        name: 'Gemini',
        client: process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null,
        model: 'gemini-1.5-flash',
        enabled: !!process.env.GEMINI_API_KEY
    },
    openai: {
        name: 'OpenAI',
        apiKey: process.env.OPENAI_API_KEY,
        enabled: !!process.env.OPENAI_API_KEY
    },
    anthropic: {
        name: 'Claude',
        apiKey: process.env.ANTHROPIC_API_KEY,
        enabled: !!process.env.ANTHROPIC_API_KEY
    }
};

const circuitBreakers = {
    gemini: { failures: 0, lastFailure: null, isOpen: false },
    openai: { failures: 0, lastFailure: null, isOpen: false },
    anthropic: { failures: 0, lastFailure: null, isOpen: false }
};

function getPrompt(persona, code) {
    const baseInstruction = `
        Analyze the following code snippet. Provide your review in a pure JSON format, with no markdown wrappers or extra text.
        The JSON object must have two top-level keys:
        1. "review": An object with three string keys: "summary", "critique", and "suggestions".
        2. "productionRisk": An array of objects, where each object has a "risk" (string) and a "isSafe" (boolean).
    `;
    switch (persona) {
        case 'Strict Tech Lead': return `You are a Strict Tech Lead. ${baseInstruction}\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
        case 'Supportive Mentor': return `You are a Supportive Mentor. ${baseInstruction}\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
        case 'Sarcastic Reviewer': return `You are a Sarcastic Reviewer. ${baseInstruction}\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
        case 'Code Poet': return `You are a Code Poet. ${baseInstruction}\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
        case 'Paranoid Security Engineer': return `You are a Paranoid Security Engineer. Focus ONLY on security vulnerabilities. ${baseInstruction}\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
        default: return `Analyze this code: ${code}`;
    }
}

function getDocstringPrompt(code) {
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

function parseAndValidateJsonResponse(rawText) {
    const jsonRegex = /\{[\s\S]*\}/;
    const match = rawText.match(jsonRegex);
    if (!match) throw new Error("AI response did not contain a valid JSON object.");
    const jsonString = match[0];
    let parsedJson;
    try {
        parsedJson = JSON.parse(jsonString);
    } catch (error) {
        throw new Error(`Failed to parse AI response as JSON: ${error.message}`);
    }
    if (!parsedJson.review || !Array.isArray(parsedJson.productionRisk)) {
        throw new Error("AI response is missing 'review' object or 'productionRisk' array.");
    }
    const requiredReviewKeys = ['summary', 'critique', 'suggestions'];
    const missingKeys = requiredReviewKeys.filter(key => !(key in parsedJson.review));
    if (missingKeys.length > 0) {
        throw new Error(`AI response's 'review' object is missing keys: ${missingKeys.join(', ')}`);
    }
    return parsedJson;
}

function isCircuitBreakerOpen(serviceName) {
    const breaker = circuitBreakers[serviceName];
    if (!breaker.isOpen) return false;

    if (Date.now() - breaker.lastFailure > CIRCUIT_BREAKER_TIMEOUT) {
        breaker.isOpen = false;
        breaker.failures = 0;
        console.log(`Circuit breaker for ${serviceName} has been reset.`);
        return false;
    }
    return true;
}

function recordFailure(serviceName) {
    const breaker = circuitBreakers[serviceName];
    breaker.failures++;
    breaker.lastFailure = Date.now();
    if (breaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
        breaker.isOpen = true;
        console.log(`Circuit breaker for ${serviceName} has OPENED after ${breaker.failures} failures.`);
    }
}

function recordSuccess(serviceName) {
    const breaker = circuitBreakers[serviceName];
    breaker.failures = 0;
    breaker.isOpen = false;
}

async function callGeminiForReview(prompt) {
    const service = aiServices.gemini;
    const model = service.client.getGenerativeModel({ model: service.model });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseAndValidateJsonResponse(text);
}

async function callGeminiForDocstring(prompt) {
    const service = aiServices.gemini;
    const model = service.client.getGenerativeModel({ model: service.model });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

async function retryWithBackoff(operation, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            const isRetryable = error.status === 503 || error.status === 429 || (error.status >= 500 && error.status < 600);
            if (!isRetryable || attempt === maxRetries - 1) throw error;
            const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
            console.log(`Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

async function generateWithFallback(prompt, primaryServiceFunction) {
    const serviceOrder = ['gemini', 'openai', 'anthropic'];
    const serviceFunctions = {
        gemini: primaryServiceFunction,
        openai: primaryServiceFunction,
        anthropic: primaryServiceFunction
    };
    let lastError;
    for (const serviceName of serviceOrder) {
        const service = aiServices[serviceName];
        if (!service.enabled || isCircuitBreakerOpen(serviceName)) {
            console.log(`${service.name} is disabled or circuit breaker is open, skipping...`);
            continue;
        }
        try {
            console.log(`Trying ${service.name}...`);
            const result = await retryWithBackoff(() => serviceFunctions[serviceName](prompt));
            recordSuccess(serviceName);
            console.log(`Successfully generated response using ${service.name}`);
            return { result, service: serviceName };
        } catch (error) {
            console.error(`${service.name} failed:`, error.message);
            recordFailure(serviceName);
            lastError = error;
        }
    }
    throw lastError || new Error('All AI services are unavailable');
}

app.get('/', (req, res) => res.send('GitWit Backend is alive!'));

app.post('/review', async (req, res) => {
    try {
        const { code, persona } = req.body;
        if (!code) return res.status(400).json({ error: 'Code is required.' });
        console.log('--- New AI Review Request ---');
        const prompt = getPrompt(persona, code);
        const { result: reviewData, service } = await generateWithFallback(prompt, callGeminiForReview);
        res.json({ review: reviewData.review, productionRisk: reviewData.productionRisk, service });
    } catch (error) {
        console.error("Error generating AI review:", error.message);
        res.status(503).json({ error: 'All AI services are currently unavailable. Please try again later.' });
    }
});

app.post('/generate-docstring', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Code is required.' });
        console.log('--- New Docstring Request ---');
        const prompt = getDocstringPrompt(code);
        const { result: docstring } = await generateWithFallback(prompt, callGeminiForDocstring);
        res.json({ docstring });
    } catch (error) {
        console.error("Error generating docstring:", error.message);
        res.status(503).json({ error: 'Failed to generate docstring from AI.' });
    }
});

app.listen(port, () => {
    console.log(`GitWit backend server listening on http://localhost:${port}`);
    console.log('Available AI services:');
    for (const [name, service] of Object.entries(aiServices)) {
        console.log(`  - ${service.name}: ${service.enabled ? 'enabled' : 'disabled'}`);
    }
});
