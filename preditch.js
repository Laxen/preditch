const express = require('express');
const tmi = require('tmi.js');
const bodyParser = require('body-parser');

const app = express();
app.use(express.static('.'));
app.use(bodyParser.json());

let client = null;
let targetWord = 'weirdWordNoOneTypes';
let pointCount = 0;
let pointClients = [];
let chatClients = [];

let wordClients = [];
let recentMessages = [];

function handleMessage(tags, message) {
  const now = Date.now();

  const words = message.toLowerCase().split(/\W+/);
  if (words.includes(targetWord)) {
    pointCount++;
    pointClients.forEach(res => res.write(`data: ${pointCount}\n\n`));
  }

  chatClients.forEach(res => res.write(`data: ${tags['display-name']}: ${message}\n\n`));

  recentMessages.push({ time: now, text: message });
  recentMessages = recentMessages.filter(m => now - m.time <= 10000);
  const freq = {};
  recentMessages.forEach(m => {
    const unique = new Set(m.text.toLowerCase().split(/\W+/).filter(Boolean));
    unique.forEach(w => freq[w] = (freq[w] || 0) + 1);
  });
  const topWords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);
  wordClients.forEach(res => res.write(`data: ${JSON.stringify(topWords)}\n\n`));
}

app.post('/connect', (req, res) => {
  if (client) client.disconnect();

  const { channel } = req.body;

  client = new tmi.Client({ channels: [channel] });
  client.connect();

  client.on('message', (_, tags, message) => {
    handleMessage(tags, message);
  });
});

app.post('/submit', (req, res) => {
  const { word } = req.body;
  targetWord = word.toLowerCase();

  res.sendStatus(200);
});

app.get('/points', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`data: ${pointCount}\n\n`);
  pointClients.push(res);

  req.on('close', () => {
    pointClients = pointClients.filter(c => c !== res);
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

