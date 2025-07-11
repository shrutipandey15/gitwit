const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function getPrompt(persona, code) {
    switch (persona) {
        case 'Strict Tech Lead':
            return `
                You are a Strict Tech Lead reviewing a code snippet. Your standards are high, and you focus on performance, readability, and best practices. Do not be friendly; be direct and concise.

                Analyze the following code:
                \`\`\`
                ${code}
                \`\`\`

                Provide your review in a pure JSON format. The JSON object must have three keys: "summary", "critique", and "suggestions".
                - summary: A one-sentence, blunt summary of the code's main problem.
                - critique: A slightly longer, direct critique of the logic, structure, or potential issues.
                - suggestions: A concrete suggestion for how to fix the code.

                Example Response:
                {
                  "summary": "This function is doing too much and lacks proper error handling.",
                  "critique": "The function fetches data, parses it, and handles the UI update all in one block. This violates the Single Responsibility Principle and will be difficult to test or debug. It also completely ignores potential network errors or non-200 status codes.",
                  "suggestions": "Refactor this into three separate functions: one for fetching the data, one for parsing it, and one for updating the UI. The fetching function should include a try/catch block and handle HTTP errors gracefully."
                }
            `;
        default:
            return `Analyze this code: ${code}`;
    }
}
            
app.get('/', (req, res) => {
    res.send('GitWit Backend is alive!');
});

app.post('/review', async (req, res) => {
    try {
        const { code, persona } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Code is required.' });
        }

        console.log('--- New AI Review Request ---');
        console.log('Persona:', persona);

        let reviewJson;
        const maxRetries = 3;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const prompt = getPrompt(persona, code);
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                reviewJson = JSON.parse(text);
                break;
            } catch (error) {
                if (error.status === 503 && i < maxRetries - 1) {
                    console.log(`Attempt ${i + 1} failed: Model overloaded. Retrying in 2 seconds...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    throw error;
                }
            }
        }

        res.json({ review: reviewJson });

    } catch (error) {
        console.error("Error generating AI review:", error);
        res.status(500).json({ error: 'Failed to generate review from AI. Please check the backend console.' });
    }
});

app.listen(port, () => {
    console.log(`GitWit backend server listening on http://localhost:${port}`);
});
