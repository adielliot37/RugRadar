const express = require('express');
const router = express.Router();
const { performUnifiedAnalysis, getMultiChainOnChainData } = require('../services/analysisService');
const { uploadAnalysis, retrieveAnalysis } = require('../services/storachaService');

const contractIndex = {};

router.post('/', async (req, res) => {
    const { contractAddress, forceRefresh, chain = 'base' } = req.body;
    const network = (chain || 'base').toLowerCase();

    // Address validation based on network
    if (!contractAddress) {
        return res.status(400).json({ error: 'Contract/Program address is required.' });
    }

    // Validate address format based on network
    if (network === 'solana') {
        // Solana addresses are base58 encoded and typically 32-44 characters
        if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(contractAddress)) {
            return res.status(400).json({ 
                error: 'Invalid Solana program address format. Please provide a valid base58 address.' 
            });
        }
    } else {
        // Base/Ethereum addresses
        if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
            return res.status(400).json({ 
                error: 'Invalid Base contract address format. Please provide a valid hex address.' 
            });
        }
    }

    const indexKey = `${network}-${contractAddress}`;

    try {
        const existingCid = contractIndex[indexKey];
        let staticAuditData = null;

        if (existingCid && !forceRefresh) {
            const filepath = `${existingCid}/${indexKey}.json`;
            staticAuditData = await retrieveAnalysis(filepath);

            if (staticAuditData) {
                console.log(`✅ Found cached audit for ${contractAddress} on ${network}. Refreshing on-chain data...`);

                const freshOnChainData = await getMultiChainOnChainData(contractAddress, network);

                const combinedData = {
                    ...staticAuditData,
                    onChainData: freshOnChainData,
                    rugPullScore: staticAuditData.rugPullScore,
                    cached: true,
                    cacheTimestamp: staticAuditData.lastAnalyzed,
                    lastOnChainUpdate: new Date().toISOString(),
                    network
                };

                return res.json(combinedData);
            }
        }

        console.log(`🔍 Performing full analysis for ${contractAddress} on ${network}...`);
        const analysisResult = await performUnifiedAnalysis(contractAddress, network);

        // Prepare analysis data with network-specific formatting
        const analysisData = {
            contractAddress,
            chain: network,
            network,
            contractType: analysisResult.contractType,
            isWellKnownProtocol: analysisResult.isWellKnownProtocol,
            protocolName: analysisResult.protocolName,
            rugPullScore: analysisResult.rugPullScore,
            riskAssessment: analysisResult.riskAssessment,
            onChainData: analysisResult.onChainData,
            // Network-specific metadata
            ...(network === 'solana' ? {
                programMetadata: analysisResult.programMetadata,
                tokenInfo: analysisResult.tokenInfo,
                solanaAnalysis: analysisResult.solanaAnalysis
            } : {
                contractMetadata: analysisResult.contractMetadata,
                aiAnalysis: analysisResult.aiAnalysis
            }),
            userReviews: [],
            lastAnalyzed: analysisResult.lastAnalyzed,
            lastOnChainUpdate: analysisResult.lastAnalyzed || new Date().toISOString(),
            cached: false,
            analysisVersion: '2.0',
            supportedChains: ['base', 'solana']
        };

        try {
            const fileName = `${indexKey}.json`;
            const uploadResult = await uploadAnalysis(fileName, analysisData);
            contractIndex[indexKey] = uploadResult.cid;
            console.log(`✅ Analysis complete. Stored with CID: ${uploadResult.cid}`);
        } catch (uploadError) {
            console.warn('⚠️ Storacha upload failed, continuing without caching:', uploadError.message);
        }

        res.status(201).json(analysisData);

    } catch (error) {
        console.error(`Analysis error for ${network}:`, error);
        
        const networkSpecificHint = network === 'solana' 
            ? 'Make sure the program address is valid and exists on Solana mainnet'
            : 'Make sure the contract is verified on BaseScan';
        
        res.status(500).json({
            error: `Failed to analyze ${network === 'solana' ? 'program' : 'contract'}.`,
            details: error.message,
            network,
            hint: networkSpecificHint
        });
    }
});

router.post('/review', async (req, res) => {
    const { contractAddress, rating, comment, chain = 'base' } = req.body;
    const network = (chain || 'base').toLowerCase();

    if (!contractAddress || !rating) {
        return res.status(400).json({ error: 'contractAddress and rating are required.' });
    }

    const indexKey = `${network}-${contractAddress}`;
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
