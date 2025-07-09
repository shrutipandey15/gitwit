const express = require('express');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.send('GitWit Backend is alive!');
});

app.post('/review', (req, res) => {
    const { code, persona } = req.body;

    console.log('--- New Review Request ---');
    console.log('Persona:', persona);
    console.log('Code:', code.substring(0, 200) + '...'); 

    const dummyReview = {
        summary: "This is a dummy summary from the backend.",
        critique: "The backend received your code successfully, but the AI isn't connected yet.",
        suggestions: "The next step is to wire up the Gemini API call right here in the server."
    };

    res.json({ review: dummyReview });
});


app.listen(port, () => {
    console.log(`GitWit backend server listening on http://localhost:${port}`);
});
