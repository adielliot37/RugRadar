const axios = require('axios');

const analyzeContractWithAI = async (contractData) => {
    const sourceCode = typeof contractData === 'string' ? contractData : contractData.sourceCode;
    const metadata = typeof contractData === 'object' ? contractData : {};

    const prompt = `
        As an expert smart contract security auditor, perform a comprehensive security analysis of this Solidity contract from the Base blockchain.

        CONTRACT METADATA:
        - Contract Name: ${metadata.contractName || 'Unknown'}
        - Compiler Version: ${metadata.compilerVersion || 'Unknown'}
        - Optimization: ${metadata.optimization ? 'Enabled' : 'Disabled'}
        - Is Proxy: ${metadata.proxy ? 'Yes' : 'No'}
        - License: ${metadata.licenseType || 'Unknown'}

        IMPORTANT: Identify if this is a well-known, legitimate protocol (like USDC, WETH, Uniswap, Aave, etc.) based on the contract code patterns, name, and implementation. These should have very low risk scores.

        Provide your response as a single, minified JSON object without any markdown formatting.

        The JSON object must have this exact structure:
        {
          "summary": "A detailed 2-3 sentence summary of the contract's purpose and key functionality.",
          "contractType": "Precise type with token name if applicable: 'USDC Token (ERC20)', 'WETH Token', 'Uniswap V3 Pool', 'ERC721 NFT', 'Proxy Contract', 'DEX Router', etc. Be specific with well-known protocols.",
          "isWellKnownProtocol": true/false,
          "protocolName": "If well-known: USDC, Uniswap, Aave, etc. Otherwise: null",
          "securityScore": "An integer from 0 (critical risk) to 100 (extremely safe), based on all vulnerability findings.",
          "complexityScore": "An integer from 0 (simple) to 100 (very complex), based on code complexity.",
          "gasOptimization": "A score from 0 (poor) to 100 (excellent) based on gas efficiency patterns.",
          "codeQuality": "A score from 0 (poor) to 100 (excellent) based on best practices, comments, and structure.",
          "vulnerabilities": [
            { "name": "Reentrancy Attack", "detected": boolean, "severity": "critical|high|medium|low", "details": "Detailed explanation if detected, specific line references if possible." },
            { "name": "Integer Overflow/Underflow", "detected": boolean, "severity": "critical|high|medium|low", "details": "Check if SafeMath or Solidity 0.8+ is used." },
            { "name": "Unchecked External Calls", "detected": boolean, "severity": "critical|high|medium|low", "details": "Check for unchecked call, delegatecall, send return values." },
            { "name": "Access Control Issues", "detected": boolean, "severity": "critical|high|medium|low", "details": "Analyze ownership patterns, role-based access, privilege escalation risks." },
            { "name": "Front-Running Vulnerability", "detected": boolean, "severity": "critical|high|medium|low", "details": "Check for MEV vulnerabilities and transaction ordering dependencies." },
            { "name": "Timestamp Dependence", "detected": boolean, "severity": "critical|high|medium|low", "details": "Check if block.timestamp is used unsafely." },
            { "name": "Denial of Service", "detected": boolean, "severity": "critical|high|medium|low", "details": "Check for gas limit issues, unbounded loops, external call failures." },
            { "name": "Logic Errors", "detected": boolean, "severity": "critical|high|medium|low", "details": "Business logic flaws, calculation errors, state inconsistencies." },
            { "name": "Centralization Risks", "detected": boolean, "severity": "critical|high|medium|low", "details": "Admin privileges, single points of failure, upgrade mechanisms." },
            { "name": "Unprotected Functions", "detected": boolean, "severity": "critical|high|medium|low", "details": "Public/external functions without proper access control." },
            { "name": "Oracle Manipulation", "detected": boolean, "severity": "critical|high|medium|low", "details": "Price oracle attacks, data source vulnerabilities." },
            { "name": "Flash Loan Attack Surface", "detected": boolean, "severity": "critical|high|medium|low", "details": "Vulnerability to flash loan exploits and price manipulation." }
          ],
          "bestPractices": {
            "usesLatestSolidity": boolean,
            "hasNatSpecComments": boolean,
            "usesCheckEffectsInteractions": boolean,
            "hasEmergencyStop": boolean,
            "hasUpgradeability": boolean,
            "hasTimelock": boolean,
            "usesReentrancyGuard": boolean,
            "hasEventEmissions": boolean
          },
          "gasIssues": [
            "List specific gas optimization opportunities found in the code"
          ],
          "recommendations": [
            "Prioritized list of 3-5 specific security improvements and best practices to implement"
          ],
          "overallVerdict": "A clear recommendation starting with: 'Safe to interact', 'Proceed with caution', 'High risk detected', or 'Critical vulnerabilities found'.",
          "auditPriority": "low|medium|high|critical - How urgently this contract needs a professional audit"
        }

        CONTRACT SOURCE CODE:
        \`\`\`solidity
        ${JSON.stringify(sourceCode).slice(0, 15000)}
        \`\`\`
    `;

    try {
        console.log('Sending contract to OpenAI for comprehensive security analysis...');
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 3000
        }, {
            headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
        });

        const result = response.data.choices[0].message.content;
        console.log('Comprehensive AI analysis received.');

        const cleanedResult = result.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanedResult);
    } catch (error) {
        console.error('Error with OpenAI API:', error.response ? error.response.data : error.message);
        throw new Error('Failed to get analysis from AI service.');
    }
};

const analyzeContractABI = (abi) => {
    if (!abi || !Array.isArray(abi)) {
        return {
            functionCount: 0,
            publicFunctions: 0,
            payableFunctions: 0,
            hasOwnership: false,
            hasPause: false,
            dangerousFunctions: []
        };
    }

    const functions = abi.filter(item => item.type === 'function');
    const publicFunctions = functions.filter(f =>
        f.stateMutability === 'nonpayable' || f.stateMutability === 'payable'
    );
    const payableFunctions = functions.filter(f => f.stateMutability === 'payable');

    const hasOwnership = functions.some(f =>
        f.name && (
            f.name.toLowerCase().includes('owner') ||
            f.name.toLowerCase().includes('admin') ||
            f.name === 'renounceOwnership' ||
            f.name === 'transferOwnership'
        )
    );

    const hasPause = functions.some(f =>
        f.name && (f.name === 'pause' || f.name === 'unpause')
    );

    const dangerousFunctions = functions
        .filter(f =>
            f.name && (
                f.name.toLowerCase().includes('selfdestruct') ||
                f.name.toLowerCase().includes('delegatecall') ||
                f.name.toLowerCase().includes('withdraw') ||
                f.name.toLowerCase().includes('emergencywithdraw')
            )
        )
        .map(f => f.name);

    return {
        functionCount: functions.length,
        publicFunctions: publicFunctions.length,
        payableFunctions: payableFunctions.length,
        hasOwnership,
        hasPause,
        dangerousFunctions
    };
};

const performStaticAnalysis = (sourceCode) => {
    const code = typeof sourceCode === 'string' ? sourceCode : JSON.stringify(sourceCode);

    return {
        linesOfCode: code.split('\n').length,
        hasAssembly: code.includes('assembly {'),
        usesSafeMath: code.includes('SafeMath') || code.includes('using SafeMath'),
        usesReentrancyGuard: code.includes('ReentrancyGuard') || code.includes('nonReentrant'),
        hasExternalCalls: code.includes('.call(') || code.includes('.delegatecall('),
        usesTransfer: code.includes('.transfer('),
        usesSend: code.includes('.send('),
        hasSelfDestruct: code.includes('selfdestruct'),
        usesBlockTimestamp: code.includes('block.timestamp') || code.includes('now'),
        hasUnboundedLoops: /for\s*\([^)]*\)\s*{[^}]*\[\s*i\s*\]/.test(code),
        solidityVersion: extractSolidityVersion(code),
        importsCount: (code.match(/import/g) || []).length,
        contractsCount: (code.match(/contract\s+\w+/g) || []).length
    };
};

const extractSolidityVersion = (code) => {
    const versionMatch = code.match(/pragma\s+solidity\s+([^;]+);/);
    return versionMatch ? versionMatch[1].trim() : 'Unknown';
};

module.exports = {
    analyzeContractWithAI,
    analyzeContractABI,
    performStaticAnalysis
};
