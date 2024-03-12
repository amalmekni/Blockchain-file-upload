const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const crypto = require('crypto');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Mock blockchain and PBFT implementation
const blockchain = [];
let consensusCount = 0;

class Block {
  constructor(index, previousHash, timestamp, data, hash, nonce, fileData) {
    this.index = index;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.data = data;
    this.hash = hash;
    this.nonce = nonce;
    this.fileData = fileData;
  }
}

function calculateHash(index, previousHash, timestamp, data, nonce, fileData) {
  const hashData =
    index + previousHash + timestamp + data + nonce + (fileData || '');
  return crypto.createHash('sha256').update(hashData).digest('hex');
}

function addBlock(data, fileData) {
  const previousBlock = blockchain[blockchain.length - 1] || { hash: '0' };
  const index = blockchain.length;
  const timestamp = new Date().getTime();
  let nonce = 0;
  let hash = calculateHash(
    index,
    previousBlock.hash,
    timestamp,
    data,
    nonce,
    fileData
  );

  while (!hash.startsWith('0000')) {
    nonce++;
    hash = calculateHash(
      index,
      previousBlock.hash,
      timestamp,
      data,
      nonce,
      fileData
    );
  }

  const newBlock = new Block(
    index,
    previousBlock.hash,
    timestamp,
    data,
    hash,
    nonce,
    fileData
  );
  blockchain.push(newBlock);
  return newBlock;
}

function pbftConsensus() {
  consensusCount++;
  // In a real scenario, implement PBFT consensus logic here
  // For simplicity, we'll consider consensus when three nodes agree
  if (consensusCount >= 3) {
    consensusCount = 0;
    console.log('Consensus reached. Block added to the blockchain.');
  }
}

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Endpoint for creating a new block with file upload
app.post('/createBlock', upload.single('file'), (req, res) => {
  const data = req.body.data;
  const fileData = req.file ? req.file.buffer.toString('base64') : null;

  const newBlock = addBlock(data, fileData);
  pbftConsensus();

  res.json(newBlock);
});

// Serve the file from a specific block
app.get('/file/:blockIndex', (req, res) => {
  const blockIndex = parseInt(req.params.blockIndex, 10);
  const block = blockchain[blockIndex];

  if (!block || !block.fileData) {
    return res.status(404).json({ error: 'File not found.' });
  }

  console.log(block);

  const fileBuffer = Buffer.from(block.fileData, 'base64');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=file_from_block_${blockIndex}`
  );
  res.send(fileBuffer);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
