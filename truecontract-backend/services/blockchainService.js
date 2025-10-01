const axios = require('axios');

const getContractData = async (address) => {
    try {
        console.log(`Fetching comprehensive data for ${address}...`);

        const [sourceData, abiData, creationData] = await Promise.all([
            getSourceCode(address),
            getContractABI(address),
            getContractCreation(address)
        ]);

        return {
            sourceCode: sourceData.sourceCode,
            contractName: sourceData.contractName,
            compilerVersion: sourceData.compilerVersion,
            optimization: sourceData.optimization,
            runs: sourceData.runs,
            constructorArguments: sourceData.constructorArguments,
            evmVersion: sourceData.evmVersion,
            library: sourceData.library,
            licenseType: sourceData.licenseType,
            proxy: sourceData.proxy,
            implementation: sourceData.implementation,
            abi: abiData,
            creationInfo: creationData
        };
    } catch (error) {
        console.error('Error fetching contract data:', error.message);
        throw error;
    }
};

const getSourceCode = async (address) => {
    const url = `https://api.etherscan.io/v2/api?chainid=8453&module=contract&action=getsourcecode&address=${address}&apikey=${process.env.BASESCAN_API_KEY}`;

    try {
        const response = await axios.get(url);

        if (response.data.status === "1" && response.data.result[0].SourceCode) {
            const result = response.data.result[0];
            console.log('Source code fetched successfully.');

            let sourceCode = result.SourceCode;

            if (sourceCode.startsWith('{{') && sourceCode.endsWith('}}')) {
                const parsed = JSON.parse(sourceCode.slice(1, -1));
                sourceCode = parsed.sources || sourceCode;
            } else if (sourceCode.startsWith('{') && sourceCode.includes('sources')) {
                try {
                    const parsed = JSON.parse(sourceCode);
                    sourceCode = parsed.sources || sourceCode;
                } catch (e) {}
            }

            return {
                sourceCode,
                contractName: result.ContractName,
                compilerVersion: result.CompilerVersion,
                optimization: result.OptimizationUsed === "1",
                runs: result.Runs,
                constructorArguments: result.ConstructorArguments,
                evmVersion: result.EVMVersion,
                library: result.Library,
                licenseType: result.LicenseType,
                proxy: result.Proxy === "1",
                implementation: result.Implementation
            };
        } else {
            throw new Error(response.data.result || 'Could not fetch source code. Contract may not be verified.');
        }
    } catch (error) {
        console.error('Error fetching source code:', error.message);
        throw new Error('Failed to fetch contract source code from BaseScan.');
    }
};

const getContractABI = async (address) => {
    const url = `https://api.etherscan.io/v2/api?chainid=8453&module=contract&action=getabi&address=${address}&apikey=${process.env.BASESCAN_API_KEY}`;

    try {
        const response = await axios.get(url);
        if (response.data.status === "1") {
            return JSON.parse(response.data.result);
        }
        return null;
    } catch (error) {
        console.warn('Could not fetch ABI:', error.message);
        return null;
    }
};

const getContractCreation = async (address) => {
    const url = `https://api.etherscan.io/v2/api?chainid=8453&module=contract&action=getcontractcreation&contractaddresses=${address}&apikey=${process.env.BASESCAN_API_KEY}`;

    try {
        const response = await axios.get(url);
        if (response.data.status === "1" && response.data.result[0]) {
            return {
                creator: response.data.result[0].contractCreator,
                txHash: response.data.result[0].txHash
            };
        }
        return null;
    } catch (error) {
        console.warn('Could not fetch creation info:', error.message);
        return null;
    }
};

const getContractTransactions = async (address, limit = 100) => {
    const url = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${process.env.BASESCAN_API_KEY}`;

    try {
        const response = await axios.get(url);
        if (response.data.status === "1") {
            return response.data.result;
        }
        return [];
    } catch (error) {
        console.warn('Could not fetch transactions:', error.message);
        return [];
    }
};

const getContractBalance = async (address) => {
    const url = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=balance&address=${address}&tag=latest&apikey=${process.env.BASESCAN_API_KEY}`;

    try {
        const response = await axios.get(url);
        if (response.data.status === "1") {
            return (parseInt(response.data.result) / 1e18).toString();
        }
        return "0";
    } catch (error) {
        console.warn('Could not fetch balance:', error.message);
        return "0";
    }
};

const getContractSourceCode = async (address) => {
    const data = await getContractData(address);
    return data.sourceCode;
};

module.exports = {
    getContractSourceCode,
    getContractData,
    getContractTransactions,
    getContractBalance
};
