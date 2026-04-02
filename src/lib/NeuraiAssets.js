(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.NeuraiAssets = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

    var NeuraiAssets = require('./test-page/neurai-assets/src/index.js');
    var root =
      typeof globalThis !== 'undefined' ? globalThis :
      typeof self !== 'undefined' ? self :
      typeof window !== 'undefined' ? window :
      this;
    root.NeuraiAssets = NeuraiAssets;
    if (typeof module !== 'undefined') module.exports = NeuraiAssets;
  
},{"./test-page/neurai-assets/src/index.js":22}],2:[function(require,module,exports){
/**
 * NeuraiAssets - Main API Class
 * Unified interface for all Neurai asset operations
 *
 * Usage:
 * const assets = new NeuraiAssets(rpc, {
 *   network: 'xna',
 *   addresses: ['N...'],
 *   changeAddress: 'N...',
 *   toAddress: 'N...'
 * });
 *
 * // Create asset
 * const result = await assets.createRootAsset({
 *   assetName: 'MYTOKEN',
 *   quantity: 1000000,
 *   units: 2
 * });
 *
 * // Query asset
 * const assetData = await assets.getAssetData('MYTOKEN');
 */

const { AssetQueries } = require('./queries');
const {
  IssueRootBuilder,
  IssueSubBuilder,
  IssueUniqueBuilder,
  IssueQualifierBuilder,
  IssueRestrictedBuilder,
  ReissueBuilder,
  ReissueRestrictedBuilder,
  TagAddressBuilder,
  FreezeAddressBuilder
} = require('./builders');

class NeuraiAssets {
  /**
   * @param {Function} rpc - RPC function to call Neurai node
   * @param {object} config - Configuration options
   * @param {string} config.network - Network identifier ('xna' or 'xna-test')
   * @param {Array<string>} config.addresses - Wallet addresses
   * @param {string} config.changeAddress - Default change address
   * @param {string} config.toAddress - Default receiving address
   */
  constructor(rpc, config = {}) {
    if (!rpc || typeof rpc !== 'function') {
      throw new Error('RPC function is required');
    }

    this.rpc = rpc;
    this.config = {
      network: config.network || 'xna',
      addresses: config.addresses || [],
      changeAddress: config.changeAddress || null,
      toAddress: config.toAddress || null
    };

    // Initialize query interface
    this.queries = new AssetQueries(rpc);
  }

  /**
   * Update configuration
   * @param {object} config - New configuration
   */
  updateConfig(config) {
    Object.assign(this.config, config);
  }

  /**
   * Build transaction parameters object
   * @param {object} params - Operation-specific parameters
   * @returns {object} Complete parameters with config
   */
  _buildParams(params) {
    return {
      ...params,
      network: this.config.network,
      addresses: this.config.addresses,
      changeAddress: params.changeAddress || this.config.changeAddress,
      toAddress: params.toAddress || this.config.toAddress
    };
  }

  // ========================================
  // ROOT ASSET OPERATIONS
  // ========================================

  /**
   * Create a ROOT asset
   * @param {object} params - Asset creation parameters
   * @param {string} params.assetName - Asset name (3-30 chars, A-Z 0-9 _ .)
   * @param {number} params.quantity - Total supply
   * @param {number} [params.units=0] - Decimal places (0-8)
   * @param {boolean} [params.reissuable=true] - Can mint more later
   * @param {boolean} [params.hasIpfs=false] - Has IPFS metadata
   * @param {string} [params.ipfsHash] - IPFS hash (if hasIpfs=true)
   * @returns {Promise<object>} Transaction data
   */
  async createRootAsset(params) {
    const builder = new IssueRootBuilder(this.rpc, this._buildParams(params));
    return await builder.build();
  }

  /**
   * Create a SUB asset
   * @param {object} params - Sub-asset creation parameters
   * @param {string} params.assetName - Asset name (ROOT/SUB format)
   * @param {number} params.quantity - Total supply
   * @param {number} [params.units=0] - Decimal places (0-8)
   * @param {boolean} [params.reissuable=true] - Can mint more later
   * @param {boolean} [params.hasIpfs=false] - Has IPFS metadata
   * @param {string} [params.ipfsHash] - IPFS hash (if hasIpfs=true)
   * @returns {Promise<object>} Transaction data
   */
  async createSubAsset(params) {
    const builder = new IssueSubBuilder(this.rpc, this._buildParams(params));
    return await builder.build();
  }

  /**
   * Reissue (mint more) of a ROOT or SUB asset
   * @param {object} params - Reissue parameters
   * @param {string} params.assetName - Asset name
   * @param {number} params.quantity - Amount to mint
   * @param {boolean} [params.reissuable] - Lock supply if false
   * @param {string} [params.newIpfs] - Update IPFS hash
   * @returns {Promise<object>} Transaction data
   */
  async reissueAsset(params) {
    const builder = new ReissueBuilder(this.rpc, this._buildParams(params));
    return await builder.build();
  }

  // ========================================
  // UNIQUE ASSET (NFT) OPERATIONS
  // ========================================

  /**
   * Create UNIQUE assets (NFTs)
   * @param {object} params - NFT creation parameters
   * @param {string} params.rootAssetName - Root asset name
   * @param {Array<object>} params.assetTags - NFT tags and metadata
   * @param {string} params.assetTags[].tag - Unique identifier for this NFT
   * @param {boolean} [params.assetTags[].hasIpfs=false] - Has IPFS metadata
   * @param {string} [params.assetTags[].ipfsHash] - IPFS hash for this NFT
   * @returns {Promise<object>} Transaction data
   */
  async createUniqueAssets(params) {
    const builder = new IssueUniqueBuilder(this.rpc, this._buildParams(params));
    return await builder.build();
  }

  // ========================================
  // QUALIFIER OPERATIONS (KYC Tags)
  // ========================================

  /**
   * Create a QUALIFIER (root or sub)
   * @param {object} params - Qualifier creation parameters
   * @param {string} params.qualifierName - Qualifier name (#NAME or #ROOT/#SUB)
   * @param {number} [params.quantity=1] - Quantity (1-10)
   * @param {boolean} [params.hasIpfs=false] - Has IPFS metadata
   * @param {string} [params.ipfsHash] - IPFS hash
   * @param {string} [params.changeAddress] - Override change address
   * @returns {Promise<object>} Transaction data
   */
  async createQualifier(params) {
    const normalized = { ...params, assetName: params.assetName || params.qualifierName };
    const builder = new IssueQualifierBuilder(this.rpc, this._buildParams(normalized));
    return await builder.build();
  }

  /**
   * Assign qualifier tag(s) to address(es)
   * @param {object} params - Tag assignment parameters
   * @param {string} params.qualifierName - Qualifier name (#NAME)
   * @param {Array<string>} params.addresses - Addresses to tag
   * @param {string} [params.assetData=''] - Optional data
   * @returns {Promise<object>} Transaction data
   */
  async tagAddresses(params) {
    const builder = new TagAddressBuilder(this.rpc, this._buildParams(params));
    return await builder.build();
  }

  /**
   * Remove qualifier tag(s) from address(es)
   * @param {object} params - Tag removal parameters
   * @param {string} params.qualifierName - Qualifier name (#NAME)
   * @param {Array<string>} params.addresses - Addresses to untag
   * @returns {Promise<object>} Transaction data
   */
  async untagAddresses(params) {
    const builder = new TagAddressBuilder(this.rpc, this._buildParams(params));
    return await builder.buildUntag();
  }

  // ========================================
  // RESTRICTED ASSET OPERATIONS (Security Tokens)
  // ========================================

  /**
   * Create a RESTRICTED asset (security token)
   * @param {object} params - Restricted asset creation parameters
   * @param {string} params.assetName - Asset name ($NAME format)
   * @param {number} params.quantity - Total supply
   * @param {string} params.verifierString - Boolean logic for compliance (e.g., "#KYC & #ACCREDITED")
   * @param {number} [params.units=0] - Decimal places (0-8)
   * @param {boolean} [params.reissuable=true] - Can mint more later
   * @param {boolean} [params.hasIpfs=false] - Has IPFS metadata
   * @param {string} [params.ipfsHash] - IPFS hash
   * @returns {Promise<object>} Transaction data
   */
  async createRestrictedAsset(params) {
    const builder = new IssueRestrictedBuilder(this.rpc, this._buildParams(params));
    return await builder.build();
  }

  /**
   * Reissue (mint more) of a RESTRICTED asset
   * @param {object} params - Reissue parameters
   * @param {string} params.assetName - Restricted asset name ($NAME)
   * @param {number} params.quantity - Amount to mint
   * @param {boolean} [params.changeVerifier=false] - Update verifier string
   * @param {string} [params.newVerifier] - New verifier string (if changeVerifier=true)
   * @param {boolean} [params.reissuable] - Lock supply if false
   * @param {string} [params.newIpfs] - Update IPFS hash
   * @returns {Promise<object>} Transaction data
   */
  async reissueRestrictedAsset(params) {
    const builder = new ReissueRestrictedBuilder(this.rpc, this._buildParams(params));
    return await builder.build();
  }

  /**
   * Freeze specific addresses for a restricted asset
   * @param {object} params - Freeze parameters
   * @param {string} params.assetName - Restricted asset name ($NAME)
   * @param {Array<string>} params.addresses - Addresses to freeze
   * @returns {Promise<object>} Transaction data
   */
  async freezeAddresses(params) {
    const builder = new FreezeAddressBuilder(this.rpc, this._buildParams(params));
    return await builder.build();
  }

  /**
   * Unfreeze specific addresses for a restricted asset
   * @param {object} params - Unfreeze parameters
   * @param {string} params.assetName - Restricted asset name ($NAME)
   * @param {Array<string>} params.addresses - Addresses to unfreeze
   * @returns {Promise<object>} Transaction data
   */
  async unfreezeAddresses(params) {
    const builder = new FreezeAddressBuilder(this.rpc, this._buildParams(params));
    return await builder.buildUnfreeze();
  }

  /**
   * Freeze entire restricted asset globally
   * @param {object} params - Global freeze parameters
   * @param {string} params.assetName - Restricted asset name ($NAME)
   * @returns {Promise<object>} Transaction data
   */
  async freezeAssetGlobally(params) {
    const builder = new FreezeAddressBuilder(this.rpc, this._buildParams(params));
    return await builder.buildGlobalFreeze();
  }

  /**
   * Unfreeze entire restricted asset globally
   * @param {object} params - Global unfreeze parameters
   * @param {string} params.assetName - Restricted asset name ($NAME)
   * @returns {Promise<object>} Transaction data
   */
  async unfreezeAssetGlobally(params) {
    const builder = new FreezeAddressBuilder(this.rpc, this._buildParams(params));
    return await builder.buildGlobalUnfreeze();
  }

  // ========================================
  // QUERY OPERATIONS
  // Delegates to AssetQueries instance
  // ========================================
  // Note: Asset transfers are handled by neurai-jswallet

  /**
   * Get asset metadata
   * @param {string} assetName - Asset name
   * @returns {Promise<object>} Asset data
   */
  async getAssetData(assetName) {
    return await this.queries.getAssetData(assetName);
  }

  /**
   * List all assets on blockchain
   * @param {string} [filter='*'] - Filter pattern (e.g., 'MY*')
   * @param {boolean} [verbose=false] - Include detailed information
   * @param {number} [count=100] - Maximum number to return
   * @param {number} [start=0] - Starting index for pagination
   * @returns {Promise<Array|object>} Array of asset names or detailed objects
   */
  async listAssets(filter = '*', verbose = false, count = 100, start = 0) {
    return await this.queries.listAssets(filter, verbose, count, start);
  }

  /**
   * List assets owned by wallet
   * @param {string} [assetName='*'] - Filter by asset name
   * @param {boolean} [verbose=false] - Include detailed information
   * @param {number} [count=100] - Maximum number to return
   * @param {number} [start=0] - Starting index
   * @param {number} [confs=1] - Minimum confirmations
   * @returns {Promise<object>} Object with asset names as keys and amounts as values
   */
  async listMyAssets(assetName = '*', verbose = false, count = 100, start = 0, confs = 1) {
    return await this.queries.listMyAssets(assetName, verbose, count, start, confs);
  }

  /**
   * List all addresses holding a specific asset
   * @param {string} assetName - Asset name
   * @param {boolean} [onlyCount=false] - Return only count instead of full list
   * @param {number} [count=100] - Maximum number to return
   * @param {number} [start=0] - Starting index
   * @returns {Promise<Array|number>} Array of {address, amount} or count
   */
  async listAddressesByAsset(assetName, onlyCount = false, count = 100, start = 0) {
    return await this.queries.listAddressesByAsset(assetName, onlyCount, count, start);
  }

  /**
   * List asset balances for a specific address
   * @param {string} address - Address to query
   * @param {boolean} [onlyTotal=false] - Return only count instead of full list
   * @param {number} [count=100] - Maximum number to return
   * @param {number} [start=0] - Starting index
   * @returns {Promise<Array|number>} Array of {asset, amount} or count
   */
  async listAssetBalancesByAddress(address, onlyTotal = false, count = 100, start = 0) {
    return await this.queries.listAssetBalancesByAddress(address, onlyTotal, count, start);
  }

  /**
   * Check if an address has a specific qualifier tag
   * @param {string} address - Address to check
   * @param {string} qualifierName - Qualifier name (e.g., '#KYC_VERIFIED')
   * @returns {Promise<boolean>} True if address has the tag
   */
  async checkAddressTag(address, qualifierName) {
    return await this.queries.checkAddressTag(address, qualifierName);
  }

  /**
   * List all qualifiers assigned to an address
   * @param {string} address - Address to query
   * @returns {Promise<Array>} Array of qualifier names
   */
  async listTagsForAddress(address) {
    return await this.queries.listTagsForAddress(address);
  }

  /**
   * List all addresses with a specific qualifier tag
   * @param {string} qualifierName - Qualifier name
   * @returns {Promise<Array>} Array of addresses
   */
  async listAddressesForTag(qualifierName) {
    return await this.queries.listAddressesForTag(qualifierName);
  }

  /**
   * Check if an address can hold a restricted asset
   * @param {string} address - Address to check
   * @param {string} restrictedAssetName - Restricted asset name (e.g., '$SECURITY')
   * @returns {Promise<boolean>} True if address meets verifier requirements
   */
  async checkAddressRestriction(address, restrictedAssetName) {
    return await this.queries.checkAddressRestriction(address, restrictedAssetName);
  }

  /**
   * Check if an address is frozen for a restricted asset
   * @param {string} address - Address to check
   * @param {string} restrictedAssetName - Restricted asset name
   * @returns {Promise<boolean>} True if address is frozen
   */
  async isAddressFrozen(address, restrictedAssetName) {
    return await this.queries.isAddressFrozen(address, restrictedAssetName);
  }

  /**
   * Check if an asset is globally frozen
   * @param {string} restrictedAssetName - Restricted asset name
   * @returns {Promise<boolean>} True if asset is globally frozen
   */
  async checkGlobalRestriction(restrictedAssetName) {
    return await this.queries.checkGlobalRestriction(restrictedAssetName);
  }

  /**
   * Get verifier string for a restricted asset
   * @param {string} restrictedAssetName - Restricted asset name
   * @returns {Promise<string>} Verifier string
   */
  async getVerifierString(restrictedAssetName) {
    return await this.queries.getVerifierString(restrictedAssetName);
  }

  /**
   * Validate verifier string syntax
   * @param {string} verifierString - Verifier string to validate
   * @returns {Promise<boolean>} True if valid
   */
  async isValidVerifierString(verifierString) {
    return await this.queries.isValidVerifierString(verifierString);
  }

  /**
   * Get snapshot of asset ownership at a specific block
   * @param {string} assetName - Asset name
   * @param {number} blockHeight - Block height for snapshot
   * @returns {Promise<object>} Snapshot request result
   */
  async getSnapshotRequest(assetName, blockHeight) {
    return await this.queries.getSnapshotRequest(assetName, blockHeight);
  }

  /**
   * Cancel a snapshot request
   * @param {string} assetName - Asset name
   * @param {number} blockHeight - Block height of snapshot to cancel
   * @returns {Promise<boolean>} True if cancelled successfully
   */
  async cancelSnapshotRequest(assetName, blockHeight) {
    return await this.queries.cancelSnapshotRequest(assetName, blockHeight);
  }

  /**
   * Check if asset exists
   * @param {string} assetName - Asset name
   * @returns {Promise<boolean>} True if asset exists
   */
  async assetExists(assetName) {
    return await this.queries.assetExists(assetName);
  }

  /**
   * Get asset type from name
   * @param {string} assetName - Asset name
   * @returns {string} Asset type ('ROOT', 'SUB', 'UNIQUE', 'QUALIFIER', 'RESTRICTED', 'OWNER')
   */
  getAssetType(assetName) {
    return this.queries.getAssetType(assetName);
  }

  /**
   * Get total count of assets on blockchain
   * @returns {Promise<number>} Total asset count
   */
  async getAssetCount() {
    return await this.queries.getAssetCount();
  }
}

module.exports = NeuraiAssets;

},{"./builders":13,"./queries":29}],3:[function(require,module,exports){
/**
 * Base Asset Transaction Builder
 * Abstract base class for all transaction builders
 *
 * Provides common functionality:
 * - UTXO selection
 * - Fee estimation
 * - Output ordering
 * - Raw transaction creation
 * - Validation
 *
 * Subclasses must implement:
 * - validateParams(params)
 * - build()
 */

const { BurnManager, OwnerTokenManager, UTXOSelector, OutputOrderer } = require('../managers');
const { AssetNameValidator, AmountValidator } = require('../validators');

class BaseAssetTransactionBuilder {
  /**
   * @param {Function} rpc - RPC function
   * @param {string} network - Network type ('xna' or 'xna-test')
   * @param {string[]|Function} addresses - Wallet addresses or function that returns addresses
   * @param {object} params - Transaction parameters
   */
  constructor(rpc, networkOrParams, addresses, params) {
    if (!rpc || typeof rpc !== 'function') {
      throw new Error('RPC function is required');
    }

    // Support both (rpc, network, addresses, params) and (rpc, params) calling forms.
    // NeuraiAssets passes a single merged params object as the second argument.
    let network, actualAddresses, actualParams;
    if (
      typeof networkOrParams === 'object' &&
      networkOrParams !== null &&
      !Array.isArray(networkOrParams) &&
      addresses === undefined
    ) {
      network = networkOrParams.network;
      actualAddresses = networkOrParams.addresses;
      actualParams = networkOrParams;
    } else {
      network = networkOrParams;
      actualAddresses = addresses;
      actualParams = params;
    }

    if (!network) {
      throw new Error('Network is required');
    }

    // Addresses can be an array or a function that returns addresses
    if (typeof actualAddresses === 'function') {
      this.getAddresses = actualAddresses;
    } else if (Array.isArray(actualAddresses)) {
      this.getAddresses = () => actualAddresses;
    } else {
      throw new Error('Addresses must be an array or a function');
    }

    this.rpc = rpc;
    this.network = network;
    this.params = actualParams || {};

    // Initialize managers
    this.burnManager = new BurnManager(network);
    this.ownerTokenManager = new OwnerTokenManager(rpc);
    this.utxoSelector = new UTXOSelector(rpc);
    this.outputOrderer = new OutputOrderer();
  }

  /**
   * Get wallet addresses
   * @returns {string[]} Array of addresses
   */
  async _getAddresses() {
    const addresses = await this.getAddresses();
    if (!Array.isArray(addresses) || addresses.length === 0) {
      throw new Error('No addresses available');
    }
    return addresses;
  }

  /**
   * Validate transaction parameters
   * Must be implemented by subclasses
   * @param {object} params - Parameters to validate
   * @throws {Error} If validation fails
   */
  validateParams(params) {
    throw new Error('validateParams must be implemented by subclass');
  }

  /**
   * Build the transaction
   * Must be implemented by subclasses
   * @returns {Promise<object>} Transaction result
   */
  async build() {
    throw new Error('build must be implemented by subclass');
  }

  /**
   * Estimate transaction fee
   * @param {number} inputCount - Number of inputs
   * @param {number} outputCount - Number of outputs
   * @returns {Promise<number>} Estimated fee in XNA
   */
  async estimateFee(inputCount, outputCount) {
    const feeRate = await this.utxoSelector.getFeeRate();
    return this.utxoSelector.estimateFee(inputCount, outputCount, feeRate);
  }

  /**
   * Select UTXOs for transaction
   * @param {number} xnaAmount - Required XNA amount (for fees + burn)
   * @param {string|null} assetName - Asset name if needed
   * @param {number} assetAmount - Asset amount if needed
   * @returns {Promise<object>} Selected UTXOs
   */
  async selectUTXOs(xnaAmount, assetName = null, assetAmount = 0) {
    const addresses = await this._getAddresses();
    return this.utxoSelector.selectMixedUTXOs(
      addresses,
      xnaAmount,
      assetName,
      assetAmount
    );
  }

  /**
   * Build raw transaction using RPC
   * @param {Array} inputs - Transaction inputs
   * @param {object} outputs - Transaction outputs (must be ordered)
   * @returns {Promise<string>} Raw transaction hex
   */
  async buildRawTransaction(inputs, outputs) {
    try {
      // Format inputs for createrawtransaction
      const formattedInputs = inputs.map(input => ({
        txid: input.txid,
        vout: input.vout !== undefined ? input.vout : input.outputIndex
      }));

      // Call createrawtransaction
      const rawTx = await this.rpc('createrawtransaction', [
        formattedInputs,
        outputs
      ]);

      return rawTx;
    } catch (error) {
      throw new Error(`Failed to create raw transaction: ${error.message}`);
    }
  }

  /**
   * Calculate change amount
   * @param {number} totalInput - Total input amount
   * @param {number} totalOutput - Total output amount (including fee)
   * @returns {number} Change amount
   */
  calculateChange(totalInput, totalOutput) {
    const change = totalInput - totalOutput;
    if (change < 0) {
      throw new Error('Insufficient funds: inputs < outputs');
    }
    return change;
  }

  /**
   * Get change address
   * Uses first address from wallet by default
   * Can be overridden by params.changeAddress
   * @returns {Promise<string>} Change address
   */
  async getChangeAddress() {
    if (this.params.changeAddress) {
      return this.params.changeAddress;
    }

    const addresses = await this._getAddresses();
    return addresses[0];
  }

  /**
   * Get recipient address
   * Uses first address from wallet if not specified
   * @returns {Promise<string>} Recipient address
   */
  async getToAddress() {
    if (this.params.toAddress) {
      return this.params.toAddress;
    }

    const addresses = await this._getAddresses();
    return addresses[0];
  }

  /**
   * Common validation for asset name
   * @param {string} assetName - Asset name to validate
   * @param {string} type - Expected type ('ROOT', 'SUB', etc.)
   */
  validateAssetName(assetName, type) {
    if (!assetName) {
      throw new Error('Asset name is required');
    }

    switch (type) {
      case 'ROOT':
        AssetNameValidator.validateRoot(assetName);
        break;
      case 'SUB':
        AssetNameValidator.validateSub(assetName);
        break;
      case 'UNIQUE':
        AssetNameValidator.validateUnique(assetName);
        break;
      case 'QUALIFIER':
        AssetNameValidator.validateQualifier(assetName);
        break;
      case 'RESTRICTED':
        AssetNameValidator.validateRestricted(assetName);
        break;
      default:
        throw new Error(`Unknown asset type: ${type}`);
    }
  }

  /**
   * Common validation for amount and units
   * @param {number} quantity - Quantity to validate
   * @param {number} units - Units (decimal places)
   */
  validateAmount(quantity, units) {
    AmountValidator.validate(quantity, units);
  }

  /**
   * Convert amount to satoshis
   * @param {number} amount - Amount in asset units
   * @param {number} units - Decimal places
   * @returns {number} Amount in satoshis
   */
  toSatoshis(amount, units) {
    return Math.round(amount * Math.pow(10, units));
  }

  /**
   * Convert satoshis to amount
   * @param {number} satoshis - Amount in satoshis
   * @param {number} units - Decimal places
   * @returns {number} Amount in asset units
   */
  fromSatoshis(satoshis, units) {
    return satoshis / Math.pow(10, units);
  }

  /**
   * Format transaction result
   * @param {string} rawTx - Raw transaction hex
   * @param {Array} utxos - UTXOs used
   * @param {Array} inputs - Transaction inputs
   * @param {object} outputs - Transaction outputs
   * @param {number} fee - Transaction fee
   * @param {number} burnAmount - Burn amount
   * @param {object} extra - Extra information
   * @returns {object} Formatted result
   */
  formatResult(rawTx, utxos, inputs, outputs, fee, burnAmount, extra = {}) {
    return {
      rawTx,
      utxos,
      inputs,
      outputs,
      fee,
      burnAmount,
      ...extra
    };
  }

  /**
   * Check if asset exists (to prevent creating duplicates)
   * @param {string} assetName - Asset name to check
   * @returns {Promise<boolean>} True if exists
   */
  async assetExists(assetName) {
    try {
      const assetData = await this.rpc('getassetdata', [assetName]);
      return assetData !== null && assetData !== undefined;
    } catch (error) {
      // If asset doesn't exist, RPC will throw error
      if (error.message && error.message.includes('not found')) {
        return false;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Get asset data from blockchain
   * @param {string} assetName - Asset name
   * @returns {Promise<object|null>} Asset data or null if not found
   */
  async getAssetData(assetName) {
    try {
      return await this.rpc('getassetdata', [assetName]);
    } catch (error) {
      if (error.message && error.message.includes('not found')) {
        return null;
      }
      throw error;
    }
  }
}

module.exports = BaseAssetTransactionBuilder;

},{"../managers":27,"../validators":37}],4:[function(require,module,exports){
/**
 * Freeze Address Builder
 * Builds transactions for freezing/unfreezing addresses and assets
 *
 * Freeze operations (restricted assets only):
 * - Freeze specific addresses (prevent trading)
 * - Unfreeze specific addresses (allow trading again)
 * - Global asset freeze (freeze entire asset)
 * - Global asset unfreeze (unfreeze entire asset)
 * - Cost: No burn (but requires fee)
 * - Requires restricted asset's owner token ($ASSET!)
 * - Owner token must be returned
 */

const BaseAssetTransactionBuilder = require('./BaseAssetTransactionBuilder');
const { OutputFormatter, AssetNameParser } = require('../utils');
const { AssetNotFoundError, OwnerTokenNotFoundError, InvalidAddressError } = require('../errors');

class FreezeAddressBuilder extends BaseAssetTransactionBuilder {
  /**
   * Validate freeze/unfreeze parameters
   * @param {object} params - Freeze parameters
   * @param {string} operationType - Operation type
   * @throws {Error} If validation fails
   */
  validateParams(params, operationType) {
    // Validate required parameters
    if (!params.assetName) {
      throw new Error('assetName is required');
    }

    // Validate asset name is restricted
    this.validateAssetName(params.assetName, 'RESTRICTED');

    // For address-specific operations, validate addresses
    if (operationType === 'FREEZE_ADDRESSES' || operationType === 'UNFREEZE_ADDRESSES') {
      if (!params.addresses || !Array.isArray(params.addresses) || params.addresses.length === 0) {
        throw new Error('addresses is required and must be a non-empty array');
      }

      // Validate each address
      params.addresses.forEach((address, index) => {
        if (!address || typeof address !== 'string') {
          throw new InvalidAddressError(
            `addresses[${index}] must be a non-empty string`,
            address
          );
        }

        // Address prefix validation is left to the node (varies by network)
      });
    }

    return true;
  }

  /**
   * Build freeze operation transaction
   * @param {string} operationType - Operation type
   * @returns {Promise<object>} Transaction result
   */
  async buildFreezeOperation(operationType) {
    // 1. Validate parameters
    await this.validateParams(this.params, operationType);

    const { assetName } = this.params;

    // 2. Check if asset exists and is restricted
    const assetData = await this.getAssetData(assetName);
    if (!assetData) {
      throw new AssetNotFoundError(
        `Asset ${assetName} does not exist on the blockchain`,
        assetName
      );
    }

    // 3. Get wallet addresses
    const addresses = await this._getAddresses();
    const changeAddress = await this.getChangeAddress();

    // 4. Find owner token (CRITICAL: must have this)
    const ownerTokenName = AssetNameParser.getOwnerTokenName(assetName);
    let ownerTokenUTXO;
    try {
      ownerTokenUTXO = await this.ownerTokenManager.findOwnerTokenUTXO(
        ownerTokenName,
        addresses
      );
    } catch (error) {
      if (error instanceof OwnerTokenNotFoundError) {
        throw new OwnerTokenNotFoundError(
          `You must own the restricted asset's owner token (${ownerTokenName}) to freeze/unfreeze addresses or the asset.`,
          ownerTokenName
        );
      }
      throw error;
    }

    // 5. No burn for freeze operations (only fee)
    const burnAmount = 0;

    // 6. Estimate fee
    const estimatedFee = await this.estimateFee(2, 3);

    // 7. Select XNA UTXOs (only for fee, no burn)
    const utxoSelection = await this.selectUTXOs(estimatedFee, null, 0);
    const baseCurrencyUTXOs = utxoSelection.xnaUTXOs;
    const totalXNAInput = utxoSelection.totalXNA;

    // 8. Recalculate fee with actual input count
    const actualInputCount = baseCurrencyUTXOs.length + 1; // +1 for owner token
    const actualFee = await this.estimateFee(actualInputCount, 3);

    // 9. Verify we have enough XNA for fee
    if (totalXNAInput < actualFee) {
      const additionalNeeded = actualFee - totalXNAInput + 0.001;
      const additionalSelection = await this.selectUTXOs(additionalNeeded, null, 0);
      baseCurrencyUTXOs.push(...additionalSelection.xnaUTXOs);
    }

    // 10. Calculate XNA change
    const finalTotalInput = baseCurrencyUTXOs.reduce(
      (sum, utxo) => sum + utxo.satoshis / 100000000,
      0
    );
    const xnaChange = finalTotalInput - actualFee;

    // 11. Build inputs (XNA + owner token)
    const inputs = [];

    // Add XNA inputs
    baseCurrencyUTXOs.forEach(utxo => {
      inputs.push({
        txid: utxo.txid,
        vout: utxo.outputIndex,
        address: utxo.address,
        satoshis: utxo.satoshis
      });
    });

    // Add owner token input
    inputs.push({
      txid: ownerTokenUTXO.txid,
      vout: ownerTokenUTXO.outputIndex,
      address: ownerTokenUTXO.address,
      assetName: ownerTokenUTXO.assetName,
      satoshis: ownerTokenUTXO.satoshis
    });

    // 12. Build outputs (ORDER CRITICAL!)
    const outputs = [];

    // First: XNA change (if any)
    if (xnaChange > 0.00000001) {
      outputs.push({ [changeAddress]: parseFloat(xnaChange.toFixed(8)) });
    }

    // Last: Freeze/Unfreeze operation
    let operationOutput;
    let targetAddresses = [];

    switch (operationType) {
      case 'FREEZE_ADDRESSES':
        targetAddresses = this.params.addresses;
        operationOutput = OutputFormatter.formatFreezeAddressesOutput({
          asset_name: assetName,
          addresses: targetAddresses
        });
        outputs.push({ [changeAddress]: operationOutput });
        break;

      case 'UNFREEZE_ADDRESSES':
        targetAddresses = this.params.addresses;
        operationOutput = OutputFormatter.formatUnfreezeAddressesOutput({
          asset_name: assetName,
          addresses: targetAddresses
        });
        outputs.push({ [changeAddress]: operationOutput });
        break;

      case 'FREEZE_ASSET':
        operationOutput = OutputFormatter.formatFreezeAssetOutput(assetName);
        outputs.push({ [changeAddress]: operationOutput });
        break;

      case 'UNFREEZE_ASSET':
        operationOutput = OutputFormatter.formatUnfreezeAssetOutput(assetName);
        outputs.push({ [changeAddress]: operationOutput });
        break;

      default:
        throw new Error(`Unknown freeze operation type: ${operationType}`);
    }

    // 13. Order outputs (protocol requirement)
    const orderedOutputs = this.outputOrderer.order(outputs);

    // 14. Create raw transaction
    const rawTx = await this.buildRawTransaction(inputs, orderedOutputs);

    // 15. Format and return result
    const allUTXOs = [...baseCurrencyUTXOs, ownerTokenUTXO];

    return this.formatResult(
      rawTx,
      allUTXOs,
      inputs,
      orderedOutputs,
      actualFee,
      burnAmount,
      {
        assetName,
        ownerTokenUsed: ownerTokenName,
        targetAddresses: targetAddresses.length > 0 ? targetAddresses : null,
        addressCount: targetAddresses.length,
        operationType
      }
    );
  }

  /**
   * Build freeze addresses transaction
   * @returns {Promise<object>} Transaction result
   */
  async build() {
    return this.buildFreezeOperation('FREEZE_ADDRESSES');
  }

  /**
   * Build unfreeze addresses transaction
   * @returns {Promise<object>} Transaction result
   */
  async buildUnfreeze() {
    return this.buildFreezeOperation('UNFREEZE_ADDRESSES');
  }

  /**
   * Build global freeze asset transaction
   * @returns {Promise<object>} Transaction result
   */
  async buildGlobalFreeze() {
    return this.buildFreezeOperation('FREEZE_ASSET');
  }

  /**
   * Build global unfreeze asset transaction
   * @returns {Promise<object>} Transaction result
   */
  async buildGlobalUnfreeze() {
    return this.buildFreezeOperation('UNFREEZE_ASSET');
  }
}

module.exports = FreezeAddressBuilder;

},{"../errors":21,"../utils":32,"./BaseAssetTransactionBuilder":3}],5:[function(require,module,exports){
/**
 * Issue Qualifier Builder
 * Builds transactions for creating QUALIFIER assets
 *
 * QUALIFIER assets:
 * - KYC/compliance tags (e.g., #KYC_VERIFIED, #ACCREDITED)
 * - Format: #NAME or #ROOT/SUB
 * - Cost: 2000 XNA (root) or 200 XNA (sub-qualifier)
 * - Quantity: 1-10 units only
 * - Units: Always 0 (non-divisible)
 * - Used to tag addresses for restricted asset compliance
 * - Root qualifiers do not create owner tokens
 * - Sub-qualifiers consume and return the parent qualifier asset itself
 */

const BaseAssetTransactionBuilder = require('./BaseAssetTransactionBuilder');
const { OutputFormatter, AssetNameParser } = require('../utils');
const { AssetExistsError, ParentAssetNotFoundError, OwnerTokenNotFoundError } = require('../errors');
const { IpfsValidator, AmountValidator } = require('../validators');

class IssueQualifierBuilder extends BaseAssetTransactionBuilder {
  /**
   * Validate issue QUALIFIER parameters
   * @param {object} params - Issue parameters
   * @throws {Error} If validation fails
   */
  validateParams(params) {
    // Validate required parameters
    if (!params.assetName) {
      throw new Error('assetName is required');
    }

    if (params.quantity === undefined || params.quantity === null) {
      throw new Error('quantity is required');
    }

    // Validate asset name (QUALIFIER format: #NAME)
    this.validateAssetName(params.assetName, 'QUALIFIER');

    // Validate quantity (1-10 only for qualifiers)
    AmountValidator.validateQualifierQuantity(params.quantity);

    // Validate IPFS hash if provided
    if (params.hasIpfs && params.ipfsHash) {
      IpfsValidator.validate(params.ipfsHash);
    }

    return true;
  }

  /**
   * Determine if this is a sub-qualifier
   * @param {string} assetName - Qualifier name
   * @returns {boolean} True if sub-qualifier
   */
  isSubQualifier(assetName) {
    return assetName.includes('/');
  }

  /**
   * Build QUALIFIER asset issuance transaction
   * @returns {Promise<object>} Transaction result
   */
  async build() {
    // 1. Validate parameters
    await this.validateParams(this.params);

    const {
      assetName,
      quantity,
      hasIpfs = false,
      ipfsHash = ''
    } = this.params;

    // 2. Determine if root or sub-qualifier
    const isSub = this.isSubQualifier(assetName);
    const parsed = AssetNameParser.parse(assetName);

    // 3. If sub-qualifier, check parent exists and get parent qualifier input
    let parentQualifierUTXOs = [];
    let parentQualifierQuantity = null;
    let parentQualifierName = null;
    const addresses = await this._getAddresses();

    if (isSub) {
      parentQualifierName = parsed.parent;

      // Check parent qualifier exists
      const parentExists = await this.assetExists(parentQualifierName);
      if (!parentExists) {
        throw new ParentAssetNotFoundError(
          `Parent qualifier ${parentQualifierName} does not exist. You must create the parent qualifier first.`,
          parentQualifierName
        );
      }

      // Find parent qualifier balance to spend and return as change
      try {
        const selection = await this.utxoSelector.selectAssetUTXOs(addresses, parentQualifierName, 1);
        parentQualifierUTXOs = selection.utxos;
        parentQualifierQuantity = selection.totalAmount;
      } catch (error) {
        if (error.name === 'InsufficientFundsError') {
          throw new OwnerTokenNotFoundError(
            `You must own the parent qualifier asset (${parentQualifierName}) to create a sub-qualifier.`,
            parentQualifierName
          );
        }
        throw error;
      }
    }

    // 4. Check if qualifier already exists
    const exists = await this.assetExists(assetName);
    if (exists) {
      throw new AssetExistsError(
        `Qualifier ${assetName} already exists on the blockchain`,
        assetName
      );
    }

    // 5. Get burn information (2000 XNA for root, 200 XNA for sub)
    const burnInfo = isSub
      ? this.burnManager.getIssueSubQualifierBurn()
      : this.burnManager.getIssueQualifierBurn();

    // 6. Get addresses
    const toAddress = await this.getToAddress();
    const changeAddress = await this.getChangeAddress();

    // 7. Estimate fee
    const outputCount = 3;
    const estimatedFee = await this.estimateFee(2, outputCount);

    // 8. Calculate total XNA needed
    const totalXNANeeded = burnInfo.amount + estimatedFee;

    // 9. Select XNA UTXOs
    const utxoSelection = await this.selectUTXOs(totalXNANeeded, null, 0);
    const baseCurrencyUTXOs = utxoSelection.xnaUTXOs;
    const totalXNAInput = utxoSelection.totalXNA;

    // 10. Recalculate fee with actual input count
    const actualInputCount = baseCurrencyUTXOs.length + parentQualifierUTXOs.length;
    const actualFee = await this.estimateFee(actualInputCount, outputCount);

    // 11. Verify we have enough XNA
    const totalRequired = burnInfo.amount + actualFee;
    if (totalXNAInput < totalRequired) {
      const additionalNeeded = totalRequired - totalXNAInput + 0.001;
      const additionalSelection = await this.selectUTXOs(additionalNeeded, null, 0);
      baseCurrencyUTXOs.push(...additionalSelection.xnaUTXOs);
    }

    // 12. Calculate XNA change
    const finalTotalInput = baseCurrencyUTXOs.reduce(
      (sum, utxo) => sum + utxo.satoshis / 100000000,
      0
    );
    const xnaChange = finalTotalInput - burnInfo.amount - actualFee;

    // 13. Build inputs
    const inputs = [];

    // Add XNA inputs
    baseCurrencyUTXOs.forEach(utxo => {
      inputs.push({
        txid: utxo.txid,
        vout: utxo.outputIndex,
        address: utxo.address,
        satoshis: utxo.satoshis
      });
    });

    // Add parent qualifier inputs if sub-qualifier
    parentQualifierUTXOs.forEach(parentUTXO => {
      inputs.push({
        txid: parentUTXO.txid,
        vout: parentUTXO.outputIndex,
        address: parentUTXO.address,
        assetName: parentUTXO.assetName,
        satoshis: parentUTXO.satoshis
      });
    });

    // 14. Build outputs (ORDER CRITICAL!)
    const outputs = [];

    // First: Burn output
    outputs.push({ [burnInfo.address]: burnInfo.amount });

    // Second: XNA change (if any)
    if (xnaChange > 0.00000001) {
      outputs.push({ [changeAddress]: parseFloat(xnaChange.toFixed(8)) });
    }

    // Last: Issue qualifier operation
    const issueQualifierOutput = OutputFormatter.formatIssueQualifierOutput({
      asset_name: assetName,
      asset_quantity: quantity,
      has_ipfs: hasIpfs,
      ipfs_hash: ipfsHash,
      root_change_address: isSub ? changeAddress : undefined,
      change_quantity: isSub ? parentQualifierQuantity : undefined
    });

    outputs.push({ [toAddress]: issueQualifierOutput });

    // 15. Order outputs (protocol requirement)
    const orderedOutputs = this.outputOrderer.order(outputs);

    // 16. Create raw transaction
    const rawTx = await this.buildRawTransaction(inputs, orderedOutputs);

    // 17. Format and return result
    const allUTXOs = [...baseCurrencyUTXOs, ...parentQualifierUTXOs];

    return this.formatResult(
      rawTx,
      allUTXOs,
      inputs,
      orderedOutputs,
      actualFee,
      burnInfo.amount,
      {
        assetName,
        qualifierType: isSub ? 'SUB_QUALIFIER' : 'QUALIFIER',
        parentQualifier: isSub ? parsed.parent : null,
        parentQualifierUsed: parentQualifierName,
        operationType: isSub ? 'ISSUE_SUB_QUALIFIER' : 'ISSUE_QUALIFIER'
      }
    );
  }
}

module.exports = IssueQualifierBuilder;

},{"../errors":21,"../utils":32,"../validators":37,"./BaseAssetTransactionBuilder":3}],6:[function(require,module,exports){
/**
 * Issue Restricted Builder
 * Builds transactions for creating RESTRICTED assets (security tokens)
 *
 * RESTRICTED assets:
 * - Security tokens with KYC/compliance controls
 * - Format: $NAME (e.g., $SECURITY, $STOCK)
 * - Cost: 3000 XNA (burned)
 * - Requires verifier string (boolean logic with qualifiers)
 * - Only addresses meeting verifier requirements can receive/hold
 * - Can freeze individual addresses or entire asset
 * - Creates owner token (ASSET!)
 */

const BaseAssetTransactionBuilder = require('./BaseAssetTransactionBuilder');
const { OutputFormatter, AssetNameParser } = require('../utils');
const { AssetExistsError, OwnerTokenNotFoundError } = require('../errors');
const { IpfsValidator, VerifierValidator } = require('../validators');

class IssueRestrictedBuilder extends BaseAssetTransactionBuilder {
  /**
   * Validate issue RESTRICTED parameters
   * @param {object} params - Issue parameters
   * @throws {Error} If validation fails
   */
  validateParams(params) {
    // Validate required parameters
    if (!params.assetName) {
      throw new Error('assetName is required');
    }

    if (params.quantity === undefined || params.quantity === null) {
      throw new Error('quantity is required');
    }

    if (!params.verifierString) {
      throw new Error('verifierString is required for restricted assets');
    }

    // Validate asset name (RESTRICTED format: $NAME)
    this.validateAssetName(params.assetName, 'RESTRICTED');

    // Validate quantity and units
    const units = params.units !== undefined ? params.units : 0;
    this.validateAmount(params.quantity, units);

    // Validate verifier string (critical for compliance)
    VerifierValidator.validate(params.verifierString);

    // Validate IPFS hash if provided
    if (params.hasIpfs && params.ipfsHash) {
      IpfsValidator.validate(params.ipfsHash);
    }

    // Validate reissuable is boolean if provided
    if (params.reissuable !== undefined && typeof params.reissuable !== 'boolean') {
      throw new Error('reissuable must be a boolean');
    }

    return true;
  }

  /**
   * Build RESTRICTED asset issuance transaction
   * @returns {Promise<object>} Transaction result
   */
  async build() {
    // 1. Validate parameters
    await this.validateParams(this.params);

    const {
      assetName,
      quantity,
      units = 0,
      verifierString,
      reissuable = true,
      hasIpfs = false,
      ipfsHash = ''
    } = this.params;

    // 2. Check if asset already exists
    const exists = await this.assetExists(assetName);
    if (exists) {
      throw new AssetExistsError(
        `Asset ${assetName} already exists on the blockchain`,
        assetName
      );
    }

    // 3. Extract qualifiers from verifier string for info
    const requiredQualifiers = VerifierValidator.extractQualifiers(verifierString);

    // 4. Get burn information (3000 XNA for restricted assets)
    const burnInfo = this.burnManager.getIssueRestrictedBurn();

    // 5. Get addresses
    const addresses = await this._getAddresses();
    const toAddress = await this.getToAddress();
    const changeAddress = await this.getChangeAddress();

    // 6. Find owner token UTXO (CRITICAL: node requires it as input)
    const ownerTokenName = AssetNameParser.getOwnerTokenName(assetName);
    let ownerTokenUTXO;
    try {
      ownerTokenUTXO = await this.ownerTokenManager.findOwnerTokenUTXO(
        ownerTokenName,
        addresses
      );
    } catch (error) {
      if (error instanceof OwnerTokenNotFoundError) {
        throw new OwnerTokenNotFoundError(
          `You must own the owner token (${ownerTokenName}) to issue the restricted asset ${assetName}.`,
          ownerTokenName
        );
      }
      throw error;
    }

    // 7. Estimate fee (+1 for owner token input)
    const estimatedFee = await this.estimateFee(2, 4);

    // 8. Calculate total XNA needed
    const totalXNANeeded = burnInfo.amount + estimatedFee;

    // 9. Select XNA UTXOs
    const utxoSelection = await this.selectUTXOs(totalXNANeeded, null, 0);
    const baseCurrencyUTXOs = utxoSelection.xnaUTXOs;
    const totalXNAInput = utxoSelection.totalXNA;

    // 10. Recalculate fee with actual input count (+1 for owner token)
    const actualFee = await this.estimateFee(baseCurrencyUTXOs.length + 1, 4);

    // 11. Verify we have enough XNA
    const totalRequired = burnInfo.amount + actualFee;
    if (totalXNAInput < totalRequired) {
      const additionalNeeded = totalRequired - totalXNAInput + 0.001;
      const additionalSelection = await this.selectUTXOs(additionalNeeded, null, 0);
      baseCurrencyUTXOs.push(...additionalSelection.xnaUTXOs);
    }

    // 12. Calculate XNA change
    const finalTotalInput = baseCurrencyUTXOs.reduce(
      (sum, utxo) => sum + utxo.satoshis / 100000000,
      0
    );
    const xnaChange = finalTotalInput - burnInfo.amount - actualFee;

    // 13. Build inputs (XNA + owner token)
    const inputs = [];

    baseCurrencyUTXOs.forEach(utxo => {
      inputs.push({
        txid: utxo.txid,
        vout: utxo.outputIndex,
        address: utxo.address,
        satoshis: utxo.satoshis
      });
    });

    // Add owner token input (node requires it to issue restricted asset)
    inputs.push({
      txid: ownerTokenUTXO.txid,
      vout: ownerTokenUTXO.outputIndex,
      address: ownerTokenUTXO.address,
      assetName: ownerTokenUTXO.assetName,
      satoshis: ownerTokenUTXO.satoshis
    });

    // 14. Build outputs (ORDER CRITICAL!)
    const outputs = [];

    // First: Burn output
    outputs.push({ [burnInfo.address]: burnInfo.amount });

    // Second: XNA change (if any)
    if (xnaChange > 0.00000001) {
      outputs.push({ [changeAddress]: parseFloat(xnaChange.toFixed(8)) });
    }

    // Last: Issue restricted operation
    const issueRestrictedOutput = OutputFormatter.formatIssueRestrictedOutput({
      asset_name: assetName,
      asset_quantity: this.toSatoshis(quantity, units),
      verifier_string: verifierString,
      units: units,
      reissuable: reissuable,
      has_ipfs: hasIpfs,
      ipfs_hash: ipfsHash,
      owner_change_address: changeAddress
    });

    outputs.push({ [toAddress]: issueRestrictedOutput });

    // 15. Order outputs (protocol requirement)
    const orderedOutputs = this.outputOrderer.order(outputs);

    // 16. Create raw transaction
    const rawTx = await this.buildRawTransaction(inputs, orderedOutputs);

    // 17. Format and return result
    const allUTXOs = [...baseCurrencyUTXOs, ownerTokenUTXO];

    return this.formatResult(
      rawTx,
      allUTXOs,
      inputs,
      orderedOutputs,
      actualFee,
      burnInfo.amount,
      {
        assetName,
        ownerTokenName,
        verifierString,
        requiredQualifiers,
        operationType: 'ISSUE_RESTRICTED'
      }
    );
  }
}

module.exports = IssueRestrictedBuilder;

},{"../errors":21,"../utils":32,"../validators":37,"./BaseAssetTransactionBuilder":3}],7:[function(require,module,exports){
/**
 * Issue Root Builder
 * Builds transactions for creating ROOT assets
 *
 * ROOT assets:
 * - Top-level assets (3-30 uppercase characters)
 * - Cost: 1000 XNA (burned)
 * - Automatically creates owner token (ASSET!)
 * - Can be reissuable or non-reissuable
 * - Optional IPFS metadata
 */

const BaseAssetTransactionBuilder = require('./BaseAssetTransactionBuilder');
const { OutputFormatter } = require('../utils');
const { AssetExistsError, InvalidIPFSHashError } = require('../errors');
const { IpfsValidator } = require('../validators');

class IssueRootBuilder extends BaseAssetTransactionBuilder {
  /**
   * Validate issue ROOT parameters
   * @param {object} params - Issue parameters
   * @throws {Error} If validation fails
   */
  validateParams(params) {
    // Validate required parameters
    if (!params.assetName) {
      throw new Error('assetName is required');
    }

    if (params.quantity === undefined || params.quantity === null) {
      throw new Error('quantity is required');
    }

    // Validate asset name (ROOT format)
    this.validateAssetName(params.assetName, 'ROOT');

    // Validate quantity and units
    const units = params.units !== undefined ? params.units : 0;
    this.validateAmount(params.quantity, units);

    // Validate IPFS hash if provided
    if (params.hasIpfs && params.ipfsHash) {
      IpfsValidator.validate(params.ipfsHash);
    }

    // Validate reissuable is boolean if provided
    if (params.reissuable !== undefined && typeof params.reissuable !== 'boolean') {
      throw new Error('reissuable must be a boolean');
    }

    return true;
  }

  /**
   * Build ROOT asset issuance transaction
   * @returns {Promise<object>} Transaction result
   */
  async build() {
    // 1. Validate parameters
    await this.validateParams(this.params);

    const {
      assetName,
      quantity,
      units = 0,
      reissuable = true,
      hasIpfs = false,
      ipfsHash = ''
    } = this.params;

    // 2. Check if asset already exists
    const exists = await this.assetExists(assetName);
    if (exists) {
      throw new AssetExistsError(
        `Asset ${assetName} already exists on the blockchain`,
        assetName
      );
    }

    // 3. Get burn information
    const burnInfo = this.burnManager.getIssueRootBurn();

    // 4. Get addresses
    const addresses = await this._getAddresses();
    const toAddress = await this.getToAddress();
    const changeAddress = await this.getChangeAddress();

    // 5. Estimate fee (rough estimate for initial UTXO selection)
    const estimatedFee = await this.estimateFee(1, 3);

    // 6. Calculate total XNA needed
    const totalXNANeeded = burnInfo.amount + estimatedFee;

    // 7. Select UTXOs
    const utxoSelection = await this.selectUTXOs(totalXNANeeded, null, 0);
    const baseCurrencyUTXOs = utxoSelection.xnaUTXOs;
    const totalXNAInput = utxoSelection.totalXNA;

    // 8. Recalculate fee with actual input count
    const actualFee = await this.estimateFee(baseCurrencyUTXOs.length, 3);

    // 9. Verify we still have enough after fee recalculation
    const totalRequired = burnInfo.amount + actualFee;
    if (totalXNAInput < totalRequired) {
      // Need to select more UTXOs
      const additionalNeeded = totalRequired - totalXNAInput + 0.001; // Add small buffer
      const additionalSelection = await this.selectUTXOs(additionalNeeded, null, 0);
      baseCurrencyUTXOs.push(...additionalSelection.xnaUTXOs);
    }

    // 10. Calculate final totals
    const finalTotalInput = baseCurrencyUTXOs.reduce(
      (sum, utxo) => sum + utxo.satoshis / 100000000,
      0
    );
    const xnaChange = finalTotalInput - burnInfo.amount - actualFee;

    // 11. Build inputs
    const inputs = baseCurrencyUTXOs.map(utxo => ({
      txid: utxo.txid,
      vout: utxo.outputIndex,
      address: utxo.address,
      satoshis: utxo.satoshis
    }));

    // 12. Build outputs (ORDER MATTERS!)
    const outputs = [];

    // First: Burn output
    outputs.push({ [burnInfo.address]: burnInfo.amount });

    // Second: XNA change (if any)
    if (xnaChange > 0.00000001) {
      // Only add change if meaningful amount
      outputs.push({ [changeAddress]: parseFloat(xnaChange.toFixed(8)) });
    }

    // Last: Issue operation
    const issueOutput = OutputFormatter.formatIssueOutput({
      asset_name: assetName,
      asset_quantity: this.toSatoshis(quantity, units),
      units: units,
      reissuable: reissuable,
      has_ipfs: hasIpfs,
      ipfs_hash: ipfsHash
    });

    outputs.push({ [toAddress]: issueOutput });

    // 13. Order outputs (critical for protocol)
    const orderedOutputs = this.outputOrderer.order(outputs);

    // 14. Create raw transaction
    const rawTx = await this.buildRawTransaction(inputs, orderedOutputs);

    // 15. Format and return result
    return this.formatResult(
      rawTx,
      baseCurrencyUTXOs,
      inputs,
      orderedOutputs,
      actualFee,
      burnInfo.amount,
      {
        assetName,
        ownerTokenName: assetName + '!',
        operationType: 'ISSUE_ROOT'
      }
    );
  }
}

module.exports = IssueRootBuilder;

},{"../errors":21,"../utils":32,"../validators":37,"./BaseAssetTransactionBuilder":3}],8:[function(require,module,exports){
/**
 * Issue Sub Builder
 * Builds transactions for creating SUB assets
 *
 * SUB assets:
 * - Child of a ROOT asset (format: ROOT/SUBNAME)
 * - Cost: 200 XNA (burned)
 * - Requires parent's owner token (ROOT!)
 * - Creates own owner token (ROOT/SUB!)
 * - Parent owner token must be returned in outputs
 */

const BaseAssetTransactionBuilder = require('./BaseAssetTransactionBuilder');
const { OutputFormatter, AssetNameParser } = require('../utils');
const {
  AssetExistsError,
  ParentAssetNotFoundError,
  OwnerTokenNotFoundError
} = require('../errors');
const { IpfsValidator } = require('../validators');

class IssueSubBuilder extends BaseAssetTransactionBuilder {
  /**
   * Validate issue SUB parameters
   * @param {object} params - Issue parameters
   * @throws {Error} If validation fails
   */
  validateParams(params) {
    // Validate required parameters
    if (!params.assetName) {
      throw new Error('assetName is required');
    }

    if (params.quantity === undefined || params.quantity === null) {
      throw new Error('quantity is required');
    }

    // Validate asset name (SUB format: ROOT/SUBNAME)
    this.validateAssetName(params.assetName, 'SUB');

    // Validate quantity and units
    const units = params.units !== undefined ? params.units : 0;
    this.validateAmount(params.quantity, units);

    // Validate IPFS hash if provided
    if (params.hasIpfs && params.ipfsHash) {
      IpfsValidator.validate(params.ipfsHash);
    }

    return true;
  }

  /**
   * Build SUB asset issuance transaction
   * @returns {Promise<object>} Transaction result
   */
  async build() {
    // 1. Validate parameters
    await this.validateParams(this.params);

    const {
      assetName,
      quantity,
      units = 0,
      reissuable = true,
      hasIpfs = false,
      ipfsHash = ''
    } = this.params;

    // 2. Parse asset name to get parent
    const parsed = AssetNameParser.parse(assetName);
    const parentAssetName = parsed.parent;

    if (!parentAssetName) {
      throw new Error('Cannot parse parent asset from SUB asset name');
    }

    // 3. Check if parent asset exists
    const parentExists = await this.assetExists(parentAssetName);
    if (!parentExists) {
      throw new ParentAssetNotFoundError(
        `Parent asset ${parentAssetName} does not exist. You must create the ROOT asset first.`,
        parentAssetName
      );
    }

    // 4. Check if SUB asset already exists
    const subExists = await this.assetExists(assetName);
    if (subExists) {
      throw new AssetExistsError(
        `Asset ${assetName} already exists on the blockchain`,
        assetName
      );
    }

    // 5. Get addresses
    const addresses = await this._getAddresses();
    const toAddress = await this.getToAddress();
    const changeAddress = await this.getChangeAddress();

    // 6. Find parent's owner token (CRITICAL: must have this)
    const ownerTokenName = AssetNameParser.getOwnerTokenName(parentAssetName);
    let ownerTokenUTXO;
    try {
      ownerTokenUTXO = await this.ownerTokenManager.findOwnerTokenUTXO(
        ownerTokenName,
        addresses
      );
    } catch (error) {
      if (error instanceof OwnerTokenNotFoundError) {
        throw new OwnerTokenNotFoundError(
          `You must own the parent asset's owner token (${ownerTokenName}) to create a SUB asset. ` +
          `The owner token proves you control the parent asset.`,
          ownerTokenName
        );
      }
      throw error;
    }

    // 7. Get burn information
    const burnInfo = this.burnManager.getIssueSubBurn();

    // 8. Estimate fee
    // Inputs: XNA UTXOs + owner token UTXO
    // Outputs: burn + change + owner token return + issue operation
    const estimatedFee = await this.estimateFee(2, 4);

    // 9. Calculate total XNA needed
    const totalXNANeeded = burnInfo.amount + estimatedFee;

    // 10. Select XNA UTXOs
    const utxoSelection = await this.selectUTXOs(totalXNANeeded, null, 0);
    const baseCurrencyUTXOs = utxoSelection.xnaUTXOs;
    const totalXNAInput = utxoSelection.totalXNA;

    // 11. Recalculate fee with actual input count
    const actualInputCount = baseCurrencyUTXOs.length + 1; // +1 for owner token
    const actualFee = await this.estimateFee(actualInputCount, 4);

    // 12. Verify we have enough XNA
    const totalRequired = burnInfo.amount + actualFee;
    if (totalXNAInput < totalRequired) {
      const additionalNeeded = totalRequired - totalXNAInput + 0.001;
      const additionalSelection = await this.selectUTXOs(additionalNeeded, null, 0);
      baseCurrencyUTXOs.push(...additionalSelection.xnaUTXOs);
    }

    // 13. Calculate XNA change
    const finalTotalInput = baseCurrencyUTXOs.reduce(
      (sum, utxo) => sum + utxo.satoshis / 100000000,
      0
    );
    const xnaChange = finalTotalInput - burnInfo.amount - actualFee;

    // 14. Build inputs (XNA + owner token)
    const inputs = [];

    // Add XNA inputs
    baseCurrencyUTXOs.forEach(utxo => {
      inputs.push({
        txid: utxo.txid,
        vout: utxo.outputIndex,
        address: utxo.address,
        satoshis: utxo.satoshis
      });
    });

    // Add owner token input
    inputs.push({
      txid: ownerTokenUTXO.txid,
      vout: ownerTokenUTXO.outputIndex,
      address: ownerTokenUTXO.address,
      assetName: ownerTokenUTXO.assetName,
      satoshis: ownerTokenUTXO.satoshis
    });

    // 15. Build outputs (ORDER CRITICAL!)
    const outputs = [];

    // First: Burn output
    outputs.push({ [burnInfo.address]: burnInfo.amount });

    // Second: XNA change (if any)
    if (xnaChange > 0.00000001) {
      outputs.push({ [changeAddress]: parseFloat(xnaChange.toFixed(8)) });
    }

    // Third: Owner token return (CRITICAL - must return or lost forever!)
    const ownerTokenReturn = this.ownerTokenManager.createOwnerTokenReturnOutput(
      ownerTokenName,
      changeAddress // Return owner token to change address
    );
    outputs.push(ownerTokenReturn);

    // Last: Issue operation
    const issueOutput = OutputFormatter.formatIssueOutput({
      asset_name: assetName,
      asset_quantity: this.toSatoshis(quantity, units),
      units: units,
      reissuable: reissuable,
      has_ipfs: hasIpfs,
      ipfs_hash: ipfsHash
    });

    outputs.push({ [toAddress]: issueOutput });

    // 16. Order outputs (protocol requirement)
    const orderedOutputs = this.outputOrderer.order(outputs);

    // 17. Validate owner token is returned (safety check)
    this.ownerTokenManager.validateOwnerTokenReturn(inputs, orderedOutputs);

    // 18. Create raw transaction
    const rawTx = await this.buildRawTransaction(inputs, orderedOutputs);

    // 19. Format and return result
    const allUTXOs = [...baseCurrencyUTXOs, ownerTokenUTXO];

    return this.formatResult(
      rawTx,
      allUTXOs,
      inputs,
      orderedOutputs,
      actualFee,
      burnInfo.amount,
      {
        assetName,
        parentAssetName,
        ownerTokenName: assetName + '!',
        parentOwnerTokenUsed: ownerTokenName,
        operationType: 'ISSUE_SUB'
      }
    );
  }
}

module.exports = IssueSubBuilder;

},{"../errors":21,"../utils":32,"../validators":37,"./BaseAssetTransactionBuilder":3}],9:[function(require,module,exports){
/**
 * Issue Unique Builder
 * Builds transactions for creating UNIQUE assets (NFTs)
 *
 * UNIQUE assets:
 * - Non-fungible tokens (NFTs)
 * - Format: ROOT#TAG (e.g., MYNFT#001)
 * - Cost: 10 XNA per NFT (burned)
 * - Requires parent's owner token (ROOT!)
 * - Properties: quantity=1, units=0, reissuable=false (always)
 * - Can create multiple NFTs in single transaction
 * - Each NFT can have unique IPFS metadata
 */

const BaseAssetTransactionBuilder = require('./BaseAssetTransactionBuilder');
const { OutputFormatter, AssetNameParser } = require('../utils');
const {
  ParentAssetNotFoundError,
  OwnerTokenNotFoundError,
  AssetExistsError
} = require('../errors');
const { IpfsValidator } = require('../validators');

class IssueUniqueBuilder extends BaseAssetTransactionBuilder {
  /**
   * Validate issue UNIQUE parameters
   * @param {object} params - Issue parameters
   * @throws {Error} If validation fails
   */
  validateParams(params) {
    // Validate required parameters
    if (!params.rootName) {
      throw new Error('rootName is required (parent asset name)');
    }

    if (!params.assetTags || !Array.isArray(params.assetTags) || params.assetTags.length === 0) {
      throw new Error('assetTags is required and must be a non-empty array');
    }

    // Validate root name
    this.validateAssetName(params.rootName, 'ROOT');

    // Validate each tag
    params.assetTags.forEach((tag, index) => {
      if (!tag || typeof tag !== 'string') {
        throw new Error(`assetTags[${index}] must be a non-empty string`);
      }

      // Validate full unique asset name
      const fullName = `${params.rootName}#${tag}`;
      this.validateAssetName(fullName, 'UNIQUE');
    });

    // Validate IPFS hashes if provided
    if (params.ipfsHashes) {
      if (!Array.isArray(params.ipfsHashes)) {
        throw new Error('ipfsHashes must be an array');
      }

      if (params.ipfsHashes.length !== params.assetTags.length) {
        throw new Error(
          `ipfsHashes array length (${params.ipfsHashes.length}) must match ` +
          `assetTags array length (${params.assetTags.length})`
        );
      }

      params.ipfsHashes.forEach((hash, index) => {
        if (hash) {
          IpfsValidator.validate(hash);
        }
      });
    }

    return true;
  }

  /**
   * Build UNIQUE asset issuance transaction
   * @returns {Promise<object>} Transaction result
   */
  async build() {
    // 1. Validate parameters
    await this.validateParams(this.params);

    const {
      rootName,
      assetTags,
      ipfsHashes = []
    } = this.params;

    // 2. Check if parent asset exists
    const parentExists = await this.assetExists(rootName);
    if (!parentExists) {
      throw new ParentAssetNotFoundError(
        `Parent asset ${rootName} does not exist. You must create the ROOT asset first.`,
        rootName
      );
    }

    // 3. Check if any of the unique assets already exist
    for (const tag of assetTags) {
      const fullName = `${rootName}#${tag}`;
      const exists = await this.assetExists(fullName);
      if (exists) {
        throw new AssetExistsError(
          `Unique asset ${fullName} already exists on the blockchain`,
          fullName
        );
      }
    }

    // 4. Get addresses
    const addresses = await this._getAddresses();
    const toAddress = await this.getToAddress();
    const changeAddress = await this.getChangeAddress();

    // 5. Find parent's owner token (CRITICAL: must have this)
    const ownerTokenName = AssetNameParser.getOwnerTokenName(rootName);
    let ownerTokenUTXO;
    try {
      ownerTokenUTXO = await this.ownerTokenManager.findOwnerTokenUTXO(
        ownerTokenName,
        addresses
      );
    } catch (error) {
      if (error instanceof OwnerTokenNotFoundError) {
        throw new OwnerTokenNotFoundError(
          `You must own the parent asset's owner token (${ownerTokenName}) to create UNIQUE assets. ` +
          `The owner token proves you control the parent asset.`,
          ownerTokenName
        );
      }
      throw error;
    }

    // 6. Get burn information (cost = 10 XNA per NFT)
    const nftCount = assetTags.length;
    const burnInfo = this.burnManager.getIssueUniqueBurn(nftCount);

    // 7. Estimate fee
    // Inputs: XNA UTXOs + owner token UTXO
    // Outputs: burn + change + owner token return + issue_unique operation
    const estimatedFee = await this.estimateFee(2, 4);

    // 8. Calculate total XNA needed
    const totalXNANeeded = burnInfo.amount + estimatedFee;

    // 9. Select XNA UTXOs
    const utxoSelection = await this.selectUTXOs(totalXNANeeded, null, 0);
    const baseCurrencyUTXOs = utxoSelection.xnaUTXOs;
    const totalXNAInput = utxoSelection.totalXNA;

    // 10. Recalculate fee with actual input count
    const actualInputCount = baseCurrencyUTXOs.length + 1; // +1 for owner token
    const actualFee = await this.estimateFee(actualInputCount, 4);

    // 11. Verify we have enough XNA
    const totalRequired = burnInfo.amount + actualFee;
    if (totalXNAInput < totalRequired) {
      const additionalNeeded = totalRequired - totalXNAInput + 0.001;
      const additionalSelection = await this.selectUTXOs(additionalNeeded, null, 0);
      baseCurrencyUTXOs.push(...additionalSelection.xnaUTXOs);
    }

    // 12. Calculate XNA change
    const finalTotalInput = baseCurrencyUTXOs.reduce(
      (sum, utxo) => sum + utxo.satoshis / 100000000,
      0
    );
    const xnaChange = finalTotalInput - burnInfo.amount - actualFee;

    // 13. Build inputs (XNA + owner token)
    const inputs = [];

    // Add XNA inputs
    baseCurrencyUTXOs.forEach(utxo => {
      inputs.push({
        txid: utxo.txid,
        vout: utxo.outputIndex,
        address: utxo.address,
        satoshis: utxo.satoshis
      });
    });

    // Add owner token input
    inputs.push({
      txid: ownerTokenUTXO.txid,
      vout: ownerTokenUTXO.outputIndex,
      address: ownerTokenUTXO.address,
      assetName: ownerTokenUTXO.assetName,
      satoshis: ownerTokenUTXO.satoshis
    });

    // 14. Build outputs (ORDER CRITICAL!)
    const outputs = [];

    // First: Burn output
    outputs.push({ [burnInfo.address]: burnInfo.amount });

    // Second: XNA change (if any)
    if (xnaChange > 0.00000001) {
      outputs.push({ [changeAddress]: parseFloat(xnaChange.toFixed(8)) });
    }

    // Last: Issue unique operation
    // NOTE: owner token return is handled automatically by the node when processing
    // issue_unique — adding it manually would cause TOKEN! to appear twice in outputs
    const issueUniqueOutput = OutputFormatter.formatIssueUniqueOutput({
      root_name: rootName,
      asset_tags: assetTags,
      ipfs_hashes: ipfsHashes.length > 0 ? ipfsHashes : undefined
    });

    outputs.push({ [toAddress]: issueUniqueOutput });

    // 15. Order outputs (protocol requirement)
    const orderedOutputs = this.outputOrderer.order(outputs);

    // 16. Create raw transaction
    // NOTE: validateOwnerTokenReturn removed — the node returns TOKEN! automatically
    const rawTx = await this.buildRawTransaction(inputs, orderedOutputs);

    // 17. Build list of created NFT names
    const createdNFTs = assetTags.map(tag => `${rootName}#${tag}`);

    // 18. Format and return result
    const allUTXOs = [...baseCurrencyUTXOs, ownerTokenUTXO];

    return this.formatResult(
      rawTx,
      allUTXOs,
      inputs,
      orderedOutputs,
      actualFee,
      burnInfo.amount,
      {
        rootName,
        assetTags,
        createdNFTs,
        nftCount,
        ownerTokenUsed: ownerTokenName,
        operationType: 'ISSUE_UNIQUE'
      }
    );
  }
}

module.exports = IssueUniqueBuilder;

},{"../errors":21,"../utils":32,"../validators":37,"./BaseAssetTransactionBuilder":3}],10:[function(require,module,exports){
/**
 * Reissue Builder
 * Builds transactions for reissuing (minting more supply) assets
 *
 * Reissue:
 * - Mints additional supply of an existing asset
 * - Cost: 200 XNA (burned)
 * - Requires asset's owner token (ASSET!)
 * - Can lock asset (make it non-reissuable)
 * - Can update IPFS metadata
 * - Owner token must be returned
 */

const BaseAssetTransactionBuilder = require('./BaseAssetTransactionBuilder');
const { OutputFormatter, AssetNameParser } = require('../utils');
const {
  AssetNotFoundError,
  AssetNotReissuableError,
  OwnerTokenNotFoundError,
  MaxSupplyExceededError
} = require('../errors');
const { IpfsValidator } = require('../validators');
const { ASSET_LIMITS } = require('../constants');

class ReissueBuilder extends BaseAssetTransactionBuilder {
  /**
   * Validate reissue parameters
   * @param {object} params - Reissue parameters
   * @throws {Error} If validation fails
   */
  validateParams(params) {
    // Validate required parameters
    if (!params.assetName) {
      throw new Error('assetName is required');
    }

    if (params.quantity === undefined || params.quantity === null) {
      throw new Error('quantity is required (amount to mint)');
    }

    if (params.quantity <= 0) {
      throw new Error('quantity must be greater than 0');
    }

    // Validate new IPFS hash if provided
    if (params.newIpfs) {
      IpfsValidator.validate(params.newIpfs);
    }

    return true;
  }

  /**
   * Build reissue transaction
   * @returns {Promise<object>} Transaction result
   */
  async build() {
    // 1. Validate parameters
    await this.validateParams(this.params);

    const {
      assetName,
      quantity,
      reissuable,
      newIpfs
    } = this.params;

    // 2. Get asset data to verify it exists and is reissuable
    const assetData = await this.getAssetData(assetName);
    if (!assetData) {
      throw new AssetNotFoundError(
        `Asset ${assetName} does not exist on the blockchain`,
        assetName
      );
    }

    // 3. Check if asset is reissuable
    if (!assetData.reissuable) {
      throw new AssetNotReissuableError(
        `Asset ${assetName} is not reissuable. The supply has been locked.`,
        assetName
      );
    }

    // 4. Check if reissuing would exceed max supply
    const currentSupply = assetData.amount || 0;
    const additionalAmount = quantity;
    const newTotalSupply = currentSupply + additionalAmount;

    if (newTotalSupply > ASSET_LIMITS.MAX_QUANTITY) {
      throw new MaxSupplyExceededError(
        `Reissuing ${additionalAmount} would exceed maximum supply. ` +
        `Current: ${currentSupply}, Additional: ${additionalAmount}, ` +
        `Max: ${ASSET_LIMITS.MAX_QUANTITY}`,
        assetName,
        currentSupply,
        additionalAmount,
        ASSET_LIMITS.MAX_QUANTITY
      );
    }

    // 5. Get addresses
    const addresses = await this._getAddresses();
    const toAddress = await this.getToAddress();
    const changeAddress = await this.getChangeAddress();

    // 6. Find owner token (CRITICAL: must have this)
    const ownerTokenName = AssetNameParser.getOwnerTokenName(assetName);
    let ownerTokenUTXO;
    try {
      ownerTokenUTXO = await this.ownerTokenManager.findOwnerTokenUTXO(
        ownerTokenName,
        addresses
      );
    } catch (error) {
      if (error instanceof OwnerTokenNotFoundError) {
        throw new OwnerTokenNotFoundError(
          `You must own the asset's owner token (${ownerTokenName}) to reissue it. ` +
          `The owner token proves you have the right to mint more supply.`,
          ownerTokenName
        );
      }
      throw error;
    }

    // 7. Get burn information
    const burnInfo = this.burnManager.getReissueBurn();

    // 8. Estimate fee
    // Inputs: XNA UTXOs + owner token UTXO
    // Outputs: burn + change + reissue operation
    // (node auto-generates owner token return from the reissue entry, total = 4 physical outputs)
    const estimatedFee = await this.estimateFee(2, 4);

    // 9. Calculate total XNA needed
    const totalXNANeeded = burnInfo.amount + estimatedFee;

    // 10. Select XNA UTXOs
    const utxoSelection = await this.selectUTXOs(totalXNANeeded, null, 0);
    const baseCurrencyUTXOs = utxoSelection.xnaUTXOs;
    const totalXNAInput = utxoSelection.totalXNA;

    // 11. Recalculate fee with actual input count
    const actualInputCount = baseCurrencyUTXOs.length + 1; // +1 for owner token
    const actualFee = await this.estimateFee(actualInputCount, 4);

    // 12. Verify we have enough XNA
    const totalRequired = burnInfo.amount + actualFee;
    if (totalXNAInput < totalRequired) {
      const additionalNeeded = totalRequired - totalXNAInput + 0.001;
      const additionalSelection = await this.selectUTXOs(additionalNeeded, null, 0);
      baseCurrencyUTXOs.push(...additionalSelection.xnaUTXOs);
    }

    // 13. Calculate XNA change
    const finalTotalInput = baseCurrencyUTXOs.reduce(
      (sum, utxo) => sum + utxo.satoshis / 100000000,
      0
    );
    const xnaChange = finalTotalInput - burnInfo.amount - actualFee;

    // 14. Build inputs (XNA + owner token)
    const inputs = [];

    // Add XNA inputs
    baseCurrencyUTXOs.forEach(utxo => {
      inputs.push({
        txid: utxo.txid,
        vout: utxo.outputIndex,
        address: utxo.address,
        satoshis: utxo.satoshis
      });
    });

    // Add owner token input
    inputs.push({
      txid: ownerTokenUTXO.txid,
      vout: ownerTokenUTXO.outputIndex,
      address: ownerTokenUTXO.address,
      assetName: ownerTokenUTXO.assetName,
      satoshis: ownerTokenUTXO.satoshis
    });

    // 15. Build outputs (ORDER CRITICAL!)
    const outputs = [];

    // First: Burn output
    outputs.push({ [burnInfo.address]: burnInfo.amount });

    // Second: XNA change (if any)
    if (xnaChange > 0.00000001) {
      outputs.push({ [changeAddress]: parseFloat(xnaChange.toFixed(8)) });
    }

    // Last: Reissue operation
    // Note: the node auto-generates the owner token return as part of processing
    // the reissue entry — no explicit transfer output needed here.
    const units = assetData.units || 0;
    const reissueOutput = OutputFormatter.formatReissueOutput({
      asset_name: assetName,
      asset_quantity: this.toSatoshis(quantity, units),
      reissuable: reissuable !== undefined ? reissuable : undefined,
      new_ipfs: newIpfs || undefined,
      owner_change_address: changeAddress
    });

    outputs.push({ [toAddress]: reissueOutput });

    // 16. Order outputs (protocol requirement)
    const orderedOutputs = this.outputOrderer.order(outputs);

    // 17. Create raw transaction
    const rawTx = await this.buildRawTransaction(inputs, orderedOutputs);

    // 18. Format and return result
    const allUTXOs = [...baseCurrencyUTXOs, ownerTokenUTXO];

    return this.formatResult(
      rawTx,
      allUTXOs,
      inputs,
      orderedOutputs,
      actualFee,
      burnInfo.amount,
      {
        assetName,
        ownerTokenUsed: ownerTokenName,
        quantityMinted: quantity,
        newTotalSupply,
        previousSupply: currentSupply,
        reissuableLocked: reissuable === false,
        operationType: 'REISSUE'
      }
    );
  }
}

module.exports = ReissueBuilder;

},{"../constants":17,"../errors":21,"../utils":32,"../validators":37,"./BaseAssetTransactionBuilder":3}],11:[function(require,module,exports){
/**
 * Reissue Restricted Builder
 * Builds transactions for reissuing RESTRICTED assets
 *
 * Reissue Restricted:
 * - Mints additional supply of restricted asset
 * - Cost: 200 XNA (burned)
 * - Requires asset's owner token (ASSET!)
 * - Can update verifier string
 * - Can lock asset (make it non-reissuable)
 * - Can update IPFS metadata
 * - Owner token must be returned
 */

const BaseAssetTransactionBuilder = require('./BaseAssetTransactionBuilder');
const { OutputFormatter, AssetNameParser } = require('../utils');
const {
  AssetNotFoundError,
  AssetNotReissuableError,
  OwnerTokenNotFoundError,
  MaxSupplyExceededError
} = require('../errors');
const { IpfsValidator, VerifierValidator } = require('../validators');
const { ASSET_LIMITS } = require('../constants');

class ReissueRestrictedBuilder extends BaseAssetTransactionBuilder {
  /**
   * Validate reissue restricted parameters
   * @param {object} params - Reissue parameters
   * @throws {Error} If validation fails
   */
  validateParams(params) {
    // Validate required parameters
    if (!params.assetName) {
      throw new Error('assetName is required');
    }

    // Validate asset name is restricted
    this.validateAssetName(params.assetName, 'RESTRICTED');

    if (params.quantity === undefined || params.quantity === null) {
      throw new Error('quantity is required (amount to mint)');
    }

    if (params.quantity <= 0) {
      throw new Error('quantity must be greater than 0');
    }

    // Validate verifier string if changing
    if (params.changeVerifier && params.newVerifier) {
      VerifierValidator.validate(params.newVerifier);
    }

    // Validate new IPFS hash if provided
    if (params.newIpfs) {
      IpfsValidator.validate(params.newIpfs);
    }

    return true;
  }

  /**
   * Build reissue restricted transaction
   * @returns {Promise<object>} Transaction result
   */
  async build() {
    // 1. Validate parameters
    await this.validateParams(this.params);

    const {
      assetName,
      quantity,
      changeVerifier = false,
      newVerifier,
      reissuable,
      newIpfs
    } = this.params;

    // 2. Get asset data to verify it exists and is reissuable
    const assetData = await this.getAssetData(assetName);
    if (!assetData) {
      throw new AssetNotFoundError(
        `Asset ${assetName} does not exist on the blockchain`,
        assetName
      );
    }

    // 3. Check if asset is reissuable
    if (!assetData.reissuable) {
      throw new AssetNotReissuableError(
        `Asset ${assetName} is not reissuable. The supply has been locked.`,
        assetName
      );
    }

    // 4. Check if reissuing would exceed max supply
    const currentSupply = assetData.amount || 0;
    const additionalAmount = quantity;
    const newTotalSupply = currentSupply + additionalAmount;

    if (newTotalSupply > ASSET_LIMITS.MAX_QUANTITY) {
      throw new MaxSupplyExceededError(
        `Reissuing ${additionalAmount} would exceed maximum supply. ` +
        `Current: ${currentSupply}, Additional: ${additionalAmount}, ` +
        `Max: ${ASSET_LIMITS.MAX_QUANTITY}`,
        assetName,
        currentSupply,
        additionalAmount,
        ASSET_LIMITS.MAX_QUANTITY
      );
    }

    // 5. Get addresses
    const addresses = await this._getAddresses();
    const toAddress = await this.getToAddress();
    const changeAddress = await this.getChangeAddress();

    // 6. Find owner token (CRITICAL: must have this)
    const ownerTokenName = AssetNameParser.getOwnerTokenName(assetName);
    let ownerTokenUTXO;
    try {
      ownerTokenUTXO = await this.ownerTokenManager.findOwnerTokenUTXO(
        ownerTokenName,
        addresses
      );
    } catch (error) {
      if (error instanceof OwnerTokenNotFoundError) {
        throw new OwnerTokenNotFoundError(
          `You must own the asset's owner token (${ownerTokenName}) to reissue it. ` +
          `The owner token proves you have the right to mint more supply and manage the asset.`,
          ownerTokenName
        );
      }
      throw error;
    }

    // 7. Get burn information
    const burnInfo = this.burnManager.getReissueBurn();

    // 8. Estimate fee
    const estimatedFee = await this.estimateFee(2, 4);

    // 9. Calculate total XNA needed
    const totalXNANeeded = burnInfo.amount + estimatedFee;

    // 10. Select XNA UTXOs
    const utxoSelection = await this.selectUTXOs(totalXNANeeded, null, 0);
    const baseCurrencyUTXOs = utxoSelection.xnaUTXOs;
    const totalXNAInput = utxoSelection.totalXNA;

    // 11. Recalculate fee with actual input count
    const actualInputCount = baseCurrencyUTXOs.length + 1; // +1 for owner token
    const actualFee = await this.estimateFee(actualInputCount, 4);

    // 12. Verify we have enough XNA
    const totalRequired = burnInfo.amount + actualFee;
    if (totalXNAInput < totalRequired) {
      const additionalNeeded = totalRequired - totalXNAInput + 0.001;
      const additionalSelection = await this.selectUTXOs(additionalNeeded, null, 0);
      baseCurrencyUTXOs.push(...additionalSelection.xnaUTXOs);
    }

    // 13. Calculate XNA change
    const finalTotalInput = baseCurrencyUTXOs.reduce(
      (sum, utxo) => sum + utxo.satoshis / 100000000,
      0
    );
    const xnaChange = finalTotalInput - burnInfo.amount - actualFee;

    // 14. Build inputs (XNA + owner token)
    const inputs = [];

    // Add XNA inputs
    baseCurrencyUTXOs.forEach(utxo => {
      inputs.push({
        txid: utxo.txid,
        vout: utxo.outputIndex,
        address: utxo.address,
        satoshis: utxo.satoshis
      });
    });

    // Add owner token input
    inputs.push({
      txid: ownerTokenUTXO.txid,
      vout: ownerTokenUTXO.outputIndex,
      address: ownerTokenUTXO.address,
      assetName: ownerTokenUTXO.assetName,
      satoshis: ownerTokenUTXO.satoshis
    });

    // 15. Build outputs (ORDER CRITICAL!)
    const outputs = [];

    // First: Burn output
    outputs.push({ [burnInfo.address]: burnInfo.amount });

    // Second: XNA change (if any)
    if (xnaChange > 0.00000001) {
      outputs.push({ [changeAddress]: parseFloat(xnaChange.toFixed(8)) });
    }

    // Last: Reissue restricted operation
    const units = assetData.units || 0;
    const reissueRestrictedOutput = OutputFormatter.formatReissueRestrictedOutput({
      asset_name: assetName,
      asset_quantity: this.toSatoshis(quantity, units),
      change_verifier: changeVerifier,
      new_verifier: changeVerifier ? newVerifier : undefined,
      reissuable: reissuable !== undefined ? reissuable : undefined,
      new_ipfs: newIpfs || undefined,
      owner_change_address: this.params.ownerChangeAddress || changeAddress
    });

    outputs.push({ [toAddress]: reissueRestrictedOutput });

    // 16. Order outputs (protocol requirement)
    const orderedOutputs = this.outputOrderer.order(outputs);

    // 17. Create raw transaction
    const rawTx = await this.buildRawTransaction(inputs, orderedOutputs);

    // 18. Format and return result
    const allUTXOs = [...baseCurrencyUTXOs, ownerTokenUTXO];

    // Extract qualifiers from new verifier if changed
    const requiredQualifiers = changeVerifier && newVerifier
      ? VerifierValidator.extractQualifiers(newVerifier)
      : null;

    return this.formatResult(
      rawTx,
      allUTXOs,
      inputs,
      orderedOutputs,
      actualFee,
      burnInfo.amount,
      {
        assetName,
        ownerTokenUsed: ownerTokenName,
        quantityMinted: quantity,
        newTotalSupply,
        previousSupply: currentSupply,
        verifierChanged: changeVerifier,
        newVerifier: changeVerifier ? newVerifier : undefined,
        requiredQualifiers,
        reissuableLocked: reissuable === false,
        operationType: 'REISSUE_RESTRICTED'
      }
    );
  }
}

module.exports = ReissueRestrictedBuilder;

},{"../constants":17,"../errors":21,"../utils":32,"../validators":37,"./BaseAssetTransactionBuilder":3}],12:[function(require,module,exports){
/**
 * Tag Address Builder
 * Builds transactions for tagging/untagging addresses with qualifiers
 *
 * Tag operations:
 * - Assign qualifier tags to addresses (for restricted asset compliance)
 * - Remove qualifier tags from addresses
 * - Cost: 0.1 XNA per address (burned)
 * - Requires spending the qualifier asset itself (#QUALIFIER)
 * - Used to mark addresses as KYC'd, accredited, etc.
 * - Owner token must be returned
 */

const BaseAssetTransactionBuilder = require('./BaseAssetTransactionBuilder');
const { OutputFormatter } = require('../utils');
const { AssetNotFoundError, OwnerTokenNotFoundError, InvalidAddressError } = require('../errors');

class TagAddressBuilder extends BaseAssetTransactionBuilder {
  /**
   * Validate tag/untag parameters
   * @param {object} params - Tag parameters
   * @param {boolean} isUntag - True if untag operation
   * @throws {Error} If validation fails
   */
  validateParams(params, isUntag = false) {
    // Validate required parameters
    if (!params.qualifierName) {
      throw new Error('qualifierName is required');
    }

    if (!params.addresses || !Array.isArray(params.addresses) || params.addresses.length === 0) {
      throw new Error('addresses is required and must be a non-empty array');
    }

    if (params.addresses.length > 10) {
      throw new Error('addresses array cannot exceed 10 entries per transaction (node limit)');
    }

    // Validate qualifier name
    this.validateAssetName(params.qualifierName, 'QUALIFIER');

    // Validate addresses
    params.addresses.forEach((address, index) => {
      if (!address || typeof address !== 'string') {
        throw new InvalidAddressError(
          `addresses[${index}] must be a non-empty string`,
          address
        );
      }

      // Address prefix validation is left to the node (varies by network)
    });

    return true;
  }

  /**
   * Build tag addresses transaction
   * @param {boolean} isUntag - True for untag operation, false for tag
   * @returns {Promise<object>} Transaction result
   */
  async buildTagOperation(isUntag = false) {
    // 1. Validate parameters
    await this.validateParams(this.params, isUntag);

    const {
      qualifierName,
      addresses: targetAddresses,
    } = this.params;

    // 2. Check if qualifier exists
    const qualifierExists = await this.assetExists(qualifierName);
    if (!qualifierExists) {
      throw new AssetNotFoundError(
        `Qualifier ${qualifierName} does not exist. You must create the qualifier first.`,
        qualifierName
      );
    }

    // 3. Get wallet addresses
    const addresses = await this._getAddresses();
    const changeAddress = await this.getChangeAddress();

    // 4. Find qualifier asset balance (CRITICAL: must have this)
    let qualifierUTXOs;
    let qualifierQuantity;
    try {
      const selection = await this.utxoSelector.selectAssetUTXOs(addresses, qualifierName, 1);
      qualifierUTXOs = selection.utxos;
      qualifierQuantity = selection.totalAmount;
    } catch (error) {
      if (error.name === 'InsufficientFundsError') {
        throw new OwnerTokenNotFoundError(
          `You must own the qualifier asset (${qualifierName}) to tag/untag addresses.`,
          qualifierName
        );
      }
      throw error;
    }

    // 5. Get burn information (0.1 XNA per address)
    const addressCount = targetAddresses.length;
    const burnInfo = isUntag
      ? this.burnManager.getUntagAddressBurn(addressCount)
      : this.burnManager.getTagAddressBurn(addressCount);

    // 6. Estimate fee
    const estimatedFee = await this.estimateFee(2, 3);

    // 7. Calculate total XNA needed
    const totalXNANeeded = burnInfo.amount + estimatedFee;

    // 8. Select XNA UTXOs
    const utxoSelection = await this.selectUTXOs(totalXNANeeded, null, 0);
    const baseCurrencyUTXOs = utxoSelection.xnaUTXOs;
    const totalXNAInput = utxoSelection.totalXNA;

    // 9. Recalculate fee with actual input count
    const actualInputCount = baseCurrencyUTXOs.length + qualifierUTXOs.length;
    const actualFee = await this.estimateFee(actualInputCount, 3);

    // 10. Verify we have enough XNA
    const totalRequired = burnInfo.amount + actualFee;
    if (totalXNAInput < totalRequired) {
      const additionalNeeded = totalRequired - totalXNAInput + 0.001;
      const additionalSelection = await this.selectUTXOs(additionalNeeded, null, 0);
      baseCurrencyUTXOs.push(...additionalSelection.xnaUTXOs);
    }

    // 11. Calculate XNA change
    const finalTotalInput = baseCurrencyUTXOs.reduce(
      (sum, utxo) => sum + utxo.satoshis / 100000000,
      0
    );
    const xnaChange = finalTotalInput - burnInfo.amount - actualFee;

    // 12. Build inputs (XNA + qualifier asset)
    const inputs = [];

    // Add XNA inputs
    baseCurrencyUTXOs.forEach(utxo => {
      inputs.push({
        txid: utxo.txid,
        vout: utxo.outputIndex,
        address: utxo.address,
        satoshis: utxo.satoshis
      });
    });

    qualifierUTXOs.forEach(utxo => {
      inputs.push({
        txid: utxo.txid,
        vout: utxo.outputIndex,
        address: utxo.address,
        assetName: utxo.assetName,
        satoshis: utxo.satoshis
      });
    });

    // 13. Build outputs (ORDER CRITICAL!)
    const outputs = [];

    // First: Burn output
    outputs.push({ [burnInfo.address]: burnInfo.amount });

    // Second: XNA change (if any)
    if (xnaChange > 0.00000001) {
      outputs.push({ [changeAddress]: parseFloat(xnaChange.toFixed(8)) });
    }

    // Last: Tag/Untag operation. The node creates the qualifier change output
    // from the operation object itself, so this must be sent to the change address.
    const operationOutput = isUntag
      ? OutputFormatter.formatUntagAddressesOutput({
          qualifier: qualifierName,
          addresses: targetAddresses,
          change_quantity: qualifierQuantity
        })
      : OutputFormatter.formatTagAddressesOutput({
          qualifier: qualifierName,
          addresses: targetAddresses,
          change_quantity: qualifierQuantity
        });

    outputs.push({ [changeAddress]: operationOutput });

    // 14. Order outputs (protocol requirement)
    const orderedOutputs = this.outputOrderer.order(outputs);

    // 15. Create raw transaction
    const rawTx = await this.buildRawTransaction(inputs, orderedOutputs);

    // 16. Format and return result
    const allUTXOs = [...baseCurrencyUTXOs, ...qualifierUTXOs];

    return this.formatResult(
      rawTx,
      allUTXOs,
      inputs,
      orderedOutputs,
      actualFee,
      burnInfo.amount,
      {
        qualifierName,
        qualifierAssetUsed: qualifierName,
        targetAddresses,
        addressCount,
        operationType: isUntag ? 'UNTAG_ADDRESSES' : 'TAG_ADDRESSES'
      }
    );
  }

  /**
   * Build tag addresses transaction
   * @returns {Promise<object>} Transaction result
   */
  async build() {
    return this.buildTagOperation(false);
  }

  /**
   * Build untag addresses transaction
   * @returns {Promise<object>} Transaction result
   */
  async buildUntag() {
    return this.buildTagOperation(true);
  }
}

module.exports = TagAddressBuilder;

},{"../errors":21,"../utils":32,"./BaseAssetTransactionBuilder":3}],13:[function(require,module,exports){
/**
 * Builders Module
 * Exports all transaction builder classes
 */

// Base
const BaseAssetTransactionBuilder = require('./BaseAssetTransactionBuilder');

// Basic Builders
const IssueRootBuilder = require('./IssueRootBuilder');
const IssueSubBuilder = require('./IssueSubBuilder');
const ReissueBuilder = require('./ReissueBuilder');

// Advanced Builders
const IssueUniqueBuilder = require('./IssueUniqueBuilder');
const IssueQualifierBuilder = require('./IssueQualifierBuilder');
const IssueRestrictedBuilder = require('./IssueRestrictedBuilder');
const ReissueRestrictedBuilder = require('./ReissueRestrictedBuilder');
const TagAddressBuilder = require('./TagAddressBuilder');
const FreezeAddressBuilder = require('./FreezeAddressBuilder');

module.exports = {
  // Base
  BaseAssetTransactionBuilder,

  // Basic Builders
  IssueRootBuilder,
  IssueSubBuilder,
  ReissueBuilder,

  // Advanced Builders
  IssueUniqueBuilder,
  IssueQualifierBuilder,
  IssueRestrictedBuilder,
  ReissueRestrictedBuilder,
  TagAddressBuilder,
  FreezeAddressBuilder
};

},{"./BaseAssetTransactionBuilder":3,"./FreezeAddressBuilder":4,"./IssueQualifierBuilder":5,"./IssueRestrictedBuilder":6,"./IssueRootBuilder":7,"./IssueSubBuilder":8,"./IssueUniqueBuilder":9,"./ReissueBuilder":10,"./ReissueRestrictedBuilder":11,"./TagAddressBuilder":12}],14:[function(require,module,exports){
/**
 * Neurai Asset Types
 * Based on: src/assets/assettypes.h
 */

const AssetType = {
  ROOT: 0,           // Top-level asset (Cost: 1000 XNA)
  SUB: 1,            // Sub-asset (Cost: 200 XNA, requires PARENT!)
  UNIQUE: 2,         // NFT/Unique asset (Cost: 10 XNA per token)
  MSGCHANNEL: 3,     // Message channel (Cost: 200 XNA, legacy)
  QUALIFIER: 4,      // KYC qualifier tag (Cost: 2000 XNA)
  SUB_QUALIFIER: 5,  // Sub-qualifier (Cost: 200 XNA)
  RESTRICTED: 6,     // Restricted/security token (Cost: 3000 XNA)
  VOTE: 7,           // Voting asset (Reserved for future use)
  REISSUE: 8,        // Reissuance operation (Cost: 200 XNA)
  OWNER: 9,          // Owner token (Cost: 0 XNA, auto-generated)
  NULL_ADD_QUALIFIER: 10,  // Qualifier assignment (Cost: 0.1 XNA)
  DEPIN: 12          // Soulbound DePIN asset (Testnet only)
};

module.exports = {
  AssetType
};

},{}],15:[function(require,module,exports){
/**
 * Burn Addresses for Asset Operations
 * Different addresses for mainnet and testnet
 */

const MAINNET_BURN_ADDRESSES = {
  ISSUE_ROOT: 'NbURNXXXXXXXXXXXXXXXXXXXXXXXT65Gdr',
  ISSUE_SUB: 'NXissueSubAssetXXXXXXXXXXXXXX6B2JF',
  ISSUE_UNIQUE: 'NXissueUniqueAssetXXXXXXXXXXUBzP4Z',
  ISSUE_MSGCHANNEL: 'NXissueMsgChanneLAssetXXXXXXTUzrtJ',
  REISSUE: 'NXReissueAssetXXXXXXXXXXXXXXWLe4Ao',
  ISSUE_RESTRICTED: 'NXissueRestrictedXXXXXXXXXXXWpXx4H',
  ISSUE_QUALIFIER: 'NXissueQuaLifierXXXXXXXXXXXXWurNcU',
  ISSUE_SUB_QUALIFIER: 'NXissueSubQuaLifierXXXXXXXXXV71vM3',
  TAG_ADDRESS: 'NXaddTagBurnXXXXXXXXXXXXXXXXWucUTr',
  UNTAG_ADDRESS: 'NXaddTagBurnXXXXXXXXXXXXXXXXWucUTr'
};

const TESTNET_BURN_ADDRESSES = {
  ISSUE_ROOT: 'tBURNXXXXXXXXXXXXXXXXXXXXXXXVZLroy',
  ISSUE_SUB: 'tSubAssetXXXXXXXXXXXXXXXXXXXXGTvF4',
  ISSUE_UNIQUE: 'tUniqueAssetXXXXXXXXXXXXXXXXVCgpLs',
  ISSUE_MSGCHANNEL: 'tMsgChanneLAssetXXXXXXXXXXXXVsJoya',
  REISSUE: 'tAssetXXXXXXXXXXXXXXXXXXXXXXas6pz8',
  ISSUE_RESTRICTED: 'tRestrictedXXXXXXXXXXXXXXXXXVyPBEK',
  ISSUE_QUALIFIER: 'tQuaLifierXXXXXXXXXXXXXXXXXXT5czoV',
  ISSUE_SUB_QUALIFIER: 'tSubQuaLifierXXXXXXXXXXXXXXXW5MmGk',
  TAG_ADDRESS: 'tTagBurnXXXXXXXXXXXXXXXXXXXXYm6pxA',
  UNTAG_ADDRESS: 'tTagBurnXXXXXXXXXXXXXXXXXXXXYm6pxA'
};

/**
 * Get burn address for an operation and network
 * @param {string} operationType - Operation type (e.g., 'ISSUE_ROOT')
 * @param {string} network - Network type ('xna' or 'xna-test')
 * @returns {string} Burn address
 */
function getBurnAddress(operationType, network) {
  const addresses = network === 'xna' ? MAINNET_BURN_ADDRESSES : TESTNET_BURN_ADDRESSES;

  const address = addresses[operationType];
  if (!address) {
    throw new Error(`Unknown operation type: ${operationType} for network: ${network}`);
  }

  return address;
}

/**
 * Check if an address is a burn address
 * @param {string} address - Address to check
 * @param {string} network - Network type ('xna' or 'xna-test')
 * @returns {boolean} True if it's a burn address
 */
function isBurnAddress(address, network) {
  const addresses = network === 'xna' ? MAINNET_BURN_ADDRESSES : TESTNET_BURN_ADDRESSES;
  return Object.values(addresses).includes(address);
}

module.exports = {
  MAINNET_BURN_ADDRESSES,
  TESTNET_BURN_ADDRESSES,
  getBurnAddress,
  isBurnAddress
};

},{}],16:[function(require,module,exports){
/**
 * Asset Operation Costs (in XNA)
 * These are burn amounts required for each operation
 */

const ASSET_COSTS = {
  ISSUE_ROOT: 1000,
  ISSUE_SUB: 200,
  ISSUE_UNIQUE: 10,  // Per NFT
  ISSUE_MSGCHANNEL: 200,
  ISSUE_QUALIFIER: 2000,
  ISSUE_SUB_QUALIFIER: 200,
  ISSUE_RESTRICTED: 3000,
  REISSUE: 200,
  REISSUE_RESTRICTED: 200,
  TAG_ADDRESS: 0.2,   // Per address
  UNTAG_ADDRESS: 0.2, // Per address
  FREEZE_ADDRESS: 0,  // No cost (requires owner token)
  UNFREEZE_ADDRESS: 0, // No cost (requires owner token)
  FREEZE_ASSET: 0,    // No cost (requires owner token)
  UNFREEZE_ASSET: 0,  // No cost (requires owner token)
  OWNER_TOKEN: 0      // Auto-generated, no cost
};

/**
 * Get cost for a specific operation type
 * @param {string} operationType - Operation type (e.g., 'ISSUE_ROOT')
 * @returns {number} Cost in XNA
 */
function getAssetCost(operationType) {
  const cost = ASSET_COSTS[operationType];
  if (cost === undefined) {
    throw new Error(`Unknown operation type: ${operationType}`);
  }
  return cost;
}

/**
 * Calculate total cost for unique asset issuance
 * @param {number} count - Number of unique assets to create
 * @returns {number} Total cost in XNA
 */
function getUniqueAssetCost(count) {
  return ASSET_COSTS.ISSUE_UNIQUE * count;
}

/**
 * Calculate total cost for tagging multiple addresses
 * @param {number} addressCount - Number of addresses to tag
 * @returns {number} Total cost in XNA
 */
function getTaggingCost(addressCount) {
  return ASSET_COSTS.TAG_ADDRESS * addressCount;
}

module.exports = {
  ASSET_COSTS,
  getAssetCost,
  getUniqueAssetCost,
  getTaggingCost
};

},{}],17:[function(require,module,exports){
/**
 * Constants Module
 * Exports all constant values and configurations
 */

const { AssetType } = require('./assetTypes');
const { ASSET_COSTS, getAssetCost, getUniqueAssetCost, getTaggingCost } = require('./fees');
const {
  MAINNET_BURN_ADDRESSES,
  TESTNET_BURN_ADDRESSES,
  getBurnAddress,
  isBurnAddress
} = require('./burnAddresses');
const {
  NETWORKS,
  ASSET_NAME_RULES,
  ASSET_LIMITS,
  getNetworkConfig,
  detectNetworkFromAddress
} = require('./networks');

module.exports = {
  // Asset Types
  AssetType,

  // Fees/Costs
  ASSET_COSTS,
  getAssetCost,
  getUniqueAssetCost,
  getTaggingCost,

  // Burn Addresses
  MAINNET_BURN_ADDRESSES,
  TESTNET_BURN_ADDRESSES,
  getBurnAddress,
  isBurnAddress,

  // Networks
  NETWORKS,
  ASSET_NAME_RULES,
  ASSET_LIMITS,
  getNetworkConfig,
  detectNetworkFromAddress
};

},{"./assetTypes":14,"./burnAddresses":15,"./fees":16,"./networks":18}],18:[function(require,module,exports){
/**
 * Network Configuration for Neurai
 */

const NETWORKS = {
  MAINNET: {
    name: 'xna',
    displayName: 'Neurai Mainnet',
    addressPrefix: 'N',
    assetNameMaxLength: 32,
    defaultRPCPort: 19001,
    coin: 'XNA'
  },
  TESTNET: {
    name: 'xna-test',
    displayName: 'Neurai Testnet',
    addressPrefix: 't',
    assetNameMaxLength: 32,  // Same as mainnet
    defaultRPCPort: 19101,
    coin: 'TXNA'
  }
};

/**
 * Asset naming rules (same for all networks)
 */
const ASSET_NAME_RULES = {
  ROOT: {
    minLength: 3,
    maxLength: 30,
    pattern: /^[A-Z0-9_.]+$/,
    cannotStartWith: ['.', 'A', 'Z'],
    reserved: ['XNA', 'NEURAI']
  },
  SUB: {
    minLength: 1,
    maxLength: 30,
    pattern: /^[A-Z0-9_.]+$/,
    separator: '/',
    maxDepth: 1  // Only one level of sub-assets
  },
  UNIQUE: {
    minLength: 1,
    maxLength: 30,
    pattern: /^[A-Z0-9_.]+$/,
    separator: '#'
  },
  QUALIFIER: {
    minLength: 3,
    maxLength: 30,
    pattern: /^[A-Z0-9_]+$/,
    prefix: '#',
    separator: '/'
  },
  RESTRICTED: {
    minLength: 3,
    maxLength: 30,
    pattern: /^[A-Z0-9_.]+$/,
    prefix: '$'
  }
};

/**
 * Asset quantity limits
 */
const ASSET_LIMITS = {
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 21000000000,  // 21 billion (same as Bitcoin's 21M with 3 extra decimals)
  MIN_UNITS: 0,
  MAX_UNITS: 8,
  OWNER_TOKEN_QUANTITY: 1,    // Owner tokens are always exactly 1
  QUALIFIER_MIN_QUANTITY: 1,
  QUALIFIER_MAX_QUANTITY: 10  // Qualifiers are limited to 1-10 units
};

/**
 * Get network configuration
 * @param {string} networkName - Network name ('xna' or 'xna-test')
 * @returns {object} Network configuration
 */
function getNetworkConfig(networkName) {
  if (networkName === 'xna' || networkName === 'mainnet') {
    return NETWORKS.MAINNET;
  } else if (networkName === 'xna-test' || networkName === 'testnet') {
    return NETWORKS.TESTNET;
  } else {
    throw new Error(`Unknown network: ${networkName}`);
  }
}

/**
 * Detect network from address prefix
 * @param {string} address - Neurai address
 * @returns {string} Network name ('xna' or 'xna-test')
 */
function detectNetworkFromAddress(address) {
  if (address.startsWith('N')) {
    return 'xna';
  } else if (address.startsWith('t')) {
    return 'xna-test';
  } else {
    throw new Error(`Cannot detect network from address: ${address}`);
  }
}

module.exports = {
  NETWORKS,
  ASSET_NAME_RULES,
  ASSET_LIMITS,
  getNetworkConfig,
  detectNetworkFromAddress
};

},{}],19:[function(require,module,exports){
/**
 * Asset-Specific Error Classes
 * Errors related to asset operations
 */

class AssetError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AssetError';
    this.code = 'ASSET_ERROR';
  }
}

class AssetExistsError extends AssetError {
  constructor(message, assetName) {
    super(message);
    this.name = 'AssetExistsError';
    this.code = 'ASSET_EXISTS';
    this.assetName = assetName;
  }
}

class AssetNotFoundError extends AssetError {
  constructor(message, assetName) {
    super(message);
    this.name = 'AssetNotFoundError';
    this.code = 'ASSET_NOT_FOUND';
    this.assetName = assetName;
  }
}

class OwnerTokenNotFoundError extends AssetError {
  constructor(message, ownerTokenName) {
    super(message);
    this.name = 'OwnerTokenNotFoundError';
    this.code = 'OWNER_TOKEN_NOT_FOUND';
    this.ownerTokenName = ownerTokenName;
    this.severity = 'HIGH';
  }
}

class OwnerTokenNotReturnedError extends AssetError {
  constructor(message, ownerTokenName) {
    super(message);
    this.name = 'OwnerTokenNotReturnedError';
    this.code = 'OWNER_TOKEN_NOT_RETURNED';
    this.ownerTokenName = ownerTokenName;
    this.severity = 'CRITICAL';  // This results in permanent loss
  }
}

class AssetNotReissuableError extends AssetError {
  constructor(message, assetName) {
    super(message);
    this.name = 'AssetNotReissuableError';
    this.code = 'ASSET_NOT_REISSUABLE';
    this.assetName = assetName;
  }
}

class InsufficientBurnAmountError extends AssetError {
  constructor(message, required, provided) {
    super(message);
    this.name = 'InsufficientBurnAmountError';
    this.code = 'INSUFFICIENT_BURN_AMOUNT';
    this.required = required;
    this.provided = provided;
  }
}

class InvalidBurnAddressError extends AssetError {
  constructor(message, expectedAddress, providedAddress) {
    super(message);
    this.name = 'InvalidBurnAddressError';
    this.code = 'INVALID_BURN_ADDRESS';
    this.expectedAddress = expectedAddress;
    this.providedAddress = providedAddress;
  }
}

class MaxSupplyExceededError extends AssetError {
  constructor(message, assetName, currentSupply, additionalAmount, maxSupply) {
    super(message);
    this.name = 'MaxSupplyExceededError';
    this.code = 'MAX_SUPPLY_EXCEEDED';
    this.assetName = assetName;
    this.currentSupply = currentSupply;
    this.additionalAmount = additionalAmount;
    this.maxSupply = maxSupply;
  }
}

class RestrictedAssetViolationError extends AssetError {
  constructor(message, assetName, address, reason) {
    super(message);
    this.name = 'RestrictedAssetViolationError';
    this.code = 'RESTRICTED_ASSET_VIOLATION';
    this.assetName = assetName;
    this.address = address;
    this.reason = reason;
  }
}

class QualifierNotFoundError extends AssetError {
  constructor(message, qualifierName) {
    super(message);
    this.name = 'QualifierNotFoundError';
    this.code = 'QUALIFIER_NOT_FOUND';
    this.qualifierName = qualifierName;
  }
}

class ParentAssetNotFoundError extends AssetError {
  constructor(message, parentAssetName) {
    super(message);
    this.name = 'ParentAssetNotFoundError';
    this.code = 'PARENT_ASSET_NOT_FOUND';
    this.parentAssetName = parentAssetName;
  }
}

module.exports = {
  AssetError,
  AssetExistsError,
  AssetNotFoundError,
  OwnerTokenNotFoundError,
  OwnerTokenNotReturnedError,
  AssetNotReissuableError,
  InsufficientBurnAmountError,
  InvalidBurnAddressError,
  MaxSupplyExceededError,
  RestrictedAssetViolationError,
  QualifierNotFoundError,
  ParentAssetNotFoundError
};

},{}],20:[function(require,module,exports){
/**
 * Validation Error Classes
 * Errors thrown during parameter validation
 */

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
  }
}

class InvalidAssetNameError extends ValidationError {
  constructor(message, assetName) {
    super(message);
    this.name = 'InvalidAssetNameError';
    this.code = 'INVALID_ASSET_NAME';
    this.assetName = assetName;
  }
}

class InvalidAmountError extends ValidationError {
  constructor(message, amount) {
    super(message);
    this.name = 'InvalidAmountError';
    this.code = 'INVALID_AMOUNT';
    this.amount = amount;
  }
}

class InvalidUnitsError extends ValidationError {
  constructor(message, units) {
    super(message);
    this.name = 'InvalidUnitsError';
    this.code = 'INVALID_UNITS';
    this.units = units;
  }
}

class InvalidVerifierStringError extends ValidationError {
  constructor(message, verifier) {
    super(message);
    this.name = 'InvalidVerifierStringError';
    this.code = 'INVALID_VERIFIER_STRING';
    this.verifier = verifier;
  }
}

class InvalidIPFSHashError extends ValidationError {
  constructor(message, hash) {
    super(message);
    this.name = 'InvalidIPFSHashError';
    this.code = 'INVALID_IPFS_HASH';
    this.ipfsHash = hash;
  }
}

class InvalidAddressError extends ValidationError {
  constructor(message, address) {
    super(message);
    this.name = 'InvalidAddressError';
    this.code = 'INVALID_ADDRESS';
    this.address = address;
  }
}

class InsufficientFundsError extends ValidationError {
  constructor(message, required, available) {
    super(message);
    this.name = 'InsufficientFundsError';
    this.code = 'INSUFFICIENT_FUNDS';
    this.required = required;
    this.available = available;
  }
}

module.exports = {
  ValidationError,
  InvalidAssetNameError,
  InvalidAmountError,
  InvalidUnitsError,
  InvalidVerifierStringError,
  InvalidIPFSHashError,
  InvalidAddressError,
  InsufficientFundsError
};

},{}],21:[function(require,module,exports){
/**
 * Errors Module
 * Exports all error classes
 */

const {
  ValidationError,
  InvalidAssetNameError,
  InvalidAmountError,
  InvalidUnitsError,
  InvalidVerifierStringError,
  InvalidIPFSHashError,
  InvalidAddressError,
  InsufficientFundsError
} = require('./ValidationErrors');

const {
  AssetError,
  AssetExistsError,
  AssetNotFoundError,
  OwnerTokenNotFoundError,
  OwnerTokenNotReturnedError,
  AssetNotReissuableError,
  InsufficientBurnAmountError,
  InvalidBurnAddressError,
  MaxSupplyExceededError,
  RestrictedAssetViolationError,
  QualifierNotFoundError,
  ParentAssetNotFoundError
} = require('./AssetErrors');

module.exports = {
  // Validation Errors
  ValidationError,
  InvalidAssetNameError,
  InvalidAmountError,
  InvalidUnitsError,
  InvalidVerifierStringError,
  InvalidIPFSHashError,
  InvalidAddressError,
  InsufficientFundsError,

  // Asset Errors
  AssetError,
  AssetExistsError,
  AssetNotFoundError,
  OwnerTokenNotFoundError,
  OwnerTokenNotReturnedError,
  AssetNotReissuableError,
  InsufficientBurnAmountError,
  InvalidBurnAddressError,
  MaxSupplyExceededError,
  RestrictedAssetViolationError,
  QualifierNotFoundError,
  ParentAssetNotFoundError
};

},{"./AssetErrors":19,"./ValidationErrors":20}],22:[function(require,module,exports){
/**
 * @neuraiproject/neurai-assets
 * Non-custodial Neurai asset management library
 *
 * Comprehensive asset management library for Neurai blockchain
 * Supports creation, reissuance, transfers, and queries for all asset types:
 * - ROOT assets (standard tokens)
 * - SUB assets (sub-tokens)
 * - UNIQUE assets (NFTs)
 * - QUALIFIER assets (KYC/compliance tags)
 * - RESTRICTED assets (security tokens with compliance)
 *
 * @example
 * const NeuraiAssets = require('@neuraiproject/neurai-assets');
 *
 * // Initialize with RPC function
 * const assets = new NeuraiAssets(rpc, {
 *   network: 'xna',
 *   addresses: walletAddresses,
 *   changeAddress: myChangeAddress,
 *   toAddress: myReceivingAddress
 * });
 *
 * // Create a ROOT asset
 * const result = await assets.createRootAsset({
 *   assetName: 'MYTOKEN',
 *   quantity: 1000000,
 *   units: 2,
 *   reissuable: true
 * });
 *
 * // Sign and broadcast
 * const signedTx = await wallet.signTransaction(result.rawTx);
 * const txid = await wallet.broadcastTransaction(signedTx);
 */

// Main API class
const NeuraiAssets = require('./NeuraiAssets');

// Builders
const builders = require('./builders');

// Queries
const { AssetQueries } = require('./queries');

// Constants
const constants = require('./constants');

// Errors
const errors = require('./errors');

// Validators
const validators = require('./validators');

// Utils
const utils = require('./utils');

// Export main class as default
module.exports = NeuraiAssets;

// Export everything as named exports
module.exports.NeuraiAssets = NeuraiAssets;
module.exports.AssetQueries = AssetQueries;
module.exports.builders = builders;
module.exports.constants = constants;
module.exports.errors = errors;
module.exports.validators = validators;
module.exports.utils = utils;

},{"./NeuraiAssets":2,"./builders":13,"./constants":17,"./errors":21,"./queries":29,"./utils":32,"./validators":37}],23:[function(require,module,exports){
/**
 * Burn Manager
 * Manages burn addresses and amounts for asset operations
 *
 * Each asset operation requires burning XNA to specific addresses.
 * This manager ensures correct burn addresses and amounts are used
 * based on network (mainnet/testnet) and operation type.
 */

const { getBurnAddress, getAssetCost } = require('../constants');
const { InsufficientBurnAmountError, InvalidBurnAddressError } = require('../errors');

class BurnManager {
  /**
   * @param {string} network - Network type ('xna' or 'xna-test')
   */
  constructor(network) {
    if (!network) {
      throw new Error('Network is required');
    }
    this.network = network;
  }

  /**
   * Get burn address for an operation
   * @param {string} operationType - Operation type (e.g., 'ISSUE_ROOT')
   * @returns {string} Burn address for the network
   */
  getBurnAddress(operationType) {
    return getBurnAddress(operationType, this.network);
  }

  /**
   * Get burn amount for an operation
   * @param {string} operationType - Operation type (e.g., 'ISSUE_ROOT')
   * @param {number} multiplier - Multiplier for operations like UNIQUE (default: 1)
   * @returns {number} Burn amount in XNA
   */
  getBurnAmount(operationType, multiplier = 1) {
    const baseCost = getAssetCost(operationType);
    return baseCost * multiplier;
  }

  /**
   * Get burn info (address + amount) for an operation
   * @param {string} operationType - Operation type
   * @param {number} multiplier - Multiplier (default: 1)
   * @returns {object} { address, amount }
   */
  getBurnInfo(operationType, multiplier = 1) {
    return {
      address: this.getBurnAddress(operationType),
      amount: this.getBurnAmount(operationType, multiplier)
    };
  }

  /**
   * Get burn info for ROOT asset issuance
   * @returns {object} { address, amount }
   */
  getIssueRootBurn() {
    return this.getBurnInfo('ISSUE_ROOT');
  }

  /**
   * Get burn info for SUB asset issuance
   * @returns {object} { address, amount }
   */
  getIssueSubBurn() {
    return this.getBurnInfo('ISSUE_SUB');
  }

  /**
   * Get burn info for UNIQUE asset issuance
   * @param {number} count - Number of unique assets to create
   * @returns {object} { address, amount }
   */
  getIssueUniqueBurn(count) {
    return this.getBurnInfo('ISSUE_UNIQUE', count);
  }

  /**
   * Get burn info for QUALIFIER asset issuance
   * @returns {object} { address, amount }
   */
  getIssueQualifierBurn() {
    return this.getBurnInfo('ISSUE_QUALIFIER');
  }

  /**
   * Get burn info for SUB_QUALIFIER asset issuance
   * @returns {object} { address, amount }
   */
  getIssueSubQualifierBurn() {
    return this.getBurnInfo('ISSUE_SUB_QUALIFIER');
  }

  /**
   * Get burn info for RESTRICTED asset issuance
   * @returns {object} { address, amount }
   */
  getIssueRestrictedBurn() {
    return this.getBurnInfo('ISSUE_RESTRICTED');
  }

  /**
   * Get burn info for REISSUE operation
   * @returns {object} { address, amount }
   */
  getReissueBurn() {
    return this.getBurnInfo('REISSUE');
  }

  /**
   * Get burn info for TAG_ADDRESS operation
   * @param {number} addressCount - Number of addresses to tag
   * @returns {object} { address, amount }
   */
  getTagAddressBurn(addressCount) {
    return this.getBurnInfo('TAG_ADDRESS', addressCount);
  }

  /**
   * Get burn info for UNTAG_ADDRESS operation
   * @param {number} addressCount - Number of addresses to untag
   * @returns {object} { address, amount }
   */
  getUntagAddressBurn(addressCount) {
    return this.getBurnInfo('UNTAG_ADDRESS', addressCount);
  }

  /**
   * Validate that burn output is correct
   * @param {object} outputs - Transaction outputs
   * @param {string} operationType - Expected operation type
   * @param {number} multiplier - Expected multiplier (default: 1)
   * @returns {boolean} True if valid
   * @throws {Error} If burn is invalid
   */
  validateBurnOutput(outputs, operationType, multiplier = 1) {
    const expectedBurn = this.getBurnInfo(operationType, multiplier);

    // Check if burn address exists in outputs
    const burnAmount = outputs[expectedBurn.address];
    if (burnAmount === undefined) {
      throw new InvalidBurnAddressError(
        `Expected burn to ${expectedBurn.address} not found in outputs`,
        expectedBurn.address,
        null
      );
    }

    // Check if burn amount is correct
    if (burnAmount !== expectedBurn.amount) {
      throw new InsufficientBurnAmountError(
        `Incorrect burn amount. Expected ${expectedBurn.amount} XNA, got ${burnAmount} XNA`,
        expectedBurn.amount,
        burnAmount
      );
    }

    return true;
  }

  /**
   * Check if an address is a burn address for this network
   * @param {string} address - Address to check
   * @returns {boolean} True if it's a burn address
   */
  isBurnAddress(address) {
    const burnTypes = [
      'ISSUE_ROOT',
      'ISSUE_SUB',
      'ISSUE_UNIQUE',
      'ISSUE_MSGCHANNEL',
      'REISSUE',
      'ISSUE_RESTRICTED',
      'ISSUE_QUALIFIER',
      'ISSUE_SUB_QUALIFIER',
      'TAG_ADDRESS',
      'UNTAG_ADDRESS'
    ];

    for (const type of burnTypes) {
      if (this.getBurnAddress(type) === address) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get operation type from burn address
   * @param {string} address - Burn address
   * @returns {string|null} Operation type or null if not a burn address
   */
  getOperationTypeFromBurnAddress(address) {
    const burnTypes = [
      'ISSUE_ROOT',
      'ISSUE_SUB',
      'ISSUE_UNIQUE',
      'ISSUE_MSGCHANNEL',
      'REISSUE',
      'ISSUE_RESTRICTED',
      'ISSUE_QUALIFIER',
      'ISSUE_SUB_QUALIFIER',
      'TAG_ADDRESS',
      'UNTAG_ADDRESS'
    ];

    for (const type of burnTypes) {
      if (this.getBurnAddress(type) === address) {
        return type;
      }
    }

    return null;
  }
}

module.exports = BurnManager;

},{"../constants":17,"../errors":21}],24:[function(require,module,exports){
/**
 * Output Orderer
 * Orders transaction outputs according to Neurai protocol requirements
 *
 * CRITICAL: Output ordering is mandatory for asset transactions
 *
 * Correct order:
 * 1. All XNA outputs (burn addresses + change) FIRST
 * 2. Owner token change outputs SECOND
 * 3. Asset operations (issue, reissue, transfer, etc.) LAST
 *
 * Incorrect ordering will cause transaction rejection by the network.
 */

const { AssetNameParser } = require('../utils');

class OutputOrderer {
  /**
   * Order outputs according to protocol requirements
   * @param {object|Array} outputs - Unordered outputs object or array of single-key objects
   * @returns {Array} Ordered array of single-key output objects
   */
  order(outputs) {
    // Normalize to array of {address, value} pairs
    let pairs;
    if (Array.isArray(outputs)) {
      pairs = outputs.map(obj => {
        const [address, value] = Object.entries(obj)[0];
        return { address, value };
      });
    } else if (outputs && typeof outputs === 'object') {
      pairs = Object.entries(outputs).map(([address, value]) => ({ address, value }));
    } else {
      throw new Error('Outputs must be an object or array');
    }

    // Categorize
    const xnaOutputs = [];
    const ownerOutputs = [];
    const assetOutputs = [];

    for (const { address, value } of pairs) {
      if (typeof value === 'number') {
        xnaOutputs.push({ address, value });
      } else if (typeof value === 'object') {
        if (value.transfer && this.isOwnerTokenTransfer(value.transfer)) {
          ownerOutputs.push({ address, value });
        } else {
          assetOutputs.push({ address, value });
        }
      }
    }

    // Return ordered array of single-key objects
    return [
      ...xnaOutputs.map(({ address, value }) => ({ [address]: value })),
      ...ownerOutputs.map(({ address, value }) => ({ [address]: value })),
      ...assetOutputs.map(({ address, value }) => ({ [address]: value })),
    ];
  }

  /**
   * Check if a transfer output contains an owner token
   * @param {object} transfer - Transfer object
   * @returns {boolean} True if contains owner token
   */
  isOwnerTokenTransfer(transfer) {
    if (!transfer || typeof transfer !== 'object') {
      return false;
    }

    // Check if any asset name in transfer ends with '!'
    return Object.keys(transfer).some(assetName => {
      return AssetNameParser.isOwnerToken(assetName);
    });
  }

  /**
   * Validate output ordering
   * Ensures outputs are in correct order
   *
   * @param {object} outputs - Outputs to validate
   * @returns {boolean} True if valid
   * @throws {Error} If ordering is invalid
   */
  validateOrdering(outputs) {
    const entries = Array.isArray(outputs)
      ? outputs.map(obj => Object.entries(obj)[0])
      : Object.entries(outputs);
    let currentCategory = 0; // 0 = not started, 1 = XNA, 2 = owner, 3 = assets

    for (const [address, value] of entries) {
      let category;

      if (typeof value === 'number') {
        category = 1; // XNA
      } else if (value.transfer && this.isOwnerTokenTransfer(value.transfer)) {
        category = 2; // Owner token
      } else {
        category = 3; // Asset operation/transfer
      }

      // Check if we're going backwards in category order
      if (category < currentCategory) {
        throw new Error(
          'Invalid output ordering. Outputs must be ordered as: ' +
          '1) XNA outputs, 2) Owner token outputs, 3) Asset operations'
        );
      }

      currentCategory = category;
    }

    return true;
  }

  /**
   * Get output category for debugging
   * @param {*} value - Output value
   * @returns {string} Category name
   */
  getOutputCategory(value) {
    if (typeof value === 'number') {
      return 'XNA';
    } else if (value.transfer && this.isOwnerTokenTransfer(value.transfer)) {
      return 'OWNER_TOKEN';
    } else if (value.transfer) {
      return 'ASSET_TRANSFER';
    } else if (value.issue) {
      return 'ISSUE';
    } else if (value.issue_unique) {
      return 'ISSUE_UNIQUE';
    } else if (value.issue_restricted) {
      return 'ISSUE_RESTRICTED';
    } else if (value.issue_qualifier) {
      return 'ISSUE_QUALIFIER';
    } else if (value.reissue) {
      return 'REISSUE';
    } else if (value.reissue_restricted) {
      return 'REISSUE_RESTRICTED';
    } else if (value.tag_addresses) {
      return 'TAG_ADDRESSES';
    } else if (value.untag_addresses) {
      return 'UNTAG_ADDRESSES';
    } else if (value.freeze_addresses) {
      return 'FREEZE_ADDRESSES';
    } else if (value.unfreeze_addresses) {
      return 'UNFREEZE_ADDRESSES';
    } else if (value.freeze_asset) {
      return 'FREEZE_ASSET';
    } else if (value.unfreeze_asset) {
      return 'UNFREEZE_ASSET';
    } else {
      return 'UNKNOWN';
    }
  }

  /**
   * Debug output ordering
   * Returns detailed information about output categories
   *
   * @param {object} outputs - Outputs to analyze
   * @returns {Array} Array of { address, category, order }
   */
  debugOrdering(outputs) {
    const debug = [];
    const entries = Array.isArray(outputs)
      ? outputs.map(obj => Object.entries(obj)[0])
      : Object.entries(outputs);

    for (const [address, value] of entries) {
      const category = this.getOutputCategory(value);
      let order;

      if (typeof value === 'number') {
        order = 1;
      } else if (value.transfer && this.isOwnerTokenTransfer(value.transfer)) {
        order = 2;
      } else {
        order = 3;
      }

      debug.push({
        address,
        category,
        order,
        value
      });
    }

    return debug;
  }

  /**
   * Merge multiple output objects with proper ordering
   * Useful when building outputs from multiple sources
   *
   * @param {...object} outputObjects - Multiple output objects to merge
   * @returns {object} Merged and ordered outputs
   */
  merge(...outputObjects) {
    const merged = {};

    // Merge all objects
    for (const outputs of outputObjects) {
      if (outputs && typeof outputs === 'object') {
        Object.assign(merged, outputs);
      }
    }

    // Order the merged result
    return this.order(merged);
  }

  /**
   * Add XNA output (convenience method)
   * @param {object} outputs - Existing outputs
   * @param {string} address - Address
   * @param {number} amount - XNA amount
   * @returns {object} Updated outputs (not ordered yet)
   */
  addXNAOutput(outputs, address, amount) {
    return {
      ...outputs,
      [address]: amount
    };
  }

  /**
   * Add owner token output (convenience method)
   * @param {object} outputs - Existing outputs
   * @param {string} address - Address
   * @param {string} ownerTokenName - Owner token name
   * @returns {object} Updated outputs (not ordered yet)
   */
  addOwnerTokenOutput(outputs, address, ownerTokenName) {
    return {
      ...outputs,
      [address]: {
        transfer: {
          [ownerTokenName]: 1.0
        }
      }
    };
  }

  /**
   * Add asset transfer output (convenience method)
   * @param {object} outputs - Existing outputs
   * @param {string} address - Address
   * @param {string} assetName - Asset name
   * @param {number} amount - Amount
   * @returns {object} Updated outputs (not ordered yet)
   */
  addAssetTransferOutput(outputs, address, assetName, amount) {
    return {
      ...outputs,
      [address]: {
        transfer: {
          [assetName]: amount
        }
      }
    };
  }

  /**
   * Add asset operation output (convenience method)
   * @param {object} outputs - Existing outputs
   * @param {string} address - Address
   * @param {object} operation - Operation object (issue, reissue, etc.)
   * @returns {object} Updated outputs (not ordered yet)
   */
  addOperationOutput(outputs, address, operation) {
    return {
      ...outputs,
      [address]: operation
    };
  }
}

module.exports = OutputOrderer;

},{"../utils":32}],25:[function(require,module,exports){
/**
 * Owner Token Manager
 * CRITICAL: Manages owner token UTXOs and ensures they are properly returned
 *
 * Owner tokens (ASSET!) are required for:
 * - Reissuing assets
 * - Creating sub-assets
 * - Managing restricted assets (freeze/unfreeze)
 *
 * WARNING: If an owner token is not included in transaction outputs,
 * it will be PERMANENTLY LOST and the asset can never be reissued or managed.
 */

const { AssetNameParser } = require('../utils');
const {
  OwnerTokenNotFoundError,
  OwnerTokenNotReturnedError,
  AssetError
} = require('../errors');

class OwnerTokenManager {
  /**
   * @param {Function} rpc - RPC function to call Neurai node
   */
  constructor(rpc) {
    if (!rpc || typeof rpc !== 'function') {
      throw new Error('RPC function is required');
    }
    this.rpc = rpc;
  }

  /**
   * Find owner token UTXO in wallet addresses
   * @param {string} ownerTokenName - Owner token name (e.g., 'MYTOKEN!')
   * @param {string[]} addresses - Array of wallet addresses
   * @returns {Promise<object>} Owner token UTXO
   * @throws {OwnerTokenNotFoundError} If owner token not found
   */
  async findOwnerTokenUTXO(ownerTokenName, addresses) {
    if (!ownerTokenName || !ownerTokenName.endsWith('!')) {
      throw new Error('Owner token name must end with !');
    }

    if (!Array.isArray(addresses) || addresses.length === 0) {
      throw new Error('Addresses array is required');
    }

    try {
      // Request UTXOs for the specific owner token via assetName param
      const utxos = await this.rpc('getaddressutxos', [{ addresses, assetName: ownerTokenName }]);

      // Filter for the specific owner token
      const ownerTokenUTXOs = utxos.filter(utxo => utxo.assetName === ownerTokenName);

      if (ownerTokenUTXOs.length === 0) {
        throw new OwnerTokenNotFoundError(
          `Owner token ${ownerTokenName} not found in wallet addresses. ` +
          `You must own the owner token to perform this operation.`,
          ownerTokenName
        );
      }

      // Owner tokens should be indivisible (only 1 UTXO typically)
      // But if split, return the first one found
      return ownerTokenUTXOs[0];
    } catch (error) {
      if (error instanceof OwnerTokenNotFoundError) {
        throw error;
      }

      throw new AssetError(
        `Failed to find owner token ${ownerTokenName}: ${error.message}`
      );
    }
  }

  /**
   * Find owner token UTXO by base asset name
   * @param {string} assetName - Base asset name (without !)
   * @param {string[]} addresses - Array of wallet addresses
   * @returns {Promise<object>} Owner token UTXO
   */
  async findOwnerTokenByAssetName(assetName, addresses) {
    const ownerTokenName = AssetNameParser.getOwnerTokenName(assetName);
    return this.findOwnerTokenUTXO(ownerTokenName, addresses);
  }

  /**
   * Create owner token return output
   * Owner tokens must always be returned to an address or they're lost forever
   *
   * @param {string} ownerTokenName - Owner token name (e.g., 'MYTOKEN!')
   * @param {string} returnAddress - Address to return owner token to
   * @returns {object} Output object for owner token transfer
   */
  createOwnerTokenReturnOutput(ownerTokenName, returnAddress) {
    if (!ownerTokenName || !ownerTokenName.endsWith('!')) {
      throw new Error('Owner token name must end with !');
    }

    if (!returnAddress) {
      throw new Error('Return address is required');
    }

    // Owner tokens are always exactly 1.0
    return {
      [returnAddress]: {
        transfer: {
          [ownerTokenName]: 1.0
        }
      }
    };
  }

  /**
   * Validate that owner token inputs are properly returned in outputs
   * CRITICAL: This prevents permanent loss of owner tokens
   *
   * @param {Array} inputs - Transaction inputs
   * @param {object} outputs - Transaction outputs
   * @returns {boolean} True if valid
   * @throws {OwnerTokenNotReturnedError} If owner token not returned
   */
  validateOwnerTokenReturn(inputs, outputs) {
    // Find all owner token inputs
    const ownerTokenInputs = inputs.filter(input => {
      return input.assetName && input.assetName.endsWith('!');
    });

    // If no owner tokens in inputs, validation passes
    if (ownerTokenInputs.length === 0) {
      return true;
    }

    // Check each owner token is in outputs
    const outputEntries = Array.isArray(outputs)
      ? outputs.map(obj => Object.entries(obj)[0])
      : Object.entries(outputs);

    for (const ownerInput of ownerTokenInputs) {
      const ownerTokenName = ownerInput.assetName;
      let foundInOutputs = false;

      // Check all outputs for owner token
      for (const [address, output] of outputEntries) {
        // Check if output has transfer field
        if (output && typeof output === 'object' && output.transfer) {
          // Check if owner token is in the transfer
          if (output.transfer[ownerTokenName]) {
            foundInOutputs = true;
            break;
          }
        }
      }

      if (!foundInOutputs) {
        throw new OwnerTokenNotReturnedError(
          `CRITICAL: Owner token ${ownerTokenName} is not returned in outputs! ` +
          `This will result in PERMANENT LOSS of the owner token and you will ` +
          `never be able to reissue or manage this asset again. ` +
          `The owner token MUST be included in the transaction outputs.`,
          ownerTokenName
        );
      }
    }

    return true;
  }

  /**
   * Check if wallet owns an owner token
   * @param {string} ownerTokenName - Owner token name (e.g., 'MYTOKEN!')
   * @param {string[]} addresses - Array of wallet addresses
   * @returns {Promise<boolean>} True if wallet owns the owner token
   */
  async hasOwnerToken(ownerTokenName, addresses) {
    try {
      await this.findOwnerTokenUTXO(ownerTokenName, addresses);
      return true;
    } catch (error) {
      if (error instanceof OwnerTokenNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get all owner tokens in wallet
   * @param {string[]} addresses - Array of wallet addresses
   * @returns {Promise<Array>} Array of owner token UTXOs
   */
  async getAllOwnerTokens(addresses) {
    if (!Array.isArray(addresses) || addresses.length === 0) {
      throw new Error('Addresses array is required');
    }

    try {
      // Request all asset UTXOs with assetName='*'
      const utxos = await this.rpc('getaddressutxos', [{ addresses, assetName: '*' }]);

      // Filter for owner tokens (asset names ending with !)
      const ownerTokenUTXOs = utxos.filter(utxo => {
        return utxo.assetName && utxo.assetName.endsWith('!');
      });

      return ownerTokenUTXOs;
    } catch (error) {
      throw new AssetError(
        `Failed to get owner tokens: ${error.message}`
      );
    }
  }

  /**
   * Verify owner token quantity is correct (always 1)
   * @param {object} ownerTokenUTXO - Owner token UTXO
   * @returns {boolean} True if valid
   * @throws {Error} If quantity is not 1
   */
  validateOwnerTokenQuantity(ownerTokenUTXO) {
    // Owner tokens should always have satoshis = 100000000 (1.0 with 8 decimals)
    const expectedSatoshis = 100000000;

    if (ownerTokenUTXO.satoshis !== expectedSatoshis) {
      throw new Error(
        `Invalid owner token quantity. Expected ${expectedSatoshis} satoshis, ` +
        `got ${ownerTokenUTXO.satoshis}. Owner tokens must always be exactly 1.0`
      );
    }

    return true;
  }

  /**
   * Add owner token input and output to transaction
   * Convenience method that handles both finding and returning owner token
   *
   * @param {string} assetName - Base asset name (without !)
   * @param {string[]} addresses - Wallet addresses
   * @param {string} returnAddress - Address to return owner token to
   * @returns {Promise<object>} { input, output }
   */
  async prepareOwnerTokenForTransaction(assetName, addresses, returnAddress) {
    // Find owner token UTXO
    const ownerTokenUTXO = await this.findOwnerTokenByAssetName(assetName, addresses);

    // Validate quantity
    this.validateOwnerTokenQuantity(ownerTokenUTXO);

    // Create input
    const input = {
      txid: ownerTokenUTXO.txid,
      vout: ownerTokenUTXO.outputIndex,
      address: ownerTokenUTXO.address,
      assetName: ownerTokenUTXO.assetName,
      satoshis: ownerTokenUTXO.satoshis
    };

    // Create output
    const output = this.createOwnerTokenReturnOutput(
      ownerTokenUTXO.assetName,
      returnAddress
    );

    return { input, output, utxo: ownerTokenUTXO };
  }
}

module.exports = OwnerTokenManager;

},{"../errors":21,"../utils":32}],26:[function(require,module,exports){
/**
 * UTXO Selector
 * Selects appropriate UTXOs for asset transactions
 *
 * Handles selection of:
 * - Base currency (XNA) UTXOs for fees and burns
 * - Asset UTXOs for transfers and operations
 * - Mempool filtering to prevent double-spending
 */

const { InsufficientFundsError } = require('../errors');

class UTXOSelector {
  /**
   * @param {Function} rpc - RPC function to call Neurai node
   */
  constructor(rpc) {
    if (!rpc || typeof rpc !== 'function') {
      throw new Error('RPC function is required');
    }
    this.rpc = rpc;
  }

  /**
   * Get all UTXOs for addresses
   * @param {string[]} addresses - Array of wallet addresses
   * @param {string|null} assetName - Filter by asset name (null for XNA)
   * @returns {Promise<Array>} Array of UTXOs
   */
  async getUTXOs(addresses, assetName = null) {
    if (!Array.isArray(addresses) || addresses.length === 0) {
      throw new Error('Addresses array is required');
    }

    try {
      // assetName goes inside the params object; omit it for XNA UTXOs
      const queryParams = assetName ? { addresses, assetName } : { addresses };
      const utxos = await this.rpc('getaddressutxos', [queryParams]);

      // Filter for specific asset or XNA
      if (assetName) {
        return utxos.filter(utxo => utxo.assetName === assetName);
      } else {
        // XNA UTXOs don't have assetName or have assetName === 'XNA'
        return utxos.filter(utxo => !utxo.assetName || utxo.assetName === 'XNA');
      }
    } catch (error) {
      throw new Error(`Failed to get UTXOs: ${error.message}`);
    }
  }

  /**
   * Get mempool entries for addresses
   * Used to filter out UTXOs that are already being spent
   * @param {string[]} addresses - Array of wallet addresses
   * @returns {Promise<Array>} Array of mempool entries
   */
  async getMempoolEntries(addresses) {
    if (!Array.isArray(addresses) || addresses.length === 0) {
      throw new Error('Addresses array is required');
    }

    try {
      const mempool = await this.rpc('getaddressmempool', [{ addresses }]);
      return mempool || [];
    } catch (error) {
      // If RPC method not available, return empty array
      return [];
    }
  }

  /**
   * Filter out UTXOs that are being spent in mempool
   * @param {Array} utxos - Array of UTXOs
   * @param {Array} mempoolEntries - Array of mempool entries
   * @returns {Array} Filtered UTXOs
   */
  filterMempoolSpentUTXOs(utxos, mempoolEntries) {
    if (mempoolEntries.length === 0) {
      return utxos;
    }

    return utxos.filter(utxo => {
      // Check if this UTXO is being spent in mempool
      const isSpent = mempoolEntries.some(entry => {
        return entry.prevtxid === utxo.txid && entry.prevout === utxo.outputIndex;
      });

      return !isSpent;
    });
  }

  /**
   * Select UTXOs for base currency (XNA)
   * Uses greedy algorithm: selects UTXOs until sum >= required amount
   *
   * @param {string[]} addresses - Wallet addresses
   * @param {number} requiredAmount - Required amount in XNA
   * @param {number} buffer - Safety buffer percentage (default: 0.1 = 10%)
   * @returns {Promise<object>} { utxos, totalAmount }
   * @throws {InsufficientFundsError} If not enough funds
   */
  async selectBaseCurrencyUTXOs(addresses, requiredAmount, buffer = 0.1) {
    // Get all XNA UTXOs
    const allUTXOs = await this.getUTXOs(addresses, null);

    // Get mempool and filter
    const mempool = await this.getMempoolEntries(addresses);
    const availableUTXOs = this.filterMempoolSpentUTXOs(allUTXOs, mempool);

    // Sort by value (largest first) for efficiency
    const sortedUTXOs = availableUTXOs.sort((a, b) => b.satoshis - a.satoshis);

    // Add buffer to required amount
    const requiredWithBuffer = requiredAmount * (1 + buffer);

    // Select UTXOs greedily
    const selected = [];
    let totalSatoshis = 0;
    const requiredSatoshis = Math.ceil(requiredWithBuffer * 100000000); // Convert XNA to satoshis

    for (const utxo of sortedUTXOs) {
      selected.push(utxo);
      totalSatoshis += utxo.satoshis;

      if (totalSatoshis >= requiredSatoshis) {
        break;
      }
    }

    // Check if we have enough
    if (totalSatoshis < requiredSatoshis) {
      const available = totalSatoshis / 100000000;
      throw new InsufficientFundsError(
        `Insufficient XNA balance. Required: ${requiredAmount.toFixed(8)} XNA (+ ${(buffer * 100).toFixed(0)}% buffer), ` +
        `Available: ${available.toFixed(8)} XNA`,
        requiredAmount,
        available
      );
    }

    return {
      utxos: selected,
      totalAmount: totalSatoshis / 100000000
    };
  }

  /**
   * Select UTXOs for asset transfer
   * @param {string[]} addresses - Wallet addresses
   * @param {string} assetName - Asset name
   * @param {number} requiredAmount - Required amount (in asset units)
   * @returns {Promise<object>} { utxos, totalAmount }
   * @throws {InsufficientFundsError} If not enough asset balance
   */
  async selectAssetUTXOs(addresses, assetName, requiredAmount) {
    if (!assetName) {
      throw new Error('Asset name is required');
    }

    // Get all asset UTXOs
    const allUTXOs = await this.getUTXOs(addresses, assetName);

    // Get mempool and filter
    const mempool = await this.getMempoolEntries(addresses);
    const availableUTXOs = this.filterMempoolSpentUTXOs(allUTXOs, mempool);

    // Sort by value (largest first)
    const sortedUTXOs = availableUTXOs.sort((a, b) => b.satoshis - a.satoshis);

    // Select UTXOs greedily
    const selected = [];
    let totalSatoshis = 0;
    const requiredSatoshis = Math.ceil(requiredAmount * 100000000); // Assuming 8 decimals

    for (const utxo of sortedUTXOs) {
      selected.push(utxo);
      totalSatoshis += utxo.satoshis;

      if (totalSatoshis >= requiredSatoshis) {
        break;
      }
    }

    // Check if we have enough
    if (totalSatoshis < requiredSatoshis) {
      const available = totalSatoshis / 100000000;
      throw new InsufficientFundsError(
        `Insufficient ${assetName} balance. Required: ${requiredAmount}, Available: ${available}`,
        requiredAmount,
        available
      );
    }

    return {
      utxos: selected,
      totalAmount: totalSatoshis / 100000000
    };
  }

  /**
   * Select UTXOs for a transaction requiring both XNA and assets
   * @param {string[]} addresses - Wallet addresses
   * @param {number} xnaAmount - Required XNA amount
   * @param {string|null} assetName - Asset name (null if not needed)
   * @param {number} assetAmount - Required asset amount
   * @returns {Promise<object>} { xnaUTXOs, assetUTXOs, totalXNA, totalAsset }
   */
  async selectMixedUTXOs(addresses, xnaAmount, assetName = null, assetAmount = 0) {
    const result = {
      xnaUTXOs: [],
      assetUTXOs: [],
      totalXNA: 0,
      totalAsset: 0
    };

    // Select XNA UTXOs if needed
    if (xnaAmount > 0) {
      const xnaSelection = await this.selectBaseCurrencyUTXOs(addresses, xnaAmount);
      result.xnaUTXOs = xnaSelection.utxos;
      result.totalXNA = xnaSelection.totalAmount;
    }

    // Select asset UTXOs if needed
    if (assetName && assetAmount > 0) {
      const assetSelection = await this.selectAssetUTXOs(addresses, assetName, assetAmount);
      result.assetUTXOs = assetSelection.utxos;
      result.totalAsset = assetSelection.totalAmount;
    }

    return result;
  }

  /**
   * Get total balance for an asset
   * @param {string[]} addresses - Wallet addresses
   * @param {string|null} assetName - Asset name (null for XNA)
   * @returns {Promise<number>} Total balance
   */
  async getBalance(addresses, assetName = null) {
    const utxos = await this.getUTXOs(addresses, assetName);
    const mempool = await this.getMempoolEntries(addresses);
    const availableUTXOs = this.filterMempoolSpentUTXOs(utxos, mempool);

    const totalSatoshis = availableUTXOs.reduce((sum, utxo) => sum + utxo.satoshis, 0);
    return totalSatoshis / 100000000;
  }

  /**
   * Estimate transaction size in bytes
   * Used for fee calculation
   *
   * @param {number} inputCount - Number of inputs
   * @param {number} outputCount - Number of outputs
   * @returns {number} Estimated size in bytes
   */
  estimateTransactionSize(inputCount, outputCount) {
    // Rough estimation:
    // - Each input: ~180 bytes
    // - Each output: ~34 bytes
    // - Transaction overhead: ~10 bytes
    const inputSize = inputCount * 180;
    const outputSize = outputCount * 34;
    const overhead = 10;

    return inputSize + outputSize + overhead;
  }

  /**
   * Estimate fee for a transaction
   * @param {number} inputCount - Number of inputs
   * @param {number} outputCount - Number of outputs
   * @param {number} feeRate - Fee rate in XNA per KB (default: 0.015)
   * @returns {number} Estimated fee in XNA
   */
  estimateFee(inputCount, outputCount, feeRate = 0.015) {
    const sizeBytes = this.estimateTransactionSize(inputCount, outputCount);
    const sizeKB = sizeBytes / 1000;
    const fee = sizeKB * feeRate;

    // Round up to 8 decimals
    return Math.ceil(fee * 100000000) / 100000000;
  }

  /**
   * Get fee rate from network
   * @param {number} confirmationTarget - Target confirmations (default: 20)
   * @returns {Promise<number>} Fee rate in XNA per KB
   */
  async getFeeRate(confirmationTarget = 20) {
    try {
      const result = await this.rpc('estimatesmartfee', [confirmationTarget]);

      if (result && result.feerate && result.feerate > 0) {
        return result.feerate;
      }

      // Fallback to default
      return 0.015;
    } catch (error) {
      // Fallback to default if estimation fails
      return 0.015;
    }
  }
}

module.exports = UTXOSelector;

},{"../errors":21}],27:[function(require,module,exports){
/**
 * Managers Module
 * Exports all manager classes
 */

const BurnManager = require('./BurnManager');
const OwnerTokenManager = require('./OwnerTokenManager');
const UTXOSelector = require('./UTXOSelector');
const OutputOrderer = require('./OutputOrderer');

module.exports = {
  BurnManager,
  OwnerTokenManager,
  UTXOSelector,
  OutputOrderer
};

},{"./BurnManager":23,"./OutputOrderer":24,"./OwnerTokenManager":25,"./UTXOSelector":26}],28:[function(require,module,exports){
/**
 * Asset Queries
 * Wrapper methods for querying asset information from the blockchain
 *
 * Provides convenient access to all asset-related RPC query methods:
 * - Asset metadata (getassetdata)
 * - Asset listings (listassets, listmyassets)
 * - Holder information (listaddressesbyasset)
 * - Balance queries (listassetbalancesbyaddress)
 * - Qualifier checks (checkaddresstag, listtagsforaddress)
 * - Restriction checks (checkaddressrestriction, checkglobalrestriction)
 * - Verifier validation (isvalidverifierstring)
 */

const { AssetNotFoundError, InvalidAddressError } = require('../errors');

class AssetQueries {
  /**
   * @param {Function} rpc - RPC function to call Neurai node
   */
  constructor(rpc) {
    if (!rpc || typeof rpc !== 'function') {
      throw new Error('RPC function is required');
    }
    this.rpc = rpc;
  }

  /**
   * Get asset metadata
   * @param {string} assetName - Asset name
   * @returns {Promise<object>} Asset data
   * @throws {AssetNotFoundError} If asset doesn't exist
   */
  async getAssetData(assetName) {
    if (!assetName) {
      throw new Error('Asset name is required');
    }

    try {
      const assetData = await this.rpc('getassetdata', [assetName]);

      if (!assetData) {
        throw new AssetNotFoundError(
          `Asset ${assetName} not found on blockchain`,
          assetName
        );
      }

      return assetData;
    } catch (error) {
      if (error instanceof AssetNotFoundError) {
        throw error;
      }

      // RPC error - likely asset doesn't exist
      if (error.message && error.message.includes('not found')) {
        throw new AssetNotFoundError(
          `Asset ${assetName} not found on blockchain`,
          assetName
        );
      }

      throw new Error(`Failed to get asset data: ${error.message}`);
    }
  }

  /**
   * List all assets on the blockchain
   * @param {string} filter - Filter pattern (e.g., 'MY*' for all assets starting with MY)
   * @param {boolean} verbose - Include detailed information
   * @param {number} count - Maximum number to return
   * @param {number} start - Starting index (for pagination)
   * @returns {Promise<Array|object>} Array of asset names or detailed objects
   */
  async listAssets(filter = '*', verbose = false, count = 100, start = 0) {
    try {
      const assets = await this.rpc('listassets', [filter, verbose, count, start]);
      return assets || [];
    } catch (error) {
      throw new Error(`Failed to list assets: ${error.message}`);
    }
  }

  /**
   * List assets owned by wallet
   * @param {string} assetName - Filter by asset name (default: '*' for all)
   * @param {boolean} verbose - Include detailed information
   * @param {number} count - Maximum number to return
   * @param {number} start - Starting index (for pagination)
   * @param {number} confs - Minimum confirmations (default: 1)
   * @returns {Promise<object>} Object with asset names as keys and amounts as values
   */
  async listMyAssets(assetName = '*', verbose = false, count = 100, start = 0, confs = 1) {
    try {
      const myAssets = await this.rpc('listmyassets', [assetName, verbose, count, start, confs]);
      return myAssets || {};
    } catch (error) {
      throw new Error(`Failed to list my assets: ${error.message}`);
    }
  }

  /**
   * List all addresses holding a specific asset
   * @param {string} assetName - Asset name
   * @param {boolean} onlyCount - Return only count instead of full list
   * @param {number} count - Maximum number to return
   * @param {number} start - Starting index (for pagination)
   * @returns {Promise<Array|number>} Array of {address, amount} or count
   */
  async listAddressesByAsset(assetName, onlyCount = false, count = 100, start = 0) {
    if (!assetName) {
      throw new Error('Asset name is required');
    }

    try {
      const result = await this.rpc('listaddressesbyasset', [assetName, onlyCount, count, start]);
      return result || (onlyCount ? 0 : []);
    } catch (error) {
      if (error.message && error.message.includes('not found')) {
        throw new AssetNotFoundError(
          `Asset ${assetName} not found on blockchain`,
          assetName
        );
      }
      throw new Error(`Failed to list addresses by asset: ${error.message}`);
    }
  }

  /**
   * List asset balances for a specific address
   * @param {string} address - Address to query
   * @param {boolean} onlyTotal - Return only count instead of full list
   * @param {number} count - Maximum number to return
   * @param {number} start - Starting index (for pagination)
   * @returns {Promise<Array|number>} Array of {asset, amount} or count
   */
  async listAssetBalancesByAddress(address, onlyTotal = false, count = 100, start = 0) {
    if (!address) {
      throw new Error('Address is required');
    }

    try {
      const result = await this.rpc('listassetbalancesbyaddress', [address, onlyTotal, count, start]);
      return result || (onlyTotal ? 0 : []);
    } catch (error) {
      throw new Error(`Failed to list asset balances by address: ${error.message}`);
    }
  }

  /**
   * Check if an address has a specific qualifier tag
   * @param {string} address - Address to check
   * @param {string} qualifierName - Qualifier name (e.g., '#KYC_VERIFIED')
   * @returns {Promise<boolean>} True if address has the tag
   */
  async checkAddressTag(address, qualifierName) {
    if (!address) {
      throw new Error('Address is required');
    }

    if (!qualifierName) {
      throw new Error('Qualifier name is required');
    }

    try {
      const result = await this.rpc('checkaddresstag', [address, qualifierName]);
      return result === true || result === 1;
    } catch (error) {
      // If tag doesn't exist or address doesn't have it, return false
      if (error.message && (error.message.includes('not found') || error.message.includes('does not have'))) {
        return false;
      }
      throw new Error(`Failed to check address tag: ${error.message}`);
    }
  }

  /**
   * List all qualifiers assigned to an address
   * @param {string} address - Address to query
   * @returns {Promise<Array>} Array of qualifier names
   */
  async listTagsForAddress(address) {
    if (!address) {
      throw new Error('Address is required');
    }

    try {
      const tags = await this.rpc('listtagsforaddress', [address]);
      return tags || [];
    } catch (error) {
      // If no tags found, return empty array
      if (error.message && error.message.includes('not found')) {
        return [];
      }
      throw new Error(`Failed to list tags for address: ${error.message}`);
    }
  }

  /**
   * List all addresses with a specific qualifier tag
   * @param {string} qualifierName - Qualifier name
   * @returns {Promise<Array>} Array of addresses
   */
  async listAddressesForTag(qualifierName) {
    if (!qualifierName) {
      throw new Error('Qualifier name is required');
    }

    try {
      const addresses = await this.rpc('listaddressesfortag', [qualifierName]);
      return addresses || [];
    } catch (error) {
      if (error.message && error.message.includes('not found')) {
        throw new AssetNotFoundError(
          `Qualifier ${qualifierName} not found on blockchain`,
          qualifierName
        );
      }
      throw new Error(`Failed to list addresses for tag: ${error.message}`);
    }
  }

  /**
   * Check if an address can hold a restricted asset
   * @param {string} address - Address to check
   * @param {string} restrictedAssetName - Restricted asset name (e.g., '$SECURITY')
   * @returns {Promise<boolean>} True if address meets verifier requirements
   */
  async checkAddressRestriction(address, restrictedAssetName) {
    if (!address) {
      throw new Error('Address is required');
    }

    if (!restrictedAssetName) {
      throw new Error('Restricted asset name is required');
    }

    try {
      const result = await this.rpc('checkaddressrestriction', [address, restrictedAssetName]);
      return result === true || result === 1;
    } catch (error) {
      // If address doesn't meet requirements, return false
      if (error.message && (error.message.includes('not found') || error.message.includes('does not meet'))) {
        return false;
      }
      throw new Error(`Failed to check address restriction: ${error.message}`);
    }
  }

  /**
   * Check if an address is frozen for a restricted asset
   * @param {string} address - Address to check
   * @param {string} restrictedAssetName - Restricted asset name
   * @returns {Promise<boolean>} True if address is frozen
   */
  async isAddressFrozen(address, restrictedAssetName) {
    if (!address) {
      throw new Error('Address is required');
    }

    if (!restrictedAssetName) {
      throw new Error('Restricted asset name is required');
    }

    try {
      const result = await this.rpc('checkaddressrestriction', [address, restrictedAssetName]);
      // If result has frozen property, check it
      if (typeof result === 'object' && result.frozen !== undefined) {
        return result.frozen === true || result.frozen === 1;
      }
      return false;
    } catch (error) {
      throw new Error(`Failed to check if address is frozen: ${error.message}`);
    }
  }

  /**
   * Check if an asset is globally frozen
   * @param {string} restrictedAssetName - Restricted asset name
   * @returns {Promise<boolean>} True if asset is globally frozen
   */
  async checkGlobalRestriction(restrictedAssetName) {
    if (!restrictedAssetName) {
      throw new Error('Restricted asset name is required');
    }

    try {
      const result = await this.rpc('checkglobalrestriction', [restrictedAssetName]);
      return result === true || result === 1;
    } catch (error) {
      if (error.message && error.message.includes('not found')) {
        throw new AssetNotFoundError(
          `Restricted asset ${restrictedAssetName} not found on blockchain`,
          restrictedAssetName
        );
      }
      throw new Error(`Failed to check global restriction: ${error.message}`);
    }
  }

  /**
   * Get verifier string for a restricted asset
   * @param {string} restrictedAssetName - Restricted asset name
   * @returns {Promise<string>} Verifier string
   */
  async getVerifierString(restrictedAssetName) {
    if (!restrictedAssetName) {
      throw new Error('Restricted asset name is required');
    }

    try {
      const result = await this.rpc('getverifierstring', [restrictedAssetName]);
      return result || '';
    } catch (error) {
      if (error.message && error.message.includes('not found')) {
        throw new AssetNotFoundError(
          `Restricted asset ${restrictedAssetName} not found on blockchain`,
          restrictedAssetName
        );
      }
      throw new Error(`Failed to get verifier string: ${error.message}`);
    }
  }

  /**
   * Validate verifier string syntax
   * @param {string} verifierString - Verifier string to validate
   * @returns {Promise<boolean>} True if valid
   */
  async isValidVerifierString(verifierString) {
    if (!verifierString) {
      throw new Error('Verifier string is required');
    }

    try {
      const result = await this.rpc('isvalidverifierstring', [verifierString]);
      return result === true || result === 1;
    } catch (error) {
      // If validation fails, return false
      return false;
    }
  }

  /**
   * Get snapshot of asset ownership at a specific block
   * @param {string} assetName - Asset name
   * @param {number} blockHeight - Block height for snapshot
   * @returns {Promise<object>} Snapshot request result
   */
  async getSnapshotRequest(assetName, blockHeight) {
    if (!assetName) {
      throw new Error('Asset name is required');
    }

    if (!blockHeight || typeof blockHeight !== 'number') {
      throw new Error('Block height must be a number');
    }

    try {
      const result = await this.rpc('getsnapshotrequest', [assetName, blockHeight]);
      return result;
    } catch (error) {
      throw new Error(`Failed to get snapshot request: ${error.message}`);
    }
  }

  /**
   * Cancel a snapshot request
   * @param {string} assetName - Asset name
   * @param {number} blockHeight - Block height of snapshot to cancel
   * @returns {Promise<boolean>} True if cancelled successfully
   */
  async cancelSnapshotRequest(assetName, blockHeight) {
    if (!assetName) {
      throw new Error('Asset name is required');
    }

    if (!blockHeight || typeof blockHeight !== 'number') {
      throw new Error('Block height must be a number');
    }

    try {
      const result = await this.rpc('cancelsnapshotrequest', [assetName, blockHeight]);
      return result === true || result === 1;
    } catch (error) {
      throw new Error(`Failed to cancel snapshot request: ${error.message}`);
    }
  }

  /**
   * Get total count of assets on blockchain
   * @returns {Promise<number>} Total asset count
   */
  async getAssetCount() {
    try {
      // List all assets with count only
      const assets = await this.listAssets('*', false, 1, 0);
      return Array.isArray(assets) ? assets.length : 0;
    } catch (error) {
      throw new Error(`Failed to get asset count: ${error.message}`);
    }
  }

  /**
   * Check if asset exists
   * @param {string} assetName - Asset name
   * @returns {Promise<boolean>} True if asset exists
   */
  async assetExists(assetName) {
    try {
      await this.getAssetData(assetName);
      return true;
    } catch (error) {
      if (error instanceof AssetNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get asset type from name
   * @param {string} assetName - Asset name
   * @returns {string} Asset type ('ROOT', 'SUB', 'UNIQUE', 'QUALIFIER', 'RESTRICTED', 'OWNER')
   */
  getAssetType(assetName) {
    if (!assetName) {
      throw new Error('Asset name is required');
    }

    if (assetName.endsWith('!')) {
      return 'OWNER';
    } else if (assetName.startsWith('#')) {
      return assetName.includes('/') ? 'SUB_QUALIFIER' : 'QUALIFIER';
    } else if (assetName.startsWith('$')) {
      return 'RESTRICTED';
    } else if (assetName.includes('#')) {
      return 'UNIQUE';
    } else if (assetName.includes('/')) {
      return 'SUB';
    } else {
      return 'ROOT';
    }
  }
}

module.exports = AssetQueries;

},{"../errors":21}],29:[function(require,module,exports){
/**
 * Query Module
 * Exports all asset query functionality
 */

const AssetQueries = require('./AssetQueries');

module.exports = {
  AssetQueries
};

},{"./AssetQueries":28}],30:[function(require,module,exports){
/**
 * Amount Converter
 * Converts between user amounts and satoshis (protocol internal format)
 */

class AmountConverter {
  /**
   * Convert user amount to satoshis
   * @param {number} amount - User-friendly amount (e.g., 1.5)
   * @param {number} units - Decimal places (0-8)
   * @returns {number} Amount in satoshis
   */
  static toSatoshis(amount, units) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new Error('Amount must be a valid number');
    }

    if (typeof units !== 'number' || isNaN(units) || units < 0 || units > 8) {
      throw new Error('Units must be a number between 0 and 8');
    }

    // Calculate multiplier
    const multiplier = Math.pow(10, units);

    // Convert to satoshis and round to avoid floating point issues
    const satoshis = Math.round(amount * multiplier);

    return satoshis;
  }

  /**
   * Convert satoshis to user amount
   * @param {number} satoshis - Amount in satoshis
   * @param {number} units - Decimal places (0-8)
   * @returns {number} User-friendly amount
   */
  static fromSatoshis(satoshis, units) {
    if (typeof satoshis !== 'number' || isNaN(satoshis)) {
      throw new Error('Satoshis must be a valid number');
    }

    if (typeof units !== 'number' || isNaN(units) || units < 0 || units > 8) {
      throw new Error('Units must be a number between 0 and 8');
    }

    // Calculate divisor
    const divisor = Math.pow(10, units);

    // Convert to user amount
    const amount = satoshis / divisor;

    return amount;
  }

  /**
   * Format amount with proper decimal places
   * @param {number} amount - Amount to format
   * @param {number} units - Decimal places
   * @returns {string} Formatted amount
   */
  static format(amount, units) {
    if (units === 0) {
      return amount.toString();
    }

    return amount.toFixed(units);
  }

  /**
   * Parse formatted amount string
   * @param {string} formattedAmount - Formatted amount string
   * @returns {number} Parsed amount
   */
  static parse(formattedAmount) {
    const num = parseFloat(formattedAmount);
    if (isNaN(num)) {
      throw new Error('Invalid number format');
    }
    return num;
  }

  /**
   * Get decimal places from amount
   * @param {number} amount - Amount to check
   * @returns {number} Number of decimal places
   */
  static getDecimalPlaces(amount) {
    const match = ('' + amount).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
    if (!match) return 0;
    return Math.max(
      0,
      (match[1] ? match[1].length : 0) - (match[2] ? +match[2] : 0)
    );
  }

  /**
   * Adjust amount to proper units
   * If amount has more decimals than units allow, round it
   * @param {number} amount - Amount to adjust
   * @param {number} units - Target decimal places
   * @returns {number} Adjusted amount
   */
  static adjustToUnits(amount, units) {
    const decimalPlaces = this.getDecimalPlaces(amount);
    if (decimalPlaces <= units) {
      return amount;
    }

    // Round to units decimal places
    const multiplier = Math.pow(10, units);
    return Math.round(amount * multiplier) / multiplier;
  }
}

module.exports = AmountConverter;

},{}],31:[function(require,module,exports){
/**
 * Asset Name Parser
 * Parses and analyzes asset names
 */

const { AssetType } = require('../constants');

class AssetNameParser {
  /**
   * Parse asset name and extract information
   * @param {string} name - Asset name
   * @returns {object} Parsed information
   */
  static parse(name) {
    const isOwner = name.endsWith('!');
    const isRestricted = name.startsWith('$');
    const isQualifier = name.startsWith('#');
    const cleanName = isOwner ? name.slice(0, -1) : name;

    let type;
    let parent = null;
    let subName = null;
    let tag = null;
    let prefix = null;

    if (isQualifier) {
      // QUALIFIER or SUB_QUALIFIER: #NAME or #ROOT/SUB
      if (cleanName.includes('/')) {
        type = AssetType.SUB_QUALIFIER;
        const withoutHash = cleanName.substring(1);
        const parts = withoutHash.split('/');
        parent = '#' + parts[0];
        subName = parts[1];
        prefix = '#';
      } else {
        type = AssetType.QUALIFIER;
        prefix = '#';
      }
    } else if (isRestricted) {
      // RESTRICTED: $NAME
      type = AssetType.RESTRICTED;
      prefix = '$';
    } else if (cleanName.includes('#')) {
      // UNIQUE: ROOT#TAG
      type = AssetType.UNIQUE;
      const parts = cleanName.split('#');
      parent = parts[0];
      tag = parts[1];
    } else if (cleanName.includes('/')) {
      // SUB: ROOT/SUB
      type = AssetType.SUB;
      const parts = cleanName.split('/');
      parent = parts[0];
      subName = parts[1];
    } else {
      // ROOT
      type = AssetType.ROOT;
    }

    // Override type if owner token
    if (isOwner) {
      const baseType = type;
      type = AssetType.OWNER;
      return {
        type,
        baseType,
        parent,
        name: cleanName,
        subName,
        tag,
        prefix,
        isOwner: true,
        isRestricted: cleanName.startsWith('$'),
        isQualifier: false,
        fullName: name,
        baseName: cleanName
      };
    }

    return {
      type,
      parent,
      name: cleanName,
      subName,
      tag,
      prefix,
      isOwner,
      isRestricted,
      isQualifier,
      fullName: name,
      baseName: cleanName
    };
  }

  /**
   * Get asset type from name
   * @param {string} name - Asset name
   * @returns {number} AssetType enum value
   */
  static getType(name) {
    return this.parse(name).type;
  }

  /**
   * Get parent asset name
   * @param {string} name - Asset name
   * @returns {string|null} Parent asset name or null
   */
  static getParent(name) {
    return this.parse(name).parent;
  }

  /**
   * Check if asset is an owner token
   * @param {string} name - Asset name
   * @returns {boolean} True if owner token
   */
  static isOwnerToken(name) {
    return name.endsWith('!');
  }

  /**
   * Get owner token name for an asset
   * @param {string} assetName - Asset name
   * @returns {string} Owner token name (assetName + '!')
   */
  static getOwnerTokenName(assetName) {
    if (this.isOwnerToken(assetName)) {
      return assetName;
    }
    if (this.isRestricted(assetName)) {
      return assetName.slice(1) + '!';
    }
    return assetName + '!';
  }

  /**
   * Get base asset name from owner token
   * @param {string} ownerTokenName - Owner token name (with !)
   * @returns {string} Base asset name (without !)
   */
  static getBaseAssetName(ownerTokenName) {
    if (this.isOwnerToken(ownerTokenName)) {
      return ownerTokenName.slice(0, -1);
    }
    return ownerTokenName;
  }

  /**
   * Check if asset is restricted
   * @param {string} name - Asset name
   * @returns {boolean} True if restricted
   */
  static isRestricted(name) {
    return name.startsWith('$');
  }

  /**
   * Check if asset is a qualifier
   * @param {string} name - Asset name
   * @returns {boolean} True if qualifier
   */
  static isQualifier(name) {
    return name.startsWith('#');
  }

  /**
   * Check if asset is unique (NFT)
   * @param {string} name - Asset name
   * @returns {boolean} True if unique
   */
  static isUnique(name) {
    return name.includes('#') && !name.startsWith('#');
  }

  /**
   * Check if asset is a sub-asset
   * @param {string} name - Asset name
   * @returns {boolean} True if sub-asset
   */
  static isSub(name) {
    return name.includes('/') && !name.startsWith('#');
  }

  /**
   * Build unique asset name
   * @param {string} rootName - Root asset name
   * @param {string} tag - Unique tag
   * @returns {string} Full unique asset name
   */
  static buildUniqueName(rootName, tag) {
    return `${rootName}#${tag}`;
  }

  /**
   * Build sub-asset name
   * @param {string} rootName - Root asset name
   * @param {string} subName - Sub-asset name
   * @returns {string} Full sub-asset name
   */
  static buildSubName(rootName, subName) {
    return `${rootName}/${subName}`;
  }
}

module.exports = AssetNameParser;

},{"../constants":17}],32:[function(require,module,exports){
/**
 * Utils Module
 * Exports all utility classes
 */

const AssetNameParser = require('./assetNameParser');
const AmountConverter = require('./amountConverter');
const NetworkDetector = require('./networkDetector');
const OutputFormatter = require('./outputFormatter');

module.exports = {
  AssetNameParser,
  AmountConverter,
  NetworkDetector,
  OutputFormatter
};

},{"./amountConverter":30,"./assetNameParser":31,"./networkDetector":33,"./outputFormatter":34}],33:[function(require,module,exports){
/**
 * Network Detector
 * Detects network type from various sources
 */

const { NETWORKS } = require('../constants');

class NetworkDetector {
  /**
   * Detect network from RPC client
   * Calls getblockchaininfo to determine network
   * @param {Function} rpc - RPC function
   * @returns {Promise<string>} Network name ('xna' or 'xna-test')
   */
  static async detectFromRPC(rpc) {
    try {
      const blockchainInfo = await rpc('getblockchaininfo', []);

      // Check chain name
      if (blockchainInfo.chain === 'main') {
        return 'xna';
      } else if (blockchainInfo.chain === 'test') {
        return 'xna-test';
      } else if (blockchainInfo.chain === 'regtest') {
        return 'xna-test';  // Treat regtest as testnet
      }

      // Fallback: check if testnet field exists
      if (blockchainInfo.testnet === true) {
        return 'xna-test';
      }

      // Default to mainnet
      return 'xna';
    } catch (error) {
      throw new Error(`Failed to detect network from RPC: ${error.message}`);
    }
  }

  /**
   * Detect network from address
   * @param {string} address - Neurai address
   * @returns {string} Network name ('xna' or 'xna-test')
   */
  static detectFromAddress(address) {
    if (!address || typeof address !== 'string') {
      throw new Error('Address must be a non-empty string');
    }

    // Mainnet addresses start with 'N'
    if (address.startsWith(NETWORKS.MAINNET.addressPrefix)) {
      return 'xna';
    }

    // Testnet addresses start with 't' (prefix byte 0x7f = 127)
    if (address.startsWith(NETWORKS.TESTNET.addressPrefix)) {
      return 'xna-test';
    }

    throw new Error(`Cannot detect network from address: ${address}`);
  }

  /**
   * Detect network from multiple addresses
   * @param {string[]} addresses - Array of addresses
   * @returns {string} Network name ('xna' or 'xna-test')
   */
  static detectFromAddresses(addresses) {
    if (!Array.isArray(addresses) || addresses.length === 0) {
      throw new Error('Addresses must be a non-empty array');
    }

    // Detect from first address
    const network = this.detectFromAddress(addresses[0]);

    // Verify all addresses are from the same network
    for (let i = 1; i < addresses.length; i++) {
      const otherNetwork = this.detectFromAddress(addresses[i]);
      if (otherNetwork !== network) {
        throw new Error(`Mixed network addresses detected: ${network} and ${otherNetwork}`);
      }
    }

    return network;
  }

  /**
   * Validate that addresses match expected network
   * @param {string[]} addresses - Array of addresses
   * @param {string} expectedNetwork - Expected network ('xna' or 'xna-test')
   * @returns {boolean} True if all addresses match network
   */
  static validateAddressesNetwork(addresses, expectedNetwork) {
    if (!Array.isArray(addresses) || addresses.length === 0) {
      throw new Error('Addresses must be a non-empty array');
    }

    for (const address of addresses) {
      const network = this.detectFromAddress(address);
      if (network !== expectedNetwork) {
        throw new Error(
          `Address ${address} is from ${network} but expected ${expectedNetwork}`
        );
      }
    }

    return true;
  }

  /**
   * Get network config from network name
   * @param {string} network - Network name
   * @returns {object} Network configuration
   */
  static getNetworkConfig(network) {
    if (network === 'xna' || network === 'mainnet') {
      return NETWORKS.MAINNET;
    } else if (network === 'xna-test' || network === 'testnet') {
      return NETWORKS.TESTNET;
    } else {
      throw new Error(`Unknown network: ${network}`);
    }
  }

  /**
   * Check if network is mainnet
   * @param {string} network - Network name
   * @returns {boolean} True if mainnet
   */
  static isMainnet(network) {
    return network === 'xna' || network === 'mainnet';
  }

  /**
   * Check if network is testnet
   * @param {string} network - Network name
   * @returns {boolean} True if testnet
   */
  static isTestnet(network) {
    return network === 'xna-test' || network === 'testnet' || network === 'regtest';
  }
}

module.exports = NetworkDetector;

},{"../constants":17}],34:[function(require,module,exports){
/**
 * Output Formatter
 * Formats outputs for createrawtransaction RPC calls
 */

class OutputFormatter {
  /**
   * Format issue operation output
   * @param {object} params - Issue parameters
   * @returns {object} Formatted output for createrawtransaction
   */
  static formatIssueOutput(params) {
    const {
      asset_name,
      asset_quantity,
      units,
      reissuable,
      has_ipfs,
      ipfs_hash
    } = params;

    return {
      issue: {
        asset_name,
        asset_quantity,
        units,
        reissuable: reissuable ? 1 : 0,
        has_ipfs: has_ipfs ? 1 : 0,
        ipfs_hash: ipfs_hash || ''
      }
    };
  }

  /**
   * Format issue unique operation output
   * @param {object} params - Issue unique parameters
   * @returns {object} Formatted output for createrawtransaction
   */
  static formatIssueUniqueOutput(params) {
    const { root_name, asset_tags, ipfs_hashes } = params;

    const output = {
      issue_unique: {
        root_name,
        asset_tags
      }
    };

    if (ipfs_hashes && ipfs_hashes.length > 0) {
      output.issue_unique.ipfs_hashes = ipfs_hashes;
    }

    return output;
  }

  /**
   * Format issue restricted operation output
   * @param {object} params - Issue restricted parameters
   * @returns {object} Formatted output for createrawtransaction
   */
  static formatIssueRestrictedOutput(params) {
    const {
      asset_name,
      asset_quantity,
      verifier_string,
      units,
      reissuable,
      has_ipfs,
      ipfs_hash,
      owner_change_address
    } = params;

    const output = {
      issue_restricted: {
        asset_name,
        asset_quantity,
        verifier_string,
        units,
        reissuable: reissuable ? 1 : 0,
        has_ipfs: has_ipfs ? 1 : 0,
        ipfs_hash: ipfs_hash || ''
      }
    };

    if (owner_change_address) {
      output.issue_restricted.owner_change_address = owner_change_address;
    }

    return output;
  }

  /**
   * Format issue qualifier operation output
   * @param {object} params - Issue qualifier parameters
   * @returns {object} Formatted output for createrawtransaction
   */
  static formatIssueQualifierOutput(params) {
    const {
      asset_name,
      asset_quantity,
      has_ipfs,
      ipfs_hash,
      root_change_address,
      change_quantity
    } = params;

    const output = {
      issue_qualifier: {
        asset_name,
        asset_quantity,
        has_ipfs: has_ipfs ? 1 : 0,
        ipfs_hash: ipfs_hash || ''
      }
    };

    if (root_change_address) {
      output.issue_qualifier.root_change_address = root_change_address;
    }

    if (change_quantity !== undefined && change_quantity !== null) {
      output.issue_qualifier.change_quantity = change_quantity;
    }

    return output;
  }

  /**
   * Format reissue operation output
   * @param {object} params - Reissue parameters
   * @returns {object} Formatted output for createrawtransaction
   */
  static formatReissueOutput(params) {
    const {
      asset_name,
      asset_quantity,
      reissuable,
      new_ipfs,
      owner_change_address
    } = params;

    const output = {
      reissue: {
        asset_name,
        asset_quantity
      }
    };

    // Optional parameters
    if (reissuable !== undefined) {
      output.reissue.reissuable = reissuable ? 1 : 0;
    }

    if (new_ipfs) {
      output.reissue.ipfs_hash = new_ipfs;
    }

    if (owner_change_address) {
      output.reissue.owner_change_address = owner_change_address;
    }

    return output;
  }

  /**
   * Format reissue restricted operation output
   * @param {object} params - Reissue restricted parameters
   * @returns {object} Formatted output for createrawtransaction
   */
  static formatReissueRestrictedOutput(params) {
    const {
      asset_name,
      asset_quantity,
      change_verifier,
      new_verifier,
      reissuable,
      new_ipfs,
      owner_change_address
    } = params;

    const output = {
      reissue_restricted: {
        asset_name,
        asset_quantity
      }
    };

    // Optional parameters
    if (change_verifier && new_verifier) {
      output.reissue_restricted.verifier_string = new_verifier;
    }

    if (reissuable !== undefined) {
      output.reissue_restricted.reissuable = reissuable ? 1 : 0;
    }

    if (new_ipfs) {
      output.reissue_restricted.ipfs_hash = new_ipfs;
    }

    if (owner_change_address) {
      output.reissue_restricted.owner_change_address = owner_change_address;
    }

    return output;
  }

  /**
   * Format asset transfer output
   * @param {string} assetName - Asset name
   * @param {number} amount - Amount to transfer
   * @returns {object} Formatted transfer output
   */
  static formatTransferOutput(assetName, amount) {
    return {
      transfer: {
        [assetName]: amount
      }
    };
  }

  /**
   * Format tag addresses operation output
   * @param {object} params - Tag addresses parameters
   * @returns {object} Formatted output for createrawtransaction
   */
  static formatTagAddressesOutput(params) {
    const {
      qualifier,
      addresses,
      change_quantity
    } = params;

    const output = {
      tag_addresses: {
        qualifier,
        addresses
      }
    };

    if (change_quantity !== undefined && change_quantity !== null) {
      output.tag_addresses.change_quantity = change_quantity;
    }

    return output;
  }

  /**
   * Format untag addresses operation output
   * @param {object} params - Untag addresses parameters
   * @returns {object} Formatted output for createrawtransaction
   */
  static formatUntagAddressesOutput(params) {
    const {
      qualifier,
      addresses,
      change_quantity
    } = params;

    const output = {
      untag_addresses: {
        qualifier,
        addresses
      }
    };

    if (change_quantity !== undefined && change_quantity !== null) {
      output.untag_addresses.change_quantity = change_quantity;
    }

    return output;
  }

  /**
   * Format freeze addresses operation output
   * @param {object} params - Freeze addresses parameters
   * @returns {object} Formatted output for createrawtransaction
   */
  static formatFreezeAddressesOutput(params) {
    const {
      asset_name,
      addresses
    } = params;

    return {
      freeze_addresses: {
        asset_name,
        addresses
      }
    };
  }

  /**
   * Format unfreeze addresses operation output
   * @param {object} params - Unfreeze addresses parameters
   * @returns {object} Formatted output for createrawtransaction
   */
  static formatUnfreezeAddressesOutput(params) {
    const {
      asset_name,
      addresses
    } = params;

    return {
      unfreeze_addresses: {
        asset_name,
        addresses
      }
    };
  }

  /**
   * Format freeze asset operation output
   * @param {string} assetName - Restricted asset name
   * @returns {object} Formatted output for createrawtransaction
   */
  static formatFreezeAssetOutput(assetName) {
    return {
      freeze_asset: {
        asset_name: assetName
      }
    };
  }

  /**
   * Format unfreeze asset operation output
   * @param {string} assetName - Restricted asset name
   * @returns {object} Formatted output for createrawtransaction
   */
  static formatUnfreezeAssetOutput(assetName) {
    return {
      unfreeze_asset: {
        asset_name: assetName
      }
    };
  }
}

module.exports = OutputFormatter;

},{}],35:[function(require,module,exports){
/**
 * Amount Validator
 * Validates asset quantities and units
 */

const { ASSET_LIMITS } = require('../constants');
const { InvalidAmountError, InvalidUnitsError } = require('../errors');

class AmountValidator {
  /**
   * Validate asset quantity
   * @param {number} quantity - Asset quantity
   * @param {number} units - Decimal places (0-8)
   */
  static validate(quantity, units = 0) {
    // Validate quantity is a number
    if (typeof quantity !== 'number' || isNaN(quantity)) {
      throw new InvalidAmountError('Quantity must be a valid number', quantity);
    }

    // Validate quantity is positive
    if (quantity <= 0) {
      throw new InvalidAmountError('Quantity must be greater than 0', quantity);
    }

    // Validate quantity is within limits
    if (quantity < ASSET_LIMITS.MIN_QUANTITY) {
      throw new InvalidAmountError(
        `Quantity must be at least ${ASSET_LIMITS.MIN_QUANTITY}`,
        quantity
      );
    }

    if (quantity > ASSET_LIMITS.MAX_QUANTITY) {
      throw new InvalidAmountError(
        `Quantity cannot exceed ${ASSET_LIMITS.MAX_QUANTITY}`,
        quantity
      );
    }

    // Validate units
    this.validateUnits(units);

    // Validate quantity doesn't have more decimals than units allow
    const decimalPlaces = this.getDecimalPlaces(quantity);
    if (decimalPlaces > units) {
      throw new InvalidAmountError(
        `Quantity has ${decimalPlaces} decimal places but units is ${units}`,
        quantity
      );
    }

    return true;
  }

  /**
   * Validate units (decimal places)
   * @param {number} units - Decimal places (0-8)
   */
  static validateUnits(units) {
    if (typeof units !== 'number' || isNaN(units)) {
      throw new InvalidUnitsError('Units must be a valid number', units);
    }

    if (!Number.isInteger(units)) {
      throw new InvalidUnitsError('Units must be an integer', units);
    }

    if (units < ASSET_LIMITS.MIN_UNITS || units > ASSET_LIMITS.MAX_UNITS) {
      throw new InvalidUnitsError(
        `Units must be between ${ASSET_LIMITS.MIN_UNITS} and ${ASSET_LIMITS.MAX_UNITS}`,
        units
      );
    }

    return true;
  }

  /**
   * Validate qualifier quantity (1-10 only)
   * @param {number} quantity - Qualifier quantity
   */
  static validateQualifierQuantity(quantity) {
    if (typeof quantity !== 'number' || isNaN(quantity)) {
      throw new InvalidAmountError('Qualifier quantity must be a valid number', quantity);
    }

    if (!Number.isInteger(quantity)) {
      throw new InvalidAmountError('Qualifier quantity must be an integer', quantity);
    }

    if (quantity < ASSET_LIMITS.QUALIFIER_MIN_QUANTITY || quantity > ASSET_LIMITS.QUALIFIER_MAX_QUANTITY) {
      throw new InvalidAmountError(
        `Qualifier quantity must be between ${ASSET_LIMITS.QUALIFIER_MIN_QUANTITY} and ${ASSET_LIMITS.QUALIFIER_MAX_QUANTITY}`,
        quantity
      );
    }

    return true;
  }

  /**
   * Validate owner token quantity (always 1)
   * @param {number} quantity - Owner token quantity
   */
  static validateOwnerTokenQuantity(quantity) {
    if (quantity !== ASSET_LIMITS.OWNER_TOKEN_QUANTITY) {
      throw new InvalidAmountError(
        `Owner token quantity must be exactly ${ASSET_LIMITS.OWNER_TOKEN_QUANTITY}`,
        quantity
      );
    }

    return true;
  }

  /**
   * Get number of decimal places in a number
   * @param {number} num - Number to check
   * @returns {number} Number of decimal places
   */
  static getDecimalPlaces(num) {
    const match = ('' + num).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
    if (!match) return 0;
    return Math.max(
      0,
      (match[1] ? match[1].length : 0) - (match[2] ? +match[2] : 0)
    );
  }

  /**
   * Validate that sum of amounts doesn't exceed max
   * @param {number} current - Current amount
   * @param {number} additional - Additional amount
   * @returns {boolean} True if sum is valid
   */
  static validateSum(current, additional) {
    if (current + additional > ASSET_LIMITS.MAX_QUANTITY) {
      throw new InvalidAmountError(
        `Sum of current (${current}) and additional (${additional}) exceeds maximum ${ASSET_LIMITS.MAX_QUANTITY}`,
        current + additional
      );
    }

    return true;
  }
}

module.exports = AmountValidator;

},{"../constants":17,"../errors":21}],36:[function(require,module,exports){
/**
 * Asset Name Validator
 * Validates asset names according to Neurai protocol rules
 */

const { ASSET_NAME_RULES } = require('../constants');
const { InvalidAssetNameError } = require('../errors');

class AssetNameValidator {
  /**
   * Validate ROOT asset name
   * Rules: 3-30 uppercase characters, A-Z, 0-9, underscore, period
   * Cannot start with period, A, or Z
   * Cannot be reserved names
   */
  static validateRoot(name) {
    if (!name || typeof name !== 'string') {
      throw new InvalidAssetNameError('Asset name must be a non-empty string', name);
    }

    // Length check
    if (name.length < ASSET_NAME_RULES.ROOT.minLength || name.length > ASSET_NAME_RULES.ROOT.maxLength) {
      throw new InvalidAssetNameError(
        `ROOT asset name must be ${ASSET_NAME_RULES.ROOT.minLength}-${ASSET_NAME_RULES.ROOT.maxLength} characters`,
        name
      );
    }

    // Uppercase check
    if (name !== name.toUpperCase()) {
      throw new InvalidAssetNameError('Asset name must be uppercase', name);
    }

    // Starting character check
    if (ASSET_NAME_RULES.ROOT.cannotStartWith.some(char => name.startsWith(char))) {
      throw new InvalidAssetNameError(
        `Asset name cannot start with: ${ASSET_NAME_RULES.ROOT.cannotStartWith.join(', ')}`,
        name
      );
    }

    // Pattern check
    if (!ASSET_NAME_RULES.ROOT.pattern.test(name)) {
      throw new InvalidAssetNameError(
        'Asset name can only contain A-Z, 0-9, underscore, and period',
        name
      );
    }

    // Reserved names check
    if (ASSET_NAME_RULES.ROOT.reserved.includes(name)) {
      throw new InvalidAssetNameError(`${name} is a reserved asset name`, name);
    }

    return true;
  }

  /**
   * Validate SUB asset name
   * Format: ROOT/SUBNAME
   */
  static validateSub(name) {
    if (!name || typeof name !== 'string') {
      throw new InvalidAssetNameError('SUB asset name must be a non-empty string', name);
    }

    const parts = name.split(ASSET_NAME_RULES.SUB.separator);
    if (parts.length !== 2) {
      throw new InvalidAssetNameError(
        `SUB asset must be in ${ASSET_NAME_RULES.SUB.separator} format (ROOT/SUBNAME)`,
        name
      );
    }

    const [rootName, subName] = parts;

    // Validate root part
    this.validateRoot(rootName);

    // Validate sub part
    if (subName.length < ASSET_NAME_RULES.SUB.minLength || subName.length > ASSET_NAME_RULES.SUB.maxLength) {
      throw new InvalidAssetNameError(
        `SUB asset name must be ${ASSET_NAME_RULES.SUB.minLength}-${ASSET_NAME_RULES.SUB.maxLength} characters`,
        name
      );
    }

    if (subName !== subName.toUpperCase()) {
      throw new InvalidAssetNameError('SUB asset name must be uppercase', name);
    }

    if (!ASSET_NAME_RULES.SUB.pattern.test(subName)) {
      throw new InvalidAssetNameError(
        'SUB asset name can only contain A-Z, 0-9, underscore, and period',
        name
      );
    }

    return true;
  }

  /**
   * Validate UNIQUE asset name
   * Format: ROOT#TAG
   */
  static validateUnique(name) {
    if (!name || typeof name !== 'string') {
      throw new InvalidAssetNameError('UNIQUE asset name must be a non-empty string', name);
    }

    const parts = name.split(ASSET_NAME_RULES.UNIQUE.separator);
    if (parts.length !== 2) {
      throw new InvalidAssetNameError(
        `UNIQUE asset must be in ROOT${ASSET_NAME_RULES.UNIQUE.separator}TAG format`,
        name
      );
    }

    const [rootName, tag] = parts;

    // Validate root part
    this.validateRoot(rootName);

    // Validate tag
    if (tag.length < ASSET_NAME_RULES.UNIQUE.minLength || tag.length > ASSET_NAME_RULES.UNIQUE.maxLength) {
      throw new InvalidAssetNameError(
        `UNIQUE tag must be ${ASSET_NAME_RULES.UNIQUE.minLength}-${ASSET_NAME_RULES.UNIQUE.maxLength} characters`,
        name
      );
    }

    if (tag !== tag.toUpperCase()) {
      throw new InvalidAssetNameError('UNIQUE tag must be uppercase', name);
    }

    if (!ASSET_NAME_RULES.UNIQUE.pattern.test(tag)) {
      throw new InvalidAssetNameError(
        'UNIQUE tag can only contain A-Z, 0-9, underscore, and period',
        name
      );
    }

    return true;
  }

  /**
   * Validate QUALIFIER asset name
   * Format: #NAME or #ROOT/SUB
   */
  static validateQualifier(name) {
    if (!name || typeof name !== 'string') {
      throw new InvalidAssetNameError('QUALIFIER asset name must be a non-empty string', name);
    }

    if (!name.startsWith(ASSET_NAME_RULES.QUALIFIER.prefix)) {
      throw new InvalidAssetNameError(
        `QUALIFIER asset must start with ${ASSET_NAME_RULES.QUALIFIER.prefix}`,
        name
      );
    }

    const withoutPrefix = name.substring(1);

    if (withoutPrefix.includes(ASSET_NAME_RULES.QUALIFIER.separator)) {
      // Sub-qualifier: #ROOT/SUB
      const parts = withoutPrefix.split(ASSET_NAME_RULES.QUALIFIER.separator);
      if (parts.length !== 2) {
        throw new InvalidAssetNameError(
          'SUB_QUALIFIER must be in #ROOT/SUB format',
          name
        );
      }

      // Validate each part as a qualifier name (without the #)
      parts.forEach(part => {
        if (part.length < ASSET_NAME_RULES.QUALIFIER.minLength || part.length > ASSET_NAME_RULES.QUALIFIER.maxLength) {
          throw new InvalidAssetNameError(
            `QUALIFIER name must be ${ASSET_NAME_RULES.QUALIFIER.minLength}-${ASSET_NAME_RULES.QUALIFIER.maxLength} characters`,
            name
          );
        }

        if (part !== part.toUpperCase()) {
          throw new InvalidAssetNameError('QUALIFIER name must be uppercase', name);
        }

        if (!ASSET_NAME_RULES.QUALIFIER.pattern.test(part)) {
          throw new InvalidAssetNameError(
            'QUALIFIER name can only contain A-Z, 0-9, and underscore',
            name
          );
        }
      });
    } else {
      // Root qualifier: #NAME
      if (withoutPrefix.length < ASSET_NAME_RULES.QUALIFIER.minLength ||
          withoutPrefix.length > ASSET_NAME_RULES.QUALIFIER.maxLength) {
        throw new InvalidAssetNameError(
          `QUALIFIER name must be ${ASSET_NAME_RULES.QUALIFIER.minLength}-${ASSET_NAME_RULES.QUALIFIER.maxLength} characters`,
          name
        );
      }

      if (withoutPrefix !== withoutPrefix.toUpperCase()) {
        throw new InvalidAssetNameError('QUALIFIER name must be uppercase', name);
      }

      if (!ASSET_NAME_RULES.QUALIFIER.pattern.test(withoutPrefix)) {
        throw new InvalidAssetNameError(
          'QUALIFIER name can only contain A-Z, 0-9, and underscore',
          name
        );
      }
    }

    return true;
  }

  /**
   * Validate RESTRICTED asset name
   * Format: $NAME
   */
  static validateRestricted(name) {
    if (!name || typeof name !== 'string') {
      throw new InvalidAssetNameError('RESTRICTED asset name must be a non-empty string', name);
    }

    if (!name.startsWith(ASSET_NAME_RULES.RESTRICTED.prefix)) {
      throw new InvalidAssetNameError(
        `RESTRICTED asset must start with ${ASSET_NAME_RULES.RESTRICTED.prefix}`,
        name
      );
    }

    const withoutPrefix = name.substring(1);

    // Validate the part after $ as a ROOT asset name
    this.validateRoot(withoutPrefix);

    return true;
  }

  /**
   * Validate owner token name
   * Format: ASSETNAME!
   */
  static validateOwnerToken(name) {
    if (!name || typeof name !== 'string') {
      throw new InvalidAssetNameError('Owner token name must be a non-empty string', name);
    }

    if (!name.endsWith('!')) {
      throw new InvalidAssetNameError('Owner token must end with !', name);
    }

    const assetName = name.substring(0, name.length - 1);

    // Validate the asset name part (could be ROOT or RESTRICTED)
    if (assetName.startsWith('$')) {
      this.validateRestricted(assetName);
    } else {
      this.validateRoot(assetName);
    }

    return true;
  }

  /**
   * Auto-detect asset type and validate
   * @param {string} name - Asset name
   * @returns {string} Asset type ('ROOT', 'SUB', 'UNIQUE', 'QUALIFIER', 'RESTRICTED', 'OWNER')
   */
  static validateAndDetectType(name) {
    if (name.endsWith('!')) {
      this.validateOwnerToken(name);
      return 'OWNER';
    } else if (name.startsWith('#')) {
      this.validateQualifier(name);
      return name.includes('/') ? 'SUB_QUALIFIER' : 'QUALIFIER';
    } else if (name.startsWith('$')) {
      this.validateRestricted(name);
      return 'RESTRICTED';
    } else if (name.includes('#')) {
      this.validateUnique(name);
      return 'UNIQUE';
    } else if (name.includes('/')) {
      this.validateSub(name);
      return 'SUB';
    } else {
      this.validateRoot(name);
      return 'ROOT';
    }
  }
}

module.exports = AssetNameValidator;

},{"../constants":17,"../errors":21}],37:[function(require,module,exports){
/**
 * Validators Module
 * Exports all validator classes
 */

const AssetNameValidator = require('./assetNameValidator');
const AmountValidator = require('./amountValidator');
const VerifierValidator = require('./verifierValidator');
const IpfsValidator = require('./ipfsValidator');

module.exports = {
  AssetNameValidator,
  AmountValidator,
  VerifierValidator,
  IpfsValidator
};

},{"./amountValidator":35,"./assetNameValidator":36,"./ipfsValidator":38,"./verifierValidator":39}],38:[function(require,module,exports){
/**
 * IPFS Hash Validator
 * Validates IPFS CID formats
 */

const { InvalidIPFSHashError } = require('../errors');

class IpfsValidator {
  /**
   * Validate IPFS hash format
   * Accepts:
   * - CIDv0: Qm... (46 characters, base58)
   * - CIDv1: bafy... or bafk... (various lengths, base32)
   * - Neurai TXID: 64 hex characters (for on-chain metadata)
   *
   * @param {string} hash - IPFS hash or TXID
   * @returns {boolean} True if valid
   */
  static validate(hash) {
    if (!hash || typeof hash !== 'string') {
      throw new InvalidIPFSHashError('IPFS hash must be a non-empty string', hash);
    }

    const trimmed = hash.trim();

    // Check maximum length (Neurai allows up to 40 bytes in protocol)
    if (trimmed.length > 80) {
      throw new InvalidIPFSHashError('IPFS hash too long (max 80 characters)', hash);
    }

    // Check if it's a valid format
    const isCIDv0 = this.isCIDv0(trimmed);
    const isCIDv1 = this.isCIDv1(trimmed);
    const isTXID = this.isTXID(trimmed);

    if (!isCIDv0 && !isCIDv1 && !isTXID) {
      throw new InvalidIPFSHashError(
        'Invalid IPFS hash format. Must be CIDv0 (Qm...), CIDv1 (bafy...), or TXID (64 hex chars)',
        hash
      );
    }

    return true;
  }

  /**
   * Check if hash is CIDv0 format
   * @param {string} hash - Hash to check
   * @returns {boolean} True if CIDv0
   */
  static isCIDv0(hash) {
    // CIDv0: Starts with "Qm", 46 characters, base58
    if (!hash.startsWith('Qm')) return false;
    if (hash.length !== 46) return false;

    // Base58 characters: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
    const base58Pattern = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
    return base58Pattern.test(hash);
  }

  /**
   * Check if hash is CIDv1 format
   * @param {string} hash - Hash to check
   * @returns {boolean} True if CIDv1
   */
  static isCIDv1(hash) {
    // CIDv1: Starts with "bafy" or "bafk" (base32), various lengths
    if (!hash.startsWith('bafy') && !hash.startsWith('bafk')) return false;

    // Base32 characters: a-z, 2-7
    const base32Pattern = /^[a-z2-7]+$/;
    return base32Pattern.test(hash);
  }

  /**
   * Check if hash is a transaction ID
   * @param {string} hash - Hash to check
   * @returns {boolean} True if TXID
   */
  static isTXID(hash) {
    // TXID: 64 hexadecimal characters
    if (hash.length !== 64) return false;

    const hexPattern = /^[0-9a-fA-F]+$/;
    return hexPattern.test(hash);
  }

  /**
   * Get IPFS hash type
   * @param {string} hash - IPFS hash
   * @returns {string} Type ('CIDv0', 'CIDv1', 'TXID', or 'UNKNOWN')
   */
  static getHashType(hash) {
    if (this.isCIDv0(hash)) return 'CIDv0';
    if (this.isCIDv1(hash)) return 'CIDv1';
    if (this.isTXID(hash)) return 'TXID';
    return 'UNKNOWN';
  }
}

module.exports = IpfsValidator;

},{"../errors":21}],39:[function(require,module,exports){
/**
 * Verifier String Validator
 * Validates verifier strings for restricted assets
 */

const { InvalidVerifierStringError } = require('../errors');
const AssetNameValidator = require('./assetNameValidator');

class VerifierValidator {
  /**
   * Validate verifier string syntax
   * Verifier syntax: #TAG, !#TAG, &, |, (, )
   * Examples:
   *   "#KYC"
   *   "#KYC & #ACCREDITED"
   *   "#KYC | #INSTITUTION"
   *   "(#KYC & #ACCREDITED) | #INSTITUTION"
   *   "!#BANNED"
   *
   * @param {string} verifierString - Verifier string to validate
   * @returns {boolean} True if valid
   */
  static validate(verifierString) {
    if (!verifierString || typeof verifierString !== 'string') {
      throw new InvalidVerifierStringError(
        'Verifier string must be a non-empty string',
        verifierString
      );
    }

    // Trim whitespace
    const trimmed = verifierString.trim();
    if (trimmed.length === 0) {
      throw new InvalidVerifierStringError(
        'Verifier string cannot be empty',
        verifierString
      );
    }

    // Check for valid characters only
    // Valid: #, A-Z, 0-9, _, &, |, !, (, ), space, /
    const validPattern = /^[#A-Z0-9_&|()\s!/]+$/;
    if (!validPattern.test(trimmed)) {
      throw new InvalidVerifierStringError(
        'Verifier contains invalid characters. Valid: #, A-Z, 0-9, _, &, |, !, (, ), space, /',
        verifierString
      );
    }

    // Extract all qualifiers (tokens starting with # or !#)
    const qualifierMatches = trimmed.match(/!?#[A-Z0-9_/]+/g) || [];

    if (qualifierMatches.length === 0) {
      throw new InvalidVerifierStringError(
        'Verifier must contain at least one qualifier (#TAG)',
        verifierString
      );
    }

    // Validate each qualifier
    for (const match of qualifierMatches) {
      const qualifier = match.startsWith('!') ? match.substring(1) : match;

      try {
        AssetNameValidator.validateQualifier(qualifier);
      } catch (e) {
        throw new InvalidVerifierStringError(
          `Invalid qualifier in verifier: ${qualifier} - ${e.message}`,
          verifierString
        );
      }
    }

    // Check balanced parentheses
    let depth = 0;
    for (const char of trimmed) {
      if (char === '(') depth++;
      if (char === ')') depth--;
      if (depth < 0) {
        throw new InvalidVerifierStringError(
          'Unbalanced parentheses in verifier string',
          verifierString
        );
      }
    }
    if (depth !== 0) {
      throw new InvalidVerifierStringError(
        'Unbalanced parentheses in verifier string',
        verifierString
      );
    }

    // Check for valid operators placement
    // & and | must be between qualifiers, not at start/end
    const operatorPattern = /(&|\|)/g;
    const operators = trimmed.match(operatorPattern);
    if (operators) {
      // Check operators are not at start or end
      if (trimmed.trim().match(/^(&|\|)/) || trimmed.trim().match(/(&|\|)$/)) {
        throw new InvalidVerifierStringError(
          'Operators & or | cannot be at start or end of verifier',
          verifierString
        );
      }

      // Check no consecutive operators
      if (trimmed.match(/(&|\|)\s*(&|\|)/)) {
        throw new InvalidVerifierStringError(
          'Consecutive operators are not allowed',
          verifierString
        );
      }
    }

    return true;
  }

  /**
   * Extract all qualifiers from verifier string
   * @param {string} verifierString - Verifier string
   * @returns {string[]} Array of qualifier names (including #)
   */
  static extractQualifiers(verifierString) {
    this.validate(verifierString);

    const qualifierMatches = verifierString.match(/!?#[A-Z0-9_/]+/g) || [];

    // Remove ! prefix and deduplicate
    const qualifiers = [...new Set(qualifierMatches.map(q => q.replace('!', '')))];

    return qualifiers;
  }

  /**
   * Check if verifier string uses a specific qualifier
   * @param {string} verifierString - Verifier string
   * @param {string} qualifierName - Qualifier to check (with #)
   * @returns {boolean} True if qualifier is used
   */
  static usesQualifier(verifierString, qualifierName) {
    const qualifiers = this.extractQualifiers(verifierString);
    return qualifiers.includes(qualifierName);
  }
}

module.exports = VerifierValidator;

},{"../errors":21,"./assetNameValidator":36}]},{},[1])(1)
});
