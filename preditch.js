const express = require('express');
const tmi = require('tmi.js');
const bodyParser = require('body-parser');

const app = express();
app.use(express.static('.'));
app.use(bodyParser.json());

let client = null;
let targetWord = '';
let pointCount = 0;
let sseClients = [];
let chatClients = [];

let wordClients = [];
let recentMessages = [];

app.post('/start', (req, res) => {
  const { channel, word } = req.body;
  targetWord = word.toLowerCase();

  if (client) client.disconnect();

  client = new tmi.Client({ channels: [channel] });
  client.connect();

  client.on('message', (_, tags, message) => {
    console.log(message);
    chatClients.forEach(res => res.write(`data: ${tags['display-name']}: ${message}\n\n`));

    if (message.toLowerCase().includes(targetWord)) {
      pointCount++;
      sseClients.forEach(res => res.write(`data: ${pointCount}\n\n`));
    }

    const now = Date.now();
    recentMessages.push({ time: now, text: message });
    recentMessages = recentMessages.filter(m => now - m.time <= 10000); // keep last 10s

    const words = recentMessages.flatMap(m => m.text.toLowerCase().split(/\W+/));
    const freq = {};
    words.forEach(w => {
      if (!w) return;
      freq[w] = (freq[w] || 0) + 1;
    });
    const topWords = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    wordClients.forEach(res => res.write(`data: ${JSON.stringify(topWords)}\n\n`));
  });

  res.sendStatus(200);
});

app.get('/points', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`data: ${pointCount}\n\n`);
  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== res);
  });
});

app.get('/chat', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  chatClients.push(res);

  req.on('close', () => {
    chatClients = chatClients.filter(c => c !== res);
  });
});

app.get('/words', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  wordClients.push(res);

  req.on('close', () => {
    wordClients = wordClients.filter(c => c !== res);
  });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));

