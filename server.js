require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { OpenAI } = require('openai');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const ASSISTANT_ID = process.env.ASSISTANT_ID;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const headers = {
  headers: {
    'OpenAI-Beta': 'assistants=v2'
  }
};

app.post('/ask', async (req, res) => {
  const question = req.body.question;

  try {
    const thread = await openai.beta.threads.create({}, headers);

    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: question
    }, headers);

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID
    }, headers);

    for (let i = 0; i < 30; i++) {
      const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id, headers);
      if (runStatus.status === 'completed') break;
      if (runStatus.status === 'failed') throw new Error('Assistant run failed');
      await new Promise(r => setTimeout(r, 1000));
    }

    const messages = await openai.beta.threads.messages.list(thread.id, {
      order: 'desc',
      limit: 1
    }, headers);

    const reply = messages.data[0].content
      .filter(item => item.type === 'text')
      .map(item => item.text.value)
      .join('\n');

    res.json({ answer: reply });
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ error: 'שגיאה בתשובה 😢' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ ChatGBB server is running at http://localhost:${PORT}`);
});
