const axios = require('axios');

// Solana RPC endpoint - can be configured via environment variable
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

// Solana program IDs for known protocols
const KNOWN_PROGRAM_IDS = {
    TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    TOKEN_2022_PROGRAM: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
    ASSOCIATED_TOKEN: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    SYSTEM_PROGRAM: '11111111111111111111111111111111',
    METAPLEX_TOKEN_METADATA: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
    RAYDIUM_AMM: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
    JUPITER_AGGREGATOR: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
    ORCA: '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP',
    PUMP_FUN: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'
};

const getSolanaProgramData = async (programId) => {
    try {
        console.log(`Fetching Solana program data for ${programId}...`);

        // Get account info to determine if it's a program
        const accountInfo = await getSolanaAccountInfo(programId);
        if (!accountInfo) {
            throw new Error('Program not found or invalid address');
        }

        const programData = {
            programId,
            accountInfo,
            programType: await determineProgramType(programId),
            isToken: false,
            tokenInfo: null,
            metadata: null,
            transactions: await getSolanaProgramTransactions(programId, 100)
        };

        // If it's a token mint, get additional token information
        if (programData.programType === 'SPL_TOKEN_MINT') {
            programData.isToken = true;
            programData.tokenInfo = await getTokenInfo(programId);
            programData.metadata = await getTokenMetadata(programId);
        }

        return programData;
    } catch (error) {
        console.error('Error fetching Solana program data:', error.message);
        throw error;
    }
};

const getSolanaAccountInfo = async (address) => {
    try {
        const response = await axios.post(SOLANA_RPC_URL, {
            jsonrpc: '2.0',
            id: 1,
            method: 'getAccountInfo',
            params: [
                address,
                {
                    encoding: 'jsonParsed',
                    commitment: 'confirmed'
                }
            ]
        });

        if (response.data.error) {
            throw new Error(response.data.error.message);
        }

        return response.data.result.value;
    } catch (error) {
        console.error('Error getting Solana account info:', error.message);
        return null;
    }
};

const determineProgramType = async (address) => {
    try {
        const accountInfo = await getSolanaAccountInfo(address);
        
        if (!accountInfo) return 'UNKNOWN';

        // Check if it's a token mint
        if (accountInfo.owner === KNOWN_PROGRAM_IDS.TOKEN_PROGRAM || 
            accountInfo.owner === KNOWN_PROGRAM_IDS.TOKEN_2022_PROGRAM) {
            if (accountInfo.data?.parsed?.type === 'mint') {
                return 'SPL_TOKEN_MINT';
            }
            if (accountInfo.data?.parsed?.type === 'account') {
                return 'TOKEN_ACCOUNT';
            }
        }

        // Check if it's a known program
        if (address === KNOWN_PROGRAM_IDS.TOKEN_PROGRAM) return 'SPL_TOKEN_PROGRAM';
        if (address === KNOWN_PROGRAM_IDS.TOKEN_2022_PROGRAM) return 'TOKEN_2022_PROGRAM';
        if (address === KNOWN_PROGRAM_IDS.RAYDIUM_AMM) return 'RAYDIUM_AMM';
        if (address === KNOWN_PROGRAM_IDS.JUPITER_AGGREGATOR) return 'JUPITER_AGGREGATOR';
        if (address === KNOWN_PROGRAM_IDS.ORCA) return 'ORCA_DEX';
        if (address === KNOWN_PROGRAM_IDS.PUMP_FUN) return 'PUMP_FUN';

        // Check if it's an executable program
        if (accountInfo.executable) {
            return 'SOLANA_PROGRAM';
        }

        return 'ACCOUNT';
    } catch (error) {
        console.error('Error determining program type:', error.message);
        return 'UNKNOWN';
    }
};

const getTokenInfo = async (mintAddress) => {
    try {
        const accountInfo = await getSolanaAccountInfo(mintAddress);
        
        if (!accountInfo || accountInfo.data?.parsed?.type !== 'mint') {
            return null;
        }

        const mintInfo = accountInfo.data.parsed.info;
        
        // Get supply information
        const supply = await getTokenSupply(mintAddress);
        
        // Get largest accounts (holders)
        const largestAccounts = await getTokenLargestAccounts(mintAddress);
        
        return {
            mintAddress,
            decimals: mintInfo.decimals,
            supply: supply,
            mintAuthority: mintInfo.mintAuthority,
            freezeAuthority: mintInfo.freezeAuthority,
            isInitialized: mintInfo.isInitialized,
            largestHolders: largestAccounts,
            creationSlot: accountInfo.slot || null
        };
    } catch (error) {
        console.error('Error getting token info:', error.message);
        return null;
    }
};

const getTokenSupply = async (mintAddress) => {
    try {
        const response = await axios.post(SOLANA_RPC_URL, {
            jsonrpc: '2.0',
            id: 1,
            method: 'getTokenSupply',
            params: [mintAddress]
        });

        if (response.data.error) {
            return null;
        }

        return response.data.result.value;
    } catch (error) {
        console.error('Error getting token supply:', error.message);
        return null;
    }
};

const getTokenLargestAccounts = async (mintAddress) => {
    try {
        const response = await axios.post(SOLANA_RPC_URL, {
            jsonrpc: '2.0',
            id: 1,
            method: 'getTokenLargestAccounts',
            params: [mintAddress]
        });

        if (response.data.error) {
            return [];
        }

        return response.data.result.value || [];
    } catch (error) {
        console.error('Error getting largest token accounts:', error.message);
        return [];
    }
};

const getTokenMetadata = async (mintAddress) => {
    try {
        // Try to get metadata from Metaplex
        const metadataPDA = await getMetadataPDA(mintAddress);
        const metadataAccount = await getSolanaAccountInfo(metadataPDA);
        
        if (!metadataAccount) {
            return null;
        }

        // For now, we'll return basic info. In production, you'd parse the metadata account data
        return {
            metadataAddress: metadataPDA,
            hasMetadata: true,
            updateAuthority: null, // Would parse from account data
            name: null, // Would parse from account data
            symbol: null, // Would parse from account data
            uri: null // Would parse from account data
        };
    } catch (error) {
        console.error('Error getting token metadata:', error.message);
        return null;
    }
};

const getMetadataPDA = async (mintAddress) => {
    // This is a simplified version. In production, you'd use @metaplex-foundation/js
    const seeds = [
        Buffer.from('metadata'),
        Buffer.from(KNOWN_PROGRAM_IDS.METAPLEX_TOKEN_METADATA, 'base58'),
        Buffer.from(mintAddress, 'base58')
    ];
    
    // This would use findProgramAddress in actual implementation
    return mintAddress; // Placeholder
};

const getSolanaProgramTransactions = async (address, limit = 100) => {
    try {
        // Using getSignaturesForAddress to get recent transactions
        const response = await axios.post(SOLANA_RPC_URL, {
            jsonrpc: '2.0',
            id: 1,
            method: 'getSignaturesForAddress',
            params: [
                address,
                {
                    limit: limit
                }
            ]
        });

        if (response.data.error) {
            return [];
        }

        const signatures = response.data.result || [];
        
        // Get detailed transaction info for each signature
        const transactions = [];
        const batchSize = 10; // Process in batches to avoid rate limits
        
        for (let i = 0; i < Math.min(signatures.length, batchSize); i++) {
            try {
                const txResponse = await axios.post(SOLANA_RPC_URL, {
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getTransaction',
                    params: [
                        signatures[i].signature,
                        {
                            encoding: 'jsonParsed',
                            maxSupportedTransactionVersion: 0
                        }
                    ]
                });

                if (!txResponse.data.error && txResponse.data.result) {
                    transactions.push({
                        signature: signatures[i].signature,
                        slot: signatures[i].slot,
                        blockTime: signatures[i].blockTime,
                        err: signatures[i].err,
                        transaction: txResponse.data.result
                    });
                }
            } catch (txError) {
                console.warn(`Failed to get transaction ${signatures[i].signature}:`, txError.message);
            }
        }

        return transactions;
    } catch (error) {
        console.error('Error getting Solana transactions:', error.message);
        return [];
    }
};

const getSolanaBalance = async (address) => {
    try {
        const response = await axios.post(SOLANA_RPC_URL, {
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [address]
        });

        if (response.data.error) {
            return "0";
        }

        // Convert lamports to SOL
        const lamports = response.data.result.value;
        return (lamports / 1e9).toString();
    } catch (error) {
        console.error('Error getting Solana balance:', error.message);
        return "0";
    }
};

const analyzeTokenRisk = async (tokenInfo, metadata, transactions) => {
    const risks = [];
    let riskScore = 0;

    if (!tokenInfo) {
        return { risks: ['Unable to fetch token information'], riskScore: 100 };
    }

    // Check mint authority
    if (tokenInfo.mintAuthority) {
        risks.push({
            type: 'mint_authority_present',
            severity: 'high',
            description: 'Token has mint authority - new tokens can be minted',
            impact: 'Supply can be inflated'
        });
        riskScore += 25;
    }

    // Check freeze authority
    if (tokenInfo.freezeAuthority) {
        risks.push({
            type: 'freeze_authority_present',
            severity: 'high',
            description: 'Token has freeze authority - accounts can be frozen',
            impact: 'Token transfers can be blocked'
        });
        riskScore += 25;
    }

    // Analyze token distribution
    if (tokenInfo.largestHolders && tokenInfo.largestHolders.length > 0) {
        const topHolder = tokenInfo.largestHolders[0];
        const totalSupply = parseFloat(tokenInfo.supply?.uiAmountString || '0');
        const topHolderAmount = parseFloat(topHolder.uiAmountString || '0');
        
        if (totalSupply > 0) {
            const concentration = (topHolderAmount / totalSupply) * 100;
            
            if (concentration > 50) {
                risks.push({
                    type: 'high_concentration',
                    severity: 'critical',
                    description: `Top holder owns ${concentration.toFixed(1)}% of total supply`,
                    impact: 'High risk of rug pull'
                });
                riskScore += 40;
            } else if (concentration > 20) {
                risks.push({
                    type: 'medium_concentration',
                    severity: 'medium',
                    description: `Top holder owns ${concentration.toFixed(1)}% of total supply`,
                    impact: 'Moderate concentration risk'
                });
                riskScore += 15;
            }
        }
    }

    // Check if it's likely a memecoin based on supply
    const totalSupply = parseFloat(tokenInfo.supply?.uiAmountString || '0');
    if (totalSupply > 1000000000) { // 1B+ supply often indicates memecoin
        risks.push({
            type: 'memecoin_characteristics',
            severity: 'medium',
            description: 'Very high token supply typical of memecoins',
            impact: 'Higher volatility and speculative risk'
        });
        riskScore += 10;
    }

    // Analyze transaction patterns
    if (transactions && transactions.length > 0) {
        const recentTxs = transactions.filter(tx => 
            tx.blockTime && (Date.now() / 1000 - tx.blockTime) < 86400 // Last 24 hours
        );
        
        if (recentTxs.length === 0 && transactions.length > 0) {
            risks.push({
                type: 'low_recent_activity',
                severity: 'low',
                description: 'No transactions in the last 24 hours',
                impact: 'Low liquidity or abandoned project'
            });
            riskScore += 5;
        }
    }

    return {
        risks,
        riskScore: Math.min(riskScore, 100),
        isMemecoin: totalSupply > 1000000000,
        hasUnlimitedMint: !!tokenInfo.mintAuthority,
        hasFreeze: !!tokenInfo.freezeAuthority,
        concentration: tokenInfo.largestHolders?.length > 0 ? 
            (parseFloat(tokenInfo.largestHolders[0].uiAmountString || '0') / totalSupply * 100) : 0
    };
};

const classifyTokenType = (tokenInfo, metadata, programData) => {
    if (!tokenInfo) return 'UNKNOWN';

    const totalSupply = parseFloat(tokenInfo.supply?.uiAmountString || '0');
    const decimals = tokenInfo.decimals;

    // Check for common patterns
    if (totalSupply === 0) {
        return 'NFT_MINT';
    }

    if (decimals === 0 && totalSupply <= 10000) {
        return 'NFT_COLLECTION';
    }

    if (totalSupply >= 1000000000) {
        return 'MEMECOIN';
    }

    if (totalSupply <= 21000000 && decimals >= 6) {
        return 'UTILITY_TOKEN';
    }

    if (metadata?.name?.toLowerCase().includes('lp') || 
        metadata?.name?.toLowerCase().includes('pool')) {
        return 'LP_TOKEN';
    }

    return 'SPL_TOKEN';
};

module.exports = {
    getSolanaProgramData,
    getSolanaAccountInfo,
    determineProgramType,
    getTokenInfo,
    getTokenMetadata,
    getSolanaProgramTransactions,
    getSolanaBalance,
    analyzeTokenRisk,
    classifyTokenType,
    KNOWN_PROGRAM_IDS
};