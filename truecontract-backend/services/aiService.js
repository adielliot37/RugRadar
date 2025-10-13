const axios = require('axios');

const analyzeContractWithAI = async (contractData, network = 'base') => {
    const sourceCode = typeof contractData === 'string' ? contractData : contractData.sourceCode;
    const metadata = typeof contractData === 'object' ? contractData : {};

    if (network === 'solana') {
        return analyzeSolanaProgram(contractData, metadata);
    }

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

const analyzeSolanaProgram = async (programData, metadata) => {
    const isToken = programData.isToken || false;
    const tokenInfo = programData.tokenInfo || null;
    const programType = programData.programType || 'Unknown';
    const tokenAnalysis = programData.tokenAnalysis || null;
    
    let prompt;
    
    if (isToken && tokenInfo) {
        // Token-specific analysis prompt
        const supply = parseFloat(tokenInfo.supply?.uiAmountString || '0');
        const isMemecoin = supply > 1000000000;
        
        prompt = `
        As an expert Solana token security analyst, perform a comprehensive analysis of this SPL token.
        
        TOKEN INFORMATION:
        - Mint Address: ${programData.programAddress || programData.programId}
        - Token Type: ${programData.contractType || classifyTokenType(tokenInfo)}
        - Total Supply: ${supply.toLocaleString()} tokens
        - Decimals: ${tokenInfo.decimals}
        - Mint Authority: ${tokenInfo.mintAuthority ? 'Present (RISK)' : 'Revoked (Safe)'}
        - Freeze Authority: ${tokenInfo.freezeAuthority ? 'Present (RISK)' : 'Revoked (Safe)'}
        - Is Memecoin: ${isMemecoin ? 'Yes' : 'No'}
        - Top Holder Concentration: ${tokenAnalysis?.concentration?.toFixed(1) || 'Unknown'}%
        
        ${tokenInfo.largestHolders && tokenInfo.largestHolders.length > 0 ? 
            `TOP HOLDERS:
${tokenInfo.largestHolders.slice(0, 5).map((holder, i) => 
    `${i + 1}. ${holder.address}: ${parseFloat(holder.uiAmountString || '0').toLocaleString()} tokens (${((parseFloat(holder.uiAmountString || '0') / supply) * 100).toFixed(2)}%)`
).join('\n')}` : ''}
        
        Provide your response as a single, minified JSON object without any markdown formatting.
        
        The JSON object must have this exact structure:
        {
          "summary": "A detailed 2-3 sentence summary of the token's purpose, supply characteristics, and key risk factors.",
          "contractType": "Specific token classification: 'Memecoin', 'Utility Token', 'LP Token', 'NFT Mint', etc.",
          "isWellKnownProtocol": false,
          "protocolName": null,
          "securityScore": "An integer from 0 (critical risk) to 100 (extremely safe), based on authority analysis and distribution.",
          "complexityScore": "An integer from 0 (simple) to 100 (very complex) - most SPL tokens are simple (10-30).",
          "gasOptimization": "Score from 0-100 based on Solana efficiency (most SPL tokens score 80-95).",
          "codeQuality": "Score from 0-100 based on standard SPL implementation (usually 70-90).",
          "vulnerabilities": [
            { "name": "Unlimited Mint Authority", "detected": ${!!tokenInfo.mintAuthority}, "severity": "high", "details": "${tokenInfo.mintAuthority ? 'Token supply can be inflated by mint authority' : 'Mint authority has been revoked - supply is fixed'}" },
            { "name": "Freeze Authority Active", "detected": ${!!tokenInfo.freezeAuthority}, "severity": "high", "details": "${tokenInfo.freezeAuthority ? 'Token accounts can be frozen by freeze authority' : 'Freeze authority has been revoked - accounts cannot be frozen'}" },
            { "name": "High Concentration Risk", "detected": ${(tokenAnalysis?.concentration || 0) > 30}, "severity": "${(tokenAnalysis?.concentration || 0) > 50 ? 'critical' : 'medium'}", "details": "Top holder owns ${tokenAnalysis?.concentration?.toFixed(1) || '0'}% of total supply" },
            { "name": "Memecoin Volatility Risk", "detected": ${isMemecoin}, "severity": "medium", "details": "${isMemecoin ? 'High supply memecoin with speculative nature and extreme volatility risk' : 'Not classified as a memecoin'}" },
            { "name": "Low Liquidity Risk", "detected": ${tokenAnalysis?.risks?.some(r => r.type === 'low_recent_activity') || false}, "severity": "low", "details": "Limited recent trading activity may indicate low liquidity" }
          ],
          "bestPractices": {
            "mintAuthorityRevoked": ${!tokenInfo.mintAuthority},
            "freezeAuthorityRevoked": ${!tokenInfo.freezeAuthority},
            "hasMetadata": ${!!programData.metadata},
            "reasonableSupply": ${supply > 0 && supply < 1e15},
            "activeTrading": ${tokenAnalysis?.risks?.some(r => r.type !== 'low_recent_activity') !== false}
          },
          "tokenSpecificIssues": [
            ${tokenInfo.mintAuthority ? '"Mint authority present - supply can be inflated"' : ''}
            ${tokenInfo.freezeAuthority ? '"Freeze authority present - accounts can be frozen"' : ''}
            ${(tokenAnalysis?.concentration || 0) > 50 ? '"Extremely high token concentration - rug pull risk"' : ''}
            ${isMemecoin ? '"High-risk memecoin - extreme volatility expected"' : ''}
          ].filter(Boolean),
          "recommendations": [
            ${tokenInfo.mintAuthority || tokenInfo.freezeAuthority ? '"Verify if authorities are truly needed or consider revoking them"' : '"Good: Both mint and freeze authorities are properly revoked"'},
            ${(tokenAnalysis?.concentration || 0) > 30 ? '"Monitor large holder movements closely"' : '"Token distribution appears reasonable"'},
            ${isMemecoin ? '"Exercise extreme caution - this is a speculative memecoin"' : '"Standard token safety practices apply"'},
            "Always verify token authenticity and do your own research",
            "Check for official project social media and documentation"
          ],
          "overallVerdict": "${(tokenAnalysis?.riskScore || 50) > 70 ? 'High risk detected' : (tokenAnalysis?.riskScore || 50) > 50 ? 'Proceed with caution' : (tokenAnalysis?.riskScore || 50) > 30 ? 'Moderate risk - research thoroughly' : 'Standard token risks apply'}",
          "auditPriority": "${(tokenAnalysis?.riskScore || 50) > 70 ? 'high' : (tokenAnalysis?.riskScore || 50) > 40 ? 'medium' : 'low'} - ${isMemecoin ? 'Memecoin classification increases risk' : 'Standard SPL token'}"
        }`;
    } else {
        // General Solana program analysis
        prompt = `
        As an expert Solana program security analyst, analyze this Solana program.
        
        PROGRAM INFORMATION:
        - Program Address: ${programData.programAddress || programData.programId}
        - Program Type: ${programType}
        - Is Executable: ${programData.accountInfo?.executable ? 'Yes' : 'No'}
        - Owner Program: ${programData.accountInfo?.owner || 'Unknown'}
        - Account Data Length: ${programData.accountInfo?.data?.length || 0} bytes
        
        Provide your response as a single, minified JSON object without any markdown formatting.
        
        The JSON object must have this exact structure:
        {
          "summary": "A detailed 2-3 sentence summary of what this Solana program does and its risk level.",
          "contractType": "${programType === 'UNKNOWN' ? 'Unknown Solana Program' : programType.replace(/_/g, ' ')}",
          "isWellKnownProtocol": ${['SPL_TOKEN_PROGRAM', 'TOKEN_2022_PROGRAM', 'RAYDIUM_AMM', 'JUPITER_AGGREGATOR', 'ORCA_DEX'].includes(programType)},
          "protocolName": ${programType === 'RAYDIUM_AMM' ? '"Raydium"' : programType === 'JUPITER_AGGREGATOR' ? '"Jupiter"' : programType === 'ORCA_DEX' ? '"Orca"' : 'null'},
          "securityScore": "${programType === 'UNKNOWN' ? '30' : ['SPL_TOKEN_PROGRAM', 'TOKEN_2022_PROGRAM'].includes(programType) ? '95' : '60'}",
          "complexityScore": "${programType === 'UNKNOWN' ? '50' : programType.includes('TOKEN') ? '20' : '70'}",
          "gasOptimization": "85",
          "codeQuality": "${programType === 'UNKNOWN' ? '40' : '75'}",
          "vulnerabilities": [
            { "name": "Unknown Program Type", "detected": ${programType === 'UNKNOWN'}, "severity": "medium", "details": "${programType === 'UNKNOWN' ? 'Cannot determine program functionality and safety' : 'Program type identified successfully'}" },
            { "name": "Unverified Program", "detected": ${!['SPL_TOKEN_PROGRAM', 'TOKEN_2022_PROGRAM', 'RAYDIUM_AMM', 'JUPITER_AGGREGATOR', 'ORCA_DEX'].includes(programType)}, "severity": "low", "details": "Program is not a well-known protocol - verify independently" }
          ],
          "bestPractices": {
            "isWellKnownProgram": ${['SPL_TOKEN_PROGRAM', 'TOKEN_2022_PROGRAM', 'RAYDIUM_AMM', 'JUPITER_AGGREGATOR', 'ORCA_DEX'].includes(programType)},
            "hasValidStructure": ${programData.accountInfo ? 'true' : 'false'}
          },
          "gasIssues": [],
          "recommendations": [
            "Verify program authenticity through official sources",
            "Check program's transaction history and usage patterns",
            "Research the program's purpose and documentation"
          ],
          "overallVerdict": "${programType === 'UNKNOWN' ? 'Unknown program - proceed with extreme caution' : ['SPL_TOKEN_PROGRAM', 'TOKEN_2022_PROGRAM', 'RAYDIUM_AMM', 'JUPITER_AGGREGATOR', 'ORCA_DEX'].includes(programType) ? 'Well-known protocol - generally safe' : 'Unverified program - research thoroughly'}",
          "auditPriority": "${programType === 'UNKNOWN' ? 'high' : ['SPL_TOKEN_PROGRAM', 'TOKEN_2022_PROGRAM'].includes(programType) ? 'low' : 'medium'}"
        }`;
    }

    try {
        console.log(`Sending Solana ${isToken ? 'token' : 'program'} to OpenAI for analysis...`);
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 2000
        }, {
            headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
        });

        const result = response.data.choices[0].message.content;
        console.log('Solana AI analysis received.');

        const cleanedResult = result.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanedResult);
    } catch (error) {
        console.error('Error with OpenAI API for Solana:', error.response ? error.response.data : error.message);
        
        // Return fallback analysis for Solana
        return {
            summary: `This is a Solana ${isToken ? 'token' : 'program'} that requires manual verification.`,
            contractType: isToken ? 'SPL Token' : 'Solana Program',
            isWellKnownProtocol: false,
            protocolName: null,
            securityScore: 50,
            complexityScore: 40,
            gasOptimization: 85,
            codeQuality: 60,
            vulnerabilities: [
                {
                    name: 'Analysis Failed',
                    detected: true,
                    severity: 'medium',
                    details: 'AI analysis could not be completed - manual review required'
                }
            ],
            bestPractices: {
                mintAuthorityRevoked: !tokenInfo?.mintAuthority,
                freezeAuthorityRevoked: !tokenInfo?.freezeAuthority
            },
            tokenSpecificIssues: tokenInfo?.mintAuthority || tokenInfo?.freezeAuthority ? 
                ['Authority controls present'] : [],
            recommendations: [
                'Manual security review required',
                'Verify program/token through official sources',
                'Check community feedback and usage patterns'
            ],
            overallVerdict: 'Analysis incomplete - manual verification needed',
            auditPriority: 'medium'
        };
    }
};

const classifyTokenType = (tokenInfo) => {
    if (!tokenInfo || !tokenInfo.supply) return 'Unknown Token';
    
    const supply = parseFloat(tokenInfo.supply.uiAmountString || '0');
    const decimals = tokenInfo.decimals;
    
    if (supply === 0) return 'NFT Mint';
    if (decimals === 0 && supply <= 10000) return 'NFT Collection';
    if (supply >= 1000000000) return 'Memecoin';
    if (supply <= 21000000 && decimals >= 6) return 'Utility Token';
    
    return 'SPL Token';
};

module.exports = {
    analyzeContractWithAI,
    analyzeContractABI,
    performStaticAnalysis,
    analyzeSolanaProgram
};
