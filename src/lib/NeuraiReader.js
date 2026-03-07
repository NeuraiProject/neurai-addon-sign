// NeuraiReader - Browser-compatible version using fetch
// RPC URL: https://rpc-main.neurai.org/rpc

const NeuraiReader = (function() {
    'use strict';

    const URL_MAINNET = 'https://rpc-main.neurai.org/rpc';
    const URL_TESTNET = 'https://rpc-testnet.neurai.org/rpc';
    const ONE_FULL_COIN = 1e8;

    let rpcUrl = URL_MAINNET;

    function setURL(url) {
        rpcUrl = url;
    }

    function setMainnet() {
        rpcUrl = URL_MAINNET;
    }

    function setTestnet() {
        rpcUrl = URL_TESTNET;
    }

    async function rpc(method, params = []) {
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '1.0',
                id: 'curltest',
                method: method,
                params: params
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }
        return data.result;
    }

    // Get balance in XNA (native coin)
    async function getNeuraiBalance(address) {
        const addresses = Array.isArray(address) ? address : [address];
        const result = await rpc('getaddressbalance', [
            { addresses: addresses },
            false // includeAssets = false
        ]);
        return result;
    }

    // Get balance with assets (tokens)
    async function getAssetBalance(address) {
        const addresses = Array.isArray(address) ? address : [address];
        const result = await rpc('getaddressbalance', [
            { addresses: addresses },
            true // includeAssets = true
        ]);
        return result;
    }

    // Get UTXOs for an address
    async function getAddressUTXOs(address) {
        const addresses = Array.isArray(address) ? address : [address];
        const result = await rpc('getaddressutxos', [
            { addresses: addresses }
        ]);
        return result;
    }

    // Get mempool info for address
    async function getAddressMempool(address) {
        const addresses = Array.isArray(address) ? address : [address];
        const result = await rpc('getaddressmempool', [
            { addresses: addresses },
            true // includeAssets
        ]);
        return result;
    }

    // Get public key for an address (if revealed on chain)
    async function getPubKey(address) {
        const result = await rpc('getpubkey', [address]);
        return result;
    }

    // Verify a signed message
    async function verifyMessage(address, signature, message) {
        const result = await rpc('verifymessage', [address, signature, message]);
        return result;
    }

    // Get transaction by ID
    async function getTransaction(txid) {
        const result = await rpc('getrawtransaction', [txid, true]);
        return result;
    }

    // Get best block hash
    async function getBestBlockHash() {
        const result = await rpc('getbestblockhash', []);
        return result;
    }

    // Get block by hash
    async function getBlock(hash, verbosity = 1) {
        const result = await rpc('getblock', [hash, verbosity]);
        return result;
    }

    // Get block by height
    async function getBlockByHeight(height) {
        const hash = await rpc('getblockhash', [height]);
        const block = await rpc('getblock', [hash, 2]); // verbosity 2 = JSON object with tx data
        return block;
    }

    // Get mempool transactions
    async function getMempool() {
        const result = await rpc('getrawmempool', [true]);
        return result;
    }

    function getAssetBalanceFromMempool(assetName, mempool) {
        if (!Array.isArray(mempool) || mempool.length === 0) {
            return 0;
        }

        return mempool.reduce((pending, item) => {
            if (item && item.assetName === assetName) {
                return pending + Number(item.satoshis || 0);
            }
            return pending;
        }, 0);
    }

    async function getPendingBalanceFromAddressMempool(address, assetName = 'XNA') {
        const mempool = await getAddressMempool(address);
        return getAssetBalanceFromMempool(assetName, mempool);
    }

    // Get all assets
    async function getAllAssets(prefix = '*', includeAllMetaData = false) {
        const result = await rpc('listassets', [prefix, includeAllMetaData]);
        return result;
    }

    // Helper to format balance
    function formatBalance(satoshis) {
        if (!satoshis) return '0';
        return (satoshis / ONE_FULL_COIN).toFixed(8);
    }

    return {
        setURL,
        setMainnet,
        setTestnet,
        getNeuraiBalance,
        getAssetBalance,
        getAddressUTXOs,
        getAddressMempool,
        getPubKey,
        verifyMessage,
        getTransaction,
        getBestBlockHash,
        getBlock,
        getBlockByHeight,
        getMempool,
        getAssetBalanceFromMempool,
        getPendingBalanceFromAddressMempool,
        getAllAssets,
        formatBalance,
        URL_MAINNET,
        URL_TESTNET
    };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeuraiReader;
}
