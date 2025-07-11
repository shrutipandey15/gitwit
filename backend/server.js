const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = 3001;

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
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_TIMEOUT = 60000;

function getPrompt(persona, code) {
    switch (persona) {
        case 'Strict Tech Lead':
            return `
                You are a Strict Tech Lead reviewing a code snippet. Your standards are high.
                Analyze the following code:
                \`\`\`
                ${code}
                \`\`\`
                Provide your review in a pure JSON format, with no markdown wrappers or extra text. The JSON object must have three string keys: "summary", "critique", and "suggestions".
            `;
        default:
            return `Analyze this code: ${code}`;
    }
}
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
    } catch (error) {
        throw new Error(`Failed to parse AI response as JSON. Details: ${error.message}`);
    }

    const requiredKeys = ['summary', 'critique', 'suggestions'];
    const missingKeys = requiredKeys.filter(key => !(key in parsedJson));

    if (missingKeys.length > 0) {
        throw new Error(`AI response is missing required keys: ${missingKeys.join(', ')}`);
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

async function callGemini(prompt) {
    const service = aiServices.gemini;
    const model = service.client.getGenerativeModel({ model: service.model });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseAndValidateJsonResponse(text);
}

async function callOpenAI(prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiServices.openai.apiKey}` },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: "json_object" }
        })
    });
    if (!response.ok) throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    const content = data.choices[0].message.content;
    return parseAndValidateJsonResponse(content);
}

async function callAnthropic(prompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': aiServices.anthropic.apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }]
        })
    });
    if (!response.ok) throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    const content = data.content[0].text;
    return parseAndValidateJsonResponse(content);
}

async function generateReviewWithFallback(prompt) {
    const serviceOrder = ['gemini', 'openai', 'anthropic'];
    const serviceFunctions = { gemini: callGemini, openai: callOpenAI, anthropic: callAnthropic };
    let lastError;
    for (const serviceName of serviceOrder) {
        const service = aiServices[serviceName];
        if (!service.enabled || isCircuitBreakerOpen(serviceName)) {
            console.log(`${service.name} is disabled or circuit breaker is open, skipping...`);
            continue;
        }
        try {
            console.log(`Trying ${service.name}...`);
            const result = await serviceFunctions[serviceName](prompt);
            recordSuccess(serviceName);
            console.log(`Successfully generated review using ${service.name}`);
            return { result, service: service.name };
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
        console.log('Persona:', persona);

        const prompt = getPrompt(persona, code);
        const { result: reviewJson, service } = await generateReviewWithFallback(prompt);

        res.json({ review: reviewJson, service: service });

    } catch (error) {
        console.error("Error generating AI review:", error.message);
        res.status(503).json({ error: 'All AI services are currently unavailable. Please try again later.' });
    }
});

app.listen(port, () => {
    console.log(`GitWit backend server listening on http://localhost:${port}`);
    console.log('Available AI services:');
    for (const [name, service] of Object.entries(aiServices)) {
        console.log(`  - ${service.name}: ${service.enabled ? 'enabled' : 'disabled'}`);
    }
});
