const express = require('express');
const router = express.Router();
const { performComprehensiveAnalysis } = require('../services/analysisService');
const { uploadAnalysis, retrieveAnalysis } = require('../services/storachaService');

const contractIndex = {};

router.post('/', async (req, res) => {
    const { contractAddress, forceRefresh } = req.body;
    const chain = 'base';

    if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        return res.status(400).json({ error: 'A valid contract address is required.' });
    }

    const indexKey = `${chain}-${contractAddress}`;

    try {
        const existingCid = contractIndex[indexKey];
        if (existingCid && !forceRefresh) {
            const filepath = `${existingCid}/${indexKey}.json`;
            const existingData = await retrieveAnalysis(filepath);
            if (existingData) {
                console.log(`Serving cached analysis for ${contractAddress} from CID ${existingCid}`);
                existingData.cached = true;
                existingData.cacheTimestamp = existingData.lastAnalyzed;
                return res.json(existingData);
            }
        }

        console.log(`Performing comprehensive analysis for ${contractAddress}...`);
        const analysisResult = await performComprehensiveAnalysis(contractAddress);

        const analysisData = {
            contractAddress,
            chain,
            contractMetadata: analysisResult.contractMetadata,
            aiAnalysis: analysisResult.aiAnalysis,
            riskAssessment: analysisResult.riskAssessment,
            userReviews: [],
            lastAnalyzed: analysisResult.lastAnalyzed,
            cached: false
        };

        const fileName = `${indexKey}.json`;
        const uploadResult = await uploadAnalysis(fileName, analysisData);

        contractIndex[indexKey] = uploadResult.cid;

        console.log(`Analysis complete. Stored with CID: ${uploadResult.cid}`);
        res.status(201).json(analysisData);

    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            error: 'Failed to analyze contract.',
            details: error.message,
            hint: 'Make sure the contract is verified on BaseScan'
        });
    }
});

router.post('/review', async (req, res) => {
    const { contractAddress, rating, comment } = req.body;
    const chain = 'base';

    if (!contractAddress || !rating) {
        return res.status(400).json({ error: 'contractAddress and rating are required.' });
    }

    const indexKey = `${chain}-${contractAddress}`;
    const existingCid = contractIndex[indexKey];

    if (!existingCid) {
        return res.status(404).json({ error: 'Contract has not been analyzed yet. Please analyze it first.' });
    }

    try {
        const filepath = `${existingCid}/${indexKey}.json`;
        let data = await retrieveAnalysis(filepath);

        data.userReviews.unshift({
            rating: parseInt(rating, 10),
            comment: comment || "",
            timestamp: new Date().toISOString()
        });

        const fileName = `${indexKey}.json`;
        const uploadResult = await uploadAnalysis(fileName, data);

        contractIndex[indexKey] = uploadResult.cid;
        console.log(`Review added for ${contractAddress}. New CID is ${uploadResult.cid}`);

        res.json(data);

    } catch (error) {
        res.status(500).json({ error: 'Failed to add review.', details: error.message });
    }
});

module.exports = router;
