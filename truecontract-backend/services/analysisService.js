const { getContractData, getContractTransactions, getContractBalance } = require('./blockchainService');
const { analyzeContractWithAI, analyzeContractABI, performStaticAnalysis } = require('./aiService');

const getOnChainData = async (contractAddress) => {
    console.log(`Fetching fresh on-chain data for ${contractAddress}...`);

    const balance = await getContractBalance(contractAddress);
    const transactions = await getContractTransactions(contractAddress, 10000);
    const transactionAnalysis = analyzeTransactionPatterns(transactions);

    return {
        balance,
        totalTransactions: transactions.length,
        transactionAnalysis,
        lastUpdated: new Date().toISOString()
    };
};

const performComprehensiveAnalysis = async (contractAddress) => {
    console.log(`Starting comprehensive analysis for ${contractAddress}...`);

    const contractData = await getContractData(contractAddress);
    const balance = await getContractBalance(contractAddress);
    const transactions = await getContractTransactions(contractAddress, 50);

    const staticAnalysis = performStaticAnalysis(contractData.sourceCode);

    const abiAnalysis = analyzeContractABI(contractData.abi);

    const transactionAnalysis = analyzeTransactionPatterns(transactions);

    const aiAnalysis = await analyzeContractWithAI({
        ...contractData,
        staticAnalysis,
        abiAnalysis,
        transactionAnalysis
    });

    const riskAssessment = calculateRiskAssessment(
        aiAnalysis,
        staticAnalysis,
        abiAnalysis,
        transactionAnalysis
    );

    const rugPullScore = calculateRugPullScore(
        aiAnalysis,
        staticAnalysis,
        abiAnalysis,
        transactionAnalysis
    );

    const onChainData = {
        balance,
        totalTransactions: transactions.length,
        transactionAnalysis,
        lastUpdated: new Date().toISOString()
    };

    return {
        contractAddress,
        rugPullScore,
        contractMetadata: {
            name: contractData.contractName,
            compiler: contractData.compilerVersion,
            optimization: contractData.optimization,
            optimizationRuns: contractData.runs,
            evmVersion: contractData.evmVersion,
            license: contractData.licenseType,
            isProxy: contractData.proxy,
            implementationAddress: contractData.implementation,
            createdBy: contractData.creationInfo?.creator,
            creationTx: contractData.creationInfo?.txHash,
            linesOfCode: staticAnalysis.linesOfCode,
            solidityVersion: staticAnalysis.solidityVersion
        },
        aiAnalysis: {
            ...aiAnalysis,
            staticAnalysis,
            abiAnalysis
        },
        onChainData,
        riskAssessment,
        lastAnalyzed: new Date().toISOString()
    };
};

const analyzeTransactionPatterns = (transactions) => {
    if (!transactions || transactions.length === 0) {
        return {
            totalTransactions: 0,
            activity: 'inactive',
            suspiciousPatterns: [],
            recentActivity: false
        };
    }

    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 86400;
    const oneWeekAgo = now - 604800;
    const oneMonthAgo = now - 2592000;

    const recentTxs = transactions.filter(tx => parseInt(tx.timeStamp) > oneDayAgo);
    const weekTxs = transactions.filter(tx => parseInt(tx.timeStamp) > oneWeekAgo);
    const monthTxs = transactions.filter(tx => parseInt(tx.timeStamp) > oneMonthAgo);

    const failedTxs = transactions.filter(tx => tx.isError === "1");
    const uniqueInteractors = new Set(transactions.map(tx => tx.from)).size;

    const suspiciousPatterns = [];

    if (failedTxs.length > transactions.length * 0.3) {
        suspiciousPatterns.push({
            type: 'high_failure_rate',
            severity: 'medium',
            description: `${((failedTxs.length / transactions.length) * 100).toFixed(1)}% of transactions failed`
        });
    }

    if (recentTxs.length > weekTxs.length * 0.5) {
        suspiciousPatterns.push({
            type: 'activity_spike',
            severity: 'low',
            description: 'Unusual spike in recent activity'
        });
    }

    if (transactions.length > 20 && uniqueInteractors < 5) {
        suspiciousPatterns.push({
            type: 'low_user_diversity',
            severity: 'medium',
            description: `Only ${uniqueInteractors} unique addresses interacted with contract`
        });
    }

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
        uniqueInteractors,
        activity,
        suspiciousPatterns,
        recentActivity: recentTxs.length > 0,
        lastInteraction: transactions[0] ? new Date(parseInt(transactions[0].timeStamp) * 1000).toISOString() : null
    };
};

const calculateRugPullScore = (aiAnalysis, staticAnalysis, abiAnalysis, transactionAnalysis) => {
    let rugScore = 0;

    if (aiAnalysis.isWellKnownProtocol) {
        console.log(`✅ AI detected well-known protocol: ${aiAnalysis.protocolName}`);
        return 5;
    }

    const rugPullIndicators = [
        'Centralization Risks',
        'Unprotected Functions',
        'Access Control Issues',
        'Unchecked External Calls'
    ];

    const rugVulns = aiAnalysis.vulnerabilities?.filter(v =>
        v.detected && rugPullIndicators.some(indicator => v.name.includes(indicator))
    ) || [];

    rugScore += rugVulns.filter(v => v.severity === 'critical').length * 30;
    rugScore += rugVulns.filter(v => v.severity === 'high').length * 20;
    rugScore += rugVulns.filter(v => v.severity === 'medium').length * 10;

    if (abiAnalysis.hasOwnership && !abiAnalysis.hasPause) {
        rugScore += 10;
    }

    if (abiAnalysis.dangerousFunctions?.some(fn =>
        fn.toLowerCase().includes('withdraw') ||
        fn.toLowerCase().includes('selfdestruct')
    )) {
        rugScore += 15;
    }

    if (staticAnalysis.hasSelfDestruct) {
        rugScore += 25;
    }

    if (transactionAnalysis.uniqueInteractors < 10 && transactionAnalysis.totalTransactions > 50) {
        rugScore += 20;
    }

    if (transactionAnalysis.uniqueInteractors > 1000) {
        rugScore = Math.max(0, rugScore - 20);
    }

    if (transactionAnalysis.totalTransactions > 10000) {
        rugScore = Math.max(0, rugScore - 15);
    }

    if (transactionAnalysis.failureRate > 30) {
        rugScore += 10;
    }

    return Math.min(100, rugScore);
};

const calculateRiskAssessment = (aiAnalysis, staticAnalysis, abiAnalysis, transactionAnalysis) => {
    const risks = [];
    let overallRiskScore = 0;

    const criticalVulns = aiAnalysis.vulnerabilities?.filter(v => v.detected && v.severity === 'critical').length || 0;
    const highVulns = aiAnalysis.vulnerabilities?.filter(v => v.detected && v.severity === 'high').length || 0;
    const mediumVulns = aiAnalysis.vulnerabilities?.filter(v => v.detected && v.severity === 'medium').length || 0;

    if (criticalVulns > 0) {
        overallRiskScore += criticalVulns * 25;
        risks.push({
            category: 'Critical Vulnerabilities',
            severity: 'critical',
            count: criticalVulns,
            impact: 'Immediate exploitation possible'
        });
    }

    if (highVulns > 0) {
        overallRiskScore += highVulns * 15;
        risks.push({
            category: 'High Severity Issues',
            severity: 'high',
            count: highVulns,
            impact: 'Significant security concerns'
        });
    }

    if (mediumVulns > 0) {
        overallRiskScore += mediumVulns * 5;
    }

    if (staticAnalysis.hasAssembly) {
        overallRiskScore += 10;
        risks.push({
            category: 'Assembly Code',
            severity: 'medium',
            impact: 'Requires careful manual review'
        });
    }

    if (staticAnalysis.hasExternalCalls && !staticAnalysis.usesReentrancyGuard) {
        overallRiskScore += 15;
        risks.push({
            category: 'Unprotected External Calls',
            severity: 'high',
            impact: 'Potential reentrancy vulnerability'
        });
    }

    if (staticAnalysis.hasSelfDestruct) {
        overallRiskScore += 20;
        risks.push({
            category: 'Self-Destruct Function',
            severity: 'critical',
            impact: 'Contract can be permanently destroyed'
        });
    }

    if (abiAnalysis.dangerousFunctions?.length > 0) {
        overallRiskScore += 10;
        risks.push({
            category: 'Dangerous Functions',
            severity: 'medium',
            functions: abiAnalysis.dangerousFunctions,
            impact: 'Contains high-risk functions'
        });
    }

    if (transactionAnalysis.suspiciousPatterns?.length > 0) {
        const criticalPatterns = transactionAnalysis.suspiciousPatterns.filter(p => p.severity === 'critical' || p.severity === 'high');
        if (criticalPatterns.length > 0) {
            overallRiskScore += 15;
            risks.push({
                category: 'Suspicious Transaction Patterns',
                severity: 'high',
                patterns: criticalPatterns,
                impact: 'Unusual or suspicious contract activity detected'
            });
        }
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
        summary: generateRiskSummary(riskLevel, criticalVulns, highVulns, risks.length)
    };
};

const generateRiskSummary = (riskLevel, criticalVulns, highVulns, totalRisks) => {
    if (riskLevel === 'critical') {
        return `This contract has critical security issues that require immediate attention. ${criticalVulns} critical vulnerabilities detected. Do not interact with this contract.`;
    }
    if (riskLevel === 'high') {
        return `This contract has significant security concerns with ${highVulns} high-severity issues. Professional audit strongly recommended before interaction.`;
    }
    if (riskLevel === 'medium') {
        return `This contract has ${totalRisks} identified risks. Proceed with caution and conduct thorough testing.`;
    }
    return 'This contract appears to follow security best practices, but users should always do their own research.';
};

module.exports = {
    performComprehensiveAnalysis,
    getOnChainData,
    analyzeTransactionPatterns,
    calculateRiskAssessment,
    calculateRugPullScore
};
