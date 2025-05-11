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

app.listen(3000, () => console.log('Server running on http://localhost:3000'));

