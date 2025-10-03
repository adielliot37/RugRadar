const express = require('express');
const router = express.Router();
const { performComprehensiveAnalysis, getOnChainData } = require('../services/analysisService');
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
        let staticAuditData = null;

        if (existingCid && !forceRefresh) {
            const filepath = `${existingCid}/${indexKey}.json`;
            staticAuditData = await retrieveAnalysis(filepath);

            if (staticAuditData) {
                console.log(`✅ Found cached audit for ${contractAddress}. Refreshing on-chain data...`);

                const freshOnChainData = await getOnChainData(contractAddress);

                const combinedData = {
                    ...staticAuditData,
                    onChainData: freshOnChainData,
                    rugPullScore: staticAuditData.rugPullScore,
                    cached: true,
                    cacheTimestamp: staticAuditData.lastAnalyzed,
                    lastOnChainUpdate: new Date().toISOString()
                };

                return res.json(combinedData);
            }
        }

        console.log(`🔍 Performing full analysis for ${contractAddress}...`);
        const analysisResult = await performComprehensiveAnalysis(contractAddress);

        const analysisData = {
            contractAddress,
            chain,
            contractMetadata: analysisResult.contractMetadata,
            aiAnalysis: analysisResult.aiAnalysis,
            riskAssessment: analysisResult.riskAssessment,
            rugPullScore: analysisResult.rugPullScore,
            onChainData: analysisResult.onChainData,
            userReviews: [],
            lastAnalyzed: analysisResult.lastAnalyzed,
            lastOnChainUpdate: analysisResult.lastAnalyzed,
            cached: false
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

router.post('/compare', async (req, res) => {
    const { contractAddresses, forceRefresh = false } = req.body;
    const chain = 'base';

    if (!contractAddresses || !Array.isArray(contractAddresses) || contractAddresses.length < 2) {
        return res.status(400).json({ error: 'At least 2 contract addresses are required for comparison.' });
    }

    if (contractAddresses.length > 5) {
        return res.status(400).json({ error: 'Maximum 5 contracts can be compared at once.' });
    }

    for (const address of contractAddresses) {
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({ error: `Invalid contract address: ${address}` });
        }
    }

    try {
        console.log(`🔍 Starting comparison for ${contractAddresses.length} contracts...`);
        
        const analysisPromises = contractAddresses.map(async (contractAddress) => {
            const indexKey = `${chain}-${contractAddress}`;
            
            const existingCid = contractIndex[indexKey];
            if (existingCid && !forceRefresh) {
                try {
                    const filepath = `${existingCid}/${indexKey}.json`;
                    const cachedData = await retrieveAnalysis(filepath);
                    if (cachedData) {
                        console.log(`✅ Using cached data for ${contractAddress}`);
                        return {
                            contractAddress,
                            ...cachedData,
                            cached: true
                        };
                    }
                } catch (error) {
                    console.warn(`⚠️ Failed to retrieve cached data for ${contractAddress}:`, error.message);
                }
            }

            console.log(`🔍 Analyzing ${contractAddress}...`);
            const analysisResult = await performComprehensiveAnalysis(contractAddress);
            
            const analysisData = {
                contractAddress,
                chain,
                contractMetadata: analysisResult.contractMetadata,
                aiAnalysis: analysisResult.aiAnalysis,
                riskAssessment: analysisResult.riskAssessment,
                rugPullScore: analysisResult.rugPullScore,
                onChainData: analysisResult.onChainData,
                userReviews: [],
                lastAnalyzed: analysisResult.lastAnalyzed,
                cached: false
            };

            try {
                const fileName = `${indexKey}.json`;
                const uploadResult = await uploadAnalysis(fileName, analysisData);
                contractIndex[indexKey] = uploadResult.cid;
                console.log(`✅ Cached analysis for ${contractAddress}`);
            } catch (uploadError) {
                console.warn(`⚠️ Failed to cache analysis for ${contractAddress}:`, uploadError.message);
            }

            return analysisData;
        });

        const comparisonResults = await Promise.all(analysisPromises);
        
        const comparisonSummary = {
            totalContracts: comparisonResults.length,
            averageRiskScore: comparisonResults.reduce((sum, result) => sum + (result.rugPullScore || 0), 0) / comparisonResults.length,
            lowestRisk: Math.min(...comparisonResults.map(r => r.rugPullScore || 0)),
            highestRisk: Math.max(...comparisonResults.map(r => r.rugPullScore || 0)),
            bestContract: comparisonResults.reduce((best, current) => 
                (current.rugPullScore || 0) < (best.rugPullScore || 0) ? current : best
            ),
            comparisonTimestamp: new Date().toISOString()
        };

        const response = {
            comparisonId: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            summary: comparisonSummary,
            contracts: comparisonResults,
            metadata: {
                chain,
                forceRefresh,
                analysisTime: new Date().toISOString()
            }
        };

        console.log(`✅ Comparison complete for ${contractAddresses.length} contracts`);
        res.json(response);

    } catch (error) {
        console.error('Comparison error:', error);
        res.status(500).json({
            error: 'Failed to compare contracts.',
            details: error.message,
            hint: 'Make sure all contracts are verified on BaseScan'
        });
    }
});

module.exports = router;
