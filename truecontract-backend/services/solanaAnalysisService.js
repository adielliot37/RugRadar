const { 
    getSolanaProgramData, 
    getSolanaBalance,
    analyzeTokenRisk,
    classifyTokenType,
    KNOWN_PROGRAM_IDS 
} = require('./solanaBlockchainService');

const performComprehensiveSolanaAnalysis = async (programAddress) => {
    console.log(`Starting comprehensive Solana analysis for ${programAddress}...`);

    try {
        // Get program data
        const programData = await getSolanaProgramData(programAddress);
        const balance = await getSolanaBalance(programAddress);
        
        // Analyze transaction patterns
        const transactionAnalysis = analyzeSolanaTransactionPatterns(programData.transactions);
        
        // Perform risk assessment based on program type
        let riskAssessment, rugPullScore, tokenAnalysis;
        
        if (programData.isToken) {
            // Comprehensive token analysis
            tokenAnalysis = await analyzeTokenRisk(
                programData.tokenInfo, 
                programData.metadata, 
                programData.transactions
            );
            
            rugPullScore = calculateSolanaRugPullScore(programData, tokenAnalysis, transactionAnalysis);
            riskAssessment = calculateSolanaRiskAssessment(programData, tokenAnalysis, transactionAnalysis);
        } else {
            // General program analysis
            rugPullScore = calculateProgramRugPullScore(programData, transactionAnalysis);
            riskAssessment = calculateProgramRiskAssessment(programData, transactionAnalysis);
        }

        const contractType = determineSolanaContractType(programData);
        
        const onChainData = {
            balance,
            totalTransactions: programData.transactions.length,
            transactionAnalysis,
            lastUpdated: new Date().toISOString(),
            network: 'solana'
        };

        return {
            programAddress,
            network: 'solana',
            rugPullScore,
            contractType,
            isWellKnownProtocol: isWellKnownSolanaProtocol(programAddress, programData.programType),
            protocolName: getProtocolName(programAddress, programData.programType),
            programMetadata: {
                programType: programData.programType,
                isToken: programData.isToken,
                tokenType: programData.isToken ? classifyTokenType(programData.tokenInfo, programData.metadata, programData) : null,
                isExecutable: programData.accountInfo?.executable || false,
                owner: programData.accountInfo?.owner,
                dataLength: programData.accountInfo?.data?.length || 0,
                lamports: programData.accountInfo?.lamports || 0
            },
            tokenInfo: programData.isToken ? {
                ...programData.tokenInfo,
                tokenAnalysis,
                classification: classifyTokenType(programData.tokenInfo, programData.metadata, programData)
            } : null,
            solanaAnalysis: {
                programData: {
                    programType: programData.programType,
                    isExecutable: programData.accountInfo?.executable || false,
                    accountInfo: {
                        owner: programData.accountInfo?.owner,
                        executable: programData.accountInfo?.executable,
                        lamports: programData.accountInfo?.lamports
                    }
                },
                transactionAnalysis
            },
            onChainData,
            riskAssessment,
            lastAnalyzed: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error in comprehensive Solana analysis:', error.message);
        throw error;
    }
};

const analyzeSolanaTransactionPatterns = (transactions) => {
    if (!transactions || transactions.length === 0) {
        return {
            totalTransactions: 0,
            activity: 'inactive',
            suspiciousPatterns: [],
            recentActivity: false,
            uniqueSigners: 0,
            failedTransactions: 0
        };
    }

    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 86400;
    const oneWeekAgo = now - 604800;
    const oneMonthAgo = now - 2592000;

    const recentTxs = transactions.filter(tx => tx.blockTime && tx.blockTime > oneDayAgo);
    const weekTxs = transactions.filter(tx => tx.blockTime && tx.blockTime > oneWeekAgo);
    const monthTxs = transactions.filter(tx => tx.blockTime && tx.blockTime > oneMonthAgo);

    const failedTxs = transactions.filter(tx => tx.err !== null);
    const uniqueSigners = new Set(
        transactions
            .map(tx => tx.transaction?.transaction?.message?.accountKeys?.[0])
            .filter(Boolean)
    ).size;

    const suspiciousPatterns = [];

    // High failure rate
    if (failedTxs.length > transactions.length * 0.3) {
        suspiciousPatterns.push({
            type: 'high_failure_rate',
            severity: 'medium',
            description: `${((failedTxs.length / transactions.length) * 100).toFixed(1)}% of transactions failed`,
            impact: 'Potential contract issues or malicious activity'
        });
    }

    // Unusual activity spikes
    if (recentTxs.length > weekTxs.length * 0.6) {
        suspiciousPatterns.push({
            type: 'activity_spike',
            severity: 'low',
            description: 'Significant spike in recent transaction activity',
            impact: 'Could indicate pump and dump activity'
        });
    }

    // Low signer diversity
    if (transactions.length > 20 && uniqueSigners < 5) {
        suspiciousPatterns.push({
            type: 'low_signer_diversity',
            severity: 'medium',
            description: `Only ${uniqueSigners} unique signers for ${transactions.length} transactions`,
            impact: 'Centralized control or bot activity'
        });
    }

    // Determine activity level
    let activity = 'inactive';
    if (recentTxs.length > 10) activity = 'very_active';
    else if (weekTxs.length > 5) activity = 'active';
    else if (monthTxs.length > 0) activity = 'moderate';

    return {
        totalTransactions: transactions.length,
        last24Hours: recentTxs.length,
        lastWeek: weekTxs.length,
        lastMonth: monthTxs.length,
        failedTransactions: failedTxs.length,
        failureRate: ((failedTxs.length / transactions.length) * 100).toFixed(2),
        uniqueSigners,
        activity,
        suspiciousPatterns,
        recentActivity: recentTxs.length > 0,
        lastInteraction: transactions[0] ? new Date(transactions[0].blockTime * 1000).toISOString() : null
    };
};

const calculateSolanaRugPullScore = (programData, tokenAnalysis, transactionAnalysis) => {
    let rugScore = 0;

    // Check if it's a well-known protocol
    if (isWellKnownSolanaProtocol(programData.programId, programData.programType)) {
        console.log(`✅ Well-known Solana protocol detected: ${getProtocolName(programData.programId, programData.programType)}`);
        return 5;
    }

    // Token-specific risk factors
    if (programData.isToken && tokenAnalysis) {
        rugScore += tokenAnalysis.riskScore;

        // Additional Solana-specific token risks
        if (tokenAnalysis.hasUnlimitedMint) {
            rugScore += 20;
        }

        if (tokenAnalysis.hasFreeze) {
            rugScore += 25;
        }

        if (tokenAnalysis.concentration > 50) {
            rugScore += 30;
        } else if (tokenAnalysis.concentration > 30) {
            rugScore += 15;
        }

        // Memecoin additional risks
        if (tokenAnalysis.isMemecoin) {
            rugScore += 10;
            
            // Very high supply memecoins are riskier
            const supply = parseFloat(programData.tokenInfo?.supply?.uiAmountString || '0');
            if (supply > 1000000000000) { // 1T+ supply
                rugScore += 15;
            }
        }
    }

    // Transaction pattern risks
    if (transactionAnalysis.uniqueSigners < 10 && transactionAnalysis.totalTransactions > 50) {
        rugScore += 20;
    }

    if (transactionAnalysis.failureRate > 30) {
        rugScore += 15;
    }

    // Reduce risk for high activity
    if (transactionAnalysis.uniqueSigners > 100) {
        rugScore = Math.max(0, rugScore - 15);
    }

    if (transactionAnalysis.totalTransactions > 1000) {
        rugScore = Math.max(0, rugScore - 10);
    }

    return Math.min(100, rugScore);
};

const calculateProgramRugPullScore = (programData, transactionAnalysis) => {
    let rugScore = 0;

    // Check if it's a well-known protocol
    if (isWellKnownSolanaProtocol(programData.programId, programData.programType)) {
        return 5;
    }

    // General program risks
    if (!programData.accountInfo?.executable && programData.programType === 'UNKNOWN') {
        rugScore += 30;
    }

    // Transaction-based risks
    if (transactionAnalysis.uniqueSigners < 5 && transactionAnalysis.totalTransactions > 20) {
        rugScore += 25;
    }

    if (transactionAnalysis.failureRate > 40) {
        rugScore += 20;
    }

    return Math.min(100, rugScore);
};

const calculateSolanaRiskAssessment = (programData, tokenAnalysis, transactionAnalysis) => {
    const risks = [];
    let overallRiskScore = 0;

    // Token-specific risks
    if (programData.isToken && tokenAnalysis) {
        tokenAnalysis.risks.forEach(risk => {
            risks.push({
                category: `Token: ${risk.type.replace(/_/g, ' ').toUpperCase()}`,
                severity: risk.severity,
                impact: risk.impact,
                details: risk.description
            });

            // Add to overall score based on severity
            switch(risk.severity) {
                case 'critical': overallRiskScore += 25; break;
                case 'high': overallRiskScore += 15; break;
                case 'medium': overallRiskScore += 8; break;
                case 'low': overallRiskScore += 3; break;
            }
        });
    }

    // Transaction pattern risks
    transactionAnalysis.suspiciousPatterns.forEach(pattern => {
        risks.push({
            category: `Transaction Pattern: ${pattern.type.replace(/_/g, ' ').toUpperCase()}`,
            severity: pattern.severity,
            impact: pattern.impact,
            details: pattern.description
        });

        switch(pattern.severity) {
            case 'critical': overallRiskScore += 20; break;
            case 'high': overallRiskScore += 12; break;
            case 'medium': overallRiskScore += 6; break;
            case 'low': overallRiskScore += 2; break;
        }
    });

    // Program type risks
    if (programData.programType === 'UNKNOWN') {
        risks.push({
            category: 'Unknown Program Type',
            severity: 'medium',
            impact: 'Unable to determine program functionality',
            details: 'Program type could not be identified'
        });
        overallRiskScore += 10;
    }

    overallRiskScore = Math.min(100, overallRiskScore);

    let riskLevel = 'low';
    if (overallRiskScore >= 70) riskLevel = 'critical';
    else if (overallRiskScore >= 50) riskLevel = 'high';
    else if (overallRiskScore >= 30) riskLevel = 'medium';

    return {
        overallRiskScore,
        riskLevel,
        trustScore: Math.max(0, 100 - overallRiskScore),
        risks,
        summary: generateSolanaRiskSummary(riskLevel, risks.length, programData.isToken, tokenAnalysis)
    };
};

const calculateProgramRiskAssessment = (programData, transactionAnalysis) => {
    const risks = [];
    let overallRiskScore = 0;

    // Basic program risks
    if (programData.programType === 'UNKNOWN') {
        risks.push({
            category: 'Unknown Program',
            severity: 'medium',
            impact: 'Cannot determine program safety',
            details: 'Program type and functionality unknown'
        });
        overallRiskScore += 15;
    }

    // Add transaction pattern risks
    transactionAnalysis.suspiciousPatterns.forEach(pattern => {
        risks.push({
            category: `Transaction: ${pattern.type.replace(/_/g, ' ').toUpperCase()}`,
            severity: pattern.severity,
            impact: pattern.impact,
            details: pattern.description
        });

        switch(pattern.severity) {
            case 'critical': overallRiskScore += 20; break;
            case 'high': overallRiskScore += 12; break;
            case 'medium': overallRiskScore += 6; break;
            case 'low': overallRiskScore += 2; break;
        }
    });

    overallRiskScore = Math.min(100, overallRiskScore);

    let riskLevel = 'low';
    if (overallRiskScore >= 70) riskLevel = 'critical';
    else if (overallRiskScore >= 50) riskLevel = 'high';
    else if (overallRiskScore >= 30) riskLevel = 'medium';

    return {
        overallRiskScore,
        riskLevel,
        trustScore: Math.max(0, 100 - overallRiskScore),
        risks,
        summary: generateSolanaRiskSummary(riskLevel, risks.length, false, null)
    };
};

const generateSolanaRiskSummary = (riskLevel, totalRisks, isToken, tokenAnalysis) => {
    const baseType = isToken ? 'token' : 'program';
    
    if (riskLevel === 'critical') {
        return `This Solana ${baseType} has critical security issues. ${totalRisks} risks identified. Strongly advise against interaction.`;
    }
    if (riskLevel === 'high') {
        return `This Solana ${baseType} has significant security concerns with ${totalRisks} identified risks. Professional review recommended.`;
    }
    if (riskLevel === 'medium') {
        return `This Solana ${baseType} has ${totalRisks} moderate risks identified. Proceed with caution and do thorough research.`;
    }
    
    if (isToken && tokenAnalysis?.isMemecoin) {
        return 'This appears to be a memecoin with typical speculative risks. Always DYOR before investing.';
    }
    
    return `This Solana ${baseType} appears to follow standard practices, but always conduct your own research.`;
};

const determineSolanaContractType = (programData) => {
    if (programData.isToken) {
        const tokenType = classifyTokenType(programData.tokenInfo, programData.metadata, programData);
        const supply = parseFloat(programData.tokenInfo?.supply?.uiAmountString || '0');
        
        if (tokenType === 'MEMECOIN') {
            return `Memecoin (${(supply / 1e9).toFixed(1)}B supply)`;
        }
        if (tokenType === 'NFT_MINT') {
            return 'NFT Mint';
        }
        if (tokenType === 'UTILITY_TOKEN') {
            return 'Utility Token';
        }
        if (tokenType === 'LP_TOKEN') {
            return 'Liquidity Pool Token';
        }
        return `SPL Token (${programData.tokenInfo.decimals} decimals)`;
    }

    switch (programData.programType) {
        case 'RAYDIUM_AMM': return 'Raydium AMM';
        case 'JUPITER_AGGREGATOR': return 'Jupiter Aggregator';
        case 'ORCA_DEX': return 'Orca DEX';
        case 'PUMP_FUN': return 'Pump.fun';
        case 'SPL_TOKEN_PROGRAM': return 'SPL Token Program';
        case 'TOKEN_2022_PROGRAM': return 'Token 2022 Program';
        case 'SOLANA_PROGRAM': return 'Solana Program';
        default: return 'Unknown Program';
    }
};

const isWellKnownSolanaProtocol = (programId, programType) => {
    const wellKnownPrograms = [
        KNOWN_PROGRAM_IDS.TOKEN_PROGRAM,
        KNOWN_PROGRAM_IDS.TOKEN_2022_PROGRAM,
        KNOWN_PROGRAM_IDS.ASSOCIATED_TOKEN,
        KNOWN_PROGRAM_IDS.SYSTEM_PROGRAM,
        KNOWN_PROGRAM_IDS.METAPLEX_TOKEN_METADATA,
        KNOWN_PROGRAM_IDS.RAYDIUM_AMM,
        KNOWN_PROGRAM_IDS.JUPITER_AGGREGATOR,
        KNOWN_PROGRAM_IDS.ORCA,
        KNOWN_PROGRAM_IDS.PUMP_FUN
    ];

    return wellKnownPrograms.includes(programId);
};

const getProtocolName = (programId, programType) => {
    const protocolNames = {
        [KNOWN_PROGRAM_IDS.TOKEN_PROGRAM]: 'SPL Token Program',
        [KNOWN_PROGRAM_IDS.TOKEN_2022_PROGRAM]: 'Token 2022 Program',
        [KNOWN_PROGRAM_IDS.ASSOCIATED_TOKEN]: 'Associated Token Program',
        [KNOWN_PROGRAM_IDS.SYSTEM_PROGRAM]: 'System Program',
        [KNOWN_PROGRAM_IDS.METAPLEX_TOKEN_METADATA]: 'Metaplex',
        [KNOWN_PROGRAM_IDS.RAYDIUM_AMM]: 'Raydium',
        [KNOWN_PROGRAM_IDS.JUPITER_AGGREGATOR]: 'Jupiter',
        [KNOWN_PROGRAM_IDS.ORCA]: 'Orca',
        [KNOWN_PROGRAM_IDS.PUMP_FUN]: 'Pump.fun'
    };

    return protocolNames[programId] || null;
};

const getSolanaOnChainData = async (programAddress) => {
    console.log(`Fetching fresh Solana on-chain data for ${programAddress}...`);

    const balance = await getSolanaBalance(programAddress);
    const programData = await getSolanaProgramData(programAddress);
    const transactionAnalysis = analyzeSolanaTransactionPatterns(programData.transactions);

    return {
        balance,
        totalTransactions: programData.transactions.length,
        transactionAnalysis,
        network: 'solana',
        lastUpdated: new Date().toISOString()
    };
};

module.exports = {
    performComprehensiveSolanaAnalysis,
    getSolanaOnChainData,
    analyzeSolanaTransactionPatterns,
    calculateSolanaRugPullScore,
    calculateSolanaRiskAssessment,
    isWellKnownSolanaProtocol,
    getProtocolName
};