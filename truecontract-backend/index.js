require('dotenv').config();
const express = require('express');
const cors = require('cors');
const analyzeRouter = require('./routes/analyze');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/analyze', analyzeRouter);

app.get('/', (req, res) => {
    res.send('RugRadar Backend is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log('Ensure your Storacha MCP Client is running on http://localhost:3001');
});
