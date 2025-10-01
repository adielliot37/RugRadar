const axios = require('axios');

const MCP_REST_URL = process.env.MCP_REST_URL || 'http://localhost:3001/rest';
const DELEGATION = process.env.DELEGATION;

const uploadAnalysis = async (fileName, data) => {
    try {
        const fileContent = JSON.stringify(data, null, 2);
        const base64Content = Buffer.from(fileContent).toString('base64');

        console.log(`Uploading ${fileName} to Storacha via MCP...`);

        const uploadArgs = {
            file: base64Content,
            name: fileName,
            publishToFilecoin: true
        };

        if (DELEGATION) {
            uploadArgs.delegation = DELEGATION;
        }

        const rpcBody = {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
                name: 'upload',
                arguments: uploadArgs
            }
        };

        console.log('Sending MCP request to:', MCP_REST_URL);

        const response = await axios.post(MCP_REST_URL, rpcBody, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000
        });

        console.log('MCP upload response received');

        const result = response.data;

        if (result.error) {
            throw new Error(`MCP error: ${result.error.message || JSON.stringify(result.error)}`);
        }

        const text = result?.result?.content?.[0]?.text;
        if (!text) {
            throw new Error('MCP upload: missing result.content[0].text in response');
        }

        let payload;
        try {
            payload = JSON.parse(text);
        } catch (parseError) {
            if (text.includes('error') || text.includes('Error')) {
                throw new Error(`MCP upload error: ${text}`);
            }
            throw new Error(`MCP upload: invalid JSON response: ${text}`);
        }

        // Check for errors in payload
        if (payload.error) {
            throw new Error(`MCP upload error: ${payload.error}`);
        }

        let fileCid = payload?.files?.[fileName]?.['/'];

        if (!fileCid && payload?.files) {
            const keys = Object.keys(payload.files);

            if (keys.length > 0) {
                fileCid = payload.files[keys[0]]?.['/'];
                console.log(`Using first available file: ${keys[0]} -> ${fileCid}`);
            }

            if (!fileCid && fileName.includes('.')) {
                const nameWithoutExt = fileName.split('.')[0];
                for (const key of keys) {
                    if (key.startsWith(nameWithoutExt)) {
                        fileCid = payload.files[key]?.['/'];
                        console.log(`Matched by prefix: ${key} -> ${fileCid}`);
                        break;
                    }
                }
            }
        }

        if (!fileCid) {
            const keys = payload?.files ? Object.keys(payload.files) : [];
            throw new Error(
                `MCP upload: file CID not found for "${fileName}". Available keys: ${keys.join(', ')}`
            );
        }

        const rootCid = payload?.root?.['/'];

        console.log('Storacha upload successful.');
        console.log(`File CID: ${fileCid}`);
        console.log(`Root CID: ${rootCid}`);

        return {
            cid: fileCid,
            rootCid: rootCid,
            path: `${fileCid}/${fileName}`
        };
    } catch (error) {
        console.error('Error uploading to Storacha:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        throw new Error(`Could not upload data to Storacha: ${error.message}`);
    }
};

const retrieveAnalysis = async (filepath) => {
    try {
        console.log(`Retrieving ${filepath} from Storacha...`);

        const cid = filepath.split('/')[0];

        const gatewayUrl = `https://w3s.link/ipfs/${cid}`;

        console.log(`Fetching from gateway: ${gatewayUrl}`);

        const response = await axios.get(gatewayUrl, {
            timeout: 30000,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (typeof response.data === 'object') {
            return response.data;
        }

        if (typeof response.data === 'string') {
            return JSON.parse(response.data);
        }

        throw new Error('Unexpected response format from gateway');

    } catch (error) {
        if (error.response?.status === 404) {
            console.log(`File not found on Storacha: ${filepath}`);
            return null;
        }

        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            console.warn(`Timeout retrieving from Storacha: ${filepath}`);
            return null;
        }

        console.error('Error retrieving from Storacha:', error.message);

        return null;
    }
};

module.exports = { uploadAnalysis, retrieveAnalysis };
