var NeuraiAssetsBundle = (function (exports) {
	'use strict';

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	var src = {exports: {}};

	/**
	 * Extract a human-readable message from an RPC rejection.
	 *
	 * @neuraiproject/neurai-rpc >= 0.5 never rejects with a plain Error, so
	 * `error.message` is undefined for every node failure. It uses three shapes:
	 *
	 *   1. {error: {code, message}, description}      JSON-RPC error (also on HTTP 200)
	 *   2. {statusText, status, description, error}   HTTP response other than 200
	 *   3. {originalError, type: 'ServerUnreachable', error, description}
	 *
	 * In shape 3 `error` is a string, in shapes 1 and 2 it is an object (or
	 * null). Plain Errors (thrown by this library or by mocks) keep working
	 * through the `error.message` candidate.
	 */

	var rpcErrorMessage_1;
	var hasRequiredRpcErrorMessage;

	function requireRpcErrorMessage () {
		if (hasRequiredRpcErrorMessage) return rpcErrorMessage_1;
		hasRequiredRpcErrorMessage = 1;
		function rpcErrorMessage(error) {
		  if (!error) {
		    return '';
		  }
		  if (typeof error === 'string') {
		    return error;
		  }

		  const candidates = [
		    error.error && error.error.message,
		    typeof error.error === 'string' ? error.error : null,
		    error.description,
		    error.message,
		    error.statusText
		  ];

		  for (const candidate of candidates) {
		    if (typeof candidate === 'string' && candidate.length > 0) {
		      return candidate;
		    }
		  }
		  return '';
		}

		rpcErrorMessage_1 = { rpcErrorMessage };
		return rpcErrorMessage_1;
	}

	/**
	 * Validation Error Classes
	 * Errors thrown during parameter validation
	 */

	var ValidationErrors;
	var hasRequiredValidationErrors;

	function requireValidationErrors () {
		if (hasRequiredValidationErrors) return ValidationErrors;
		hasRequiredValidationErrors = 1;
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

		ValidationErrors = {
		  ValidationError,
		  InvalidAssetNameError,
		  InvalidAmountError,
		  InvalidUnitsError,
		  InvalidVerifierStringError,
		  InvalidIPFSHashError,
		  InvalidAddressError,
		  InsufficientFundsError
		};
		return ValidationErrors;
	}

	/**
	 * Asset-Specific Error Classes
	 * Errors related to asset operations
	 */

	var AssetErrors;
	var hasRequiredAssetErrors;

	function requireAssetErrors () {
		if (hasRequiredAssetErrors) return AssetErrors;
		hasRequiredAssetErrors = 1;
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

		AssetErrors = {
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
		return AssetErrors;
	}

	/**
	 * Errors Module
	 * Exports all error classes
	 */

	var errors$1;
	var hasRequiredErrors;

	function requireErrors () {
		if (hasRequiredErrors) return errors$1;
		hasRequiredErrors = 1;
		const {
		  ValidationError,
		  InvalidAssetNameError,
		  InvalidAmountError,
		  InvalidUnitsError,
		  InvalidVerifierStringError,
		  InvalidIPFSHashError,
		  InvalidAddressError,
		  InsufficientFundsError
		} = requireValidationErrors();

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
		} = requireAssetErrors();

		errors$1 = {
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
		return errors$1;
	}

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

	var AssetQueries_1;
	var hasRequiredAssetQueries;

	function requireAssetQueries () {
		if (hasRequiredAssetQueries) return AssetQueries_1;
		hasRequiredAssetQueries = 1;
		const { rpcErrorMessage } = requireRpcErrorMessage();
		const { AssetNotFoundError, InvalidAddressError } = requireErrors();

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
		      if (rpcErrorMessage(error).includes('not found')) {
		        throw new AssetNotFoundError(
		          `Asset ${assetName} not found on blockchain`,
		          assetName
		        );
		      }

		      throw new Error(`Failed to get asset data: ${rpcErrorMessage(error)}`);
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
		      throw new Error(`Failed to list assets: ${rpcErrorMessage(error)}`);
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
		      throw new Error(`Failed to list my assets: ${rpcErrorMessage(error)}`);
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
		      if (rpcErrorMessage(error).includes('not found')) {
		        throw new AssetNotFoundError(
		          `Asset ${assetName} not found on blockchain`,
		          assetName
		        );
		      }
		      throw new Error(`Failed to list addresses by asset: ${rpcErrorMessage(error)}`);
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
		      throw new Error(`Failed to list asset balances by address: ${rpcErrorMessage(error)}`);
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
		      if (rpcErrorMessage(error).includes('not found') || rpcErrorMessage(error).includes('does not have')) {
		        return false;
		      }
		      throw new Error(`Failed to check address tag: ${rpcErrorMessage(error)}`);
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
		      if (rpcErrorMessage(error).includes('not found')) {
		        return [];
		      }
		      throw new Error(`Failed to list tags for address: ${rpcErrorMessage(error)}`);
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
		      if (rpcErrorMessage(error).includes('not found')) {
		        throw new AssetNotFoundError(
		          `Qualifier ${qualifierName} not found on blockchain`,
		          qualifierName
		        );
		      }
		      throw new Error(`Failed to list addresses for tag: ${rpcErrorMessage(error)}`);
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
		      if (rpcErrorMessage(error).includes('not found') || rpcErrorMessage(error).includes('does not meet')) {
		        return false;
		      }
		      throw new Error(`Failed to check address restriction: ${rpcErrorMessage(error)}`);
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
		      throw new Error(`Failed to check if address is frozen: ${rpcErrorMessage(error)}`);
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
		      if (rpcErrorMessage(error).includes('not found')) {
		        throw new AssetNotFoundError(
		          `Restricted asset ${restrictedAssetName} not found on blockchain`,
		          restrictedAssetName
		        );
		      }
		      throw new Error(`Failed to check global restriction: ${rpcErrorMessage(error)}`);
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
		      if (rpcErrorMessage(error).includes('not found')) {
		        throw new AssetNotFoundError(
		          `Restricted asset ${restrictedAssetName} not found on blockchain`,
		          restrictedAssetName
		        );
		      }
		      throw new Error(`Failed to get verifier string: ${rpcErrorMessage(error)}`);
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
		      throw new Error(`Failed to get snapshot request: ${rpcErrorMessage(error)}`);
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
		      throw new Error(`Failed to cancel snapshot request: ${rpcErrorMessage(error)}`);
		    }
		  }

		  /**
		   * List DEPIN holders with validity status
		   * @param {string} assetName - DEPIN asset name
		   * @returns {Promise<Array>} Array of holder objects
		   */
		  async listDepinHolders(assetName) {
		    if (!assetName) {
		      throw new Error('DEPIN asset name is required');
		    }

		    try {
		      const result = await this.rpc('listdepinholders', [assetName]);
		      return result || [];
		    } catch (error) {
		      if (rpcErrorMessage(error).includes('not found')) {
		        throw new AssetNotFoundError(
		          `DEPIN asset ${assetName} not found on blockchain`,
		          assetName
		        );
		      }
		      throw new Error(`Failed to list DEPIN holders: ${rpcErrorMessage(error)}`);
		    }
		  }

		  /**
		   * Check DEPIN validity for a specific address
		   * @param {string} assetName - DEPIN asset name
		   * @param {string} address - Address to query
		   * @returns {Promise<object>} Validity information
		   */
		  async checkDepinValidity(assetName, address) {
		    if (!assetName) {
		      throw new Error('DEPIN asset name is required');
		    }

		    if (!address) {
		      throw new Error('Address is required');
		    }

		    try {
		      const result = await this.rpc('checkdepinvalidity', [assetName, address]);
		      return result || { has_asset: false };
		    } catch (error) {
		      throw new Error(`Failed to check DEPIN validity: ${rpcErrorMessage(error)}`);
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
		      throw new Error(`Failed to get asset count: ${rpcErrorMessage(error)}`);
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
		   * @returns {string} Asset type ('ROOT', 'SUB', 'UNIQUE', 'QUALIFIER', 'RESTRICTED', 'DEPIN', 'OWNER')
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
		    } else if (assetName.startsWith('&')) {
		      return 'DEPIN';
		    } else if (assetName.includes('#')) {
		      return 'UNIQUE';
		    } else if (assetName.includes('/')) {
		      return 'SUB';
		    } else {
		      return 'ROOT';
		    }
		  }
		}

		AssetQueries_1 = AssetQueries;
		return AssetQueries_1;
	}

	/**
	 * Query Module
	 * Exports all asset query functionality
	 */

	var queries;
	var hasRequiredQueries;

	function requireQueries () {
		if (hasRequiredQueries) return queries;
		hasRequiredQueries = 1;
		const AssetQueries = requireAssetQueries();

		queries = {
		  AssetQueries
		};
		return queries;
	}

	var dist = {};

	var hasRequiredDist_1;

	function requireDist_1 () {
		if (hasRequiredDist_1) return dist;
		hasRequiredDist_1 = 1;

		function ensureHex(hex, label = 'hex') {
		    const normalized = String(hex || '').trim().toLowerCase();
		    if (!/^[0-9a-f]*$/.test(normalized) || normalized.length % 2 !== 0) {
		        throw new Error(`Invalid ${label}: expected even-length hex string`);
		    }
		    return normalized;
		}
		function hexToBytes(hex) {
		    const normalized = ensureHex(hex);
		    const bytes = new Uint8Array(normalized.length / 2);
		    for (let i = 0; i < normalized.length; i += 2) {
		        bytes[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16);
		    }
		    return bytes;
		}
		function bytesToHex(bytes) {
		    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
		}
		function concatBytes(...parts) {
		    const total = parts.reduce((sum, part) => sum + part.length, 0);
		    const out = new Uint8Array(total);
		    let offset = 0;
		    for (const part of parts) {
		        out.set(part, offset);
		        offset += part.length;
		    }
		    return out;
		}
		function asciiBytes(text) {
		    return Uint8Array.from(Array.from(text, (char) => char.charCodeAt(0)));
		}
		function serializeString(text) {
		    const bytes = asciiBytes(text);
		    return concatBytes(compactSize(bytes.length), bytes);
		}
		function reverseBytes(bytes) {
		    return Uint8Array.from(Array.from(bytes).reverse());
		}
		function u32LE(value) {
		    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
		        throw new Error(`uint32 out of range: ${value}`);
		    }
		    const out = new Uint8Array(4);
		    const view = new DataView(out.buffer);
		    view.setUint32(0, value, true);
		    return out;
		}
		function u64LE(value) {
		    const bigintValue = typeof value === 'bigint' ? value : BigInt(value);
		    if (bigintValue < 0n || bigintValue > 0xffffffffffffffffn) {
		        throw new Error(`uint64 out of range: ${bigintValue}`);
		    }
		    const out = new Uint8Array(8);
		    let remaining = bigintValue;
		    for (let i = 0; i < 8; i += 1) {
		        out[i] = Number(remaining & 0xffn);
		        remaining >>= 8n;
		    }
		    return out;
		}
		function i64LE(value) {
		    const bigintValue = typeof value === 'bigint' ? value : BigInt(value);
		    if (bigintValue < -0x8000000000000000n || bigintValue > 0x7fffffffffffffffn) {
		        throw new Error(`int64 out of range: ${bigintValue}`);
		    }
		    const out = new Uint8Array(8);
		    const view = new DataView(out.buffer);
		    view.setBigInt64(0, bigintValue, true);
		    return out;
		}
		function compactSize(value) {
		    const bigintValue = typeof value === 'bigint' ? value : BigInt(value);
		    if (bigintValue < 0n)
		        throw new Error('CompactSize cannot encode negative numbers');
		    if (bigintValue < 253n) {
		        return Uint8Array.of(Number(bigintValue));
		    }
		    if (bigintValue <= 0xffffn) {
		        return concatBytes(Uint8Array.of(0xfd), u16LE(Number(bigintValue)));
		    }
		    if (bigintValue <= 0xffffffffn) {
		        return concatBytes(Uint8Array.of(0xfe), u32LE(Number(bigintValue)));
		    }
		    return concatBytes(Uint8Array.of(0xff), u64LE(bigintValue));
		}
		function u16LE(value) {
		    if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
		        throw new Error(`uint16 out of range: ${value}`);
		    }
		    const out = new Uint8Array(2);
		    const view = new DataView(out.buffer);
		    view.setUint16(0, value, true);
		    return out;
		}
		function pushData(data) {
		    if (data.length > 0xffff) {
		        throw new Error(`Pushdata too large for current implementation: ${data.length} bytes`);
		    }
		    if (data.length < 0x4c) {
		        return concatBytes(Uint8Array.of(data.length), data);
		    }
		    if (data.length <= 0xff) {
		        return concatBytes(Uint8Array.of(0x4c, data.length), data);
		    }
		    return concatBytes(Uint8Array.of(0x4d), u16LE(data.length), data);
		}

		// base-x encoding / decoding
		// Copyright (c) 2018 base-x contributors
		// Copyright (c) 2014-2018 The Bitcoin Core developers (base58.cpp)
		// Distributed under the MIT software license, see the accompanying
		// file LICENSE or http://www.opensource.org/licenses/mit-license.php.
		function base (ALPHABET) {
		  if (ALPHABET.length >= 255) { throw new TypeError('Alphabet too long') }
		  const BASE_MAP = new Uint8Array(256);
		  for (let j = 0; j < BASE_MAP.length; j++) {
		    BASE_MAP[j] = 255;
		  }
		  for (let i = 0; i < ALPHABET.length; i++) {
		    const x = ALPHABET.charAt(i);
		    const xc = x.charCodeAt(0);
		    if (BASE_MAP[xc] !== 255) { throw new TypeError(x + ' is ambiguous') }
		    BASE_MAP[xc] = i;
		  }
		  const BASE = ALPHABET.length;
		  const LEADER = ALPHABET.charAt(0);
		  const FACTOR = Math.log(BASE) / Math.log(256); // log(BASE) / log(256), rounded up
		  const iFACTOR = Math.log(256) / Math.log(BASE); // log(256) / log(BASE), rounded up
		  function encode (source) {
		    // eslint-disable-next-line no-empty
		    if (source instanceof Uint8Array) ; else if (ArrayBuffer.isView(source)) {
		      source = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
		    } else if (Array.isArray(source)) {
		      source = Uint8Array.from(source);
		    }
		    if (!(source instanceof Uint8Array)) { throw new TypeError('Expected Uint8Array') }
		    if (source.length === 0) { return '' }
		    // Skip & count leading zeroes.
		    let zeroes = 0;
		    let length = 0;
		    let pbegin = 0;
		    const pend = source.length;
		    while (pbegin !== pend && source[pbegin] === 0) {
		      pbegin++;
		      zeroes++;
		    }
		    // Allocate enough space in big-endian base58 representation.
		    const size = ((pend - pbegin) * iFACTOR + 1) >>> 0;
		    const b58 = new Uint8Array(size);
		    // Process the bytes.
		    while (pbegin !== pend) {
		      let carry = source[pbegin];
		      // Apply "b58 = b58 * 256 + ch".
		      let i = 0;
		      for (let it1 = size - 1; (carry !== 0 || i < length) && (it1 !== -1); it1--, i++) {
		        carry += (256 * b58[it1]) >>> 0;
		        b58[it1] = (carry % BASE) >>> 0;
		        carry = (carry / BASE) >>> 0;
		      }
		      if (carry !== 0) { throw new Error('Non-zero carry') }
		      length = i;
		      pbegin++;
		    }
		    // Skip leading zeroes in base58 result.
		    let it2 = size - length;
		    while (it2 !== size && b58[it2] === 0) {
		      it2++;
		    }
		    // Translate the result into a string.
		    let str = LEADER.repeat(zeroes);
		    for (; it2 < size; ++it2) { str += ALPHABET.charAt(b58[it2]); }
		    return str
		  }
		  function decodeUnsafe (source) {
		    if (typeof source !== 'string') { throw new TypeError('Expected String') }
		    if (source.length === 0) { return new Uint8Array() }
		    let psz = 0;
		    // Skip and count leading '1's.
		    let zeroes = 0;
		    let length = 0;
		    while (source[psz] === LEADER) {
		      zeroes++;
		      psz++;
		    }
		    // Allocate enough space in big-endian base256 representation.
		    const size = (((source.length - psz) * FACTOR) + 1) >>> 0; // log(58) / log(256), rounded up.
		    const b256 = new Uint8Array(size);
		    // Process the characters.
		    while (psz < source.length) {
		      // Find code of next character
		      const charCode = source.charCodeAt(psz);
		      // Base map can not be indexed using char code
		      if (charCode > 255) { return }
		      // Decode character
		      let carry = BASE_MAP[charCode];
		      // Invalid character
		      if (carry === 255) { return }
		      let i = 0;
		      for (let it3 = size - 1; (carry !== 0 || i < length) && (it3 !== -1); it3--, i++) {
		        carry += (BASE * b256[it3]) >>> 0;
		        b256[it3] = (carry % 256) >>> 0;
		        carry = (carry / 256) >>> 0;
		      }
		      if (carry !== 0) { throw new Error('Non-zero carry') }
		      length = i;
		      psz++;
		    }
		    // Skip leading zeroes in b256.
		    let it4 = size - length;
		    while (it4 !== size && b256[it4] === 0) {
		      it4++;
		    }
		    const vch = new Uint8Array(zeroes + (size - it4));
		    let j = zeroes;
		    while (it4 !== size) {
		      vch[j++] = b256[it4++];
		    }
		    return vch
		  }
		  function decode (string) {
		    const buffer = decodeUnsafe(string);
		    if (buffer) { return buffer }
		    throw new Error('Non-base' + BASE + ' character')
		  }
		  return {
		    encode,
		    decodeUnsafe,
		    decode
		  }
		}

		var ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
		var base58 = base(ALPHABET);

		const IPFS_LENGTH = 0x20;
		const TXID_PREFIX = 0x54;
		function encodeAssetDataReference(value) {
		    const normalized = String(value || '').trim();
		    if (!normalized) {
		        return new Uint8Array();
		    }
		    if (normalized.startsWith('Qm') && normalized.length === 46) {
		        const decoded = Uint8Array.from(base58.decode(normalized));
		        if (decoded.length !== 34) {
		            throw new Error(`Invalid CIDv0 length for asset data: ${decoded.length}`);
		        }
		        return decoded;
		    }
		    if (normalized.length === 64 && /^[0-9a-fA-F]+$/.test(normalized)) {
		        const txidBytes = hexToBytes(normalized);
		        return Uint8Array.of(TXID_PREFIX, IPFS_LENGTH, ...txidBytes);
		    }
		    if (normalized.length === 68 && /^[0-9a-fA-F]+$/.test(normalized)) {
		        const raw = hexToBytes(normalized);
		        if (raw[1] !== IPFS_LENGTH) {
		            throw new Error('Invalid raw asset data reference length prefix');
		        }
		        return raw;
		    }
		    throw new Error('Unsupported asset data reference. Expected CIDv0 (Qm...), 64-char txid, or 68-char raw hex');
		}
		function decodeAssetDataReferenceHex(value) {
		    return bytesToHex(encodeAssetDataReference(value));
		}
		function isEncodedAssetDataReferenceHex(hex) {
		    const normalized = ensureHex(hex);
		    return normalized.length === 68 || normalized.length === 0;
		}
		function isCidV0AssetReference(value) {
		    const normalized = String(value || '').trim();
		    return normalized.startsWith('Qm') && normalized.length === 46;
		}
		function isTxidAssetReference(value) {
		    const normalized = String(value || '').trim();
		    return normalized.length === 64 && /^[0-9a-fA-F]+$/.test(normalized);
		}
		function isRawAssetDataReferenceHex(value) {
		    const normalized = String(value || '').trim();
		    return normalized.length === 68 && /^[0-9a-fA-F]+$/.test(normalized);
		}
		function formatAssetDataReferenceHex(value) {
		    return bytesToHex(encodeAssetDataReference(value));
		}

		var dist$1 = {};

		var hasRequiredDist;

		function requireDist () {
			if (hasRequiredDist) return dist$1;
			hasRequiredDist = 1;
			Object.defineProperty(dist$1, "__esModule", { value: true });
			dist$1.bech32m = dist$1.bech32 = void 0;
			const ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
			const ALPHABET_MAP = {};
			for (let z = 0; z < ALPHABET.length; z++) {
			    const x = ALPHABET.charAt(z);
			    ALPHABET_MAP[x] = z;
			}
			function polymodStep(pre) {
			    const b = pre >> 25;
			    return (((pre & 0x1ffffff) << 5) ^
			        (-((b >> 0) & 1) & 0x3b6a57b2) ^
			        (-((b >> 1) & 1) & 0x26508e6d) ^
			        (-((b >> 2) & 1) & 0x1ea119fa) ^
			        (-((b >> 3) & 1) & 0x3d4233dd) ^
			        (-((b >> 4) & 1) & 0x2a1462b3));
			}
			function prefixChk(prefix) {
			    let chk = 1;
			    for (let i = 0; i < prefix.length; ++i) {
			        const c = prefix.charCodeAt(i);
			        if (c < 33 || c > 126)
			            return 'Invalid prefix (' + prefix + ')';
			        chk = polymodStep(chk) ^ (c >> 5);
			    }
			    chk = polymodStep(chk);
			    for (let i = 0; i < prefix.length; ++i) {
			        const v = prefix.charCodeAt(i);
			        chk = polymodStep(chk) ^ (v & 0x1f);
			    }
			    return chk;
			}
			function convert(data, inBits, outBits, pad) {
			    let value = 0;
			    let bits = 0;
			    const maxV = (1 << outBits) - 1;
			    const result = [];
			    for (let i = 0; i < data.length; ++i) {
			        value = (value << inBits) | data[i];
			        bits += inBits;
			        while (bits >= outBits) {
			            bits -= outBits;
			            result.push((value >> bits) & maxV);
			        }
			    }
			    if (pad) {
			        if (bits > 0) {
			            result.push((value << (outBits - bits)) & maxV);
			        }
			    }
			    else {
			        if (bits >= inBits)
			            return 'Excess padding';
			        if ((value << (outBits - bits)) & maxV)
			            return 'Non-zero padding';
			    }
			    return result;
			}
			function toWords(bytes) {
			    return convert(bytes, 8, 5, true);
			}
			function fromWordsUnsafe(words) {
			    const res = convert(words, 5, 8, false);
			    if (Array.isArray(res))
			        return res;
			}
			function fromWords(words) {
			    const res = convert(words, 5, 8, false);
			    if (Array.isArray(res))
			        return res;
			    throw new Error(res);
			}
			function getLibraryFromEncoding(encoding) {
			    let ENCODING_CONST;
			    if (encoding === 'bech32') {
			        ENCODING_CONST = 1;
			    }
			    else {
			        ENCODING_CONST = 0x2bc830a3;
			    }
			    function encode(prefix, words, LIMIT) {
			        LIMIT = LIMIT || 90;
			        if (prefix.length + 7 + words.length > LIMIT)
			            throw new TypeError('Exceeds length limit');
			        prefix = prefix.toLowerCase();
			        // determine chk mod
			        let chk = prefixChk(prefix);
			        if (typeof chk === 'string')
			            throw new Error(chk);
			        let result = prefix + '1';
			        for (let i = 0; i < words.length; ++i) {
			            const x = words[i];
			            if (x >> 5 !== 0)
			                throw new Error('Non 5-bit word');
			            chk = polymodStep(chk) ^ x;
			            result += ALPHABET.charAt(x);
			        }
			        for (let i = 0; i < 6; ++i) {
			            chk = polymodStep(chk);
			        }
			        chk ^= ENCODING_CONST;
			        for (let i = 0; i < 6; ++i) {
			            const v = (chk >> ((5 - i) * 5)) & 0x1f;
			            result += ALPHABET.charAt(v);
			        }
			        return result;
			    }
			    function __decode(str, LIMIT) {
			        LIMIT = LIMIT || 90;
			        if (str.length < 8)
			            return str + ' too short';
			        if (str.length > LIMIT)
			            return 'Exceeds length limit';
			        // don't allow mixed case
			        const lowered = str.toLowerCase();
			        const uppered = str.toUpperCase();
			        if (str !== lowered && str !== uppered)
			            return 'Mixed-case string ' + str;
			        str = lowered;
			        const split = str.lastIndexOf('1');
			        if (split === -1)
			            return 'No separator character for ' + str;
			        if (split === 0)
			            return 'Missing prefix for ' + str;
			        const prefix = str.slice(0, split);
			        const wordChars = str.slice(split + 1);
			        if (wordChars.length < 6)
			            return 'Data too short';
			        let chk = prefixChk(prefix);
			        if (typeof chk === 'string')
			            return chk;
			        const words = [];
			        for (let i = 0; i < wordChars.length; ++i) {
			            const c = wordChars.charAt(i);
			            const v = ALPHABET_MAP[c];
			            if (v === undefined)
			                return 'Unknown character ' + c;
			            chk = polymodStep(chk) ^ v;
			            // not in the checksum?
			            if (i + 6 >= wordChars.length)
			                continue;
			            words.push(v);
			        }
			        if (chk !== ENCODING_CONST)
			            return 'Invalid checksum for ' + str;
			        return { prefix, words };
			    }
			    function decodeUnsafe(str, LIMIT) {
			        const res = __decode(str, LIMIT);
			        if (typeof res === 'object')
			            return res;
			    }
			    function decode(str, LIMIT) {
			        const res = __decode(str, LIMIT);
			        if (typeof res === 'object')
			            return res;
			        throw new Error(res);
			    }
			    return {
			        decodeUnsafe,
			        decode,
			        encode,
			        toWords,
			        fromWordsUnsafe,
			        fromWords,
			    };
			}
			dist$1.bech32 = getLibraryFromEncoding('bech32');
			dist$1.bech32m = getLibraryFromEncoding('bech32m');
			return dist$1;
		}

		var distExports = requireDist();

		/**
		 * Utilities for hex, bytes, CSPRNG.
		 * @module
		 */
		/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
		// We use WebCrypto aka globalThis.crypto, which exists in browsers and node.js 16+.
		// node.js versions earlier than v19 don't declare it in global scope.
		// For node.js, package.json#exports field mapping rewrites import
		// from `crypto` to `cryptoNode`, which imports native module.
		// Makes the utils un-importable in browsers without a bundler.
		// Once node.js 18 is deprecated (2025-04-30), we can just drop the import.
		/** Checks if something is Uint8Array. Be careful: nodejs Buffer will return true. */
		function isBytes$1(a) {
		    return a instanceof Uint8Array || (ArrayBuffer.isView(a) && a.constructor.name === 'Uint8Array');
		}
		/** Asserts something is Uint8Array. */
		function abytes$1(b, ...lengths) {
		    if (!isBytes$1(b))
		        throw new Error('Uint8Array expected');
		    if (lengths.length > 0 && !lengths.includes(b.length))
		        throw new Error('Uint8Array expected of length ' + lengths + ', got length=' + b.length);
		}
		/** Asserts a hash instance has not been destroyed / finished */
		function aexists$1(instance, checkFinished = true) {
		    if (instance.destroyed)
		        throw new Error('Hash instance has been destroyed');
		    if (checkFinished && instance.finished)
		        throw new Error('Hash#digest() has already been called');
		}
		/** Asserts output is properly-sized byte array */
		function aoutput$1(out, instance) {
		    abytes$1(out);
		    const min = instance.outputLen;
		    if (out.length < min) {
		        throw new Error('digestInto() expects output buffer of length at least ' + min);
		    }
		}
		/** Zeroize a byte array. Warning: JS provides no guarantees. */
		function clean$1(...arrays) {
		    for (let i = 0; i < arrays.length; i++) {
		        arrays[i].fill(0);
		    }
		}
		/** Create DataView of an array for easy byte-level manipulation. */
		function createView$1(arr) {
		    return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
		}
		/** The rotate right (circular right shift) operation for uint32 */
		function rotr$1(word, shift) {
		    return (word << (32 - shift)) | (word >>> shift);
		}
		/**
		 * Converts string to bytes using UTF8 encoding.
		 * @example utf8ToBytes('abc') // Uint8Array.from([97, 98, 99])
		 */
		function utf8ToBytes(str) {
		    if (typeof str !== 'string')
		        throw new Error('string expected');
		    return new Uint8Array(new TextEncoder().encode(str)); // https://bugzil.la/1681809
		}
		/**
		 * Normalizes (non-hex) string or Uint8Array to Uint8Array.
		 * Warning: when Uint8Array is passed, it would NOT get copied.
		 * Keep in mind for future mutable operations.
		 */
		function toBytes(data) {
		    if (typeof data === 'string')
		        data = utf8ToBytes(data);
		    abytes$1(data);
		    return data;
		}
		/** For runtime check if class implements interface */
		class Hash {
		}
		/** Wraps hash function, creating an interface on top of it */
		function createHasher$1(hashCons) {
		    const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
		    const tmp = hashCons();
		    hashC.outputLen = tmp.outputLen;
		    hashC.blockLen = tmp.blockLen;
		    hashC.create = () => hashCons();
		    return hashC;
		}

		/**
		 * Internal Merkle-Damgard hash utils.
		 * @module
		 */
		/** Polyfill for Safari 14. https://caniuse.com/mdn-javascript_builtins_dataview_setbiguint64 */
		function setBigUint64(view, byteOffset, value, isLE) {
		    if (typeof view.setBigUint64 === 'function')
		        return view.setBigUint64(byteOffset, value, isLE);
		    const _32n = BigInt(32);
		    const _u32_max = BigInt(0xffffffff);
		    const wh = Number((value >> _32n) & _u32_max);
		    const wl = Number(value & _u32_max);
		    const h = isLE ? 4 : 0;
		    const l = isLE ? 0 : 4;
		    view.setUint32(byteOffset + h, wh, isLE);
		    view.setUint32(byteOffset + l, wl, isLE);
		}
		/** Choice: a ? b : c */
		function Chi$1(a, b, c) {
		    return (a & b) ^ (~a & c);
		}
		/** Majority function, true if any two inputs is true. */
		function Maj$1(a, b, c) {
		    return (a & b) ^ (a & c) ^ (b & c);
		}
		/**
		 * Merkle-Damgard hash construction base class.
		 * Could be used to create MD5, RIPEMD, SHA1, SHA2.
		 */
		let HashMD$1 = class HashMD extends Hash {
		    constructor(blockLen, outputLen, padOffset, isLE) {
		        super();
		        this.finished = false;
		        this.length = 0;
		        this.pos = 0;
		        this.destroyed = false;
		        this.blockLen = blockLen;
		        this.outputLen = outputLen;
		        this.padOffset = padOffset;
		        this.isLE = isLE;
		        this.buffer = new Uint8Array(blockLen);
		        this.view = createView$1(this.buffer);
		    }
		    update(data) {
		        aexists$1(this);
		        data = toBytes(data);
		        abytes$1(data);
		        const { view, buffer, blockLen } = this;
		        const len = data.length;
		        for (let pos = 0; pos < len;) {
		            const take = Math.min(blockLen - this.pos, len - pos);
		            // Fast path: we have at least one block in input, cast it to view and process
		            if (take === blockLen) {
		                const dataView = createView$1(data);
		                for (; blockLen <= len - pos; pos += blockLen)
		                    this.process(dataView, pos);
		                continue;
		            }
		            buffer.set(data.subarray(pos, pos + take), this.pos);
		            this.pos += take;
		            pos += take;
		            if (this.pos === blockLen) {
		                this.process(view, 0);
		                this.pos = 0;
		            }
		        }
		        this.length += data.length;
		        this.roundClean();
		        return this;
		    }
		    digestInto(out) {
		        aexists$1(this);
		        aoutput$1(out, this);
		        this.finished = true;
		        // Padding
		        // We can avoid allocation of buffer for padding completely if it
		        // was previously not allocated here. But it won't change performance.
		        const { buffer, view, blockLen, isLE } = this;
		        let { pos } = this;
		        // append the bit '1' to the message
		        buffer[pos++] = 0b10000000;
		        clean$1(this.buffer.subarray(pos));
		        // we have less than padOffset left in buffer, so we cannot put length in
		        // current block, need process it and pad again
		        if (this.padOffset > blockLen - pos) {
		            this.process(view, 0);
		            pos = 0;
		        }
		        // Pad until full block byte with zeros
		        for (let i = pos; i < blockLen; i++)
		            buffer[i] = 0;
		        // Note: sha512 requires length to be 128bit integer, but length in JS will overflow before that
		        // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
		        // So we just write lowest 64 bits of that value.
		        setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
		        this.process(view, 0);
		        const oview = createView$1(out);
		        const len = this.outputLen;
		        // NOTE: we do division by 4 later, which should be fused in single op with modulo by JIT
		        if (len % 4)
		            throw new Error('_sha2: outputLen should be aligned to 32bit');
		        const outLen = len / 4;
		        const state = this.get();
		        if (outLen > state.length)
		            throw new Error('_sha2: outputLen bigger than state');
		        for (let i = 0; i < outLen; i++)
		            oview.setUint32(4 * i, state[i], isLE);
		    }
		    digest() {
		        const { buffer, outputLen } = this;
		        this.digestInto(buffer);
		        const res = buffer.slice(0, outputLen);
		        this.destroy();
		        return res;
		    }
		    _cloneInto(to) {
		        to || (to = new this.constructor());
		        to.set(...this.get());
		        const { blockLen, buffer, length, finished, destroyed, pos } = this;
		        to.destroyed = destroyed;
		        to.finished = finished;
		        to.length = length;
		        to.pos = pos;
		        if (length % blockLen)
		            to.buffer.set(buffer);
		        return to;
		    }
		    clone() {
		        return this._cloneInto();
		    }
		};
		/**
		 * Initial SHA-2 state: fractional parts of square roots of first 16 primes 2..53.
		 * Check out `test/misc/sha2-gen-iv.js` for recomputation guide.
		 */
		/** Initial SHA256 state. Bits 0..32 of frac part of sqrt of primes 2..19 */
		const SHA256_IV$1 = /* @__PURE__ */ Uint32Array.from([
		    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
		]);

		/**
		 * SHA2 hash function. A.k.a. sha256, sha384, sha512, sha512_224, sha512_256.
		 * SHA256 is the fastest hash implementable in JS, even faster than Blake3.
		 * Check out [RFC 4634](https://datatracker.ietf.org/doc/html/rfc4634) and
		 * [FIPS 180-4](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf).
		 * @module
		 */
		/**
		 * Round constants:
		 * First 32 bits of fractional parts of the cube roots of the first 64 primes 2..311)
		 */
		// prettier-ignore
		const SHA256_K$1 = /* @__PURE__ */ Uint32Array.from([
		    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
		    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
		    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
		    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
		    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
		    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
		    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
		    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
		]);
		/** Reusable temporary buffer. "W" comes straight from spec. */
		const SHA256_W$1 = /* @__PURE__ */ new Uint32Array(64);
		class SHA256 extends HashMD$1 {
		    constructor(outputLen = 32) {
		        super(64, outputLen, 8, false);
		        // We cannot use array here since array allows indexing by variable
		        // which means optimizer/compiler cannot use registers.
		        this.A = SHA256_IV$1[0] | 0;
		        this.B = SHA256_IV$1[1] | 0;
		        this.C = SHA256_IV$1[2] | 0;
		        this.D = SHA256_IV$1[3] | 0;
		        this.E = SHA256_IV$1[4] | 0;
		        this.F = SHA256_IV$1[5] | 0;
		        this.G = SHA256_IV$1[6] | 0;
		        this.H = SHA256_IV$1[7] | 0;
		    }
		    get() {
		        const { A, B, C, D, E, F, G, H } = this;
		        return [A, B, C, D, E, F, G, H];
		    }
		    // prettier-ignore
		    set(A, B, C, D, E, F, G, H) {
		        this.A = A | 0;
		        this.B = B | 0;
		        this.C = C | 0;
		        this.D = D | 0;
		        this.E = E | 0;
		        this.F = F | 0;
		        this.G = G | 0;
		        this.H = H | 0;
		    }
		    process(view, offset) {
		        // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
		        for (let i = 0; i < 16; i++, offset += 4)
		            SHA256_W$1[i] = view.getUint32(offset, false);
		        for (let i = 16; i < 64; i++) {
		            const W15 = SHA256_W$1[i - 15];
		            const W2 = SHA256_W$1[i - 2];
		            const s0 = rotr$1(W15, 7) ^ rotr$1(W15, 18) ^ (W15 >>> 3);
		            const s1 = rotr$1(W2, 17) ^ rotr$1(W2, 19) ^ (W2 >>> 10);
		            SHA256_W$1[i] = (s1 + SHA256_W$1[i - 7] + s0 + SHA256_W$1[i - 16]) | 0;
		        }
		        // Compression function main loop, 64 rounds
		        let { A, B, C, D, E, F, G, H } = this;
		        for (let i = 0; i < 64; i++) {
		            const sigma1 = rotr$1(E, 6) ^ rotr$1(E, 11) ^ rotr$1(E, 25);
		            const T1 = (H + sigma1 + Chi$1(E, F, G) + SHA256_K$1[i] + SHA256_W$1[i]) | 0;
		            const sigma0 = rotr$1(A, 2) ^ rotr$1(A, 13) ^ rotr$1(A, 22);
		            const T2 = (sigma0 + Maj$1(A, B, C)) | 0;
		            H = G;
		            G = F;
		            F = E;
		            E = (D + T1) | 0;
		            D = C;
		            C = B;
		            B = A;
		            A = (T1 + T2) | 0;
		        }
		        // Add the compressed chunk to the current hash value
		        A = (A + this.A) | 0;
		        B = (B + this.B) | 0;
		        C = (C + this.C) | 0;
		        D = (D + this.D) | 0;
		        E = (E + this.E) | 0;
		        F = (F + this.F) | 0;
		        G = (G + this.G) | 0;
		        H = (H + this.H) | 0;
		        this.set(A, B, C, D, E, F, G, H);
		    }
		    roundClean() {
		        clean$1(SHA256_W$1);
		    }
		    destroy() {
		        this.set(0, 0, 0, 0, 0, 0, 0, 0);
		        clean$1(this.buffer);
		    }
		}
		/**
		 * SHA2-256 hash function from RFC 4634.
		 *
		 * It is the fastest JS hash, even faster than Blake3.
		 * To break sha256 using birthday attack, attackers need to try 2^128 hashes.
		 * BTC network is doing 2^70 hashes/sec (2^95 hashes/year) as per 2025.
		 */
		const sha256$2 = /* @__PURE__ */ createHasher$1(() => new SHA256());

		/**
		 * SHA2-256 a.k.a. sha256. In JS, it is the fastest hash, even faster than Blake3.
		 *
		 * To break sha256 using birthday attack, attackers need to try 2^128 hashes.
		 * BTC network is doing 2^70 hashes/sec (2^95 hashes/year) as per 2025.
		 *
		 * Check out [FIPS 180-4](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf).
		 * @module
		 * @deprecated
		 */
		/** @deprecated Use import from `noble/hashes/sha2` module */
		const sha256$1 = sha256$2;

		function bs58checkBase (checksumFn) {
		    // Encode a buffer as a base58-check encoded string
		    function encode(payload) {
		        var payloadU8 = Uint8Array.from(payload);
		        var checksum = checksumFn(payloadU8);
		        var length = payloadU8.length + 4;
		        var both = new Uint8Array(length);
		        both.set(payloadU8, 0);
		        both.set(checksum.subarray(0, 4), payloadU8.length);
		        return base58.encode(both);
		    }
		    function decodeRaw(buffer) {
		        var payload = buffer.slice(0, -4);
		        var checksum = buffer.slice(-4);
		        var newChecksum = checksumFn(payload);
		        // eslint-disable-next-line
		        if (checksum[0] ^ newChecksum[0] |
		            checksum[1] ^ newChecksum[1] |
		            checksum[2] ^ newChecksum[2] |
		            checksum[3] ^ newChecksum[3])
		            return;
		        return payload;
		    }
		    // Decode a base58-check encoded string to a buffer, no result if checksum is wrong
		    function decodeUnsafe(str) {
		        var buffer = base58.decodeUnsafe(str);
		        if (buffer == null)
		            return;
		        return decodeRaw(buffer);
		    }
		    function decode(str) {
		        var buffer = base58.decode(str);
		        var payload = decodeRaw(buffer);
		        if (payload == null)
		            throw new Error('Invalid checksum');
		        return payload;
		    }
		    return {
		        encode: encode,
		        decode: decode,
		        decodeUnsafe: decodeUnsafe
		    };
		}

		// SHA256(SHA256(buffer))
		function sha256x2(buffer) {
		    return sha256$1(sha256$1(buffer));
		}
		var bs58check = bs58checkBase(sha256x2);

		function resolveAddressInput(address) {
		    if (typeof address === 'string') {
		        return String(address).trim();
		    }
		    if (address && typeof address.address === 'string') {
		        return String(address.address).trim();
		    }
		    throw new Error('Address must be a string or an object with an address field');
		}

		const LEGACY_MAINNET_PREFIX = 53;
		const LEGACY_TESTNET_PREFIX = 127;
		const PQ_MAINNET_HRP = 'nq';
		const PQ_TESTNET_HRP = 'tnq';
		const OP_XNA_ASSET = 0xc0;
		const OP_DROP = 0x75;
		const OP_1 = 0x51;
		const OP_RESERVED = 0x50;
		/**
		 * NIP-040 asset payload marker.
		 *
		 * Every transfer / new / owner / reissue payload opens with a 3-byte marker
		 * followed by the type byte. The marker is consensus: blocks below the NIP-040
		 * activation height of a network only accept `rvn` on new asset outputs and
		 * blocks at or above it only accept `xna` (mainnet: not scheduled; testnet:
		 * 303000; regtest: 1). This library does NOT know chain state and never
		 * infers the marker from a network or an address: the caller passes the
		 * value reported by the node for the next block
		 * (`getblockchaininfo.asset_marker`, node commit 347362b) — or, when building
		 * offline, the marker it knows to be right. Without it the default is `rvn`,
		 * byte-for-byte identical to 0.6.0.
		 */
		const DEFAULT_ASSET_MARKER = 'rvn';
		const ASSET_MARKER_BYTES = {
		    rvn: [0x72, 0x76, 0x6e],
		    xna: [0x78, 0x6e, 0x61]
		};
		const ASSET_PAYLOAD_TYPE_BYTE = {
		    transfer: 0x74, // 't'
		    new: 0x71, // 'q'
		    owner: 0x6f, // 'o'
		    reissue: 0x72 // 'r'
		};
		/**
		 * Applies the default only when the marker was not given at all (`undefined`)
		 * and rejects anything else that is not `'rvn'` or `'xna'` — including
		 * `null`, which is what a missing or null `asset_marker` in a JSON reply
		 * becomes: it must fail loudly, not silently build a legacy output.
		 */
		function resolveAssetMarker(value) {
		    if (value === undefined)
		        return DEFAULT_ASSET_MARKER;
		    if (value === 'rvn' || value === 'xna')
		        return value;
		    throw new Error(`Invalid assetMarker: ${String(value)} (expected 'rvn' or 'xna', the value of getblockchaininfo.asset_marker)`);
		}
		/**
		 * The only place marker bytes are assembled (mirror of the node's
		 * `AppendAssetMarkerPrefix`): `<marker 3B> <type 1B>`.
		 */
		function assetPayloadPrefix(marker, type) {
		    const typeByte = ASSET_PAYLOAD_TYPE_BYTE[type];
		    if (typeByte === undefined) {
		        throw new Error(`Unknown asset payload type: ${String(type)}`);
		    }
		    const [a, b, c] = ASSET_MARKER_BYTES[resolveAssetMarker(marker)];
		    return Uint8Array.of(a, b, c, typeByte);
		}
		function inferNetworkFromAddress(address) {
		    const normalized = resolveAddressInput(address).toLowerCase();
		    if (normalized.startsWith(PQ_MAINNET_HRP + '1'))
		        return 'xna-pq';
		    if (normalized.startsWith(PQ_TESTNET_HRP + '1'))
		        return 'xna-pq-test';
		    if (normalized.startsWith('n'))
		        return 'xna';
		    if (normalized.startsWith('t'))
		        return 'xna-test';
		    throw new Error(`Unsupported Neurai address: ${address}`);
		}

		function decodeAddress(address) {
		    const normalized = resolveAddressInput(address);
		    const lowered = normalized.toLowerCase();
		    if (!normalized)
		        throw new Error('Address is required');
		    if (lowered.startsWith(PQ_MAINNET_HRP + '1') || lowered.startsWith(PQ_TESTNET_HRP + '1')) {
		        const decoded = distExports.bech32m.decode(normalized);
		        const version = decoded.words[0];
		        const program = Uint8Array.from(distExports.bech32m.fromWords(decoded.words.slice(1)));
		        if (version !== 1 || program.length !== 32) {
		            throw new Error(`Unsupported AuthScript address program for ${address}`);
		        }
		        const network = lowered.startsWith(PQ_TESTNET_HRP + '1') ? 'xna-pq-test' : 'xna-pq';
		        return { address: normalized, type: 'authscript', network, program, commitment: program };
		    }
		    const payload = Uint8Array.from(bs58check.decode(normalized));
		    if (payload.length !== 21) {
		        throw new Error(`Unsupported legacy address payload length for ${address}`);
		    }
		    const prefix = payload[0];
		    if (prefix !== LEGACY_MAINNET_PREFIX && prefix !== LEGACY_TESTNET_PREFIX) {
		        throw new Error(`Unsupported legacy address prefix ${prefix} for ${address}`);
		    }
		    return {
		        address: normalized,
		        type: 'p2pkh',
		        network: inferNetworkFromAddress(normalized),
		        program: payload.slice(1),
		        hash: payload.slice(1)
		    };
		}
		function encodeP2PKHScript(address) {
		    const destination = decodeAddress(address);
		    if (destination.type !== 'p2pkh') {
		        throw new Error(`Address ${address} is not legacy P2PKH`);
		    }
		    return Uint8Array.of(0x76, 0xa9, 0x14, ...destination.hash, 0x88, 0xac);
		}
		function encodeAuthScriptDestinationScript(address) {
		    const destination = decodeAddress(address);
		    if (destination.type !== 'authscript') {
		        throw new Error(`Address ${address} is not AuthScript witness v1`);
		    }
		    return concatBytes(Uint8Array.of(OP_1), pushData(destination.commitment));
		}
		function encodeDestinationScript(address) {
		    const destination = decodeAddress(address);
		    return destination.type === 'authscript'
		        ? encodeAuthScriptDestinationScript(address)
		        : encodeP2PKHScript(address);
		}
		function encodeNullAssetDestinationScript(address, mode = 'strict') {
		    const destination = decodeAddress(address);
		    if (destination.type === 'authscript') {
		        if (mode === 'hash20') {
		            throw new Error('hash20 null-asset mode is not supported for AuthScript destinations');
		        }
		        return concatBytes(Uint8Array.of(OP_XNA_ASSET, OP_1), pushData(destination.commitment));
		    }
		    return concatBytes(Uint8Array.of(OP_XNA_ASSET), pushData(destination.hash));
		}
		const encodePQWitnessScript = encodeAuthScriptDestinationScript;

		const OWNER_ASSET_AMOUNT = 100000000n;
		const UNIQUE_ASSET_AMOUNT = 100000000n;
		const UNIQUE_ASSET_UNITS = 0;
		const UNIQUE_ASSETS_REISSUABLE = false;
		const MAINNET_BURN_ADDRESSES = {
		    ISSUE_ROOT: 'NbURNXXXXXXXXXXXXXXXXXXXXXXXT65Gdr',
		    ISSUE_SUB: 'NXissueSubAssetXXXXXXXXXXXXXX6B2JF',
		    ISSUE_UNIQUE: 'NXissueUniqueAssetXXXXXXXXXXUBzP4Z',
		    ISSUE_DEPIN: 'NXissueUniqueAssetXXXXXXXXXXUBzP4Z',
		    ISSUE_MSGCHANNEL: 'NXissueMsgChanneLAssetXXXXXXTUzrtJ',
		    REISSUE: 'NXReissueAssetXXXXXXXXXXXXXXWLe4Ao',
		    REISSUE_RESTRICTED: 'NXReissueAssetXXXXXXXXXXXXXXWLe4Ao',
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
		    ISSUE_DEPIN: 'tUniqueAssetXXXXXXXXXXXXXXXXVCgpLs',
		    ISSUE_MSGCHANNEL: 'tMsgChanneLAssetXXXXXXXXXXXXVsJoya',
		    REISSUE: 'tAssetXXXXXXXXXXXXXXXXXXXXXXas6pz8',
		    REISSUE_RESTRICTED: 'tAssetXXXXXXXXXXXXXXXXXXXXXXas6pz8',
		    ISSUE_RESTRICTED: 'tRestrictedXXXXXXXXXXXXXXXXXVyPBEK',
		    ISSUE_QUALIFIER: 'tQuaLifierXXXXXXXXXXXXXXXXXXT5czoV',
		    ISSUE_SUB_QUALIFIER: 'tSubQuaLifierXXXXXXXXXXXXXXXW5MmGk',
		    TAG_ADDRESS: 'tTagBurnXXXXXXXXXXXXXXXXXXXXYm6pxA',
		    UNTAG_ADDRESS: 'tTagBurnXXXXXXXXXXXXXXXXXXXXYm6pxA'
		};
		const BURN_COSTS_XNA = {
		    ISSUE_ROOT: 1000,
		    ISSUE_SUB: 200,
		    ISSUE_UNIQUE: 10,
		    ISSUE_DEPIN: 10,
		    ISSUE_MSGCHANNEL: 200,
		    ISSUE_QUALIFIER: 2000,
		    ISSUE_SUB_QUALIFIER: 200,
		    ISSUE_RESTRICTED: 3000,
		    REISSUE: 200,
		    REISSUE_RESTRICTED: 200,
		    TAG_ADDRESS: 0.2,
		    UNTAG_ADDRESS: 0.2
		};
		// Regtest chainparams use one global burn address for every operation
		// (node chainparams.cpp strGlobalBurnAddress). Pass it as the
		// `burnAddress` override of the issuance/reissue builders when targeting
		// regtest; `getBurnAddressForOperation` only models mainnet/testnet.
		const REGTEST_GLOBAL_BURN_ADDRESS = 'tBURNXXXXXXXXXXXXXXXXXXXXXXXVZLroy';
		/**
		 * Every value `SupportedNetwork` admits, and the chain family each belongs to.
		 *
		 * Written as an exhaustive map rather than a couple of comparisons so that a
		 * network added to the union upstream fails to compile here instead of
		 * silently defaulting to testnet.
		 */
		const NETWORK_FAMILY = {
		    'xna': 'mainnet',
		    'xna-legacy': 'mainnet',
		    'xna-pq': 'mainnet',
		    'xna-test': 'testnet',
		    'xna-legacy-test': 'testnet',
		    'xna-pq-test': 'testnet'
		};
		/**
		 * Resolve a network to its chain family, rejecting anything unrecognised.
		 *
		 * This used to return `'testnet'` for every value that was not explicitly
		 * mainnet. TypeScript keeps its own callers honest, but a JavaScript consumer
		 * passing the alias `'mainnet'` — which other libraries in the stack accept —
		 * landed in the testnet branch and **slipped past the DEPIN mainnet guard**,
		 * while the canonical `'xna'` triggered it. An unrecognised label is a caller
		 * error, not an implicit testnet.
		 *
		 * Callers that speak in aliases must normalize first: `'mainnet'` to `'xna'`,
		 * `'testnet'` to `'xna-test'`.
		 *
		 * Regtest is not a member of `SupportedNetwork` — it shares testnet's address
		 * prefixes — and now throws here. That reaches `getBurnAddressForOperation`,
		 * which used to answer with the TESTNET burn addresses: wrong for regtest,
		 * whose chainparams use a single global burn address for every operation, so
		 * only ISSUE_ROOT happened to coincide. Pass `REGTEST_GLOBAL_BURN_ADDRESS` as
		 * the `burnAddress` override instead; the previous answer had to be replaced
		 * anyway.
		 *
		 * @param network - Network label
		 * @returns The chain family
		 * @throws If the label is not a supported network
		 */
		function resolveNetworkFamily(network) {
		    const family = NETWORK_FAMILY[network];
		    if (family === undefined) {
		        throw new Error(`Unsupported network: ${JSON.stringify(network)}. Expected one of ` +
		            `${Object.keys(NETWORK_FAMILY).join(', ')}. Aliases such as 'mainnet' ` +
		            `or 'testnet' must be normalized by the caller ('xna', 'xna-test'); ` +
		            `for regtest, pass REGTEST_GLOBAL_BURN_ADDRESS as the burnAddress override.`);
		    }
		    return family;
		}
		function getBurnAddressForOperation(network, operation) {
		    const byFamily = resolveNetworkFamily(network) === 'mainnet'
		        ? MAINNET_BURN_ADDRESSES
		        : TESTNET_BURN_ADDRESSES;
		    return byFamily[operation];
		}
		function getBurnAmountXna(operation, multiplier = 1) {
		    return BURN_COSTS_XNA[operation] * multiplier;
		}
		function getBurnAmountSats(operation, multiplier = 1) {
		    return BigInt(Math.round(getBurnAmountXna(operation, multiplier) * 1e8));
		}
		function inferNetworkFromAnyAddress(address) {
		    return inferNetworkFromAddress(address);
		}
		function getOwnerTokenName(assetName) {
		    if (assetName.startsWith('$')) {
		        return `${assetName.slice(1)}!`;
		    }
		    return `${assetName}!`;
		}
		function getParentAssetName(assetName) {
		    // The parent is the immediate one, not the root: "A/B/C" is owned by "A/B!"
		    // (node GetParentName resolves with find_last_of for SUB and DEPIN alike).
		    const slashIndex = assetName.lastIndexOf('/');
		    if (slashIndex === -1) {
		        return null;
		    }
		    return assetName.slice(0, slashIndex);
		}
		function getUniqueAssetName(rootName, tag) {
		    return `${rootName}#${tag}`;
		}
		function normalizeVerifierString(verifierString) {
		    return String(verifierString || '')
		        .replace(/\s+/g, '')
		        .replace(/#/g, '');
		}
		// The node accepts DEPIN names up to 121 chars where DePIN is enabled, but a
		// 121-char base name yields a 122-char owner token ("&X!") that fails the
		// global name-length check, making the asset untransferable. Capped at 120
		// here so every name this library issues keeps a nameable owner token.
		const DEPIN_MAX_NAME_LENGTH = 120;
		function isDepinAssetName(assetName) {
		    const normalized = String(assetName || '').trim();
		    if (normalized.length > DEPIN_MAX_NAME_LENGTH) {
		        return false;
		    }
		    if (!normalized.includes('/')) {
		        return /^&[A-Z0-9._]{3,}$/.test(normalized);
		    }
		    if (!/^&[A-Z0-9._]+\/[A-Z0-9._/]+$/.test(normalized)) {
		        return false;
		    }
		    // The node parser lets the first part count its leading '&' toward the
		    // 3-char minimum ("&AB/CDE" parses), but such an asset can never be issued:
		    // its parent "&AB" is not a valid root, so the parent owner token "&AB!"
		    // required at issuance cannot exist. Require 3 real chars in every segment.
		    const [root, ...rest] = normalized.split('/');
		    return root.length >= 4 && rest.every((part) => part.length >= 3);
		}
		function assertDepinAssetName(assetName) {
		    if (!isDepinAssetName(assetName)) {
		        throw new Error(`Invalid DEPIN asset name: ${assetName}`);
		    }
		}
		function assertDepinNetwork(network) {
		    if (network !== undefined && resolveNetworkFamily(network) === 'mainnet') {
		        throw new Error(`DEPIN assets are only available on testnet/regtest networks: ${network}`);
		    }
		}

		function xnaToSatoshis(amount) {
		    return BigInt(Math.round(Number(amount || 0) * 1e8));
		}
		function assetUnitsToRaw(amount) {
		    return xnaToSatoshis(amount);
		}
		function encodeAssetTransferPayload(assetName, amountRaw, message, expireTime, options) {
		    const payload = [
		        assetPayloadPrefix(options?.assetMarker, 'transfer'),
		        serializeString(assetName),
		        u64LE(amountRaw)
		    ];
		    const encodedMessage = encodeAssetDataReference(message);
		    if (encodedMessage.length > 0) {
		        payload.push(encodedMessage);
		        if (expireTime !== undefined && BigInt(expireTime) !== 0n) {
		            payload.push(i64LE(expireTime));
		        }
		    }
		    return concatBytes(...payload);
		}
		function encodeAssetTransferScript(address, assetName, amountRaw, message, expireTime, options) {
		    return concatBytes(encodeDestinationScript(address), Uint8Array.of(OP_XNA_ASSET), pushData(encodeAssetTransferPayload(assetName, amountRaw, message, expireTime, options)), Uint8Array.of(OP_DROP));
		}
		/**
		 * True when `script` is exactly the 25-byte P2PKH form
		 * `OP_DUP OP_HASH160 0x14 <20B> OP_EQUALVERIFY OP_CHECKSIG`. Consensus only
		 * recognises the asset wrapper when OP_XNA_ASSET sits at byte 25 after this
		 * exact prefix (node `HasAssetOpcodeInExpectedPosition`).
		 */
		function isP2pkhScript(script) {
		    return (script.length === 25 &&
		        script[0] === 0x76 &&
		        script[1] === 0xa9 &&
		        script[2] === 0x14 &&
		        script[23] === 0x88 &&
		        script[24] === 0xac);
		}
		/**
		 * True when `script` is exactly the 34-byte AuthScript form
		 * `OP_1 0x20 <32-byte commitment>`. Consensus only recognises the asset
		 * wrapper when OP_XNA_ASSET sits at byte 34 after this exact prefix.
		 */
		function isAuthScriptScript(script) {
		    return script.length === 34 && script[0] === 0x51 && script[1] === 0x20;
		}
		/**
		 * Like `encodeAssetTransferScript` but takes a raw scriptPubKey instead of
		 * deriving one from an address, for callers that already hold the
		 * scriptPubKey bytes.
		 *
		 * The recipient script must be exactly P2PKH (25 bytes) or AuthScript
		 * `OP_1 <32B>` (34 bytes): the node's OP_XNA_ASSET placement rules only
		 * accept the asset wrapper right after one of those two prefixes, on every
		 * network, so appending it to any other script (a bare covenant, P2SH, …)
		 * produces a consensus-invalid output. To pay assets into an arbitrary
		 * script, commit it into an AuthScript destination instead (derive the
		 * address with neurai-key's `getNoAuthAddress`) and use the regular
		 * address-based transfer helpers.
		 *
		 * The asset-transfer wrapper is appended exactly as in the address-based
		 * variant: `<recipientScriptPubKey> OP_XNA_ASSET <pushdata(payload)> OP_DROP`.
		 *
		 * Note: this helper only builds the output. Spending an AuthScript output
		 * takes a witness stack; `createUnsignedTransaction` serializes the legacy
		 * pre-segwit format only, so serialize such spends with the transaction
		 * codec's `serializeTransaction` (tx-codec.ts, 0.5.1+) instead.
		 */
		function encodeAssetTransferScriptToScript(recipientScriptPubKey, assetName, amountRaw, message, expireTime, options) {
		    const spkBytes = typeof recipientScriptPubKey === 'string'
		        ? hexToBytes(ensureHex(recipientScriptPubKey, 'recipientScriptPubKey'))
		        : recipientScriptPubKey;
		    if (!isP2pkhScript(spkBytes) && !isAuthScriptScript(spkBytes)) {
		        throw new Error('asset transfers to arbitrary scripts are rejected by consensus ' +
		            '(OP_XNA_ASSET placement rules): the recipient scriptPubKey must be ' +
		            'exactly P2PKH (25 bytes) or AuthScript OP_1 <32B> (34 bytes); ' +
		            'commit the script into an AuthScript destination instead');
		    }
		    return concatBytes(spkBytes, Uint8Array.of(OP_XNA_ASSET), pushData(encodeAssetTransferPayload(assetName, amountRaw, message, expireTime, options)), Uint8Array.of(OP_DROP));
		}
		function encodeNewAssetPayload(assetName, quantityRaw, units = 0, reissuable = true, ipfsHash, options) {
		    const encodedIpfs = encodeAssetDataReference(ipfsHash);
		    return concatBytes(assetPayloadPrefix(options?.assetMarker, 'new'), serializeString(assetName), u64LE(quantityRaw), Uint8Array.of(units & 0xff, reissuable ? 1 : 0, encodedIpfs.length > 0 ? 1 : 0), encodedIpfs);
		}
		function encodeNewAssetScript(address, assetName, quantityRaw, units = 0, reissuable = true, ipfsHash, options) {
		    return concatBytes(encodeDestinationScript(address), Uint8Array.of(OP_XNA_ASSET), pushData(encodeNewAssetPayload(assetName, quantityRaw, units, reissuable, ipfsHash, options)), Uint8Array.of(OP_DROP));
		}
		function encodeOwnerAssetPayload(ownerTokenName, options) {
		    return concatBytes(assetPayloadPrefix(options?.assetMarker, 'owner'), serializeString(ownerTokenName));
		}
		function encodeOwnerAssetScript(address, ownerTokenName, options) {
		    return concatBytes(encodeDestinationScript(address), Uint8Array.of(OP_XNA_ASSET), pushData(encodeOwnerAssetPayload(ownerTokenName, options)), Uint8Array.of(OP_DROP));
		}
		/** "Keep the asset's current units", encoded as the signed byte -1 (0xff). */
		const REISSUE_UNITS_UNCHANGED = -1;
		/**
		 * Resolve the `units` byte of a reissue payload.
		 *
		 * Omitting `units` means "do not change them", which the protocol spells `-1`
		 * (`0xff`) — the value the node's own `reissue` RPC defaults to. Its
		 * validation is `nNewUnits == -1 || nNewUnits >= currentUnits`, so the
		 * previous default of `0` said "set units to 0" and was rejected outright for
		 * any asset with `units > 0` (`unit must be larger than current unit
		 * selection`).
		 *
		 * An explicit `0` still encodes `0x00`: it is legitimate for an asset that
		 * already has `units=0`, and folding it into -1 would lose the distinction in
		 * the other direction.
		 *
		 * The range is validated rather than masked. `units & 0xff` used to turn `-2`
		 * into `0xfe` and `255` into `0xff` — manufacturing a valid-looking
		 * "unchanged" byte out of an invalid input.
		 *
		 * @param units - Requested units, or undefined to keep the current ones
		 * @returns The byte to encode
		 * @throws If units is not an integer in -1..8
		 */
		function reissueUnitsByte(units) {
		    const resolved = units ?? REISSUE_UNITS_UNCHANGED;
		    if (!Number.isInteger(resolved) || resolved < -1 || resolved > 8) {
		        throw new Error(`Invalid reissue units: ${units}. Use an integer 0..8 to set the units, ` +
		            `or -1 (or omit it) to keep the asset's current units.`);
		    }
		    return resolved & 0xff;
		}
		function encodeReissueAssetPayload(assetName, quantityRaw, units, reissuable = true, ipfsHash, options) {
		    return concatBytes(assetPayloadPrefix(options?.assetMarker, 'reissue'), serializeString(assetName), u64LE(quantityRaw), Uint8Array.of(reissueUnitsByte(units), reissuable ? 1 : 0), encodeAssetDataReference(ipfsHash));
		}
		function encodeReissueAssetScript(address, assetName, quantityRaw, units, reissuable = true, ipfsHash, options) {
		    return concatBytes(encodeDestinationScript(address), Uint8Array.of(OP_XNA_ASSET), pushData(encodeReissueAssetPayload(assetName, quantityRaw, units, reissuable, ipfsHash, options)), Uint8Array.of(OP_DROP));
		}
		function encodeNullAssetDataPayload(assetName, flag) {
		    const nameBytes = asciiBytes(assetName);
		    return concatBytes(compactSize(nameBytes.length), nameBytes, Uint8Array.of(flag & 0xff));
		}
		function encodeNullAssetTagPayload(qualifierName, operation) {
		    return encodeNullAssetDataPayload(qualifierName, operation === 'tag' ? 1 : 0);
		}
		function encodeNullAssetTagScript(address, qualifierName, operation, mode = 'strict') {
		    return concatBytes(encodeNullAssetDestinationScript(address, mode), pushData(encodeNullAssetTagPayload(qualifierName, operation)));
		}
		function encodeNullAssetRestrictionScript(address, assetName, freezeFlag, mode = 'strict') {
		    return concatBytes(encodeNullAssetDestinationScript(address, mode), pushData(encodeNullAssetDataPayload(assetName, freezeFlag)));
		}
		function encodeVerifierStringPayload(verifierString) {
		    return serializeString(verifierString);
		}
		function encodeVerifierStringScript(verifierString) {
		    return concatBytes(Uint8Array.of(OP_XNA_ASSET, OP_RESERVED), pushData(encodeVerifierStringPayload(verifierString)));
		}
		function encodeGlobalRestrictionScript(assetName, freezeFlag) {
		    return concatBytes(Uint8Array.of(OP_XNA_ASSET, OP_RESERVED, OP_RESERVED), pushData(encodeNullAssetDataPayload(assetName, freezeFlag)));
		}
		function createXnaOutput(address, valueSats) {
		    return {
		        valueSats: typeof valueSats === 'bigint' ? valueSats : BigInt(valueSats),
		        scriptPubKeyHex: bytesToHex(encodeDestinationScript(address))
		    };
		}
		function createAssetTransferOutput(address, assetName, amountRaw, options) {
		    return {
		        valueSats: 0n,
		        scriptPubKeyHex: bytesToHex(encodeAssetTransferScript(address, assetName, amountRaw, undefined, undefined, options))
		    };
		}
		function createTransferWithMessageOutput(params) {
		    return {
		        valueSats: 0n,
		        scriptPubKeyHex: bytesToHex(encodeAssetTransferScript(params.address, params.assetName, params.amountRaw, params.message, params.expireTime, { assetMarker: params.assetMarker }))
		    };
		}
		function createOwnerAssetIssueOutput(address, ownerTokenName, options) {
		    return {
		        valueSats: 0n,
		        scriptPubKeyHex: bytesToHex(encodeOwnerAssetScript(address, ownerTokenName, options))
		    };
		}
		function createOwnerAssetTransferOutput(address, ownerTokenName, options) {
		    return {
		        valueSats: 0n,
		        scriptPubKeyHex: bytesToHex(encodeAssetTransferScript(address, ownerTokenName, OWNER_ASSET_AMOUNT, undefined, undefined, options))
		    };
		}
		function createIssueAssetOutput(params) {
		    return {
		        valueSats: 0n,
		        scriptPubKeyHex: bytesToHex(encodeNewAssetScript(params.address, params.assetName, params.quantityRaw, params.units ?? 0, params.reissuable ?? true, params.ipfsHash, { assetMarker: params.assetMarker }))
		    };
		}
		function createReissueAssetOutput(params) {
		    return {
		        valueSats: 0n,
		        scriptPubKeyHex: bytesToHex(encodeReissueAssetScript(params.address, params.assetName, params.quantityRaw, 
		        // Omitted means "keep the current units" (-1); do NOT collapse to 0.
		        params.units, params.reissuable ?? true, params.ipfsHash, { assetMarker: params.assetMarker }))
		    };
		}
		function createNullAssetTagOutput(address, qualifierName, operation, mode = 'strict') {
		    return {
		        valueSats: 0n,
		        scriptPubKeyHex: bytesToHex(encodeNullAssetTagScript(address, qualifierName, operation, mode))
		    };
		}
		function createNullAssetRestrictionOutput(address, assetName, freezeFlag, mode = 'strict') {
		    return {
		        valueSats: 0n,
		        scriptPubKeyHex: bytesToHex(encodeNullAssetRestrictionScript(address, assetName, freezeFlag, mode))
		    };
		}
		function createVerifierStringOutput(verifierString) {
		    return {
		        valueSats: 0n,
		        scriptPubKeyHex: bytesToHex(encodeVerifierStringScript(verifierString))
		    };
		}
		function createGlobalRestrictionOutput(assetName, freezeFlag) {
		    return {
		        valueSats: 0n,
		        scriptPubKeyHex: bytesToHex(encodeGlobalRestrictionScript(assetName, freezeFlag))
		    };
		}
		function createTransferOutput(params) {
		    return createAssetTransferOutput(params.address, params.assetName, params.amountRaw, {
		        assetMarker: params.assetMarker
		    });
		}
		/**
		 * Build a SerializedTxOutput that locks `amountRaw` of `assetName` under a
		 * raw P2PKH or AuthScript scriptPubKey (the only shapes consensus accepts —
		 * see `encodeAssetTransferScriptToScript`; covenants go through neurai-key's
		 * `getNoAuthAddress` and the address-based helpers). `valueSats` is
		 * hardcoded to 0n (asset-only outputs carry no XNA; matches
		 * `createAssetTransferOutput` semantics).
		 */
		function createAssetTransferToScriptOutput(params) {
		    return {
		        valueSats: 0n,
		        scriptPubKeyHex: bytesToHex(encodeAssetTransferScriptToScript(params.scriptPubKeyHex, params.assetName, params.amountRaw, params.message, params.expireTime, { assetMarker: params.assetMarker }))
		    };
		}

		function serializeInput(input) {
		    const txidBytes = reverseBytes(hexToBytes(input.txid));
		    const scriptSig = input.scriptSigHex ? hexToBytes(input.scriptSigHex) : new Uint8Array();
		    return concatBytes(txidBytes, u32LE(input.vout), compactSize(scriptSig.length), scriptSig, u32LE(input.sequence ?? 0xffffffff));
		}
		function serializeOutput(output) {
		    const scriptPubKey = hexToBytes(ensureHex(output.scriptPubKeyHex, 'scriptPubKeyHex'));
		    return concatBytes(u64LE(output.valueSats), compactSize(scriptPubKey.length), scriptPubKey);
		}
		function createUnsignedTransaction(tx) {
		    const version = tx.version ?? 2;
		    const locktime = tx.locktime ?? 0;
		    const inputs = tx.inputs.map(serializeInput);
		    const outputs = tx.outputs.map(serializeOutput);
		    const bytes = concatBytes(u32LE(version), compactSize(inputs.length), ...inputs, compactSize(outputs.length), ...outputs, u32LE(locktime));
		    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
		}

		function buildTransaction(version, locktime, inputs, outputs) {
		    return {
		        rawTx: createUnsignedTransaction({
		            version: version ?? 2,
		            locktime: locktime ?? 0,
		            inputs,
		            outputs
		        }),
		        outputs
		    };
		}
		function appendXnaEnvelope(outputs, burnAddress, burnAmountSats, changeAddress, changeSats) {
		    if (burnAddress && burnAmountSats !== undefined && BigInt(burnAmountSats) > 0n) {
		        outputs.push(createXnaOutput(burnAddress, burnAmountSats));
		    }
		    if (changeAddress && changeSats !== undefined && BigInt(changeSats) > 0n) {
		        outputs.push(createXnaOutput(changeAddress, changeSats));
		    }
		}
		function appendExtraOutputs(outputs, extraOutputs) {
		    if (extraOutputs?.length) {
		        outputs.push(...extraOutputs);
		    }
		}
		/**
		 * Null-asset data flag: 1 freezes, 0 unfreezes.
		 *
		 * Consensus accepts nothing else. The node's `VerifyNullAssetDataFlag`
		 * (`src/assets/assets.cpp`) rejects any other value with
		 * `bad-txns-null-data-flag-must-be-0-or-1`, and it takes neither the network
		 * nor the height, so the mapping is identical on mainnet, testnet and regtest.
		 *
		 * These same two values serve the per-address restriction, the qualifier
		 * tag/untag AND the global restriction: `VerifyRestrictedAddressChange`,
		 * `VerifyQualifierChange` and `VerifyGlobalRestrictedChange` all delegate to
		 * that one check. Captured from the node's own transactions:
		 *
		 *   freezerestrictedasset   $PROBE → c0505008062450524f424501   (flag 01)
		 *   unfreezerestrictedasset $PROBE → c0505008062450524f424500   (flag 00)
		 *
		 * Until 0.7.1 the global restriction added 2 to this value, emitting 3 and 2,
		 * which the node rejected outright.
		 */
		function freezeFlagFromOperation(operation) {
		    return operation === 'freeze' ? 1 : 0;
		}
		// NIP-040: the transaction-level marker reaches every asset output a builder
		// creates; an output-level marker wins. `extraOutputs` are never touched.
		function marker(params) {
		    return { assetMarker: params.assetMarker };
		}
		function withMarker(output, params) {
		    return output.assetMarker === undefined && params.assetMarker !== undefined
		        ? { ...output, assetMarker: params.assetMarker }
		        : output;
		}
		// Compare by decoded destination script, not by address text: two encodings of
		// the same destination (e.g. different Bech32 case) must count as equal.
		function sameDestination(a, b) {
		    return bytesToHex(encodeDestinationScript(a)) === bytesToHex(encodeDestinationScript(b));
		}
		function createPaymentTransaction(params) {
		    const outputs = [
		        ...params.payments.map((payment) => createXnaOutput(payment.address, payment.valueSats)),
		        ...(params.extraOutputs ?? [])
		    ];
		    return buildTransaction(params.version, params.locktime, params.inputs, outputs);
		}
		function createStandardAssetTransferTransaction(params) {
		    // Output order is fixed:
		    //   payments → transfers → transferMessages → transfersToScript → extraOutputs.
		    // Keep transfersToScript after transferMessages so indices of existing
		    // callers (payments + transfers + transferMessages) remain stable.
		    const outputs = [];
		    for (const payment of params.payments ?? []) {
		        outputs.push(createXnaOutput(payment.address, payment.valueSats));
		    }
		    for (const transfer of params.transfers ?? []) {
		        outputs.push(createTransferOutput(withMarker(transfer, params)));
		    }
		    for (const transfer of params.transferMessages ?? []) {
		        outputs.push(createTransferWithMessageOutput(withMarker(transfer, params)));
		    }
		    for (const transfer of params.transfersToScript ?? []) {
		        outputs.push(createAssetTransferToScriptOutput(withMarker(transfer, params)));
		    }
		    appendExtraOutputs(outputs, params.extraOutputs);
		    return buildTransaction(params.version, params.locktime, params.inputs, outputs);
		}
		function createIssueAssetTransaction(params) {
		    const outputs = [];
		    appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
		    // Consensus locates issuance outputs positionally (issue at vout[n-1], owner
		    // at vout[n-2]), so extraOutputs must come before them, not after.
		    appendExtraOutputs(outputs, params.extraOutputs);
		    if (params.includeOwnerOutput ?? true) {
		        outputs.push(createOwnerAssetIssueOutput(params.ownerTokenAddress ?? params.toAddress, params.ownerTokenName ?? getOwnerTokenName(params.assetName), marker(params)));
		    }
		    outputs.push(createIssueAssetOutput({
		        address: params.toAddress,
		        assetName: params.assetName,
		        quantityRaw: params.quantityRaw,
		        units: params.units ?? 0,
		        reissuable: params.reissuable ?? true,
		        ipfsHash: params.ipfsHash,
		        assetMarker: params.assetMarker
		    }));
		    return buildTransaction(params.version, params.locktime, params.inputs, outputs);
		}
		function createIssueSubAssetTransaction(params) {
		    const parentAssetName = getParentAssetName(params.assetName);
		    if (!parentAssetName) {
		        throw new Error(`Sub-asset name must contain '/': ${params.assetName}`);
		    }
		    const outputs = [];
		    appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
		    appendExtraOutputs(outputs, params.extraOutputs);
		    outputs.push(createOwnerAssetTransferOutput(params.parentOwnerAddress ?? params.xnaChangeAddress ?? params.toAddress, getOwnerTokenName(parentAssetName), marker(params)));
		    outputs.push(createOwnerAssetIssueOutput(params.ownerTokenAddress ?? params.toAddress, getOwnerTokenName(params.assetName), marker(params)));
		    outputs.push(createIssueAssetOutput({
		        address: params.toAddress,
		        assetName: params.assetName,
		        quantityRaw: params.quantityRaw,
		        units: params.units ?? 0,
		        reissuable: params.reissuable ?? true,
		        ipfsHash: params.ipfsHash,
		        assetMarker: params.assetMarker
		    }));
		    return buildTransaction(params.version, params.locktime, params.inputs, outputs);
		}
		function createIssueDepinTransaction(params) {
		    assertDepinAssetName(params.assetName);
		    assertDepinNetwork(params.network);
		    if (BigInt(params.quantityRaw) <= 0n) {
		        throw new Error('DEPIN issue quantity must be positive');
		    }
		    if (params.reissuable !== undefined && typeof params.reissuable !== 'boolean') {
		        throw new Error('DEPIN reissuable must be boolean when provided');
		    }
		    // A sub-DEPIN ("&X/Y") must transfer the immediate parent's owner token in
		    // the issuing transaction, exactly like sub-assets. It stays AssetType DEPIN
		    // (same burn as the root), so only the output layout follows the sub flow.
		    if (getParentAssetName(params.assetName)) {
		        return createIssueSubAssetTransaction({
		            ...params,
		            units: 0,
		            reissuable: params.reissuable ?? true,
		            parentOwnerAddress: params.parentOwnerAddress,
		            ownerTokenAddress: params.ownerTokenAddress ?? params.toAddress
		        });
		    }
		    return createIssueAssetTransaction({
		        ...params,
		        units: 0,
		        includeOwnerOutput: true,
		        ownerTokenAddress: params.ownerTokenAddress ?? params.toAddress,
		        reissuable: params.reissuable ?? true
		    });
		}
		function createDepinTransferTransaction(params) {
		    assertDepinNetwork(params.network);
		    if (!params.transfers?.length) {
		        throw new Error('DEPIN transfer requires at least one transfer');
		    }
		    const assetName = params.transfers[0].assetName;
		    assertDepinAssetName(assetName);
		    for (const transfer of params.transfers) {
		        if (transfer.assetName !== assetName) {
		            throw new Error(`DEPIN transfers must all move the same asset (got ${transfer.assetName} and ${assetName}); build one transaction per DEPIN asset`);
		        }
		        if (BigInt(transfer.amountRaw) <= 0n) {
		            throw new Error(`DEPIN transfer amount must be positive: ${assetName}`);
		        }
		    }
		    const outputs = [];
		    for (const transfer of params.transfers) {
		        outputs.push(createTransferOutput(withMarker(transfer, params)));
		    }
		    // Soulbound escort: consensus also requires SPENDING an "&X!" UTXO, which
		    // must be present in params.inputs (this package does not select UTXOs).
		    outputs.push(createOwnerAssetTransferOutput(params.ownerChangeAddress, getOwnerTokenName(assetName), marker(params)));
		    appendXnaEnvelope(outputs, undefined, undefined, params.xnaChangeAddress, params.xnaChangeSats);
		    appendExtraOutputs(outputs, params.extraOutputs);
		    return buildTransaction(params.version, params.locktime, params.inputs, outputs);
		}
		function createDepinSelfRevokeTransaction(params) {
		    assertDepinAssetName(params.assetName);
		    assertDepinNetwork(params.network);
		    if (BigInt(params.amountRaw) <= 0n) {
		        throw new Error('DEPIN self-revoke amount must be positive');
		    }
		    // Exact consensus pattern: one self-transfer of "&X" back to the holder plus
		    // one null-data with flag 1 (the only valid flag without the owner token).
		    // No owner token, no burn. The input-side rules live on the caller — see
		    // DepinSelfRevokeTransactionParams.
		    const outputs = [
		        createAssetTransferOutput(params.holderAddress, params.assetName, params.amountRaw, marker(params)),
		        createNullAssetRestrictionOutput(params.holderAddress, params.assetName, 1, params.nullAssetDestinationMode ?? 'strict')
		    ];
		    appendXnaEnvelope(outputs, undefined, undefined, params.xnaChangeAddress, params.xnaChangeSats);
		    appendExtraOutputs(outputs, params.extraOutputs);
		    return buildTransaction(params.version, params.locktime, params.inputs, outputs);
		}
		function createIssueUniqueAssetTransaction(params) {
		    const outputs = [];
		    appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
		    appendExtraOutputs(outputs, params.extraOutputs);
		    outputs.push(createOwnerAssetTransferOutput(params.ownerTokenAddress ?? params.toAddress, getOwnerTokenName(params.rootName), marker(params)));
		    for (let index = 0; index < params.assetTags.length; index += 1) {
		        outputs.push(createIssueAssetOutput({
		            address: params.toAddress,
		            assetName: getUniqueAssetName(params.rootName, params.assetTags[index]),
		            quantityRaw: UNIQUE_ASSET_AMOUNT,
		            units: UNIQUE_ASSET_UNITS,
		            reissuable: UNIQUE_ASSETS_REISSUABLE,
		            ipfsHash: params.ipfsHashes?.[index],
		            assetMarker: params.assetMarker
		        }));
		    }
		    return buildTransaction(params.version, params.locktime, params.inputs, outputs);
		}
		function createIssueQualifierTransaction(params) {
		    const outputs = [];
		    appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
		    appendExtraOutputs(outputs, params.extraOutputs);
		    const parentQualifier = getParentAssetName(params.assetName);
		    if (parentQualifier) {
		        outputs.push(createAssetTransferOutput(params.rootChangeAddress ?? params.xnaChangeAddress ?? params.toAddress, parentQualifier, params.changeQuantityRaw ?? OWNER_ASSET_AMOUNT, marker(params)));
		    }
		    outputs.push(createIssueAssetOutput({
		        address: params.toAddress,
		        assetName: params.assetName,
		        quantityRaw: params.quantityRaw,
		        units: 0,
		        reissuable: false,
		        ipfsHash: params.ipfsHash,
		        assetMarker: params.assetMarker
		    }));
		    return buildTransaction(params.version, params.locktime, params.inputs, outputs);
		}
		function createIssueRestrictedTransaction(params) {
		    const outputs = [];
		    appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
		    appendExtraOutputs(outputs, params.extraOutputs);
		    outputs.push(createVerifierStringOutput(normalizeVerifierString(params.verifierString)));
		    outputs.push(createOwnerAssetTransferOutput(params.ownerChangeAddress ?? params.toAddress, getOwnerTokenName(params.assetName), marker(params)));
		    outputs.push(createIssueAssetOutput({
		        address: params.toAddress,
		        assetName: params.assetName,
		        quantityRaw: params.quantityRaw,
		        units: params.units ?? 0,
		        reissuable: params.reissuable ?? true,
		        ipfsHash: params.ipfsHash,
		        assetMarker: params.assetMarker
		    }));
		    return buildTransaction(params.version, params.locktime, params.inputs, outputs);
		}
		function createReissueTransaction(params) {
		    if (isDepinAssetName(params.assetName)) {
		        // DEPIN reissue: units must stay 0 (-1 means "keep"), and the owner-token
		        // change must return to the destination address itself.
		        if (params.units !== undefined && params.units !== 0 && params.units !== -1) {
		            throw new Error('DEPIN reissue units must be 0 or -1 (keep)');
		        }
		        if (params.ownerChangeAddress !== undefined &&
		            !sameDestination(params.ownerChangeAddress, params.toAddress)) {
		            throw new Error('DEPIN reissue owner change address must match the destination address');
		        }
		    }
		    const outputs = [];
		    appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
		    // Consensus locates the reissue output at vout[n-1]; extraOutputs go first.
		    appendExtraOutputs(outputs, params.extraOutputs);
		    outputs.push(createOwnerAssetTransferOutput(params.ownerChangeAddress ?? params.toAddress, getOwnerTokenName(params.assetName), marker(params)));
		    outputs.push(createReissueAssetOutput({
		        address: params.toAddress,
		        assetName: params.assetName,
		        quantityRaw: params.quantityRaw,
		        // Omitted means "keep the current units" (-1); do NOT collapse to 0.
		        units: params.units,
		        reissuable: params.reissuable ?? true,
		        ipfsHash: params.ipfsHash,
		        assetMarker: params.assetMarker
		    }));
		    return buildTransaction(params.version, params.locktime, params.inputs, outputs);
		}
		function createReissueRestrictedTransaction(params) {
		    const outputs = [];
		    appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
		    appendExtraOutputs(outputs, params.extraOutputs);
		    if (params.verifierString) {
		        outputs.push(createVerifierStringOutput(normalizeVerifierString(params.verifierString)));
		    }
		    outputs.push(createOwnerAssetTransferOutput(params.ownerChangeAddress ?? params.toAddress, getOwnerTokenName(params.assetName), marker(params)));
		    outputs.push(createReissueAssetOutput({
		        address: params.toAddress,
		        assetName: params.assetName,
		        quantityRaw: params.quantityRaw,
		        // Omitted means "keep the current units" (-1); do NOT collapse to 0.
		        units: params.units,
		        reissuable: params.reissuable ?? true,
		        ipfsHash: params.ipfsHash,
		        assetMarker: params.assetMarker
		    }));
		    return buildTransaction(params.version, params.locktime, params.inputs, outputs);
		}
		function createQualifierTagTransaction(params) {
		    const outputs = [];
		    appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
		    outputs.push(createAssetTransferOutput(params.qualifierChangeAddress, params.qualifierName, params.qualifierChangeAmountRaw, marker(params)));
		    for (const address of params.targetAddresses) {
		        outputs.push(createNullAssetTagOutput(address, params.qualifierName, params.operation, params.nullAssetDestinationMode ?? 'strict'));
		    }
		    appendExtraOutputs(outputs, params.extraOutputs);
		    return buildTransaction(params.version, params.locktime, params.inputs, outputs);
		}
		function createFreezeAddressesTransaction(params) {
		    if (isDepinAssetName(params.assetName)) {
		        // The address holding (or receiving) the owner token cannot be frozen or
		        // revoked. The node also rejects spending an "&X!" UTXO that sits on a
		        // target address — that input-side rule cannot be checked here (inputs
		        // carry no address) and stays the caller's responsibility.
		        for (const target of params.targetAddresses) {
		            if (sameDestination(target, params.ownerChangeAddress)) {
		                throw new Error('DEPIN owner change address cannot be one of the target addresses (owner-holder address cannot be frozen or revoked)');
		            }
		        }
		    }
		    const outputs = [];
		    appendXnaEnvelope(outputs, undefined, undefined, params.xnaChangeAddress, params.xnaChangeSats);
		    outputs.push(createOwnerAssetTransferOutput(params.ownerChangeAddress, getOwnerTokenName(params.assetName), marker(params)));
		    for (const address of params.targetAddresses) {
		        outputs.push(createNullAssetRestrictionOutput(address, params.assetName, freezeFlagFromOperation(params.operation), params.nullAssetDestinationMode ?? 'strict'));
		    }
		    appendExtraOutputs(outputs, params.extraOutputs);
		    return buildTransaction(params.version, params.locktime, params.inputs, outputs);
		}
		function createFreezeAssetTransaction(params) {
		    const outputs = [];
		    appendXnaEnvelope(outputs, undefined, undefined, params.xnaChangeAddress, params.xnaChangeSats);
		    outputs.push(createOwnerAssetTransferOutput(params.ownerChangeAddress, getOwnerTokenName(params.assetName), marker(params)));
		    outputs.push(createGlobalRestrictionOutput(params.assetName, freezeFlagFromOperation(params.operation)));
		    appendExtraOutputs(outputs, params.extraOutputs);
		    return buildTransaction(params.version, params.locktime, params.inputs, outputs);
		}
		function createFromOperation(build) {
		    switch (build.operationType) {
		        case 'STANDARD_PAYMENT':
		            return createPaymentTransaction(build.params);
		        case 'STANDARD_TRANSFER':
		            return createStandardAssetTransferTransaction(build.params);
		        case 'ISSUE_ROOT':
		        case 'ISSUE_MSGCHANNEL':
		            return createIssueAssetTransaction(build.params);
		        case 'ISSUE_SUB':
		            return createIssueSubAssetTransaction(build.params);
		        case 'ISSUE_UNIQUE':
		            return createIssueUniqueAssetTransaction(build.params);
		        case 'ISSUE_DEPIN':
		            return createIssueDepinTransaction(build.params);
		        case 'ISSUE_QUALIFIER':
		        case 'ISSUE_SUB_QUALIFIER':
		            return createIssueQualifierTransaction(build.params);
		        case 'ISSUE_RESTRICTED':
		            return createIssueRestrictedTransaction(build.params);
		        case 'REISSUE':
		            return createReissueTransaction(build.params);
		        case 'REISSUE_RESTRICTED':
		            return createReissueRestrictedTransaction(build.params);
		        case 'TRANSFER_DEPIN':
		            return createDepinTransferTransaction(build.params);
		        case 'SELF_REVOKE_DEPIN':
		            return createDepinSelfRevokeTransaction(build.params);
		        case 'TAG_ADDRESSES':
		            return createQualifierTagTransaction({
		                ...build.params,
		                operation: 'tag'
		            });
		        case 'UNTAG_ADDRESSES':
		            return createQualifierTagTransaction({
		                ...build.params,
		                operation: 'untag'
		            });
		        case 'FREEZE_ADDRESSES':
		            return createFreezeAddressesTransaction({
		                ...build.params,
		                operation: 'freeze'
		            });
		        case 'UNFREEZE_ADDRESSES':
		            return createFreezeAddressesTransaction({
		                ...build.params,
		                operation: 'unfreeze'
		            });
		        case 'FREEZE_ASSET':
		            return createFreezeAssetTransaction({
		                ...build.params,
		                operation: 'freeze'
		            });
		        case 'UNFREEZE_ASSET':
		            return createFreezeAssetTransaction({
		                ...build.params,
		                operation: 'unfreeze'
		            });
		        default: {
		            const unsupported = build;
		            throw new Error(`Unsupported operation type: ${JSON.stringify(unsupported)}`);
		        }
		    }
		}

		/**
		 * Checks if something is Uint8Array. Be careful: nodejs Buffer will return true.
		 * @param a - value to test
		 * @returns `true` when the value is a Uint8Array-compatible view.
		 * @example
		 * Check whether a value is a Uint8Array-compatible view.
		 * ```ts
		 * isBytes(new Uint8Array([1, 2, 3]));
		 * ```
		 */
		function isBytes(a) {
		    // Plain `instanceof Uint8Array` is too strict for some Buffer / proxy / cross-realm cases.
		    // The fallback still requires a real ArrayBuffer view, so plain
		    // JSON-deserialized `{ constructor: ... }` spoofing is rejected, and
		    // `BYTES_PER_ELEMENT === 1` keeps the fallback on byte-oriented views.
		    return (a instanceof Uint8Array ||
		        (ArrayBuffer.isView(a) &&
		            a.constructor.name === 'Uint8Array' &&
		            'BYTES_PER_ELEMENT' in a &&
		            a.BYTES_PER_ELEMENT === 1));
		}
		/**
		 * Asserts something is Uint8Array.
		 * @param value - value to validate
		 * @param length - optional exact length constraint
		 * @param title - label included in thrown errors
		 * @returns The validated byte array.
		 * @throws On wrong argument types. {@link TypeError}
		 * @throws On wrong argument ranges or values. {@link RangeError}
		 * @example
		 * Validate that a value is a byte array.
		 * ```ts
		 * abytes(new Uint8Array([1, 2, 3]));
		 * ```
		 */
		function abytes(value, length, title = '') {
		    const bytes = isBytes(value);
		    const len = value?.length;
		    const needsLen = length !== undefined;
		    if (!bytes || (needsLen)) {
		        const prefix = title && `"${title}" `;
		        const ofLen = '';
		        const got = bytes ? `length=${len}` : `type=${typeof value}`;
		        const message = prefix + 'expected Uint8Array' + ofLen + ', got ' + got;
		        if (!bytes)
		            throw new TypeError(message);
		        throw new RangeError(message);
		    }
		    return value;
		}
		/**
		 * Asserts a hash instance has not been destroyed or finished.
		 * @param instance - hash instance to validate
		 * @param checkFinished - whether to reject finalized instances
		 * @throws If the hash instance has already been destroyed or finalized. {@link Error}
		 * @example
		 * Validate that a hash instance is still usable.
		 * ```ts
		 * import { aexists } from '@noble/hashes/utils.js';
		 * import { sha256 } from '@noble/hashes/sha2.js';
		 * const hash = sha256.create();
		 * aexists(hash);
		 * ```
		 */
		function aexists(instance, checkFinished = true) {
		    if (instance.destroyed)
		        throw new Error('Hash instance has been destroyed');
		    if (checkFinished && instance.finished)
		        throw new Error('Hash#digest() has already been called');
		}
		/**
		 * Asserts output is a sufficiently-sized byte array.
		 * @param out - destination buffer
		 * @param instance - hash instance providing output length
		 * Oversized buffers are allowed; downstream code only promises to fill the first `outputLen` bytes.
		 * @throws On wrong argument types. {@link TypeError}
		 * @throws On wrong argument ranges or values. {@link RangeError}
		 * @example
		 * Validate a caller-provided digest buffer.
		 * ```ts
		 * import { aoutput } from '@noble/hashes/utils.js';
		 * import { sha256 } from '@noble/hashes/sha2.js';
		 * const hash = sha256.create();
		 * aoutput(new Uint8Array(hash.outputLen), hash);
		 * ```
		 */
		function aoutput(out, instance) {
		    abytes(out, undefined, 'digestInto() output');
		    const min = instance.outputLen;
		    if (out.length < min) {
		        throw new RangeError('"digestInto() output" expected to be of length >=' + min);
		    }
		}
		/**
		 * Zeroizes typed arrays in place. Warning: JS provides no guarantees.
		 * @param arrays - arrays to overwrite with zeros
		 * @example
		 * Zeroize sensitive buffers in place.
		 * ```ts
		 * clean(new Uint8Array([1, 2, 3]));
		 * ```
		 */
		function clean(...arrays) {
		    for (let i = 0; i < arrays.length; i++) {
		        arrays[i].fill(0);
		    }
		}
		/**
		 * Creates a DataView for byte-level manipulation.
		 * @param arr - source typed array
		 * @returns DataView over the same buffer region.
		 * @example
		 * Create a DataView over an existing buffer.
		 * ```ts
		 * createView(new Uint8Array(4));
		 * ```
		 */
		function createView(arr) {
		    return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
		}
		/**
		 * Rotate-right operation for uint32 values.
		 * @param word - source word
		 * @param shift - shift amount in bits
		 * @returns Rotated word.
		 * @example
		 * Rotate a 32-bit word to the right.
		 * ```ts
		 * rotr(0x12345678, 8);
		 * ```
		 */
		function rotr(word, shift) {
		    return (word << (32 - shift)) | (word >>> shift);
		}
		/**
		 * Creates a callable hash function from a stateful class constructor.
		 * @param hashCons - hash constructor or factory
		 * @param info - optional metadata such as DER OID
		 * @returns Frozen callable hash wrapper with `.create()`.
		 *   Wrapper construction eagerly calls `hashCons(undefined)` once to read
		 *   `outputLen` / `blockLen`, so constructor side effects happen at module
		 *   init time.
		 * @example
		 * Wrap a stateful hash constructor into a callable helper.
		 * ```ts
		 * import { createHasher } from '@noble/hashes/utils.js';
		 * import { sha256 } from '@noble/hashes/sha2.js';
		 * const wrapped = createHasher(sha256.create, { oid: sha256.oid });
		 * wrapped(new Uint8Array([1]));
		 * ```
		 */
		function createHasher(hashCons, info = {}) {
		    const hashC = (msg, opts) => hashCons(opts)
		        .update(msg)
		        .digest();
		    const tmp = hashCons(undefined);
		    hashC.outputLen = tmp.outputLen;
		    hashC.blockLen = tmp.blockLen;
		    hashC.canXOF = tmp.canXOF;
		    hashC.create = (opts) => hashCons(opts);
		    Object.assign(hashC, info);
		    return Object.freeze(hashC);
		}
		/**
		 * Creates OID metadata for NIST hashes with prefix `06 09 60 86 48 01 65 03 04 02`.
		 * @param suffix - final OID byte for the selected hash.
		 *   The helper accepts any byte even though only the documented NIST hash
		 *   suffixes are meaningful downstream.
		 * @returns Object containing the DER-encoded OID.
		 * @example
		 * Build OID metadata for a NIST hash.
		 * ```ts
		 * oidNist(0x01);
		 * ```
		 */
		const oidNist = (suffix) => ({
		    // Current NIST hashAlgs suffixes used here fit in one DER subidentifier octet.
		    // Larger suffix values would need base-128 OID encoding and a different length byte.
		    oid: Uint8Array.from([0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, suffix]),
		});

		/**
		 * Internal Merkle-Damgard hash utils.
		 * @module
		 */
		/**
		 * Shared 32-bit conditional boolean primitive reused by SHA-256, SHA-1, and MD5 `F`.
		 * Returns bits from `b` when `a` is set, otherwise from `c`.
		 * The XOR form is equivalent to MD5's `F(X,Y,Z) = XY v not(X)Z` because the masked terms never
		 * set the same bit.
		 * @param a - selector word
		 * @param b - word chosen when selector bit is set
		 * @param c - word chosen when selector bit is clear
		 * @returns Mixed 32-bit word.
		 * @example
		 * Combine three words with the shared 32-bit choice primitive.
		 * ```ts
		 * Chi(0xffffffff, 0x12345678, 0x87654321);
		 * ```
		 */
		function Chi(a, b, c) {
		    return (a & b) ^ (~a & c);
		}
		/**
		 * Shared 32-bit majority primitive reused by SHA-256 and SHA-1.
		 * Returns bits shared by at least two inputs.
		 * @param a - first input word
		 * @param b - second input word
		 * @param c - third input word
		 * @returns Mixed 32-bit word.
		 * @example
		 * Combine three words with the shared 32-bit majority primitive.
		 * ```ts
		 * Maj(0xffffffff, 0x12345678, 0x87654321);
		 * ```
		 */
		function Maj(a, b, c) {
		    return (a & b) ^ (a & c) ^ (b & c);
		}
		/**
		 * Merkle-Damgard hash construction base class.
		 * Could be used to create MD5, RIPEMD, SHA1, SHA2.
		 * Accepts only byte-aligned `Uint8Array` input, even when the underlying spec describes bit
		 * strings with partial-byte tails.
		 * @param blockLen - internal block size in bytes
		 * @param outputLen - digest size in bytes
		 * @param padOffset - trailing length field size in bytes
		 * @param isLE - whether length and state words are encoded in little-endian
		 * @example
		 * Use a concrete subclass to get the shared Merkle-Damgard update/digest flow.
		 * ```ts
		 * import { _SHA1 } from '@noble/hashes/legacy.js';
		 * const hash = new _SHA1();
		 * hash.update(new Uint8Array([97, 98, 99]));
		 * hash.digest();
		 * ```
		 */
		class HashMD {
		    blockLen;
		    outputLen;
		    canXOF = false;
		    padOffset;
		    isLE;
		    // For partial updates less than block size
		    buffer;
		    view;
		    finished = false;
		    length = 0;
		    pos = 0;
		    destroyed = false;
		    constructor(blockLen, outputLen, padOffset, isLE) {
		        this.blockLen = blockLen;
		        this.outputLen = outputLen;
		        this.padOffset = padOffset;
		        this.isLE = isLE;
		        this.buffer = new Uint8Array(blockLen);
		        this.view = createView(this.buffer);
		    }
		    update(data) {
		        aexists(this);
		        abytes(data);
		        const { view, buffer, blockLen } = this;
		        const len = data.length;
		        for (let pos = 0; pos < len;) {
		            const take = Math.min(blockLen - this.pos, len - pos);
		            // Fast path only when there is no buffered partial block: `take === blockLen` implies
		            // `this.pos === 0`, so we can process full blocks directly from the input view.
		            if (take === blockLen) {
		                const dataView = createView(data);
		                for (; blockLen <= len - pos; pos += blockLen)
		                    this.process(dataView, pos);
		                continue;
		            }
		            buffer.set(data.subarray(pos, pos + take), this.pos);
		            this.pos += take;
		            pos += take;
		            if (this.pos === blockLen) {
		                this.process(view, 0);
		                this.pos = 0;
		            }
		        }
		        this.length += data.length;
		        this.roundClean();
		        return this;
		    }
		    digestInto(out) {
		        aexists(this);
		        aoutput(out, this);
		        this.finished = true;
		        // Padding
		        // We can avoid allocation of buffer for padding completely if it
		        // was previously not allocated here. But it won't change performance.
		        const { buffer, view, blockLen, isLE } = this;
		        let { pos } = this;
		        // append the bit '1' to the message
		        buffer[pos++] = 0b10000000;
		        clean(this.buffer.subarray(pos));
		        // we have less than padOffset left in buffer, so we cannot put length in
		        // current block, need process it and pad again
		        if (this.padOffset > blockLen - pos) {
		            this.process(view, 0);
		            pos = 0;
		        }
		        // Pad until full block byte with zeros
		        for (let i = pos; i < blockLen; i++)
		            buffer[i] = 0;
		        // `padOffset` reserves the whole length field. For SHA-384/512 the high 64 bits stay zero from
		        // the padding fill above, and JS will overflow before user input can make that half non-zero.
		        // So we only need to write the low 64 bits here.
		        view.setBigUint64(blockLen - 8, BigInt(this.length * 8), isLE);
		        this.process(view, 0);
		        const oview = createView(out);
		        const len = this.outputLen;
		        // NOTE: we do division by 4 later, which must be fused in single op with modulo by JIT
		        if (len % 4)
		            throw new Error('_sha2: outputLen must be aligned to 32bit');
		        const outLen = len / 4;
		        const state = this.get();
		        if (outLen > state.length)
		            throw new Error('_sha2: outputLen bigger than state');
		        for (let i = 0; i < outLen; i++)
		            oview.setUint32(4 * i, state[i], isLE);
		    }
		    digest() {
		        const { buffer, outputLen } = this;
		        this.digestInto(buffer);
		        // Copy before destroy(): subclasses wipe `buffer` during cleanup, but `digest()` must return
		        // fresh bytes to the caller.
		        const res = buffer.slice(0, outputLen);
		        this.destroy();
		        return res;
		    }
		    _cloneInto(to) {
		        to ||= new this.constructor();
		        to.set(...this.get());
		        const { blockLen, buffer, length, finished, destroyed, pos } = this;
		        to.destroyed = destroyed;
		        to.finished = finished;
		        to.length = length;
		        to.pos = pos;
		        // Only partial-block bytes need copying: when `length % blockLen === 0`, `pos === 0` and
		        // later `update()` / `digestInto()` overwrite `to.buffer` from the start before reading it.
		        if (length % blockLen)
		            to.buffer.set(buffer);
		        return to;
		    }
		    clone() {
		        return this._cloneInto();
		    }
		}
		/**
		 * Initial SHA-2 state: fractional parts of square roots of first 16 primes 2..53.
		 * Check out `test/misc/sha2-gen-iv.js` for recomputation guide.
		 */
		/** Initial SHA256 state from RFC 6234 §6.1: the first 32 bits of the fractional parts of the
		 * square roots of the first eight prime numbers. Exported as a shared table; callers must treat
		 * it as read-only because constructors copy words from it by index. */
		const SHA256_IV = /* @__PURE__ */ Uint32Array.from([
		    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
		]);

		/**
		 * SHA2 hash function. A.k.a. sha256, sha384, sha512, sha512_224, sha512_256.
		 * SHA256 is the fastest hash implementable in JS, even faster than Blake3.
		 * Check out {@link https://www.rfc-editor.org/rfc/rfc4634 | RFC 4634} and
		 * {@link https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf | FIPS 180-4}.
		 * @module
		 */
		/**
		 * SHA-224 / SHA-256 round constants from RFC 6234 §5.1: the first 32 bits
		 * of the cube roots of the first 64 primes (2..311).
		 */
		// prettier-ignore
		const SHA256_K = /* @__PURE__ */ Uint32Array.from([
		    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
		    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
		    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
		    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
		    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
		    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
		    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
		    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
		]);
		/** Reusable SHA-224 / SHA-256 message schedule buffer `W_t` from RFC 6234 §6.2 step 1. */
		const SHA256_W = /* @__PURE__ */ new Uint32Array(64);
		/** Internal SHA-224 / SHA-256 compression engine from RFC 6234 §6.2. */
		class SHA2_32B extends HashMD {
		    constructor(outputLen) {
		        super(64, outputLen, 8, false);
		    }
		    get() {
		        const { A, B, C, D, E, F, G, H } = this;
		        return [A, B, C, D, E, F, G, H];
		    }
		    // prettier-ignore
		    set(A, B, C, D, E, F, G, H) {
		        this.A = A | 0;
		        this.B = B | 0;
		        this.C = C | 0;
		        this.D = D | 0;
		        this.E = E | 0;
		        this.F = F | 0;
		        this.G = G | 0;
		        this.H = H | 0;
		    }
		    process(view, offset) {
		        // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
		        for (let i = 0; i < 16; i++, offset += 4)
		            SHA256_W[i] = view.getUint32(offset, false);
		        for (let i = 16; i < 64; i++) {
		            const W15 = SHA256_W[i - 15];
		            const W2 = SHA256_W[i - 2];
		            const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ (W15 >>> 3);
		            const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ (W2 >>> 10);
		            SHA256_W[i] = (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
		        }
		        // Compression function main loop, 64 rounds
		        let { A, B, C, D, E, F, G, H } = this;
		        for (let i = 0; i < 64; i++) {
		            const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
		            const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
		            const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
		            const T2 = (sigma0 + Maj(A, B, C)) | 0;
		            H = G;
		            G = F;
		            F = E;
		            E = (D + T1) | 0;
		            D = C;
		            C = B;
		            B = A;
		            A = (T1 + T2) | 0;
		        }
		        // Add the compressed chunk to the current hash value
		        A = (A + this.A) | 0;
		        B = (B + this.B) | 0;
		        C = (C + this.C) | 0;
		        D = (D + this.D) | 0;
		        E = (E + this.E) | 0;
		        F = (F + this.F) | 0;
		        G = (G + this.G) | 0;
		        H = (H + this.H) | 0;
		        this.set(A, B, C, D, E, F, G, H);
		    }
		    roundClean() {
		        clean(SHA256_W);
		    }
		    destroy() {
		        // HashMD callers route post-destroy usability through `destroyed`; zeroizing alone still leaves
		        // update()/digest() callable on reused instances.
		        this.destroyed = true;
		        this.set(0, 0, 0, 0, 0, 0, 0, 0);
		        clean(this.buffer);
		    }
		}
		/** Internal SHA-256 hash class grounded in RFC 6234 §6.2. */
		class _SHA256 extends SHA2_32B {
		    // We cannot use array here since array allows indexing by variable
		    // which means optimizer/compiler cannot use registers.
		    A = SHA256_IV[0] | 0;
		    B = SHA256_IV[1] | 0;
		    C = SHA256_IV[2] | 0;
		    D = SHA256_IV[3] | 0;
		    E = SHA256_IV[4] | 0;
		    F = SHA256_IV[5] | 0;
		    G = SHA256_IV[6] | 0;
		    H = SHA256_IV[7] | 0;
		    constructor() {
		        super(32);
		    }
		}
		/**
		 * SHA2-256 hash function from RFC 4634. In JS it's the fastest: even faster than Blake3. Some info:
		 *
		 * - Trying 2^128 hashes would get 50% chance of collision, using birthday attack.
		 * - BTC network is doing 2^70 hashes/sec (2^95 hashes/year) as per 2025.
		 * - Each sha256 hash is executing 2^18 bit operations.
		 * - Good 2024 ASICs can do 200Th/sec with 3500 watts of power, corresponding to 2^36 hashes/joule.
		 * @param msg - message bytes to hash
		 * @returns Digest bytes.
		 * @example
		 * Hash a message with SHA2-256.
		 * ```ts
		 * sha256(new Uint8Array([97, 98, 99]));
		 * ```
		 */
		const sha256 = /* @__PURE__ */ createHasher(() => new _SHA256(), 
		/* @__PURE__ */ oidNist(0x01));

		// Hard deserialization bound, mirroring the node (serialize.h MAX_SIZE):
		// ReadCompactSize rejects anything above it, canonical or not.
		const MAX_SIZE = 0x02000000;
		function hash256(bytes) {
		    return sha256(sha256(bytes));
		}
		class ByteReader {
		    bytes;
		    offset = 0;
		    constructor(bytes) {
		        this.bytes = bytes;
		    }
		    need(count) {
		        if (count > this.bytes.length - this.offset) {
		            throw new Error(`Transaction hex truncated: need ${count} more byte(s) at offset ${this.offset}, ` +
		                `${this.bytes.length - this.offset} remaining`);
		        }
		    }
		    readBytes(count) {
		        this.need(count);
		        const slice = this.bytes.subarray(this.offset, this.offset + count);
		        this.offset += count;
		        return slice;
		    }
		    readU8() {
		        return this.readBytes(1)[0];
		    }
		    readU32() {
		        const slice = this.readBytes(4);
		        return (slice[0] | (slice[1] << 8) | (slice[2] << 16) | (slice[3] << 24)) >>> 0;
		    }
		    readU64() {
		        const slice = this.readBytes(8);
		        let value = 0n;
		        for (let i = 7; i >= 0; i -= 1) {
		            value = (value << 8n) | BigInt(slice[i]);
		        }
		        return value;
		    }
		    // Canonical CompactSize with the node's range bound: the shortest encoding
		    // is mandatory and anything above MAX_SIZE throws, exactly like
		    // ReadCompactSize. Lengths are validated against the remaining bytes by the
		    // callers BEFORE any allocation or iteration.
		    readCompactSize() {
		        const first = this.readU8();
		        let value;
		        if (first < 0xfd) {
		            value = first;
		        }
		        else if (first === 0xfd) {
		            const slice = this.readBytes(2);
		            value = slice[0] | (slice[1] << 8);
		            if (value < 0xfd)
		                throw new Error('Non-canonical CompactSize (0xfd form for value < 253)');
		        }
		        else if (first === 0xfe) {
		            value = this.readU32();
		            if (value < 0x10000)
		                throw new Error('Non-canonical CompactSize (0xfe form for value < 0x10000)');
		        }
		        else {
		            const big = this.readU64();
		            if (big < 0x100000000n)
		                throw new Error('Non-canonical CompactSize (0xff form for value < 2^32)');
		            if (big > BigInt(MAX_SIZE))
		                throw new Error(`CompactSize exceeds MAX_SIZE: ${big}`);
		            value = Number(big);
		        }
		        if (value > MAX_SIZE) {
		            throw new Error(`CompactSize exceeds MAX_SIZE: ${value}`);
		        }
		        return value;
		    }
		    /** Read a length prefix that must fit in the remaining bytes at `bytesPerItem`. */
		    readCount(bytesPerItem, label) {
		        const count = this.readCompactSize();
		        if (count * bytesPerItem > this.bytes.length - this.offset) {
		            throw new Error(`Declared ${label} count ${count} does not fit in the remaining ` +
		                `${this.bytes.length - this.offset} byte(s)`);
		        }
		        return count;
		    }
		    get finished() {
		        return this.offset === this.bytes.length;
		    }
		    get position() {
		        return this.offset;
		    }
		}
		function readOutpoint(reader) {
		    const txid = bytesToHex(reverseBytes(reader.readBytes(32)));
		    const vout = reader.readU32();
		    return { txid, vout };
		}
		function readInput(reader) {
		    const { txid, vout } = readOutpoint(reader);
		    const scriptLength = reader.readCount(1, 'scriptSig');
		    const scriptSigHex = bytesToHex(reader.readBytes(scriptLength));
		    const sequence = reader.readU32();
		    return { txid, vout, scriptSigHex, sequence };
		}
		function readOutput(reader) {
		    const valueSats = reader.readU64();
		    const scriptLength = reader.readCount(1, 'scriptPubKey');
		    const scriptPubKeyHex = bytesToHex(reader.readBytes(scriptLength));
		    return { valueSats, scriptPubKeyHex };
		}
		// Minimum serialized size per item, used only to bound counts before reading:
		// input = outpoint(36) + compactSize(1) + sequence(4); output = value(8) +
		// compactSize(1); witness element = compactSize(1).
		const MIN_INPUT_SIZE = 41;
		const MIN_OUTPUT_SIZE = 9;
		function parseTransaction(hex) {
		    const reader = new ByteReader(hexToBytes(ensureHex(hex, 'transaction hex')));
		    // nVersion is a signed int32 (negative versions exist on-chain historically).
		    const version = reader.readU32() | 0;
		    const inputs = [];
		    const outputs = [];
		    let flags = 0;
		    const vinCount = reader.readCount(MIN_INPUT_SIZE, 'input');
		    if (vinCount === 0) {
		        // Either a dummy marker for the extended (witness) format, or a genuinely
		        // empty vin. Mirrors UnserializeTransaction: a flags byte follows; when it
		        // is non-zero the real vin/vout follow, when zero the vout is NOT read.
		        flags = reader.readU8();
		        if (flags !== 0) {
		            const realVinCount = reader.readCount(MIN_INPUT_SIZE, 'input');
		            for (let i = 0; i < realVinCount; i += 1)
		                inputs.push(readInput(reader));
		            const voutCount = reader.readCount(MIN_OUTPUT_SIZE, 'output');
		            for (let i = 0; i < voutCount; i += 1)
		                outputs.push(readOutput(reader));
		        }
		    }
		    else {
		        for (let i = 0; i < vinCount; i += 1)
		            inputs.push(readInput(reader));
		        const voutCount = reader.readCount(MIN_OUTPUT_SIZE, 'output');
		        for (let i = 0; i < voutCount; i += 1)
		            outputs.push(readOutput(reader));
		    }
		    // NIP-014: vrefin sits between vout and witness, v3 only (even when empty).
		    const vrefin = [];
		    if (version === 3) {
		        const refCount = reader.readCount(36, 'refinput');
		        for (let i = 0; i < refCount; i += 1)
		            vrefin.push(readOutpoint(reader));
		    }
		    if (flags & 1) {
		        flags ^= 1;
		        for (const input of inputs) {
		            const stackSize = reader.readCount(1, 'witness element');
		            const stack = [];
		            for (let i = 0; i < stackSize; i += 1) {
		                const elementLength = reader.readCount(1, 'witness bytes');
		                stack.push(bytesToHex(reader.readBytes(elementLength)));
		            }
		            input.witness = stack;
		        }
		    }
		    if (flags) {
		        throw new Error(`Unknown transaction optional data (flags 0x${flags.toString(16)})`);
		    }
		    const locktime = reader.readU32();
		    if (!reader.finished) {
		        throw new Error(`Trailing bytes after transaction (offset ${reader.position})`);
		    }
		    return { version, inputs, outputs, vrefin, locktime };
		}
		function serializeOutpoint(ref) {
		    const txid = hexToBytes(ensureHex(ref.txid, 'txid'));
		    if (txid.length !== 32) {
		        throw new Error(`Invalid txid: expected 32 bytes, got ${txid.length}`);
		    }
		    return concatBytes(reverseBytes(txid), u32LE(ref.vout));
		}
		function serializeCodecInput(input) {
		    const scriptSig = hexToBytes(ensureHex(input.scriptSigHex ?? '', 'scriptSigHex'));
		    return concatBytes(serializeOutpoint(input), compactSize(scriptSig.length), scriptSig, u32LE(input.sequence ?? 0xffffffff));
		}
		function serializeCodecOutput(output) {
		    const script = hexToBytes(ensureHex(output.scriptPubKeyHex, 'scriptPubKeyHex'));
		    return concatBytes(u64LE(output.valueSats), compactSize(script.length), script);
		}
		function inputHasWitness(input) {
		    return (input.witness?.length ?? 0) > 0;
		}
		function serializeTransaction(tx, options = {}) {
		    if (!Number.isInteger(tx.version) || tx.version < -2147483648 || tx.version > 0x7fffffff) {
		        throw new Error(`Transaction version out of int32 range: ${tx.version}`);
		    }
		    const vrefin = tx.vrefin ?? [];
		    if (tx.version !== 3 && vrefin.length > 0) {
		        throw new Error(`vrefin requires transaction version 3 (got version ${tx.version})`);
		    }
		    const withWitness = (options.includeWitness ?? true) && tx.inputs.some(inputHasWitness);
		    const parts = [u32LE(tx.version >>> 0)];
		    if (withWitness) {
		        // Extended format: dummy empty vin + flags byte.
		        parts.push(Uint8Array.of(0x00, 0x01));
		    }
		    parts.push(compactSize(tx.inputs.length));
		    for (const input of tx.inputs)
		        parts.push(serializeCodecInput(input));
		    parts.push(compactSize(tx.outputs.length));
		    for (const output of tx.outputs)
		        parts.push(serializeCodecOutput(output));
		    if (tx.version === 3) {
		        parts.push(compactSize(vrefin.length));
		        for (const ref of vrefin)
		            parts.push(serializeOutpoint(ref));
		    }
		    if (withWitness) {
		        // One stack per input, empty (CompactSize 0) where the input has none.
		        for (const input of tx.inputs) {
		            const stack = input.witness ?? [];
		            parts.push(compactSize(stack.length));
		            for (const element of stack) {
		                const bytes = hexToBytes(ensureHex(element, 'witness element'));
		                parts.push(compactSize(bytes.length), bytes);
		            }
		        }
		    }
		    parts.push(u32LE(tx.locktime));
		    return bytesToHex(concatBytes(...parts));
		}
		function toDecoded(txOrHex) {
		    return typeof txOrHex === 'string' ? parseTransaction(txOrHex) : txOrHex;
		}
		function computeTxid(txOrHex) {
		    const stripped = serializeTransaction(toDecoded(txOrHex), { includeWitness: false });
		    return bytesToHex(reverseBytes(hash256(hexToBytes(stripped))));
		}
		function computeWtxid(txOrHex) {
		    const full = serializeTransaction(toDecoded(txOrHex));
		    return bytesToHex(reverseBytes(hash256(hexToBytes(full))));
		}
		function estimateTransactionSize(txOrHex) {
		    const tx = toDecoded(txOrHex);
		    const size = serializeTransaction(tx).length / 2;
		    const strippedSize = serializeTransaction(tx, { includeWitness: false }).length / 2;
		    // consensus/validation.h: weight = stripped * (WITNESS_SCALE_FACTOR - 1) + total.
		    const weight = strippedSize * 3 + size;
		    return { size, strippedSize, weight, vsize: Math.ceil(weight / 4) };
		}

		dist.DEFAULT_ASSET_MARKER = DEFAULT_ASSET_MARKER;
		dist.DEPIN_MAX_NAME_LENGTH = DEPIN_MAX_NAME_LENGTH;
		dist.OWNER_ASSET_AMOUNT = OWNER_ASSET_AMOUNT;
		dist.REGTEST_GLOBAL_BURN_ADDRESS = REGTEST_GLOBAL_BURN_ADDRESS;
		dist.UNIQUE_ASSETS_REISSUABLE = UNIQUE_ASSETS_REISSUABLE;
		dist.UNIQUE_ASSET_AMOUNT = UNIQUE_ASSET_AMOUNT;
		dist.UNIQUE_ASSET_UNITS = UNIQUE_ASSET_UNITS;
		dist.assertDepinAssetName = assertDepinAssetName;
		dist.assertDepinNetwork = assertDepinNetwork;
		dist.assetPayloadPrefix = assetPayloadPrefix;
		dist.assetUnitsToRaw = assetUnitsToRaw;
		dist.computeTxid = computeTxid;
		dist.computeWtxid = computeWtxid;
		dist.createAssetTransferOutput = createAssetTransferOutput;
		dist.createAssetTransferToScriptOutput = createAssetTransferToScriptOutput;
		dist.createDepinSelfRevokeTransaction = createDepinSelfRevokeTransaction;
		dist.createDepinTransferTransaction = createDepinTransferTransaction;
		dist.createFreezeAddressesTransaction = createFreezeAddressesTransaction;
		dist.createFreezeAssetTransaction = createFreezeAssetTransaction;
		dist.createFromOperation = createFromOperation;
		dist.createGlobalRestrictionOutput = createGlobalRestrictionOutput;
		dist.createIssueAssetOutput = createIssueAssetOutput;
		dist.createIssueAssetTransaction = createIssueAssetTransaction;
		dist.createIssueDepinTransaction = createIssueDepinTransaction;
		dist.createIssueQualifierTransaction = createIssueQualifierTransaction;
		dist.createIssueRestrictedTransaction = createIssueRestrictedTransaction;
		dist.createIssueSubAssetTransaction = createIssueSubAssetTransaction;
		dist.createIssueUniqueAssetTransaction = createIssueUniqueAssetTransaction;
		dist.createNullAssetRestrictionOutput = createNullAssetRestrictionOutput;
		dist.createNullAssetTagOutput = createNullAssetTagOutput;
		dist.createOwnerAssetIssueOutput = createOwnerAssetIssueOutput;
		dist.createOwnerAssetTransferOutput = createOwnerAssetTransferOutput;
		dist.createPaymentTransaction = createPaymentTransaction;
		dist.createQualifierTagTransaction = createQualifierTagTransaction;
		dist.createReissueAssetOutput = createReissueAssetOutput;
		dist.createReissueRestrictedTransaction = createReissueRestrictedTransaction;
		dist.createReissueTransaction = createReissueTransaction;
		dist.createStandardAssetTransferTransaction = createStandardAssetTransferTransaction;
		dist.createTransferOutput = createTransferOutput;
		dist.createTransferWithMessageOutput = createTransferWithMessageOutput;
		dist.createUnsignedTransaction = createUnsignedTransaction;
		dist.createVerifierStringOutput = createVerifierStringOutput;
		dist.createXnaOutput = createXnaOutput;
		dist.decodeAddress = decodeAddress;
		dist.decodeAssetDataReferenceHex = decodeAssetDataReferenceHex;
		dist.encodeAssetDataReference = encodeAssetDataReference;
		dist.encodeAssetTransferPayload = encodeAssetTransferPayload;
		dist.encodeAssetTransferScript = encodeAssetTransferScript;
		dist.encodeAssetTransferScriptToScript = encodeAssetTransferScriptToScript;
		dist.encodeAuthScriptDestinationScript = encodeAuthScriptDestinationScript;
		dist.encodeDestinationScript = encodeDestinationScript;
		dist.encodeGlobalRestrictionScript = encodeGlobalRestrictionScript;
		dist.encodeNewAssetPayload = encodeNewAssetPayload;
		dist.encodeNewAssetScript = encodeNewAssetScript;
		dist.encodeNullAssetDataPayload = encodeNullAssetDataPayload;
		dist.encodeNullAssetDestinationScript = encodeNullAssetDestinationScript;
		dist.encodeNullAssetRestrictionScript = encodeNullAssetRestrictionScript;
		dist.encodeNullAssetTagPayload = encodeNullAssetTagPayload;
		dist.encodeNullAssetTagScript = encodeNullAssetTagScript;
		dist.encodeOwnerAssetPayload = encodeOwnerAssetPayload;
		dist.encodeOwnerAssetScript = encodeOwnerAssetScript;
		dist.encodeP2PKHScript = encodeP2PKHScript;
		dist.encodePQWitnessScript = encodePQWitnessScript;
		dist.encodeReissueAssetPayload = encodeReissueAssetPayload;
		dist.encodeReissueAssetScript = encodeReissueAssetScript;
		dist.encodeVerifierStringPayload = encodeVerifierStringPayload;
		dist.encodeVerifierStringScript = encodeVerifierStringScript;
		dist.estimateTransactionSize = estimateTransactionSize;
		dist.formatAssetDataReferenceHex = formatAssetDataReferenceHex;
		dist.getBurnAddressForOperation = getBurnAddressForOperation;
		dist.getBurnAmountSats = getBurnAmountSats;
		dist.getBurnAmountXna = getBurnAmountXna;
		dist.getOwnerTokenName = getOwnerTokenName;
		dist.getParentAssetName = getParentAssetName;
		dist.getUniqueAssetName = getUniqueAssetName;
		dist.inferNetworkFromAnyAddress = inferNetworkFromAnyAddress;
		dist.isCidV0AssetReference = isCidV0AssetReference;
		dist.isDepinAssetName = isDepinAssetName;
		dist.isEncodedAssetDataReferenceHex = isEncodedAssetDataReferenceHex;
		dist.isRawAssetDataReferenceHex = isRawAssetDataReferenceHex;
		dist.isTxidAssetReference = isTxidAssetReference;
		dist.normalizeVerifierString = normalizeVerifierString;
		dist.parseTransaction = parseTransaction;
		dist.resolveAddressInput = resolveAddressInput;
		dist.resolveAssetMarker = resolveAssetMarker;
		dist.serializeInput = serializeInput;
		dist.serializeOutput = serializeOutput;
		dist.serializeTransaction = serializeTransaction;
		dist.xnaToSatoshis = xnaToSatoshis;
		
		return dist;
	}

	/**
	 * Neurai Asset Types
	 * Based on: src/assets/assettypes.h
	 */

	var assetTypes;
	var hasRequiredAssetTypes;

	function requireAssetTypes () {
		if (hasRequiredAssetTypes) return assetTypes;
		hasRequiredAssetTypes = 1;
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

		assetTypes = {
		  AssetType
		};
		return assetTypes;
	}

	/**
	 * Asset Operation Costs (in XNA)
	 * These are burn amounts required for each operation
	 */

	var fees;
	var hasRequiredFees;

	function requireFees () {
		if (hasRequiredFees) return fees;
		hasRequiredFees = 1;
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

		fees = {
		  ASSET_COSTS,
		  getAssetCost,
		  getUniqueAssetCost,
		  getTaggingCost
		};
		return fees;
	}

	/**
	 * Burn Addresses for Asset Operations
	 * Different addresses for mainnet and testnet
	 */

	var burnAddresses;
	var hasRequiredBurnAddresses;

	function requireBurnAddresses () {
		if (hasRequiredBurnAddresses) return burnAddresses;
		hasRequiredBurnAddresses = 1;
		const MAINNET_NETWORKS = ['xna', 'mainnet', 'xna-pq', 'mainnet-pq'];
		const TESTNET_NETWORKS = ['xna-test', 'testnet', 'regtest', 'xna-pq-test', 'testnet-pq'];

		function resolveNetworkFamily(network) {
		  if (MAINNET_NETWORKS.includes(network)) {
		    return 'mainnet';
		  }

		  if (TESTNET_NETWORKS.includes(network)) {
		    return 'testnet';
		  }

		  throw new Error(`Unknown network: ${network}`);
		}

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
		 * Regtest chainparams define ONE burn address for every asset operation
		 * (`strGlobalBurnAddress` in the node's chainparams.cpp), unlike mainnet and
		 * testnet which have a distinct address per operation.
		 *
		 * Regtest shares testnet's address prefix, so it was previously resolved to
		 * the testnet table. That works only for ISSUE_ROOT — whose testnet address
		 * happens to BE the regtest global one — and every other operation is
		 * rejected by consensus with `bad-txns-*-burn-not-found`, because the burn
		 * output pays an address the chain does not recognise for that operation.
		 */
		const REGTEST_GLOBAL_BURN_ADDRESS = 'tBURNXXXXXXXXXXXXXXXXXXXXXXXVZLroy';

		/**
		 * Whether a network label means regtest specifically, rather than the wider
		 * testnet family it shares an address prefix with.
		 *
		 * @param {string} network - Network label
		 * @returns {boolean} True for regtest
		 */
		function isRegtest(network) {
		  return network === 'regtest';
		}

		/**
		 * Get burn address for an operation and network
		 * @param {string} operationType - Operation type (e.g., 'ISSUE_ROOT')
		 * @param {string} network - Network type ('xna', 'xna-test', 'regtest', 'xna-pq', or 'xna-pq-test')
		 * @returns {string} Burn address
		 */
		function getBurnAddress(operationType, network) {
		  const family = resolveNetworkFamily(network);
		  const addresses = family === 'mainnet' ? MAINNET_BURN_ADDRESSES : TESTNET_BURN_ADDRESSES;

		  const address = addresses[operationType];
		  if (!address) {
		    throw new Error(`Unknown operation type: ${operationType} for network: ${network}`);
		  }

		  return isRegtest(network) ? REGTEST_GLOBAL_BURN_ADDRESS : address;
		}

		/**
		 * Check if an address is a burn address
		 * @param {string} address - Address to check
		 * @param {string} network - Network type ('xna', 'xna-test', 'regtest', 'xna-pq', or 'xna-pq-test')
		 * @returns {boolean} True if it's a burn address
		 */
		function isBurnAddress(address, network) {
		  const family = resolveNetworkFamily(network);
		  const addresses = family === 'mainnet' ? MAINNET_BURN_ADDRESSES : TESTNET_BURN_ADDRESSES;
		  if (isRegtest(network) && address === REGTEST_GLOBAL_BURN_ADDRESS) {
		    return true;
		  }
		  return Object.values(addresses).includes(address);
		}

		burnAddresses = {
		  MAINNET_BURN_ADDRESSES,
		  TESTNET_BURN_ADDRESSES,
		  REGTEST_GLOBAL_BURN_ADDRESS,
		  resolveNetworkFamily,
		  isRegtest,
		  getBurnAddress,
		  isBurnAddress
		};
		return burnAddresses;
	}

	/**
	 * Network Configuration for Neurai
	 */

	var networks;
	var hasRequiredNetworks;

	function requireNetworks () {
		if (hasRequiredNetworks) return networks;
		hasRequiredNetworks = 1;
		const MAINNET_NETWORKS = ['xna', 'mainnet', 'xna-pq', 'mainnet-pq'];
		const TESTNET_NETWORKS = ['xna-test', 'testnet', 'regtest', 'xna-pq-test', 'testnet-pq'];

		const NETWORKS = {
		  MAINNET: {
		    name: 'xna',
		    displayName: 'Neurai Mainnet',
		    addressPrefix: 'N',
		    authScriptAddressPrefix: 'nq1',
		    pqAddressPrefix: 'nq1',
		    assetNameMaxLength: 31,
		    defaultRPCPort: 19001,
		    coin: 'XNA',
		    baseNetwork: 'xna'
		  },
		  TESTNET: {
		    name: 'xna-test',
		    displayName: 'Neurai Testnet',
		    addressPrefix: 't',
		    authScriptAddressPrefix: 'tnq1',
		    pqAddressPrefix: 'tnq1',
		    assetNameMaxLength: 121, // DePIN networks (testnet/regtest) extend the cap
		    defaultRPCPort: 19101,
		    coin: 'TXNA',
		    baseNetwork: 'xna-test'
		  },
		  MAINNET_PQ: {
		    name: 'xna-pq',
		    displayName: 'Neurai Mainnet AuthScript',
		    addressPrefix: 'N',
		    authScriptAddressPrefix: 'nq1',
		    pqAddressPrefix: 'nq1',
		    assetNameMaxLength: 31,
		    defaultRPCPort: 19001,
		    coin: 'XNA',
		    baseNetwork: 'xna'
		  },
		  TESTNET_PQ: {
		    name: 'xna-pq-test',
		    displayName: 'Neurai Testnet AuthScript',
		    addressPrefix: 't',
		    authScriptAddressPrefix: 'tnq1',
		    pqAddressPrefix: 'tnq1',
		    assetNameMaxLength: 121,
		    defaultRPCPort: 19101,
		    coin: 'TXNA',
		    baseNetwork: 'xna-test'
		  }
		};

		/**
		 * Asset naming helpers.
		 * Network-specific maximum lengths are enforced in AssetNameValidator.
		 */
		const ASSET_NAME_RULES = {
		  ROOT: {
		    minLength: 3,
		    maxLength: 31,
		    pattern: /^[A-Z0-9_.]+$/,
		    reserved: ['XNA', 'NEURAI', 'NEURAICOIN']
		  },
		  SUB: {
		    minLength: 1,
		    maxLength: 31,
		    pattern: /^[A-Z0-9_.]+$/,
		    separator: '/',
		    maxDepth: null
		  },
		  UNIQUE: {
		    minLength: 1,
		    maxLength: 32,
		    pattern: /^[-A-Za-z0-9@$%&*()[\]{}_.?:]+$/,
		    separator: '#'
		  },
		  QUALIFIER: {
		    minLength: 3,
		    maxLength: 32,
		    pattern: /^[A-Z0-9_.]+$/,
		    prefix: '#',
		    separator: '/'
		  },
		  RESTRICTED: {
		    minLength: 3,
		    maxLength: 32,
		    pattern: /^[A-Z0-9_.]+$/,
		    prefix: '$'
		  },
		  DEPIN: {
		    minLength: 3,
		    maxLength: 121,
		    pattern: /^[A-Z0-9_.]+$/,
		    prefix: '&',
		    separator: '/'
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
		 * `xna-pq` / `xna-pq-test` are preserved as compatibility aliases for
		 * AuthScript address flows on the same mainnet/testnet families.
		 *
		 * @param {string} networkName - Network name ('xna', 'xna-test', 'xna-pq', or 'xna-pq-test')
		 * @returns {object} Network configuration
		 */
		function getNetworkConfig(networkName) {
		  if (MAINNET_NETWORKS.includes(networkName)) {
		    return networkName === 'xna-pq' || networkName === 'mainnet-pq'
		      ? NETWORKS.MAINNET_PQ
		      : NETWORKS.MAINNET;
		  } else if (TESTNET_NETWORKS.includes(networkName)) {
		    return networkName === 'xna-pq-test' || networkName === 'testnet-pq'
		      ? NETWORKS.TESTNET_PQ
		      : NETWORKS.TESTNET;
		  } else {
		    throw new Error(`Unknown network: ${networkName}`);
		  }
		}

		/**
		 * Resolve a network name to its chain family.
		 * AuthScript aliases share the same family as legacy addresses.
		 *
		 * @param {string} networkName - Network name
		 * @returns {'mainnet'|'testnet'} Network family
		 */
		function resolveAddressNetworkFamily(networkName) {
		  if (MAINNET_NETWORKS.includes(networkName)) {
		    return 'mainnet';
		  }

		  if (TESTNET_NETWORKS.includes(networkName)) {
		    return 'testnet';
		  }

		  throw new Error(`Unknown network: ${networkName}`);
		}

		/**
		 * Determine whether two network labels are compatible for address use.
		 * This treats legacy and AuthScript labels on the same chain as compatible.
		 *
		 * @param {string} left - First network name
		 * @param {string} right - Second network name
		 * @returns {boolean} True if both belong to the same chain family
		 */
		function areAddressNetworksCompatible(left, right) {
		  return resolveAddressNetworkFamily(left) === resolveAddressNetworkFamily(right);
		}

		/**
		 * Detect network from address prefix.
		 * `nq1...` / `tnq1...` are AuthScript witness-v1 destinations.
		 *
		 * @param {string} address - Neurai address
		 * @returns {string} Network name ('xna', 'xna-test', 'xna-pq', or 'xna-pq-test')
		 */
		function detectNetworkFromAddress(address) {
		  if (address.startsWith(NETWORKS.MAINNET_PQ.authScriptAddressPrefix)) {
		    return 'xna-pq';
		  } else if (address.startsWith(NETWORKS.TESTNET_PQ.authScriptAddressPrefix)) {
		    return 'xna-pq-test';
		  } else if (address.startsWith('N')) {
		    return 'xna';
		  } else if (address.startsWith('t')) {
		    return 'xna-test';
		  } else {
		    throw new Error(`Cannot detect network from address: ${address}`);
		  }
		}

		networks = {
		  NETWORKS,
		  MAINNET_NETWORKS,
		  TESTNET_NETWORKS,
		  ASSET_NAME_RULES,
		  ASSET_LIMITS,
		  getNetworkConfig,
		  resolveAddressNetworkFamily,
		  areAddressNetworksCompatible,
		  detectNetworkFromAddress
		};
		return networks;
	}

	/**
	 * Constants Module
	 * Exports all constant values and configurations
	 */

	var constants$1;
	var hasRequiredConstants;

	function requireConstants () {
		if (hasRequiredConstants) return constants$1;
		hasRequiredConstants = 1;
		const { AssetType } = requireAssetTypes();
		const { ASSET_COSTS, getAssetCost, getUniqueAssetCost, getTaggingCost } = requireFees();
		const {
		  MAINNET_BURN_ADDRESSES,
		  TESTNET_BURN_ADDRESSES,
		  REGTEST_GLOBAL_BURN_ADDRESS,
		  resolveNetworkFamily,
		  isRegtest,
		  getBurnAddress,
		  isBurnAddress
		} = requireBurnAddresses();
		const {
		  NETWORKS,
		  MAINNET_NETWORKS,
		  TESTNET_NETWORKS,
		  ASSET_NAME_RULES,
		  ASSET_LIMITS,
		  getNetworkConfig,
		  resolveAddressNetworkFamily,
		  areAddressNetworksCompatible,
		  detectNetworkFromAddress
		} = requireNetworks();

		constants$1 = {
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
		  REGTEST_GLOBAL_BURN_ADDRESS,
		  resolveNetworkFamily,
		  isRegtest,
		  getBurnAddress,
		  isBurnAddress,

		  // Networks
		  NETWORKS,
		  MAINNET_NETWORKS,
		  TESTNET_NETWORKS,
		  ASSET_NAME_RULES,
		  ASSET_LIMITS,
		  getNetworkConfig,
		  resolveAddressNetworkFamily,
		  areAddressNetworksCompatible,
		  detectNetworkFromAddress
		};
		return constants$1;
	}

	/**
	 * Burn Manager
	 * Manages burn addresses and amounts for asset operations
	 *
	 * Each asset operation requires burning XNA to specific addresses.
	 * This manager ensures correct burn addresses and amounts are used
	 * based on network (mainnet/testnet) and operation type.
	 */

	var BurnManager_1;
	var hasRequiredBurnManager;

	function requireBurnManager () {
		if (hasRequiredBurnManager) return BurnManager_1;
		hasRequiredBurnManager = 1;
		const { getBurnAddress, getAssetCost } = requireConstants();
		const { InsufficientBurnAmountError, InvalidBurnAddressError } = requireErrors();

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
		   * Get burn info for DEPIN asset issuance
		   * DEPIN assets reuse the UNIQUE burn amount/address.
		   * @returns {object} { address, amount }
		   */
		  getIssueDepinBurn() {
		    return this.getIssueUniqueBurn(1);
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

		BurnManager_1 = BurnManager;
		return BurnManager_1;
	}

	/**
	 * Asset Name Parser
	 * Parses and analyzes asset names
	 */

	var assetNameParser;
	var hasRequiredAssetNameParser;

	function requireAssetNameParser () {
		if (hasRequiredAssetNameParser) return assetNameParser;
		hasRequiredAssetNameParser = 1;
		const { AssetType } = requireConstants();

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
		    const isDepin = name.startsWith('&');
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
		    } else if (isDepin) {
		      // DEPIN: &NAME or &NAME/SUB
		      type = AssetType.DEPIN;
		      prefix = '&';
		      if (cleanName.includes('/')) {
		        const parts = cleanName.split('/');
		        parent = parts[0];
		        subName = parts.slice(1).join('/');
		      }
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
		        isDepin: cleanName.startsWith('&'),
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
		      isDepin,
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
		    return name.includes('/') && !name.startsWith('#') && !name.startsWith('&');
		  }

		  /**
		   * Check if asset is a DEPIN asset
		   * @param {string} name - Asset name
		   * @returns {boolean} True if DEPIN
		   */
		  static isDepin(name) {
		    return name.startsWith('&');
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

		assetNameParser = AssetNameParser;
		return assetNameParser;
	}

	/**
	 * Amount Converter
	 * Converts between user amounts and satoshis (protocol internal format)
	 */

	var amountConverter;
	var hasRequiredAmountConverter;

	function requireAmountConverter () {
		if (hasRequiredAmountConverter) return amountConverter;
		hasRequiredAmountConverter = 1;
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

		amountConverter = AmountConverter;
		return amountConverter;
	}

	/**
	 * Network Detector
	 * Detects network type from various sources
	 */

	var networkDetector;
	var hasRequiredNetworkDetector;

	function requireNetworkDetector () {
		if (hasRequiredNetworkDetector) return networkDetector;
		hasRequiredNetworkDetector = 1;
		const { rpcErrorMessage } = requireRpcErrorMessage();

		const {
		  NETWORKS,
		  areAddressNetworksCompatible,
		  resolveAddressNetworkFamily
		} = requireConstants();

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
		      throw new Error(`Failed to detect network from RPC: ${rpcErrorMessage(error)}`);
		    }
		  }

		  /**
		   * Detect network from address
		   * @param {string} address - Neurai address
		   * @returns {string} Network label ('xna', 'xna-test', 'xna-pq', or 'xna-pq-test')
		   */
		  static detectFromAddress(address) {
		    if (!address || typeof address !== 'string') {
		      throw new Error('Address must be a non-empty string');
		    }

		    if (address.startsWith(NETWORKS.MAINNET_PQ.authScriptAddressPrefix)) {
		      return 'xna-pq';
		    }

		    if (address.startsWith(NETWORKS.TESTNET_PQ.authScriptAddressPrefix)) {
		      return 'xna-pq-test';
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
		   * @returns {string} Network label. Mixed legacy/AuthScript addresses on the same
		   * chain are normalized to the chain family label (`xna` or `xna-test`).
		   */
		  static detectFromAddresses(addresses) {
		    if (!Array.isArray(addresses) || addresses.length === 0) {
		      throw new Error('Addresses must be a non-empty array');
		    }

		    const firstNetwork = this.detectFromAddress(addresses[0]);
		    const family = resolveAddressNetworkFamily(firstNetwork);

		    // Verify all addresses are from the same network
		    for (let i = 1; i < addresses.length; i++) {
		      const otherNetwork = this.detectFromAddress(addresses[i]);
		      if (!areAddressNetworksCompatible(firstNetwork, otherNetwork)) {
		        throw new Error(`Mixed network addresses detected: ${firstNetwork} and ${otherNetwork}`);
		      }
		    }

		    return family === 'mainnet' ? 'xna' : 'xna-test';
		  }

		  /**
		   * Validate that addresses match expected network
		   * @param {string[]} addresses - Array of addresses
		   * @param {string} expectedNetwork - Expected network label
		   * @returns {boolean} True if all addresses match network
		   */
		  static validateAddressesNetwork(addresses, expectedNetwork) {
		    if (!Array.isArray(addresses) || addresses.length === 0) {
		      throw new Error('Addresses must be a non-empty array');
		    }

		    for (const address of addresses) {
		      const network = this.detectFromAddress(address);
		      if (!areAddressNetworksCompatible(network, expectedNetwork)) {
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
		    } else if (network === 'xna-pq' || network === 'mainnet-pq') {
		      return NETWORKS.MAINNET_PQ;
		    } else if (network === 'xna-pq-test' || network === 'testnet-pq') {
		      return NETWORKS.TESTNET_PQ;
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
		    return network === 'xna' || network === 'mainnet' || network === 'xna-pq' || network === 'mainnet-pq';
		  }

		  /**
		   * Check if network is testnet
		   * @param {string} network - Network name
		   * @returns {boolean} True if testnet
		   */
		  static isTestnet(network) {
		    return network === 'xna-test' ||
		      network === 'testnet' ||
		      network === 'regtest' ||
		      network === 'xna-pq-test' ||
		      network === 'testnet-pq';
		  }
		}

		networkDetector = NetworkDetector;
		return networkDetector;
	}

	/**
	 * Output Formatter
	 * Formats outputs for createrawtransaction RPC calls
	 */

	var outputFormatter;
	var hasRequiredOutputFormatter;

	function requireOutputFormatter () {
		if (hasRequiredOutputFormatter) return outputFormatter;
		hasRequiredOutputFormatter = 1;
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

		outputFormatter = OutputFormatter;
		return outputFormatter;
	}

	/**
	 * Exact amount conversion for the canonical createTransactionBuild contract.
	 *
	 * Everything the chain encodes in a transaction is an integer:
	 *   - XNA values are 10^8 sats;
	 *   - asset payload quantities are ALSO 10^8-scaled, independently of the
	 *     asset's `units`. `units` limits divisibility and presentation, it is
	 *     never a multiplier (see the node's CheckAmountWithUnits in assets.cpp).
	 *
	 * The display <-> raw conversion is therefore a fixed 10^8 scaling, done
	 * **through text**: scaling the decimal string keeps every digit the caller
	 * wrote, and refuses the ones it cannot keep.
	 *
	 * The alternative — `BigInt(Math.round(value * 1e8))`, which is what
	 * `assetUnitsToRaw` in neurai-create-transaction does — is correct for
	 * ordinary magnitudes. `4.35 * 1e8` is `434999999.99999994`, but `Math.round`
	 * recovers `435000000`; that example shows binary representation, not a wrong
	 * result. For a finite, non-negative number it has two silent failure modes:
	 *
	 *   - more than eight decimals are rounded away instead of rejected, so an
	 *     amount can vanish (`1e-9` becomes `0n`) or shift (`1.123456789` becomes
	 *     `112345679`);
	 *   - past `Number.MAX_SAFE_INTEGER` a double can no longer represent every
	 *     integer, so the product may or may not survive — and nothing says which.
	 *     `184467440.73709551` comes back as `18446744073709552n`, one unit off,
	 *     while `21000000000` scales to `2100000000000000000n` exactly. The risk
	 *     is that the two cases are indistinguishable from the outside.
	 *
	 * Outside that range its `Number(amount || 0)` also turns `NaN`, `null` and
	 * `''` into `0n`, accepts negatives, and coerces other types — `true` yields a
	 * whole unit. Every one of these is reachable with values a wallet can hold,
	 * and none announces itself. Hence: convert by text, validate, and fail closed
	 * rather than delegate.
	 */

	var assetAmount;
	var hasRequiredAssetAmount;

	function requireAssetAmount () {
		if (hasRequiredAssetAmount) return assetAmount;
		hasRequiredAssetAmount = 1;
		const { InvalidAmountError, InvalidUnitsError } = requireErrors();

		/** Asset payload and XNA values are both encoded with 8 decimals. */
		const PROTOCOL_DECIMALS = 8;

		/** 10^8, as a bigint, for callers that need the scale itself. */
		const PROTOCOL_SCALE = 100000000n;

		/**
		 * Consensus ceiling for any CAmount, asset payloads included:
		 * `MAX_MONEY = 21000000000 * COIN` in the node's `src/amount.h`, with
		 * `MoneyRange(v)` requiring `0 <= v <= MAX_MONEY`.
		 *
		 * Enforced here rather than left to the callers because it is a property of
		 * the value, not of the operation: a string is not exempt just because it
		 * carried its digits faithfully.
		 */
		const MAX_MONEY_RAW = 2100000000000000000n;

		const PLAIN_DECIMAL = /^-?\d+(\.\d+)?$/;
		const SCIENTIFIC_DECIMAL = /^(-?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/;

		/**
		 * Expand a scientific-notation decimal ("1e-7", "2.1e+19") into plain decimal
		 * text. Returns the input unchanged when it carries no exponent.
		 *
		 * @param {string} text - Decimal text, possibly with an exponent
		 * @returns {string} Plain decimal text
		 */
		function expandScientificNotation(text) {
		  const match = SCIENTIFIC_DECIMAL.exec(text);
		  if (!match) {
		    return text;
		  }

		  const [, sign, intPart, fracPart = '', exponentText] = match;
		  const digits = intPart + fracPart;
		  const pointPosition = intPart.length + Number.parseInt(exponentText, 10);

		  let expanded;
		  if (pointPosition <= 0) {
		    expanded = `0.${'0'.repeat(-pointPosition)}${digits}`;
		  } else if (pointPosition >= digits.length) {
		    expanded = digits + '0'.repeat(pointPosition - digits.length);
		  } else {
		    expanded = `${digits.slice(0, pointPosition)}.${digits.slice(pointPosition)}`;
		  }

		  return sign + expanded;
		}

		/**
		 * Normalize a public amount into canonical plain decimal text.
		 *
		 * Strings must already be plain decimals: a caller that writes "1e3" is more
		 * likely to have a bug than to mean 1000, and there is no reason to guess.
		 * Numbers are accepted through their shortest round-trip representation
		 * (`String(0.1)` is `"0.1"`, not the exact binary expansion), then expanded,
		 * which is the only reading under which a literal like `1e-7` is meaningful.
		 *
		 * @param {string|number} value - Public amount
		 * @param {string} label - What is being converted, for the error message
		 * @returns {string} Plain decimal text
		 * @throws {InvalidAmountError} If the value cannot be read exactly
		 */
		function normalizeDecimalText(value, label) {
		  if (typeof value === 'bigint') {
		    throw new InvalidAmountError(
		      `${label}: a bigint is ambiguous as a display amount (is 5n five tokens ` +
		      `or five raw units?). Pass a decimal string such as "5", or set the ` +
		      `*Raw / *Sats field directly when you already hold protocol integers.`,
		      value
		    );
		  }

		  if (typeof value === 'number') {
		    if (!Number.isFinite(value)) {
		      throw new InvalidAmountError(`${label}: ${value} is not a finite number`, value);
		    }
		    return expandScientificNotation(String(value));
		  }

		  if (typeof value === 'string') {
		    const text = value.trim();
		    if (text === '') {
		      throw new InvalidAmountError(`${label}: empty string is not an amount`, value);
		    }
		    if (SCIENTIFIC_DECIMAL.test(text)) {
		      throw new InvalidAmountError(
		        `${label}: "${text}" uses exponent notation. Pass a plain decimal ` +
		        `string (for example "${expandScientificNotation(text)}") so the ` +
		        `intended value is unambiguous.`,
		        value
		      );
		    }
		    if (!PLAIN_DECIMAL.test(text)) {
		      throw new InvalidAmountError(`${label}: "${text}" is not a decimal number`, value);
		    }
		    return text;
		  }

		  throw new InvalidAmountError(
		    `${label}: expected a decimal string or a number, received ${value === null ? 'null' : typeof value}`,
		    value
		  );
		}

		/**
		 * Scale plain decimal text by 10^decimals, exactly, using text only.
		 *
		 * `rounding: 'ceil'` exists for one purpose: a *threshold* — a fee or a
		 * funding requirement — computed by float arithmetic upstream, which can
		 * carry noise digits below the satoshi (`0.031275000000000004`). Rounding it
		 * up asks for slightly more than needed, which is safe; rounding a value that
		 * will be *encoded* would silently create money, so the default is to reject.
		 *
		 * @param {string} text - Plain decimal text
		 * @param {number} decimals - Number of decimals of the target scale
		 * @param {string} label - What is being converted, for the error message
		 * @param {'exact'|'ceil'} [rounding] - How to treat excess precision
		 * @returns {bigint} Scaled integer
		 * @throws {InvalidAmountError} If the value carries more decimals than the scale
		 */
		function scaleDecimalText(text, decimals, label, rounding = 'exact') {
		  const negative = text.startsWith('-');
		  const unsigned = negative ? text.slice(1) : text;
		  const [intPart, fracPart = ''] = unsigned.split('.');

		  if (fracPart.length > decimals) {
		    if (rounding !== 'ceil') {
		      throw new InvalidAmountError(
		        `${label}: "${text}" has ${fracPart.length} decimals; the protocol ` +
		        `encodes at most ${decimals}. The extra digits would be silently ` +
		        `dropped, so this is rejected instead of rounded.`,
		        text
		      );
		    }
		    if (negative) {
		      throw new InvalidAmountError(
		        `${label}: "${text}" is negative; rounding up a negative threshold is not meaningful`,
		        text
		      );
		    }
		    const kept = BigInt(intPart + fracPart.slice(0, decimals));
		    const dropped = fracPart.slice(decimals);
		    return /[1-9]/.test(dropped) ? kept + 1n : kept;
		  }

		  const scaled = BigInt(intPart + fracPart.padEnd(decimals, '0'));
		  return negative ? -scaled : scaled;
		}

		/**
		 * Refuse a `number` whose scaled value no longer fits a safe integer.
		 *
		 * Above `MAX_SAFE_INTEGER / 1e8` (~90071992.55) a double can no longer name
		 * every 8-decimal value, so the shortest round-trip form this module reads is
		 * not necessarily the decimal the caller meant. The two paths then disagree:
		 *
		 *   assetAmountToRaw(184467440.73709551)   → 18446744073709550n
		 *   assetAmountToRaw('184467440.73709551') → 18446744073709551n
		 *
		 * because `String(184467440.73709551)` is `'184467440.7370955'` — one digit
		 * shorter. Neither answer is wrong for the double that arrived; the problem is
		 * that the intended decimal was already lost at the call site. Asking for a
		 * string is the only way to get it back, so this fails closed instead of
		 * picking one. Strings are never restricted.
		 *
		 * A number that is itself a safe integer is still accepted, however large it
		 * scales: it names its value exactly and has no fractional digits to lose, so
		 * `21000000000` — the documented maximum supply — keeps working. What is
		 * refused is a number that is neither a safe integer nor small enough for its
		 * eight decimals to be unambiguous.
		 *
		 * @param {string|number} value - The original input
		 * @param {bigint} raw - Scaled result
		 * @param {string} text - Normalized decimal text
		 * @param {string} label - Prefix for error messages
		 * @throws {InvalidAmountError} If a number cannot carry the value exactly
		 */
		function assertNumberCarriedItExactly(value, raw, text, label) {
		  if (typeof value !== 'number') {
		    return;
		  }
		  if (raw <= BigInt(Number.MAX_SAFE_INTEGER) || Number.isSafeInteger(value)) {
		    return;
		  }
		  throw new InvalidAmountError(
		    `${label}: ${text} scales to ${raw}, past Number.MAX_SAFE_INTEGER, and the ` +
		    `number that arrived can no longer name every 8-decimal value at that ` +
		    `magnitude — it may already differ from the amount intended. Pass it as a ` +
		    `decimal string ("${text}") instead.`,
		    value
		  );
		}

		/**
		 * Convert a user-facing asset amount into the raw 10^8-scaled integer that
		 * goes into the asset payload.
		 *
		 * @param {string|number} value - Display amount (e.g. "1.25")
		 * @param {number} [units] - Asset decimal places; when given, divisibility is enforced
		 * @param {object} [options]
		 * @param {string} [options.label] - Prefix for error messages
		 * @returns {bigint} Raw amount, 10^8-scaled
		 * @throws {InvalidAmountError|InvalidUnitsError} If the amount cannot be encoded
		 */
		function assetAmountToRaw(value, units, options = {}) {
		  const label = options.label || 'asset amount';
		  const text = normalizeDecimalText(value, label);
		  const raw = scaleDecimalText(text, PROTOCOL_DECIMALS, label);

		  if (raw < 0n) {
		    throw new InvalidAmountError(`${label}: "${text}" is negative`, value);
		  }

		  assertNumberCarriedItExactly(value, raw, text, label);

		  if (raw > MAX_MONEY_RAW) {
		    throw new InvalidAmountError(
		      `${label}: "${text}" scales to ${raw}, above the consensus ceiling ` +
		      `MAX_MONEY (${MAX_MONEY_RAW}, i.e. 21000000000 units). The node rejects ` +
		      `it with MoneyRange, so it is refused here rather than serialized.`,
		      value
		    );
		  }

		  if (units !== undefined && units !== null) {
		    if (!Number.isInteger(units) || units < 0 || units > PROTOCOL_DECIMALS) {
		      throw new InvalidUnitsError(
		        `${label}: units must be an integer between 0 and ${PROTOCOL_DECIMALS}, received ${units}`,
		        units
		      );
		    }
		    const step = 10n ** BigInt(PROTOCOL_DECIMALS - units);
		    if (raw % step !== 0n) {
		      throw new InvalidAmountError(
		        `${label}: "${text}" is not a multiple of the asset's precision ` +
		        `(units=${units} allows steps of ${formatRawAsDecimal(step)}). The ` +
		        `node rejects it with CheckAmountWithUnits.`,
		        value
		      );
		    }
		  }

		  return raw;
		}

		/**
		 * Convert a user-facing XNA amount into satoshis, exactly.
		 *
		 * @param {string|number} value - Display XNA amount
		 * @param {object} [options]
		 * @param {string} [options.label] - Prefix for error messages
		 * @param {boolean} [options.allowNegative] - Permit negative results
		 * @param {'exact'|'ceil'} [options.rounding] - Only for thresholds; see scaleDecimalText
		 * @returns {bigint} Satoshis
		 * @throws {InvalidAmountError} If the amount cannot be encoded
		 */
		function xnaAmountToSats(value, options = {}) {
		  const label = options.label || 'XNA amount';
		  const text = normalizeDecimalText(value, label);
		  const sats = scaleDecimalText(text, PROTOCOL_DECIMALS, label, options.rounding);

		  if (sats < 0n && !options.allowNegative) {
		    throw new InvalidAmountError(`${label}: "${text}" is negative`, value);
		  }

		  return sats;
		}

		/**
		 * Render a protocol integer back as plain decimal text, exactly.
		 *
		 * Used for the RPC/legacy envelopes, which speak display amounts. Text keeps
		 * values above `Number.MAX_SAFE_INTEGER` intact; `toNumber` is the explicit,
		 * lossy step for the places that still need a JS number.
		 *
		 * @param {bigint} raw - Protocol integer (10^8-scaled)
		 * @returns {string} Plain decimal text without trailing zeros
		 */
		function formatRawAsDecimal(raw) {
		  const negative = raw < 0n;
		  const digits = (negative ? -raw : raw).toString().padStart(PROTOCOL_DECIMALS + 1, '0');
		  const intPart = digits.slice(0, digits.length - PROTOCOL_DECIMALS);
		  const fracPart = digits.slice(digits.length - PROTOCOL_DECIMALS).replace(/0+$/, '');
		  const text = fracPart === '' ? intPart : `${intPart}.${fracPart}`;
		  return negative ? `-${text}` : text;
		}

		/**
		 * Render a protocol integer as a JS number for the legacy display envelopes.
		 *
		 * Fails closed rather than returning a value the caller cannot trust: a
		 * quantity whose display form is not exactly representable would otherwise
		 * travel on as a plausible-looking wrong number.
		 *
		 * @param {bigint} raw - Protocol integer (10^8-scaled)
		 * @param {string} [label] - Prefix for error messages
		 * @returns {number} Display amount
		 * @throws {InvalidAmountError} If the display value is not exactly representable
		 */
		function rawToDisplayNumber(raw, label = 'amount') {
		  const text = formatRawAsDecimal(raw);
		  const asNumber = Number(text);
		  if (!Number.isFinite(asNumber) || expandScientificNotation(String(asNumber)) !== text) {
		    throw new InvalidAmountError(
		      `${label}: ${text} cannot be represented exactly as a JavaScript number. ` +
		      `Read the raw bigint instead of the display field.`,
		      text
		    );
		  }
		  return asNumber;
		}

		/**
		 * Normalize a chain-reported integer (UTXO `satoshis`, asset balance) to bigint.
		 *
		 * A `number` is only accepted when it is a safe integer. An unsafe one is
		 * rejected rather than converted: `JSON.parse` already destroyed the low bits,
		 * and `BigInt(9007199254740993)` cannot bring them back — it would just make
		 * the corruption look deliberate.
		 *
		 * @param {bigint|string|number} value - Chain integer
		 * @param {string} [label] - Prefix for error messages
		 * @returns {bigint} The same integer, exactly
		 * @throws {InvalidAmountError} If the value is not an exact integer
		 */
		function toProtocolInteger(value, label = 'value') {
		  if (typeof value === 'bigint') {
		    return value;
		  }

		  if (typeof value === 'number') {
		    if (!Number.isInteger(value)) {
		      throw new InvalidAmountError(`${label}: ${value} is not an integer`, value);
		    }
		    if (!Number.isSafeInteger(value)) {
		      throw new InvalidAmountError(
		        `${label}: ${value} exceeds Number.MAX_SAFE_INTEGER, so JSON parsing ` +
		        `already lost digits. Have the RPC transport deliver this field as a ` +
		        `string or bigint; converting it here would preserve the corruption.`,
		        value
		      );
		    }
		    return BigInt(value);
		  }

		  if (typeof value === 'string') {
		    const text = value.trim();
		    if (!/^-?\d+$/.test(text)) {
		      throw new InvalidAmountError(`${label}: "${value}" is not an integer`, value);
		    }
		    return BigInt(text);
		  }

		  throw new InvalidAmountError(
		    `${label}: expected an integer as bigint, string or number, received ${value === null ? 'null' : typeof value}`,
		    value
		  );
		}

		/**
		 * Sum chain-reported integers exactly.
		 *
		 * @param {Array<object>} items - Objects carrying the field
		 * @param {string} [field] - Field name (default: 'satoshis')
		 * @param {string} [label] - Prefix for error messages
		 * @returns {bigint} Exact total
		 */
		function sumProtocolIntegers(items, field = 'satoshis', label = 'utxo.satoshis') {
		  return (items || []).reduce(
		    (total, item) => total + toProtocolInteger(item ? item[field] : undefined, label),
		    0n
		  );
		}

		assetAmount = {
		  PROTOCOL_DECIMALS,
		  PROTOCOL_SCALE,
		  MAX_MONEY_RAW,
		  assetAmountToRaw,
		  xnaAmountToSats,
		  formatRawAsDecimal,
		  rawToDisplayNumber,
		  toProtocolInteger,
		  sumProtocolIntegers,
		  expandScientificNotation,
		  normalizeDecimalText,
		  scaleDecimalText
		};
		return assetAmount;
	}

	/**
	 * Utils Module
	 * Exports all utility classes
	 */

	var utils$1;
	var hasRequiredUtils;

	function requireUtils () {
		if (hasRequiredUtils) return utils$1;
		hasRequiredUtils = 1;
		const AssetNameParser = requireAssetNameParser();
		const AmountConverter = requireAmountConverter();
		const NetworkDetector = requireNetworkDetector();
		const OutputFormatter = requireOutputFormatter();
		const AssetAmount = requireAssetAmount();

		utils$1 = {
		  AssetNameParser,
		  AmountConverter,
		  NetworkDetector,
		  OutputFormatter,
		  AssetAmount
		};
		return utils$1;
	}

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

	var OwnerTokenManager_1;
	var hasRequiredOwnerTokenManager;

	function requireOwnerTokenManager () {
		if (hasRequiredOwnerTokenManager) return OwnerTokenManager_1;
		hasRequiredOwnerTokenManager = 1;
		const { rpcErrorMessage } = requireRpcErrorMessage();
		const { AssetNameParser } = requireUtils();
		const {
		  OwnerTokenNotFoundError,
		  OwnerTokenNotReturnedError,
		  AssetError
		} = requireErrors();

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
		        `Failed to find owner token ${ownerTokenName}: ${rpcErrorMessage(error)}`
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
		        `Failed to get owner tokens: ${rpcErrorMessage(error)}`
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

		OwnerTokenManager_1 = OwnerTokenManager;
		return OwnerTokenManager_1;
	}

	/**
	 * Fee / size helpers for Neurai transactions.
	 *
	 * These constants and classifiers are the same ones exposed by
	 * `@neuraiproject/neurai-sign-transaction` (`VBYTES`, `isPQAddress`,
	 * `isPQScript`, `estimateInputVbytes`, `estimateOutputBytes`,
	 * `estimateTransactionVbytes`). They are inlined here to keep the assets
	 * package light: depending on the full signer would pull `bitcoinjs-lib`
	 * and `@noble/post-quantum` into the IIFE / browser bundles, which is far
	 * more weight than the few constants we actually need for fee estimation.
	 *
	 * SOURCE OF TRUTH: `@neuraiproject/neurai-sign-transaction` `src/estimate.ts`.
	 * Keep these values in sync with the signer's `VBYTES`. Mismatches surface
	 * immediately as `min relay fee not met` failures from the node.
	 */

	var feeSizing;
	var hasRequiredFeeSizing;

	function requireFeeSizing () {
		if (hasRequiredFeeSizing) return feeSizing;
		hasRequiredFeeSizing = 1;
		/** Per-component byte sizes used across the Neurai stack for fee estimation. */
		const VBYTES = Object.freeze({
		  /** Raw transaction overhead: version (4) + in-count varint (1) + out-count varint (1) + locktime (4). */
		  baseTxOverheadBytes: 10,
		  /** Extra weight contributed by the segwit marker + flag bytes when any input is PQ. */
		  segwitMarkerVbytes: 1,
		  /** vbytes for a typical legacy P2PKH input (worst-case scriptSig). */
		  legacyInputVbytes: 148,
		  /** vbytes for a typical PQ AuthScript input with the default OP_TRUE witnessScript. */
		  pqInputVbytes: 977,
		  /** Bytes of a legacy P2PKH output (8-byte value + 1-byte script length + 25-byte scriptPubKey). */
		  legacyOutputBytes: 34,
		  /** Bytes of an AuthScript-v1 output (8-byte value + 1-byte script length + 34-byte scriptPubKey). */
		  pqOutputBytes: 43,
		});

		/** True for Neurai PQ AuthScript bech32 destinations (`nq1…` mainnet, `tnq1…` testnet). */
		function isPQAddress(address) {
		  return (
		    typeof address === 'string' &&
		    (address.startsWith('nq1') || address.startsWith('tnq1'))
		  );
		}

		/** True for AuthScript-v1 scriptPubKey hex (witness v1, 32-byte program — `5120…`). */
		function isPQScript(scriptHex) {
		  if (typeof scriptHex !== 'string' || scriptHex.length < 4) return false;
		  return scriptHex.toLowerCase().startsWith('5120');
		}

		/**
		 * Estimate the vbytes contributed by spending one UTXO. Uses the UTXO's
		 * `script` if available, otherwise falls back to its `address`. Unknown
		 * prevouts are treated as legacy.
		 */
		function estimateInputVbytes(utxo) {
		  const script = utxo && utxo.script;
		  if (typeof script === 'string' && script.length > 0) {
		    return isPQScript(script) ? VBYTES.pqInputVbytes : VBYTES.legacyInputVbytes;
		  }
		  const address = utxo && utxo.address;
		  if (typeof address === 'string' && isPQAddress(address)) {
		    return VBYTES.pqInputVbytes;
		  }
		  return VBYTES.legacyInputVbytes;
		}

		/**
		 * Bytes an asset payload adds on top of a plain destination output.
		 *
		 * An asset output is `<destination script> OP_XNA_ASSET <pushdata payload>
		 * OP_DROP`, so it costs the destination plus the wrapper (OP_XNA_ASSET,
		 * the pushdata prefix and OP_DROP) plus the payload itself:
		 *
		 *   marker(3) + type(1) + nameLength(1) + name + kind-specific tail
		 *
		 * Sizing these as bare P2PKH outputs under-counts a transaction by tens to
		 * hundreds of bytes. That is invisible while the node's fee rate sits well
		 * above its minimum relay fee, and becomes `min relay fee not met` as soon as
		 * it does not — which is exactly the failure this file's header warns about.
		 *
		 * @param {object} descriptor - Output descriptor with `assetName` and `kind`
		 * @returns {number} Extra bytes, or 0 when the output carries no asset payload
		 */
		function assetPayloadBytes(descriptor) {
		  if (!descriptor || typeof descriptor !== 'object' || !descriptor.assetName) {
		    return 0;
		  }

		  const nameLength = Buffer.byteLength(String(descriptor.assetName), 'ascii');
		  const kind = descriptor.kind || 'transfer';

		  // marker(3) + type(1) + CompactSize name length(1) + name
		  let payload = 5 + nameLength;

		  switch (kind) {
		    case 'owner':
		      // The owner payload carries no amount: it is always exactly one unit.
		      break;
		    case 'issue':
		      // amount(8) + units(1) + reissuable(1) + has_ipfs(1)
		      payload += 11;
		      break;
		    case 'reissue':
		      // amount(8) + units(1) + reissuable(1)
		      payload += 10;
		      break;
		    default:
		      // transfer: amount(8)
		      payload += 8;
		      break;
		  }

		  if (descriptor.hasIpfs) {
		    payload += 34;
		  }

		  // OP_XNA_ASSET(1) + pushdata prefix + OP_DROP(1). Payloads over 75 bytes
		  // need OP_PUSHDATA1, which is one byte wider — reachable with the 121-char
		  // asset names testnet and regtest allow for DePIN.
		  const pushPrefix = payload > 75 ? 2 : 1;

		  return 1 + pushPrefix + payload + 1;
		}

		/**
		 * Estimate the bytes contributed by an output.
		 *
		 * Accepts an address string, `{ address }`, or an asset-aware descriptor
		 * `{ address, assetName, kind, hasIpfs }` where `kind` is one of `transfer`
		 * (default), `owner`, `issue` or `reissue`.
		 *
		 * @param {string|object} target - Output descriptor
		 * @returns {number} Estimated bytes
		 */
		function estimateOutputBytes(target) {
		  const address =
		    typeof target === 'string' ? target : (target && target.address) || '';
		  const base = isPQAddress(address) ? VBYTES.pqOutputBytes : VBYTES.legacyOutputBytes;
		  return base + assetPayloadBytes(typeof target === 'string' ? null : target);
		}

		/**
		 * Sum the per-input/per-output contributions, plus base overhead and segwit
		 * marker (added once when any input is PQ). Inputs may be partial UTXO-like
		 * objects with `script` and/or `address`. Outputs may be address strings or
		 * `{ address }` descriptors.
		 */
		function estimateTransactionVbytes(inputs, outputs) {
		  let vbytes = VBYTES.baseTxOverheadBytes;
		  let hasPQInput = false;

		  for (const inp of inputs) {
		    const v = estimateInputVbytes(inp);
		    vbytes += v;
		    if (v === VBYTES.pqInputVbytes) hasPQInput = true;
		  }

		  for (const out of outputs) {
		    vbytes += estimateOutputBytes(out);
		  }

		  if (hasPQInput) vbytes += VBYTES.segwitMarkerVbytes;

		  return vbytes;
		}

		feeSizing = {
		  VBYTES,
		  isPQAddress,
		  isPQScript,
		  estimateInputVbytes,
		  estimateOutputBytes,
		  assetPayloadBytes,
		  estimateTransactionVbytes,
		};
		return feeSizing;
	}

	/**
	 * UTXO Selector
	 * Selects appropriate UTXOs for asset transactions
	 *
	 * Handles selection of:
	 * - Base currency (XNA) UTXOs for fees and burns
	 * - Asset UTXOs for transfers and operations
	 * - Mempool filtering to prevent double-spending
	 */

	var UTXOSelector_1;
	var hasRequiredUTXOSelector;

	function requireUTXOSelector () {
		if (hasRequiredUTXOSelector) return UTXOSelector_1;
		hasRequiredUTXOSelector = 1;
		const { rpcErrorMessage } = requireRpcErrorMessage();
		const { InsufficientFundsError } = requireErrors();
		const { estimateTransactionVbytes } = requireFeeSizing();
		const {
		  assetAmountToRaw,
		  xnaAmountToSats,
		  formatRawAsDecimal,
		  toProtocolInteger,
		  sumProtocolIntegers
		} = requireAssetAmount();

		/**
		 * Identity of an unspent output. `getaddressutxos` reports `outputIndex`;
		 * builder-side inputs carry `vout`. Both name the same thing.
		 *
		 * @param {object} utxo - UTXO or input
		 * @returns {string} Stable outpoint key
		 */
		function outpointKey(utxo) {
		  const index = utxo.outputIndex !== undefined ? utxo.outputIndex : utxo.vout;
		  return `${utxo.txid}:${index}`;
		}

		/**
		 * Accept an exclusion list as a Set, an array of keys, or an array of
		 * UTXO-like objects, and return a Set of keys.
		 *
		 * @param {Set<string>|Array<string|object>|undefined} exclude - Outpoints to skip
		 * @returns {Set<string>} Excluded outpoint keys
		 */
		function toOutpointSet(exclude) {
		  if (!exclude) {
		    return new Set();
		  }
		  if (exclude instanceof Set) {
		    return exclude;
		  }
		  return new Set(
		    Array.from(exclude, entry => (typeof entry === 'string' ? entry : outpointKey(entry)))
		  );
		}

		/**
		 * Integer division rounding away from zero, for fee thresholds.
		 *
		 * @param {bigint} numerator - Dividend
		 * @param {bigint} denominator - Positive divisor
		 * @returns {bigint} Ceiling of the quotient
		 */
		function ceilDiv(numerator, denominator) {
		  if (numerator <= 0n) {
		    return numerator / denominator;
		  }
		  return (numerator + denominator - 1n) / denominator;
		}

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
		      throw new Error(`Failed to get UTXOs: ${rpcErrorMessage(error)}`);
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
		   * Sort UTXOs by value, largest first, without mutating the input.
		   *
		   * A bigint comparison is required: `b.satoshis - a.satoshis` throws once
		   * satoshis arrive as bigint and compares lexicographically once they arrive
		   * as strings, which is how a large-value UTXO ends up sorted as if it were
		   * small.
		   *
		   * @param {Array} utxos - UTXOs to sort
		   * @param {string} label - Field description for error messages
		   * @returns {Array} New array, sorted by descending value
		   */
		  sortByValueDesc(utxos, label = 'utxo.satoshis') {
		    return [...utxos].sort((a, b) => {
		      const left = toProtocolInteger(a.satoshis, label);
		      const right = toProtocolInteger(b.satoshis, label);
		      if (right > left) return 1;
		      if (right < left) return -1;
		      return 0;
		    });
		  }

		  /**
		   * Select UTXOs for base currency (XNA)
		   * Uses greedy algorithm: selects UTXOs until sum >= required amount
		   *
		   * `options.exclude` is what keeps a second, incremental call from handing
		   * back an outpoint the caller already holds: without it this method
		   * re-queries the node, re-sorts from the largest value — which is normally
		   * the one the first call took — and returns it again, producing a
		   * transaction that spends the same outpoint twice.
		   *
		   * @param {string[]} addresses - Wallet addresses
		   * @param {number|string} requiredAmount - Required amount in XNA (ignored when options.requiredSats is given)
		   * @param {number} buffer - Safety buffer percentage (default: 0.1 = 10%)
		   * @param {object} [options]
		   * @param {bigint} [options.requiredSats] - Exact requirement in satoshis; preferred over requiredAmount
		   * @param {Set<string>|Array} [options.exclude] - Outpoints that must not be selected
		   * @returns {Promise<object>} { utxos, totalAmount, totalSats }
		   * @throws {InsufficientFundsError} If not enough funds
		   */
		  async selectBaseCurrencyUTXOs(addresses, requiredAmount, buffer = 0.1, options = {}) {
		    // Get all XNA UTXOs
		    const allUTXOs = await this.getUTXOs(addresses, null);

		    // Get mempool and filter
		    const mempool = await this.getMempoolEntries(addresses);
		    const unspentUTXOs = this.filterMempoolSpentUTXOs(allUTXOs, mempool);

		    // Drop outpoints the caller already spends elsewhere in this transaction
		    const excluded = toOutpointSet(options.exclude);
		    const availableUTXOs = excluded.size === 0
		      ? unspentUTXOs
		      : unspentUTXOs.filter(utxo => !excluded.has(outpointKey(utxo)));

		    // Sort by value (largest first) for efficiency
		    const sortedUTXOs = this.sortByValueDesc(availableUTXOs);

		    // Requirement and buffer in integer satoshis. The buffer is applied to the
		    // integer, not to a float amount that is then re-scaled.
		    const requiredSats = options.requiredSats !== undefined
		      ? toProtocolInteger(options.requiredSats, 'requiredSats')
		      : xnaAmountToSats(requiredAmount, { label: 'required XNA', rounding: 'ceil' });
		    const bufferScale = 10000n;
		    const bufferFactor = BigInt(Math.round((1 + buffer) * Number(bufferScale)));
		    const requiredWithBufferSats = ceilDiv(requiredSats * bufferFactor, bufferScale);

		    // Select UTXOs greedily
		    const selected = [];
		    let totalSatoshis = 0n;

		    for (const utxo of sortedUTXOs) {
		      selected.push(utxo);
		      totalSatoshis += toProtocolInteger(utxo.satoshis, 'utxo.satoshis');

		      if (totalSatoshis >= requiredWithBufferSats) {
		        break;
		      }
		    }

		    // Check if we have enough
		    if (totalSatoshis < requiredWithBufferSats) {
		      const available = formatRawAsDecimal(totalSatoshis);
		      const required = formatRawAsDecimal(requiredSats);
		      throw new InsufficientFundsError(
		        `Insufficient XNA balance. Required: ${required} XNA (+ ${(buffer * 100).toFixed(0)}% buffer), ` +
		        `Available: ${available} XNA`,
		        Number(required),
		        Number(available)
		      );
		    }

		    return {
		      utxos: selected,
		      totalAmount: Number(formatRawAsDecimal(totalSatoshis)),
		      totalSats: totalSatoshis
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
		  async selectAssetUTXOs(addresses, assetName, requiredAmount, options = {}) {
		    if (!assetName) {
		      throw new Error('Asset name is required');
		    }

		    // Get all asset UTXOs
		    const allUTXOs = await this.getUTXOs(addresses, assetName);

		    // Get mempool and filter
		    const mempool = await this.getMempoolEntries(addresses);
		    const unspentUTXOs = this.filterMempoolSpentUTXOs(allUTXOs, mempool);

		    const excluded = toOutpointSet(options.exclude);
		    const availableUTXOs = excluded.size === 0
		      ? unspentUTXOs
		      : unspentUTXOs.filter(utxo => !excluded.has(outpointKey(utxo)));

		    // Sort by value (largest first)
		    const sortedUTXOs = this.sortByValueDesc(availableUTXOs);

		    // Requirement as an exact protocol integer. `requiredRaw` is the path the
		    // canonical builders use: they have already summed the recipients in raw
		    // and must not round-trip that total through a display float.
		    const requiredRaw = options.requiredRaw !== undefined
		      ? toProtocolInteger(options.requiredRaw, 'requiredRaw')
		      : assetAmountToRaw(requiredAmount, undefined, { label: `${assetName} amount` });

		    // Select UTXOs greedily
		    const selected = [];
		    let totalSatoshis = 0n;

		    for (const utxo of sortedUTXOs) {
		      selected.push(utxo);
		      totalSatoshis += toProtocolInteger(utxo.satoshis, `${assetName} utxo.satoshis`);

		      if (totalSatoshis >= requiredRaw) {
		        break;
		      }
		    }

		    // Check if we have enough
		    if (totalSatoshis < requiredRaw) {
		      const available = formatRawAsDecimal(totalSatoshis);
		      const required = formatRawAsDecimal(requiredRaw);
		      throw new InsufficientFundsError(
		        `Insufficient ${assetName} balance. Required: ${required}, Available: ${available}`,
		        Number(required),
		        Number(available)
		      );
		    }

		    return {
		      utxos: selected,
		      totalAmount: Number(formatRawAsDecimal(totalSatoshis)),
		      totalRaw: totalSatoshis
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
		  async selectMixedUTXOs(addresses, xnaAmount, assetName = null, assetAmount = 0, options = {}) {
		    const result = {
		      xnaUTXOs: [],
		      assetUTXOs: [],
		      totalXNA: 0,
		      totalAsset: 0,
		      totalXNASats: 0n,
		      totalAssetRaw: 0n
		    };

		    const wantsXna = options.requiredSats !== undefined
		      ? toProtocolInteger(options.requiredSats, 'requiredSats') > 0n
		      : xnaAmount > 0;

		    // Select XNA UTXOs if needed
		    if (wantsXna) {
		      const xnaSelection = await this.selectBaseCurrencyUTXOs(
		        addresses,
		        xnaAmount,
		        options.buffer !== undefined ? options.buffer : 0.1,
		        { exclude: options.exclude, requiredSats: options.requiredSats }
		      );
		      result.xnaUTXOs = xnaSelection.utxos;
		      result.totalXNA = xnaSelection.totalAmount;
		      result.totalXNASats = xnaSelection.totalSats;
		    }

		    const wantsAsset = options.requiredRaw !== undefined
		      ? toProtocolInteger(options.requiredRaw, 'requiredRaw') > 0n
		      : assetAmount > 0;

		    // Select asset UTXOs if needed
		    if (assetName && wantsAsset) {
		      const assetSelection = await this.selectAssetUTXOs(
		        addresses,
		        assetName,
		        assetAmount,
		        { exclude: options.exclude, requiredRaw: options.requiredRaw }
		      );
		      result.assetUTXOs = assetSelection.utxos;
		      result.totalAsset = assetSelection.totalAmount;
		      result.totalAssetRaw = assetSelection.totalRaw;
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
		    return Number(formatRawAsDecimal(await this.getBalanceRaw(addresses, assetName)));
		  }

		  /**
		   * Get total balance for an asset as an exact protocol integer.
		   *
		   * @param {string[]} addresses - Wallet addresses
		   * @param {string|null} assetName - Asset name (null for XNA)
		   * @returns {Promise<bigint>} Total balance in 10^8-scaled units
		   */
		  async getBalanceRaw(addresses, assetName = null) {
		    const utxos = await this.getUTXOs(addresses, assetName);
		    const mempool = await this.getMempoolEntries(addresses);
		    const availableUTXOs = this.filterMempoolSpentUTXOs(utxos, mempool);

		    return sumProtocolIntegers(availableUTXOs, 'satoshis', `${assetName || 'XNA'} utxo.satoshis`);
		  }

		  /**
		   * Estimate transaction size in vbytes for fee calculation.
		   *
		   * Both arguments accept either a count (legacy callers) or an array of
		   * descriptors that allow the estimator to distinguish PQ AuthScript
		   * inputs/outputs from legacy P2PKH ones — PQ inputs are roughly six
		   * times larger than legacy inputs and would otherwise underflow the
		   * node's `min relay fee`.
		   *
		   * Input descriptors may be UTXO-like objects with `script` and/or
		   * `address`. Output descriptors may be address strings or `{ address }`.
		   * When a count is provided instead of an array, every input/output is
		   * treated as legacy.
		   *
		   * @param {number|Array} inputs - Input count or array of UTXO-like descriptors
		   * @param {number|Array} outputs - Output count or array of address-like descriptors
		   * @returns {number} Estimated vbytes
		   */
		  estimateTransactionSize(inputs, outputs) {
		    const inputDescriptors = Array.isArray(inputs)
		      ? inputs
		      : new Array(inputs).fill({});
		    const outputDescriptors = Array.isArray(outputs)
		      ? outputs
		      : new Array(outputs).fill({});
		    return estimateTransactionVbytes(inputDescriptors, outputDescriptors);
		  }

		  /**
		   * Estimate fee for a transaction.
		   *
		   * @param {number|Array} inputs - Input count or array of UTXO-like descriptors
		   * @param {number|Array} outputs - Output count or array of address-like descriptors
		   * @param {number} feeRate - Fee rate in XNA per KB (default: 0.015)
		   * @returns {number} Estimated fee in XNA
		   */
		  estimateFee(inputs, outputs, feeRate = 0.015) {
		    return Number(formatRawAsDecimal(this.estimateFeeSats(inputs, outputs, feeRate)));
		  }

		  /**
		   * Estimate fee for a transaction, in exact satoshis.
		   *
		   * This is the form the builders account in: the fee has to be added to a
		   * burn and subtracted from an input total, and doing that in XNA floats is
		   * what produces one-satoshi drifts in the change output.
		   *
		   * @param {number|Array} inputs - Input count or array of UTXO-like descriptors
		   * @param {number|Array} outputs - Output count or array of address-like descriptors
		   * @param {number} feeRate - Fee rate in XNA per KB (default: 0.015)
		   * @returns {bigint} Estimated fee in satoshis, rounded up
		   */
		  estimateFeeSats(inputs, outputs, feeRate = 0.015) {
		    const sizeVbytes = BigInt(this.estimateTransactionSize(inputs, outputs));
		    const feeRateSats = xnaAmountToSats(feeRate, { label: 'feeRate', rounding: 'ceil' });

		    // fee = vbytes / 1000 * feeRate, rounded up to the satoshi
		    return ceilDiv(sizeVbytes * feeRateSats, 1000n);
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

		// Shared with the builders so a transaction's outpoint bookkeeping uses one
		// definition of identity.
		UTXOSelector.outpointKey = outpointKey;
		UTXOSelector.toOutpointSet = toOutpointSet;
		UTXOSelector.ceilDiv = ceilDiv;

		UTXOSelector_1 = UTXOSelector;
		return UTXOSelector_1;
	}

	/**
	 * Output Orderer
	 * Orders the JSON outputs sent to the node's `createrawtransaction`.
	 *
	 * Order produced:
	 * 1. All XNA outputs (burn addresses + change) FIRST
	 * 2. Owner token change outputs SECOND
	 * 3. Asset operations (issue, reissue, transfer, etc.) LAST
	 *
	 * WHAT CONSENSUS ACTUALLY REQUIRES — this order is not it.
	 *
	 * The node locates only *some* outputs by position (src/assets/assets.cpp):
	 *
	 *   - new asset issuance: the issue payload must be the LAST output, and for
	 *     ISSUE_ROOT / ISSUE_SUB / ISSUE_DEPIN the new owner payload the one
	 *     before it (`IsNewAsset` / `AssetFromTransaction`). `OwnerFromTransaction`
	 *     begins with `if (!tx.IsNewAsset()) return false;`, so it does NOT govern
	 *     the owner token of the other families;
	 *   - reissue, qualifier issuance, restricted issuance and unique issuance:
	 *     only their own payload must be the LAST output. Their burns and owner
	 *     transfers are found by scanning every vout.
	 *
	 * Transfers are NOT positional at all: each output is recognised by its own
	 * payload. That is why the canonical create-transaction path lays a DePIN
	 * transfer out as `transfers → owner escort → XNA change` and the node accepts
	 * it, even though this class would produce the opposite order.
	 *
	 * So what is mandatory is the FINAL output of an issuance/reissue, plus the
	 * owner immediately before it for new assets. Everything else here is a
	 * convention for the RPC path, not a consensus rule. Do not use this class to
	 * reorder what `createFromOperation` produced: it emits a valid order of its
	 * own, and re-sorting it would break the positional rules that do apply.
	 */

	var OutputOrderer_1;
	var hasRequiredOutputOrderer;

	function requireOutputOrderer () {
		if (hasRequiredOutputOrderer) return OutputOrderer_1;
		hasRequiredOutputOrderer = 1;
		const { AssetNameParser } = requireUtils();

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

		OutputOrderer_1 = OutputOrderer;
		return OutputOrderer_1;
	}

	/**
	 * Managers Module
	 * Exports all manager classes
	 */

	var managers;
	var hasRequiredManagers;

	function requireManagers () {
		if (hasRequiredManagers) return managers;
		hasRequiredManagers = 1;
		const BurnManager = requireBurnManager();
		const OwnerTokenManager = requireOwnerTokenManager();
		const UTXOSelector = requireUTXOSelector();
		const OutputOrderer = requireOutputOrderer();

		managers = {
		  BurnManager,
		  OwnerTokenManager,
		  UTXOSelector,
		  OutputOrderer
		};
		return managers;
	}

	/**
	 * Asset Name Validator
	 * Validates asset names according to Neurai protocol rules
	 */

	var assetNameValidator;
	var hasRequiredAssetNameValidator;

	function requireAssetNameValidator () {
		if (hasRequiredAssetNameValidator) return assetNameValidator;
		hasRequiredAssetNameValidator = 1;
		const { ASSET_NAME_RULES } = requireConstants();
		const { InvalidAssetNameError } = requireErrors();

		const MIN_ASSET_LENGTH = 3;
		// Full-name caps, mirror of the node (assets_fromscript.cpp:31-47): the limit
		// applies to the COMPLETE name, owner '!' and tags included, so a mainnet
		// root is effectively capped at 30 (its owner token "ROOT!" must fit in 31).
		const MAINNET_MAX_NAME_LENGTH = 31;
		const TESTNET_MAX_NAME_LENGTH = 121;

		const ROOT_NAME_CHARACTERS = /^[A-Z0-9._]{3,}$/;
		const SUB_NAME_CHARACTERS = /^[A-Z0-9._]+$/;
		const UNIQUE_TAG_CHARACTERS = /^[-A-Za-z0-9@$%&*()[\]{}_.?:]+$/;
		const QUALIFIER_NAME_CHARACTERS = /^#[A-Z0-9._]{3,}$/;
		const SUB_QUALIFIER_NAME_CHARACTERS = /^#[A-Z0-9._]+$/;
		const RESTRICTED_NAME_CHARACTERS = /^\$[A-Z0-9._]{3,}$/;
		const DEPIN_NAME_CHARACTERS = /^&[A-Z0-9._]{3,}$/;
		const SUB_DEPIN_NAME_CHARACTERS = /^&[A-Z0-9._]+\/[A-Z0-9._/]+$/;
		const DOUBLE_PUNCTUATION = /^.*[._]{2,}.*$/;
		const LEADING_PUNCTUATION = /^[._].*$/;
		const TRAILING_PUNCTUATION = /^.*[._]$/;
		const QUALIFIER_LEADING_PUNCTUATION = /^[#$][._].*$/;
		const NEURAI_NAMES = /^XNA$|^NEURAI$|^NEURAICOIN$|^#XNA$|^#NEURAI$|^#NEURAICOIN$/;

		function isTestnet(network) {
		  return typeof network === 'string' && network.toLowerCase().includes('test');
		}

		function getMaxAssetNameLength(network) {
		  return isTestnet(network) ? TESTNET_MAX_NAME_LENGTH : MAINNET_MAX_NAME_LENGTH;
		}

		function getRootOrSubMaxLength(network) {
		  return getMaxAssetNameLength(network) - 1;
		}

		function ensureName(name, label) {
		  if (!name || typeof name !== 'string') {
		    throw new InvalidAssetNameError(`${label} must be a non-empty string`, name);
		  }
		}

		function ensureMaxLength(name, maxLength, label) {
		  if (name.length > maxLength) {
		    throw new InvalidAssetNameError(`${label} cannot exceed ${maxLength} characters`, name);
		  }
		}

		function ensureUppercase(name, message) {
		  if (name !== name.toUpperCase()) {
		    throw new InvalidAssetNameError(message, name);
		  }
		}

		function isRootNameValid(name) {
		  return ROOT_NAME_CHARACTERS.test(name)
		    && !DOUBLE_PUNCTUATION.test(name)
		    && !LEADING_PUNCTUATION.test(name)
		    && !TRAILING_PUNCTUATION.test(name)
		    && !NEURAI_NAMES.test(name);
		}

		function isSubNameValid(name) {
		  return SUB_NAME_CHARACTERS.test(name)
		    && !DOUBLE_PUNCTUATION.test(name)
		    && !LEADING_PUNCTUATION.test(name)
		    && !TRAILING_PUNCTUATION.test(name);
		}

		function isQualifierNameValid(name) {
		  return QUALIFIER_NAME_CHARACTERS.test(name)
		    && !DOUBLE_PUNCTUATION.test(name)
		    && !QUALIFIER_LEADING_PUNCTUATION.test(name)
		    && !TRAILING_PUNCTUATION.test(name)
		    && !NEURAI_NAMES.test(name);
		}

		function isSubQualifierNameValid(name) {
		  return SUB_QUALIFIER_NAME_CHARACTERS.test(name)
		    && !DOUBLE_PUNCTUATION.test(name)
		    && !LEADING_PUNCTUATION.test(name)
		    && !TRAILING_PUNCTUATION.test(name);
		}

		function isRestrictedNameValid(name) {
		  return RESTRICTED_NAME_CHARACTERS.test(name)
		    && !DOUBLE_PUNCTUATION.test(name)
		    && !LEADING_PUNCTUATION.test(name)
		    && !TRAILING_PUNCTUATION.test(name)
		    && !NEURAI_NAMES.test(name);
		}

		function isNameValidBeforeTag(name) {
		  const parts = name.split('/');

		  if (!isRootNameValid(parts[0])) {
		    return false;
		  }

		  for (let index = 1; index < parts.length; index += 1) {
		    if (!isSubNameValid(parts[index])) {
		      return false;
		    }
		  }

		  return true;
		}

		function isQualifierNameValidBeforeTag(name) {
		  const parts = name.split('/');

		  if (!isQualifierNameValid(parts[0])) {
		    return false;
		  }

		  if (parts.length > 2) {
		    return false;
		  }

		  for (let index = 1; index < parts.length; index += 1) {
		    if (!isSubQualifierNameValid(parts[index])) {
		      return false;
		    }
		  }

		  return true;
		}

		function isDepinIndicator(name) {
		  return DEPIN_NAME_CHARACTERS.test(name) || SUB_DEPIN_NAME_CHARACTERS.test(name);
		}

		class AssetNameValidator {
		  /**
		   * Validate ROOT asset name
		   * Rules: 3-31 visible characters on mainnet, A-Z, 0-9, underscore, period
		   * Cannot start or end with period/underscore, cannot use repeated punctuation
		   * Cannot be reserved names
		   */
		  static validateRoot(name, network = 'xna') {
		    ensureName(name, 'Asset name');

		    const maxLength = getRootOrSubMaxLength(network);

		    if (name.length < MIN_ASSET_LENGTH || name.length > maxLength) {
		      throw new InvalidAssetNameError(
		        `ROOT asset name must be ${MIN_ASSET_LENGTH}-${maxLength} characters`,
		        name
		      );
		    }

		    ensureUppercase(name, 'Asset name must be uppercase');

		    if (NEURAI_NAMES.test(name)) {
		      throw new InvalidAssetNameError(`${name} is a reserved asset name`, name);
		    }

		    if (!isRootNameValid(name)) {
		      throw new InvalidAssetNameError(
		        'Name contains invalid characters (Valid characters are: A-Z 0-9 _ .) (special characters can\'t be the first or last characters)',
		        name
		      );
		    }

		    return true;
		  }

		  /**
		   * Validate SUB asset name
		   * Format: ROOT/SUBNAME
		   */
		  static validateSub(name, network = 'xna') {
		    ensureName(name, 'SUB asset name');

		    if (!name.includes(ASSET_NAME_RULES.SUB.separator)) {
		      throw new InvalidAssetNameError(
		        `SUB asset must be in ${ASSET_NAME_RULES.SUB.separator} format (ROOT/SUBNAME)`,
		        name
		      );
		    }

		    ensureMaxLength(name, getRootOrSubMaxLength(network), 'SUB asset name');

		    if (name !== name.toUpperCase()) {
		      throw new InvalidAssetNameError('SUB asset name must be uppercase', name);
		    }

		    if (!isNameValidBeforeTag(name)) {
		      throw new InvalidAssetNameError(
		        'Name contains invalid characters (Valid characters are: A-Z 0-9 _ .) (special characters can\'t be the first or last characters)',
		        name
		      );
		    }

		    return true;
		  }

		  /**
		   * Validate UNIQUE asset name
		   * Format: ROOT#TAG
		   */
		  static validateUnique(name, network = 'xna') {
		    ensureName(name, 'UNIQUE asset name');

		    ensureMaxLength(name, getMaxAssetNameLength(network), 'UNIQUE asset name');

		    const parts = name.split(ASSET_NAME_RULES.UNIQUE.separator);
		    if (parts.length !== 2) {
		      throw new InvalidAssetNameError(
		        `UNIQUE asset must be in ROOT${ASSET_NAME_RULES.UNIQUE.separator}TAG format`,
		        name
		      );
		    }

		    const [rootName, tag] = parts;

		    if (!isNameValidBeforeTag(rootName) || !UNIQUE_TAG_CHARACTERS.test(tag)) {
		      throw new InvalidAssetNameError(
		        'Unique name contains invalid characters (Valid characters are: A-Z a-z 0-9 @ $ % & * ( ) [ ] { } _ . ? : -)',
		        name
		      );
		    }

		    return true;
		  }

		  /**
		   * Validate QUALIFIER asset name
		   * Format: #NAME or #ROOT/SUB
		   */
		  static validateQualifier(name, network = 'xna') {
		    ensureName(name, 'QUALIFIER asset name');

		    if (!name.startsWith(ASSET_NAME_RULES.QUALIFIER.prefix)) {
		      throw new InvalidAssetNameError(
		        `QUALIFIER asset must start with ${ASSET_NAME_RULES.QUALIFIER.prefix}`,
		        name
		      );
		    }

		    ensureMaxLength(name, getMaxAssetNameLength(network), 'QUALIFIER asset name');

		    if (name !== name.toUpperCase()) {
		      throw new InvalidAssetNameError('QUALIFIER name must be uppercase', name);
		    }

		    if (!isQualifierNameValidBeforeTag(name)) {
		      throw new InvalidAssetNameError(
		        'Qualifier name contains invalid characters (Valid characters are: A-Z 0-9 _ .) (# must be the first character, _ . special characters can\'t be the first or last characters)',
		        name
		      );
		    }

		    return true;
		  }

		  /**
		   * Validate RESTRICTED asset name
		   * Format: $NAME
		   */
		  static validateRestricted(name, network = 'xna') {
		    ensureName(name, 'RESTRICTED asset name');

		    if (!name.startsWith(ASSET_NAME_RULES.RESTRICTED.prefix)) {
		      throw new InvalidAssetNameError(
		        `RESTRICTED asset must start with ${ASSET_NAME_RULES.RESTRICTED.prefix}`,
		        name
		      );
		    }

		    ensureMaxLength(name, getMaxAssetNameLength(network), 'RESTRICTED asset name');

		    if (name !== name.toUpperCase()) {
		      throw new InvalidAssetNameError('RESTRICTED asset name must be uppercase', name);
		    }

		    if (!isRestrictedNameValid(name)) {
		      throw new InvalidAssetNameError(
		        'Restricted name contains invalid characters (Valid characters are: A-Z 0-9 _ .) ($ must be the first character, _ . special characters can\'t be the first or last characters)',
		        name
		      );
		    }

		    return true;
		  }

		  /**
		   * Validate DEPIN asset name
		   * Format: &NAME or &NAME/SUB[/...]
		   */
		  static validateDepin(name, network) {
		    ensureName(name, 'DEPIN asset name');

		    if (!name.startsWith(ASSET_NAME_RULES.DEPIN.prefix)) {
		      throw new InvalidAssetNameError(
		        `DEPIN asset must start with ${ASSET_NAME_RULES.DEPIN.prefix}`,
		        name
		      );
		    }

		    if (network && !isTestnet(network)) {
		      throw new InvalidAssetNameError('DEPIN assets are only available in testnet', name);
		    }

		    ensureMaxLength(name, getMaxAssetNameLength(network || 'xna-test'), 'DEPIN asset name');

		    if (name !== name.toUpperCase()) {
		      throw new InvalidAssetNameError('DEPIN asset name must be uppercase', name);
		    }

		    if (!isDepinIndicator(name)) {
		      throw new InvalidAssetNameError(
		        'DEPIN asset name can only contain A-Z, 0-9, underscore, period, and separator /',
		        name
		      );
		    }

		    const parts = name.split(ASSET_NAME_RULES.DEPIN.separator);

		    if (parts.length > 1) {
		      parts.forEach(part => {
		        if (part.length < MIN_ASSET_LENGTH) {
		          throw new InvalidAssetNameError(
		            `Each DEPIN sub-part must be at least ${MIN_ASSET_LENGTH} characters`,
		            name
		          );
		        }
		      });
		    } else if (name.length < MIN_ASSET_LENGTH + 1) {
		      throw new InvalidAssetNameError(
		        `DEPIN name must be at least ${MIN_ASSET_LENGTH} characters (excluding &)`,
		        name
		      );
		    }

		    return true;
		  }

		  /**
		   * Validate owner token name
		   * Format: ASSETNAME!
		   */
		  static validateOwnerToken(name, network) {
		    ensureName(name, 'Owner token name');

		    ensureMaxLength(name, getMaxAssetNameLength(network), 'Owner token name');

		    if (!name.endsWith('!')) {
		      throw new InvalidAssetNameError('Owner token must end with !', name);
		    }

		    const assetName = name.substring(0, name.length - 1);
		    const validBaseName = isNameValidBeforeTag(assetName)
		      || (assetName.startsWith('&') && (() => {
		        try {
		          this.validateDepin(assetName, network);
		          return true;
		        } catch (error) {
		          return false;
		        }
		      })());

		    if (!validBaseName) {
		        throw new InvalidAssetNameError(
		          'Owner name contains invalid characters (Valid characters are: A-Z 0-9 _ .) (special characters can\'t be the first or last characters)',
		          name
		        );
		    }

		    return true;
		  }

		  /**
		   * Auto-detect asset type and validate
		   * @param {string} name - Asset name
		   * @returns {string} Asset type ('ROOT', 'SUB', 'UNIQUE', 'QUALIFIER', 'RESTRICTED', 'DEPIN', 'OWNER')
		   */
		  static validateAndDetectType(name, network) {
		    if (name.endsWith('!')) {
		      this.validateOwnerToken(name, network);
		      return 'OWNER';
		    } else if (name.startsWith('#')) {
		      this.validateQualifier(name, network);
		      return name.includes('/') ? 'SUB_QUALIFIER' : 'QUALIFIER';
		    } else if (name.startsWith('$')) {
		      this.validateRestricted(name, network);
		      return 'RESTRICTED';
		    } else if (name.startsWith('&')) {
		      this.validateDepin(name, network);
		      return 'DEPIN';
		    } else if (name.includes('#')) {
		      this.validateUnique(name, network);
		      return 'UNIQUE';
		    } else if (name.includes('/')) {
		      this.validateSub(name, network);
		      return 'SUB';
		    } else {
		      this.validateRoot(name, network);
		      return 'ROOT';
		    }
		  }
		}

		assetNameValidator = AssetNameValidator;
		return assetNameValidator;
	}

	/**
	 * Amount Validator
	 * Validates asset quantities and units
	 */

	var amountValidator;
	var hasRequiredAmountValidator;

	function requireAmountValidator () {
		if (hasRequiredAmountValidator) return amountValidator;
		hasRequiredAmountValidator = 1;
		const { ASSET_LIMITS } = requireConstants();
		const { InvalidAmountError, InvalidUnitsError } = requireErrors();
		const { normalizeDecimalText } = requireAssetAmount();

		class AmountValidator {
		  /**
		   * Validate asset quantity.
		   *
		   * Accepts a decimal **string** as well as a number. That is not a
		   * convenience: above `MAX_SAFE_INTEGER / 1e8` (~90071992.55) a fractional
		   * `number` can no longer name every 8-decimal value, so `assetAmountToRaw`
		   * refuses it and asks for a string. Rejecting strings here would leave
		   * legitimate supplies — `100000000.5`, far below MAX_QUANTITY —
		   * unexpressible in either form.
		   *
		   * @param {number|string} quantity - Asset quantity
		   * @param {number} units - Decimal places (0-8)
		   */
		  static validate(quantity, units = 0) {
		    // Validate quantity is a number or a plain decimal string
		    if (typeof quantity === 'string') {
		      // Throws with an actionable message for anything that is not a plain
		      // decimal (exponent notation, empty, non-numeric).
		      normalizeDecimalText(quantity, 'Quantity');
		    } else if (typeof quantity !== 'number' || isNaN(quantity)) {
		      throw new InvalidAmountError(
		        'Quantity must be a valid number or a decimal string',
		        quantity
		      );
		    }

		    // Small magnitudes convert exactly, so `Number` is fine for the lower
		    // bounds. The UPPER bound is not: `Number('21000000000.00000001')` is
		    // `21000000000`, which would slip past a numeric comparison — so that one
		    // is done on the digits themselves (see exceedsMaxQuantity).
		    const numeric = Number(quantity);

		    // Validate quantity is positive
		    if (numeric <= 0) {
		      throw new InvalidAmountError('Quantity must be greater than 0', quantity);
		    }

		    // Validate quantity is within limits
		    if (numeric < ASSET_LIMITS.MIN_QUANTITY) {
		      throw new InvalidAmountError(
		        `Quantity must be at least ${ASSET_LIMITS.MIN_QUANTITY}`,
		        quantity
		      );
		    }

		    if (this.exceedsMaxQuantity(quantity)) {
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
		   * Whether a quantity is above MAX_QUANTITY, compared on the digits.
		   *
		   * A numeric comparison is not enough at this magnitude: `MAX_QUANTITY` is
		   * `21000000000`, and `Number('21000000000.00000001')` collapses to exactly
		   * `21000000000`, so the excess disappears before the comparison happens.
		   * `assetAmountToRaw` catches it afterwards against the consensus ceiling —
		   * the flow does fail closed — but this validator would have reported the
		   * value as valid, and the two must state the same contract.
		   *
		   * @param {number|string} quantity - Quantity as given by the caller
		   * @returns {boolean} True when the value exceeds MAX_QUANTITY
		   */
		  static exceedsMaxQuantity(quantity) {
		    const text = normalizeDecimalText(quantity, 'Quantity');
		    const [intPart, fracPart = ''] = (text.startsWith('-') ? text.slice(1) : text).split('.');

		    const maxWhole = BigInt(ASSET_LIMITS.MAX_QUANTITY);
		    const whole = BigInt(intPart);

		    if (whole > maxWhole) {
		      return true;
		    }
		    // Exactly at the ceiling: any non-zero fraction puts it over.
		    return whole === maxWhole && /[1-9]/.test(fracPart);
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

		amountValidator = AmountValidator;
		return amountValidator;
	}

	/**
	 * Verifier String Validator
	 * Validates verifier strings for restricted assets
	 */

	var verifierValidator;
	var hasRequiredVerifierValidator;

	function requireVerifierValidator () {
		if (hasRequiredVerifierValidator) return verifierValidator;
		hasRequiredVerifierValidator = 1;
		const { InvalidVerifierStringError } = requireErrors();
		const AssetNameValidator = requireAssetNameValidator();

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

		verifierValidator = VerifierValidator;
		return verifierValidator;
	}

	/**
	 * IPFS Hash Validator
	 * Validates IPFS CID formats
	 */

	var ipfsValidator;
	var hasRequiredIpfsValidator;

	function requireIpfsValidator () {
		if (hasRequiredIpfsValidator) return ipfsValidator;
		hasRequiredIpfsValidator = 1;
		const { InvalidIPFSHashError } = requireErrors();

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

		ipfsValidator = IpfsValidator;
		return ipfsValidator;
	}

	/**
	 * Validators Module
	 * Exports all validator classes
	 */

	var validators$1;
	var hasRequiredValidators;

	function requireValidators () {
		if (hasRequiredValidators) return validators$1;
		hasRequiredValidators = 1;
		const AssetNameValidator = requireAssetNameValidator();
		const AmountValidator = requireAmountValidator();
		const VerifierValidator = requireVerifierValidator();
		const IpfsValidator = requireIpfsValidator();

		validators$1 = {
		  AssetNameValidator,
		  AmountValidator,
		  VerifierValidator,
		  IpfsValidator
		};
		return validators$1;
	}

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

	var BaseAssetTransactionBuilder_1;
	var hasRequiredBaseAssetTransactionBuilder;

	function requireBaseAssetTransactionBuilder () {
		if (hasRequiredBaseAssetTransactionBuilder) return BaseAssetTransactionBuilder_1;
		hasRequiredBaseAssetTransactionBuilder = 1;
		const { rpcErrorMessage } = requireRpcErrorMessage();
		const { createFromOperation } = requireDist_1();
		const { BurnManager, OwnerTokenManager, UTXOSelector, OutputOrderer } = requireManagers();
		const { AssetNameValidator, AmountValidator } = requireValidators();
		const { getNetworkConfig } = requireNetworks();
		const {
		  assetAmountToRaw,
		  xnaAmountToSats,
		  formatRawAsDecimal,
		  rawToDisplayNumber,
		  toProtocolInteger,
		  sumProtocolIntegers
		} = requireAssetAmount();

		/** Outputs below this are dust and are dropped instead of created. */
		const DUST_SATS = 1n;

		/**
		 * Backstop for the funding loop. Each round consumes at least one new outpoint,
		 * so a wallet needs more than this many UTXOs in a single transaction before
		 * the limit is even reachable; it exists so a pathological fee curve fails
		 * with a clear message instead of looping.
		 */
		const MAX_FUNDING_ROUNDS = 32;

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
		      actualAddresses = networkOrParams.walletAddresses || networkOrParams.addresses;
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

		    // `estimatesmartfee` is called twice per build (pre-selection guess and
		    // post-selection recompute). The fee rate is stable for the duration of
		    // a single build, so cache the first lookup and reuse it.
		    this._feeRatePromise = null;

		    // NIP-040 marker for the localRawBuild metadata; resolved once per build.
		    this._assetMarkerPromise = null;
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
		   * Estimate transaction fee.
		   *
		   * Both arguments accept either a count (legacy) or an array of descriptors
		   * that lets the underlying estimator distinguish PQ AuthScript inputs/outputs
		   * from legacy P2PKH ones. Pass arrays whenever you have actual UTXOs and
		   * output addresses on hand — counts produce a legacy-only estimate.
		   *
		   * @param {number|Array} inputs - Input count or array of UTXO-like descriptors
		   * @param {number|Array} outputs - Output count or array of address-like descriptors
		   * @returns {Promise<number>} Estimated fee in XNA
		   */
		  async estimateFee(inputs, outputs) {
		    if (!this._feeRatePromise) {
		      this._feeRatePromise = this.utxoSelector.getFeeRate();
		    }
		    const feeRate = await this._feeRatePromise;
		    return this.utxoSelector.estimateFee(inputs, outputs, feeRate);
		  }

		  /**
		   * Select UTXOs for transaction
		   * @param {number} xnaAmount - Required XNA amount (for fees + burn)
		   * @param {string|null} assetName - Asset name if needed
		   * @param {number} assetAmount - Asset amount if needed
		   * @returns {Promise<object>} Selected UTXOs
		   */
		  async selectUTXOs(xnaAmount, assetName = null, assetAmount = 0, options = {}) {
		    const addresses = await this._getAddresses();
		    return this.utxoSelector.selectMixedUTXOs(
		      addresses,
		      xnaAmount,
		      assetName,
		      assetAmount,
		      options
		    );
		  }

		  /**
		   * Estimate the transaction fee in exact satoshis.
		   *
		   * @param {number|Array} inputs - Input count or array of UTXO-like descriptors
		   * @param {number|Array} outputs - Output count or array of address-like descriptors
		   * @returns {Promise<bigint>} Estimated fee in satoshis
		   */
		  async estimateFeeSats(inputs, outputs) {
		    if (!this._feeRatePromise) {
		      this._feeRatePromise = this.utxoSelector.getFeeRate();
		    }
		    const feeRate = await this._feeRatePromise;
		    return this.utxoSelector.estimateFeeSats(inputs, outputs, feeRate);
		  }

		  /**
		   * Fund the XNA side of a transaction, exactly.
		   *
		   * Replaces the "estimate once, select once, top up with a `+0.001` cushion"
		   * pattern that every builder carried. That pattern had three defects, all of
		   * which only surface when the top-up branch actually runs — which depends on
		   * the *value* of the selected UTXOs, not on the size of the transaction:
		   *
		   *   1. the second selection re-queried the node without excluding what the
		   *      first one took, and the greedy order is deterministic, so it handed
		   *      back the same largest outpoint and the transaction spent it twice;
		   *   2. the fee was never recomputed, so the inputs added by the top-up were
		   *      not paid for;
		   *   3. the `+0.001 XNA` cushion did not pay for them either — it only
		   *      enlarged the selection target and came back as change.
		   *
		   * Here each round excludes every outpoint already held, recomputes the fee
		   * from the real (PQ-aware) descriptors of the full input set, and loops
		   * until the funds cover burn + fee. Running out of funds throws
		   * InsufficientFundsError from the selector; it never returns underfunded.
		   *
		   * @param {object} options
		   * @param {Array} options.outputs - Output descriptors for the size estimate
		   * @param {bigint} [options.burnSats] - Burn amount that the inputs must also cover
		   * @param {Array} [options.extraInputs] - Non-XNA inputs already committed (asset, owner token)
		   * @param {Array} [options.exclude] - Outpoints that must not be selected
		   * @param {number} [options.initialInputHint] - Assumed XNA input count for the first estimate
		   * @returns {Promise<{utxos: Array, totalSats: bigint, feeSats: bigint, changeSats: bigint, rounds: number}>}
		   */
		  async fundXnaInputs(options) {
		    const {
		      outputs,
		      burnSats = 0n,
		      extraInputs = [],
		      exclude = [],
		      initialInputHint = 1
		    } = options;

		    const addresses = await this._getAddresses();
		    const excluded = UTXOSelector.toOutpointSet(exclude);
		    // toOutpointSet returns the caller's Set untouched when it already is one;
		    // copy so this method never mutates what it was handed.
		    const held = new Set(excluded);

		    const selected = [];
		    let totalSats = 0n;
		    // First estimate assumes `initialInputHint` legacy XNA inputs; the loop
		    // corrects it as soon as the real descriptors are known.
		    let feeSats = await this.estimateFeeSats(
		      [...extraInputs, ...new Array(initialInputHint).fill({})],
		      outputs
		    );
		    let rounds = 0;

		    for (;;) {
		      const requiredSats = burnSats + feeSats;
		      if (totalSats >= requiredSats) {
		        break;
		      }

		      if (rounds >= MAX_FUNDING_ROUNDS) {
		        throw new Error(
		          `XNA funding did not converge after ${MAX_FUNDING_ROUNDS} rounds ` +
		          `(need ${formatRawAsDecimal(requiredSats)} XNA, hold ` +
		          `${formatRawAsDecimal(totalSats)} XNA)`
		        );
		      }
		      rounds += 1;

		      const selection = await this.utxoSelector.selectBaseCurrencyUTXOs(
		        addresses,
		        null,
		        0.1,
		        { requiredSats: requiredSats - totalSats, exclude: held }
		      );

		      selection.utxos.forEach(utxo => {
		        held.add(UTXOSelector.outpointKey(utxo));
		        selected.push(utxo);
		      });
		      totalSats += selection.totalSats;

		      // The fee must reflect every input it is paying for.
		      feeSats = await this.estimateFeeSats([...extraInputs, ...selected], outputs);
		    }

		    return {
		      utxos: selected,
		      totalSats,
		      feeSats,
		      changeSats: totalSats - burnSats - feeSats,
		      rounds
		    };
		  }

		  /**
		   * The network label understood by neurai-create-transaction.
		   *
		   * `this.network` accepts aliases (`mainnet`, `testnet`, `regtest`,
		   * `mainnet-pq`, ...) that the serializer does not know. Its
		   * `resolveNetworkFamily` treats every unrecognised value as testnet, so
		   * passing the alias `'mainnet'` straight through would make a mainnet build
		   * slip past the DePIN guard that correctly rejects `'xna'`.
		   *
		   * @returns {'xna'|'xna-test'} Canonical network label
		   */
		  canonicalNetwork() {
		    return getNetworkConfig(this.network).baseNetwork;
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
		      throw new Error(`Failed to create raw transaction: ${rpcErrorMessage(error)}`);
		    }
		  }

		  /**
		   * Build the raw transaction locally from a canonical build, without the
		   * node's `createrawtransaction`.
		   *
		   * The reissue builders use this instead of buildRawTransaction: the RPC's
		   * `reissue` object has no field for units and the node fills in 0, so that
		   * path rejects any asset whose units are above zero (`unit must be larger
		   * than current unit selection`). The local codec encodes "keep the current
		   * units" (0xff) — the same default the node's own `reissue` RPC uses — and
		   * emits the same outputs the node would: owner-token return auto-generated,
		   * operation output last.
		   *
		   * @param {{operationType: string, params: object}} createTransactionBuild -
		   *   Canonical payload, as produced by buildCreateTransactionBuild
		   * @returns {string} Raw transaction hex, ready for signing
		   */
		  buildRawTransactionLocally(createTransactionBuild) {
		    try {
		      return createFromOperation(createTransactionBuild).rawTx;
		    } catch (error) {
		      throw new Error(`Failed to create raw transaction locally: ${error.message}`);
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
		        AssetNameValidator.validateRoot(assetName, this.network);
		        break;
		      case 'SUB':
		        AssetNameValidator.validateSub(assetName, this.network);
		        break;
		      case 'UNIQUE':
		        AssetNameValidator.validateUnique(assetName, this.network);
		        break;
		      case 'QUALIFIER':
		        AssetNameValidator.validateQualifier(assetName, this.network);
		        break;
		      case 'RESTRICTED':
		        AssetNameValidator.validateRestricted(assetName, this.network);
		        break;
		      case 'DEPIN':
		        AssetNameValidator.validateDepin(assetName, this.network);
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
		   * Build the JSON `asset_quantity` value for a `createrawtransaction`
		   * output (issue / reissue / tag change_quantity / etc.).
		   *
		   * The chain parses this field with `AmountFromValue()` (Bitcoin-style
		   * decimal-XNA → 10^8 sats), then validates that the resulting CAmount
		   * is a multiple of `10^(8 - units)` via `CheckAmountWithUnits`
		   * (assets.cpp). So:
		   *
		   *   - The JSON value MUST be the user-facing display amount
		   *     (e.g. "1" for one token, "1.5" for one and a half tokens).
		   *   - The lib must NOT pre-multiply by 10^8 or 10^units; the daemon
		   *     does the 10^8 scaling itself, and any extra factor here lands
		   *     duplicated and inflates the minted supply (or trips the
		   *     ParseFixedPoint `exponent >= 18` cap → "Invalid amount (3)").
		   *
		   * History: pre-1.2.2 multiplied by 10^units (correct only for units=0
		   * assets, inflated everything else by 10^units). v1.2.2 changed to
		   * always 10^8 (correct only for units=8, inflated everything else by
		   * 10^8 — e.g. reissuing 1 token of a units=0 asset minted 100,000,000).
		   * The right answer is to send the value untouched.
		   *
		   * The `units` parameter is kept for API compatibility but is unused.
		   *
		   * @param {number} amount - User-facing asset amount
		   * @param {number} units - Asset decimal places (unused; kept for API)
		   * @returns {number} The user-facing amount, ready for the JSON output
		   */
		  toSatoshis(amount, units) {
		    return amount;
		  }

		  /**
		   * Convert a chain-side asset balance / UTXO satoshis value back to a
		   * user-facing amount. The chain consistently encodes asset balances
		   * in 10^8 sats (because everything goes through AmountFromValue on
		   * the way in), so the divisor is always 10^8 — independent of the
		   * asset's `units`.
		   *
		   * @param {number} satoshis - Chain value in 10^8 sats
		   * @param {number} units - Asset decimal places (unused; kept for API)
		   * @returns {number} User-facing asset amount
		   */
		  fromSatoshis(satoshis, units) {
		    return satoshis / 100000000;
		  }

		  /**
		   * Normalize builder inputs to raw transaction inputs
		   * @param {Array} inputs - Builder inputs
		   * @returns {Array<{txid: string, vout: number}>} Raw transaction inputs
		   */
		  toRawTxInputs(inputs) {
		    return (inputs || []).map(input => ({
		      txid: input.txid,
		      vout: input.vout !== undefined ? input.vout : input.outputIndex
		    }));
		  }

		  /**
		   * Convert XNA amount to satoshis
		   * @param {number|null|undefined} amount - Amount in XNA
		   * @returns {number|undefined} Amount in satoshis
		   */
		  xnaToSatoshis(amount) {
		    if (amount === undefined || amount === null) {
		      return undefined;
		    }

		    return Math.round(amount * 100000000);
		  }

		  /**
		   * NIP-040 marker for every asset output of the localRawBuild metadata.
		   *
		   * The chain decides which marker ("rvn" or "xna") new asset outputs must
		   * carry, per network and height, and the node reports the one required for
		   * the next block as `getblockchaininfo.asset_marker` (node commit 347362b).
		   * Resolution order:
		   *   1. `params.assetMarker` (explicit caller override — offline builds,
		   *      tests, or a node this library should not ask);
		   *   2. `getblockchaininfo.asset_marker` from the connected node;
		   *   3. `'rvn'` when the node predates the field (a node without it enforces
		   *      the legacy marker, so that is the right answer, not a guess).
		   *
		   * An RPC *failure* is a different case, and `params.assetMarkerPolicy`
		   * decides it:
		   *   - `'legacy-fallback'` (default in 1.x) resolves `'rvn'`, preserving the
		   *     1.4.x behaviour;
		   *   - `'strict'` propagates the failure. On a post-NIP-040 chain a build
		   *     that guessed `'rvn'` produces a transaction the node rejects with
		   *     `bad-txns-legacy-asset-marker-after-nip040`, so an online wallet
		   *     should not treat "the node did not answer" as "the node said rvn".
		   *
		   * A value present but outside `rvn`/`xna` is an error under both policies.
		   * The RPC-built transaction path never needs any of this: the node stamps
		   * the marker itself in `createrawtransaction`.
		   *
		   * @returns {Promise<'rvn'|'xna'>} Marker for locally built asset outputs
		   */
		  resolveAssetMarker() {
		    if (!this._assetMarkerPromise) {
		      // Memoized including rejection, so a strict failure is one RPC call and
		      // one error, not one per asset output.
		      this._assetMarkerPromise = this._fetchAssetMarker();
		    }
		    return this._assetMarkerPromise;
		  }

		  /**
		   * Resolve the configured marker failure policy.
		   *
		   * @returns {'strict'|'legacy-fallback'} Policy in force for this build
		   */
		  assetMarkerPolicy() {
		    const policy = this.params.assetMarkerPolicy;
		    if (policy === undefined || policy === null) {
		      return 'legacy-fallback';
		    }
		    if (policy !== 'strict' && policy !== 'legacy-fallback') {
		      throw new Error(
		        `Invalid assetMarkerPolicy: ${policy} (expected 'strict' or 'legacy-fallback')`
		      );
		    }
		    return policy;
		  }

		  async _fetchAssetMarker() {
		    const policy = this.assetMarkerPolicy();
		    const override = this.params.assetMarker;
		    if (override !== undefined && override !== null) {
		      if (override !== 'rvn' && override !== 'xna') {
		        throw new Error(
		          `Invalid assetMarker: ${override} (expected 'rvn' or 'xna', the value of getblockchaininfo.asset_marker)`
		        );
		      }
		      return override;
		    }

		    let info = null;
		    try {
		      info = await this.rpc('getblockchaininfo', []);
		    } catch (error) {
		      if (policy === 'strict') {
		        throw new Error(
		          `Cannot resolve the NIP-040 asset marker: getblockchaininfo failed ` +
		          `(${rpcErrorMessage(error)}). Under assetMarkerPolicy 'strict' this ` +
		          `is not downgraded to 'rvn', which a post-NIP-040 chain would reject. ` +
		          `Pass params.assetMarker to build offline.`
		        );
		      }
		      return 'rvn';
		    }
		    const marker = info ? info.asset_marker : undefined;
		    if (marker === undefined || marker === null) {
		      // A valid answer from a node that predates the field: legacy is correct.
		      return 'rvn';
		    }
		    if (marker !== 'rvn' && marker !== 'xna') {
		      throw new Error(`Node reported an unknown asset_marker: ${marker}`);
		    }
		    return marker;
		  }

		  /**
		   * Build a typed local raw build payload compatible with
		   * @neuraiproject/neurai-create-transaction createFromOperation(...)
		   *
		   * Stamps the NIP-040 `assetMarker` (see resolveAssetMarker) so
		   * createFromOperation >= 0.7.0 emits the marker the chain requires.
		   *
		   * @param {string} operationType - Operation type
		   * @param {Array} inputs - Builder inputs
		   * @param {object|null} burnInfo - Burn metadata
		   * @param {string|null} changeAddress - XNA change address
		   * @param {number|null} changeAmount - XNA change amount in XNA
		   * @param {object} operationParams - Operation-specific params
		   * @returns {Promise<{ operationType: string, params: object }>} Local raw build
		   */
		  async buildLocalRawBuild(
		    operationType,
		    inputs,
		    burnInfo = null,
		    changeAddress = null,
		    changeAmount = null,
		    operationParams = {}
		  ) {
		    const params = {
		      inputs: this.toRawTxInputs(inputs),
		      assetMarker: await this.resolveAssetMarker(),
		      ...operationParams
		    };

		    if (burnInfo && burnInfo.address && burnInfo.amount !== undefined && burnInfo.amount !== null) {
		      params.burnAddress = burnInfo.address;
		      params.burnAmountSats = this.xnaToSatoshis(burnInfo.amount);
		    }

		    if (changeAddress && changeAmount !== undefined && changeAmount !== null) {
		      params.xnaChangeAddress = changeAddress;
		      params.xnaChangeSats = this.xnaToSatoshis(changeAmount);
		    }

		    return {
		      operationType,
		      params
		    };
		  }

		  /**
		   * Build the canonical `createTransactionBuild` payload: the exact shape
		   * `createFromOperation(...)` accepts, with no adaptation, renaming or
		   * rescaling left for the consumer.
		   *
		   * Differences from the deprecated `buildLocalRawBuild`:
		   *   - every amount is a protocol integer (`bigint`), never a display value
		   *     under a `*Raw` name;
		   *   - a transfer carries a discriminant the serializer knows
		   *     (`STANDARD_TRANSFER` / `TRANSFER_DEPIN`), not the internal `TRANSFER`;
		   *   - the network, when included, is the canonical label, so the DePIN
		   *     mainnet guard actually runs.
		   *
		   * @param {string} operationType - Canonical create-transaction discriminant
		   * @param {Array} inputs - Builder inputs
		   * @param {object} [envelope] - XNA envelope
		   * @param {string} [envelope.burnAddress] - Burn address
		   * @param {bigint} [envelope.burnSats] - Burn amount in satoshis
		   * @param {string} [envelope.changeAddress] - XNA change address
		   * @param {bigint} [envelope.changeSats] - XNA change in satoshis
		   * @param {object} [operationParams] - Operation-specific canonical params
		   * @returns {Promise<{operationType: string, params: object}>} Canonical build
		   */
		  async buildCreateTransactionBuild(
		    operationType,
		    inputs,
		    envelope = {},
		    operationParams = {}
		  ) {
		    const params = {
		      inputs: this.toRawTxInputs(inputs),
		      assetMarker: await this.resolveAssetMarker(),
		      ...operationParams
		    };

		    if (envelope.burnAddress && envelope.burnSats !== undefined && envelope.burnSats !== null) {
		      params.burnAddress = envelope.burnAddress;
		      params.burnAmountSats = toProtocolInteger(envelope.burnSats, 'burnSats');
		    }

		    if (
		      envelope.changeAddress &&
		      envelope.changeSats !== undefined &&
		      envelope.changeSats !== null &&
		      toProtocolInteger(envelope.changeSats, 'changeSats') >= DUST_SATS
		    ) {
		      params.xnaChangeAddress = envelope.changeAddress;
		      params.xnaChangeSats = toProtocolInteger(envelope.changeSats, 'changeSats');
		    }

		    return {
		      operationType,
		      params
		    };
		  }

		  /**
		   * Convert a user-facing asset amount to the raw protocol integer.
		   *
		   * @param {string|number} amount - Display amount
		   * @param {number} [units] - Asset decimal places, for the divisibility check
		   * @param {string} [label] - Prefix for error messages
		   * @returns {bigint} Raw amount, 10^8-scaled
		   */
		  assetAmountToRaw(amount, units, label) {
		    return assetAmountToRaw(amount, units, { label: label || 'asset amount' });
		  }

		  /**
		   * Convert a user-facing XNA amount to satoshis.
		   *
		   * @param {string|number} amount - Display XNA amount
		   * @param {object} [options] - Passed through to xnaAmountToSats
		   * @returns {bigint} Satoshis
		   */
		  xnaAmountToSats(amount, options) {
		    return xnaAmountToSats(amount, options);
		  }

		  /**
		   * Render a protocol integer as the display value the RPC envelope expects.
		   *
		   * @param {bigint} sats - Protocol integer
		   * @returns {number} Display amount
		   */
		  satsToDisplay(sats) {
		    return rawToDisplayNumber(sats, 'display amount');
		  }

		  /**
		   * Sum the `satoshis` field of UTXOs exactly.
		   *
		   * @param {Array} utxos - UTXOs
		   * @param {string} [label] - Prefix for error messages
		   * @returns {bigint} Exact total
		   */
		  sumSatoshis(utxos, label) {
		    return sumProtocolIntegers(utxos, 'satoshis', label || 'utxo.satoshis');
		  }

		  /**
		   * Normalize ordered outputs into flat entries
		   * @param {Array|object} outputs - Transaction outputs
		   * @returns {Array<{address: string, value: unknown}>} Output entries
		   */
		  getOutputEntries(outputs) {
		    if (Array.isArray(outputs)) {
		      return outputs.map(output => {
		        const [address, value] = Object.entries(output)[0];
		        return { address, value };
		      });
		    }

		    if (outputs && typeof outputs === 'object') {
		      return Object.entries(outputs).map(([address, value]) => ({ address, value }));
		    }

		    return [];
		  }

		  /**
		   * Extract burn metadata from outputs
		   * @param {Array<{address: string, value: unknown}>} entries - Output entries
		   * @param {number} burnAmount - Burn amount in XNA
		   * @returns {{ burnAddress: string|null, burnAmount: number }}
		   */
		  extractBurnMetadata(entries, burnAmount) {
		    if (!burnAmount || burnAmount <= 0) {
		      return {
		        burnAddress: null,
		        burnAmount: 0
		      };
		    }

		    const burnEntry = entries.find(({ address, value }) => {
		      return typeof value === 'number' &&
		        value === burnAmount &&
		        this.burnManager.isBurnAddress(address);
		    });

		    return {
		      burnAddress: burnEntry ? burnEntry.address : null,
		      burnAmount
		    };
		  }

		  /**
		   * Extract XNA change metadata from outputs
		   * @param {Array<{address: string, value: unknown}>} entries - Output entries
		   * @param {string|null} burnAddress - Burn address if present
		   * @returns {{ changeAddress: string|null, changeAmount: number|null }}
		   */
		  extractChangeMetadata(entries, burnAddress = null) {
		    const xnaOutputs = entries.filter(({ address, value }) => {
		      return typeof value === 'number' && address !== burnAddress;
		    });

		    if (xnaOutputs.length !== 1) {
		      return {
		        changeAddress: null,
		        changeAmount: null
		      };
		    }

		    return {
		      changeAddress: xnaOutputs[0].address,
		      changeAmount: xnaOutputs[0].value
		    };
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
		    const outputEntries = this.getOutputEntries(outputs);
		    const burnMetadata = this.extractBurnMetadata(outputEntries, burnAmount);
		    const changeMetadata = this.extractChangeMetadata(outputEntries, burnMetadata.burnAddress);

		    return {
		      rawTx,
		      utxos,
		      inputs,
		      outputs,
		      fee,
		      burnAmount: burnMetadata.burnAmount,
		      network: this.network,
		      buildStrategy: 'rpc-node',
		      burnAddress: burnMetadata.burnAddress,
		      changeAddress: extra.changeAddress !== undefined
		        ? extra.changeAddress
		        : changeMetadata.changeAddress,
		      changeAmount: extra.changeAmount !== undefined
		        ? extra.changeAmount
		        : changeMetadata.changeAmount,
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
		      if (rpcErrorMessage(error).includes('not found')) {
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
		      if (rpcErrorMessage(error).includes('not found')) {
		        return null;
		      }
		      throw error;
		    }
		  }
		}

		BaseAssetTransactionBuilder_1 = BaseAssetTransactionBuilder;
		return BaseAssetTransactionBuilder_1;
	}

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

	var IssueRootBuilder_1;
	var hasRequiredIssueRootBuilder;

	function requireIssueRootBuilder () {
		if (hasRequiredIssueRootBuilder) return IssueRootBuilder_1;
		hasRequiredIssueRootBuilder = 1;
		const BaseAssetTransactionBuilder = requireBaseAssetTransactionBuilder();
		const { OutputFormatter } = requireUtils();
		const { AssetExistsError, InvalidIPFSHashError } = requireErrors();
		const { IpfsValidator } = requireValidators();

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
		    await this._getAddresses();
		    const toAddress = await this.getToAddress();
		    const changeAddress = await this.getChangeAddress();

		    // 5-10. Fund the XNA side. fundXnaInputs recomputes the fee with the real
		    //       (PQ-aware) descriptors after every top-up and never selects an
		    //       outpoint it already holds.
		    const outputAddresses = [
		      burnInfo.address,
		      changeAddress,
		      // Asset outputs carry a payload; sizing them as bare P2PKH under-counts
		      // the transaction and trips the node's minimum relay fee.
		      { address: toAddress, assetName, kind: 'issue', hasIpfs },
		      { address: changeAddress, assetName: `${assetName}!`, kind: 'owner' },
		    ];
		    const burnSats = this.xnaAmountToSats(burnInfo.amount, { label: 'burn amount' });
		    const funding = await this.fundXnaInputs({ outputs: outputAddresses, burnSats });

		    const baseCurrencyUTXOs = funding.utxos;
		    const actualFee = this.satsToDisplay(funding.feeSats);
		    const xnaChangeSats = funding.changeSats;

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
		    if (xnaChangeSats > 0n) {
		      // Only add change if meaningful amount
		      outputs.push({ [changeAddress]: this.satsToDisplay(xnaChangeSats) });
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
		        operationType: 'ISSUE_ROOT',
		        createTransactionBuild: await this.buildCreateTransactionBuild(
		          'ISSUE_ROOT',
		          inputs,
		          { burnAddress: burnInfo.address, burnSats, changeAddress, changeSats: xnaChangeSats },
		          {
		            toAddress,
		            assetName,
		            quantityRaw: this.assetAmountToRaw(quantity, units, 'quantity'),
		            units,
		            reissuable,
		            ipfsHash: hasIpfs ? ipfsHash : undefined,
		            ownerTokenAddress: changeAddress
		          }
		        ),
		        localRawBuild: await this.buildLocalRawBuild(
		          'ISSUE_ROOT',
		          inputs,
		          burnInfo,
		          changeAddress,
		          xnaChangeSats > 0n ? this.satsToDisplay(xnaChangeSats) : null,
		          {
		            toAddress,
		            assetName,
		            quantityRaw: this.toSatoshis(quantity, units),
		            units,
		            reissuable,
		            ipfsHash: hasIpfs ? ipfsHash : undefined,
		            ownerTokenAddress: changeAddress
		          }
		        )
		      }
		    );
		  }
		}

		IssueRootBuilder_1 = IssueRootBuilder;
		return IssueRootBuilder_1;
	}

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

	var IssueSubBuilder_1;
	var hasRequiredIssueSubBuilder;

	function requireIssueSubBuilder () {
		if (hasRequiredIssueSubBuilder) return IssueSubBuilder_1;
		hasRequiredIssueSubBuilder = 1;
		const BaseAssetTransactionBuilder = requireBaseAssetTransactionBuilder();
		const { OutputFormatter, AssetNameParser } = requireUtils();
		const {
		  AssetExistsError,
		  ParentAssetNotFoundError,
		  OwnerTokenNotFoundError
		} = requireErrors();
		const { IpfsValidator } = requireValidators();

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
		    const outputAddresses = [
		      burnInfo.address,
		      changeAddress,
		      { address: changeAddress, assetName: ownerTokenName, kind: 'owner' },
		      { address: toAddress, assetName, kind: 'issue', hasIpfs },
		      { address: changeAddress, assetName: `${assetName}!`, kind: 'owner' },
		    ];
		    // 9-13. Fund the XNA side. The parent owner-token input counts towards the
		    //       size estimate from the first round and is excluded from selection.
		    const burnSats = this.xnaAmountToSats(burnInfo.amount, { label: 'burn amount' });
		    const funding = await this.fundXnaInputs({
		      outputs: outputAddresses,
		      burnSats,
		      extraInputs: [ownerTokenUTXO],
		      exclude: [ownerTokenUTXO],
		      initialInputHint: 1
		    });

		    const baseCurrencyUTXOs = funding.utxos;
		    const actualFee = this.satsToDisplay(funding.feeSats);
		    const xnaChangeSats = funding.changeSats;

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
		    if (xnaChangeSats > 0n) {
		      outputs.push({ [changeAddress]: this.satsToDisplay(xnaChangeSats) });
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
		        operationType: 'ISSUE_SUB',
		        createTransactionBuild: await this.buildCreateTransactionBuild(
		          'ISSUE_SUB',
		          inputs,
		          { burnAddress: burnInfo.address, burnSats, changeAddress, changeSats: xnaChangeSats },
		          {
		            toAddress,
		            assetName,
		            quantityRaw: this.assetAmountToRaw(quantity, units, 'quantity'),
		            units,
		            reissuable,
		            ipfsHash: hasIpfs ? ipfsHash : undefined,
		            parentOwnerAddress: changeAddress
		          }
		        ),
		        localRawBuild: await this.buildLocalRawBuild(
		          'ISSUE_SUB',
		          inputs,
		          burnInfo,
		          changeAddress,
		          xnaChangeSats > 0n ? this.satsToDisplay(xnaChangeSats) : null,
		          {
		            toAddress,
		            assetName,
		            quantityRaw: this.toSatoshis(quantity, units),
		            units,
		            reissuable,
		            ipfsHash: hasIpfs ? ipfsHash : undefined,
		            parentOwnerAddress: changeAddress
		          }
		        )
		      }
		    );
		  }
		}

		IssueSubBuilder_1 = IssueSubBuilder;
		return IssueSubBuilder_1;
	}

	/**
	 * Issue DePIN Builder
	 * Builds transactions for creating DEPIN assets.
	 *
	 * DEPIN assets:
	 * - Soulbound assets
	 * - Format: &NAME or &NAME/SUB
	 * - Cost: 10 XNA (same burn as UNIQUE assets)
	 * - Units: Always 0
	 * - Owner token is auto-created by the node
	 */

	var IssueDepinBuilder_1;
	var hasRequiredIssueDepinBuilder;

	function requireIssueDepinBuilder () {
		if (hasRequiredIssueDepinBuilder) return IssueDepinBuilder_1;
		hasRequiredIssueDepinBuilder = 1;
		const BaseAssetTransactionBuilder = requireBaseAssetTransactionBuilder();
		const { OutputFormatter } = requireUtils();
		const { AssetExistsError } = requireErrors();
		const { IpfsValidator } = requireValidators();

		class IssueDepinBuilder extends BaseAssetTransactionBuilder {
		  /**
		   * Validate issue DEPIN parameters
		   * @param {object} params - Issue parameters
		   * @throws {Error} If validation fails
		   */
		  validateParams(params) {
		    if (!params.assetName) {
		      throw new Error('assetName is required');
		    }

		    if (params.quantity === undefined || params.quantity === null) {
		      throw new Error('quantity is required');
		    }

		    this.validateAssetName(params.assetName, 'DEPIN');
		    this.validateAmount(params.quantity, 0);

		    if (params.units !== undefined && params.units !== 0) {
		      throw new Error('DEPIN assets must use units=0');
		    }

		    if (params.hasIpfs && params.ipfsHash) {
		      IpfsValidator.validate(params.ipfsHash);
		    }

		    if (params.reissuable !== undefined && typeof params.reissuable !== 'boolean') {
		      throw new Error('reissuable must be a boolean');
		    }

		    return true;
		  }

		  /**
		   * Build DEPIN asset issuance transaction
		   * @returns {Promise<object>} Transaction result
		   */
		  async build() {
		    await this.validateParams(this.params);

		    const {
		      assetName,
		      quantity,
		      reissuable = true,
		      hasIpfs = false,
		      ipfsHash = ''
		    } = this.params;

		    const exists = await this.assetExists(assetName);
		    if (exists) {
		      throw new AssetExistsError(
		        `Asset ${assetName} already exists on the blockchain`,
		        assetName
		      );
		    }

		    const burnInfo = this.burnManager.getIssueDepinBurn();
		    const toAddress = await this.getToAddress();
		    const changeAddress = await this.getChangeAddress();

		    const outputAddresses = [
		      burnInfo.address,
		      changeAddress,
		      { address: toAddress, assetName, kind: 'issue', hasIpfs },
		      { address: changeAddress, assetName: `${assetName}!`, kind: 'owner' },
		    ];
		    const burnSats = this.xnaAmountToSats(burnInfo.amount, { label: 'burn amount' });
		    const funding = await this.fundXnaInputs({ outputs: outputAddresses, burnSats });

		    const baseCurrencyUTXOs = funding.utxos;
		    const actualFee = this.satsToDisplay(funding.feeSats);
		    const xnaChangeSats = funding.changeSats;

		    const inputs = baseCurrencyUTXOs.map(utxo => ({
		      txid: utxo.txid,
		      vout: utxo.outputIndex,
		      address: utxo.address,
		      satoshis: utxo.satoshis
		    }));

		    const outputs = [];
		    outputs.push({ [burnInfo.address]: burnInfo.amount });

		    if (xnaChangeSats > 0n) {
		      outputs.push({ [changeAddress]: this.satsToDisplay(xnaChangeSats) });
		    }

		    const issueOutput = OutputFormatter.formatIssueOutput({
		      asset_name: assetName,
		      asset_quantity: this.toSatoshis(quantity, 0),
		      units: 0,
		      reissuable,
		      has_ipfs: hasIpfs,
		      ipfs_hash: ipfsHash
		    });

		    outputs.push({ [toAddress]: issueOutput });

		    const orderedOutputs = this.outputOrderer.order(outputs);
		    const rawTx = await this.buildRawTransaction(inputs, orderedOutputs);

		    return this.formatResult(
		      rawTx,
		      baseCurrencyUTXOs,
		      inputs,
		      orderedOutputs,
		      actualFee,
		      burnInfo.amount,
		      {
		        assetName,
		        ownerTokenName: `${assetName}!`,
		        operationType: 'ISSUE_DEPIN',
		        createTransactionBuild: await this.buildCreateTransactionBuild(
		          'ISSUE_DEPIN',
		          inputs,
		          { burnAddress: burnInfo.address, burnSats, changeAddress, changeSats: xnaChangeSats },
		          {
		            toAddress,
		            assetName,
		            quantityRaw: this.assetAmountToRaw(quantity, 0, 'quantity'),
		            ipfsHash: hasIpfs ? ipfsHash : undefined,
		            ownerTokenAddress: changeAddress,
		            reissuable,
		            // Canonical label, so create-transaction's mainnet DePIN guard
		            // actually runs: it treats any unknown value (including the alias
		            // 'mainnet') as testnet and would let a mainnet build through.
		            network: this.canonicalNetwork()
		          }
		        ),
		        localRawBuild: await this.buildLocalRawBuild(
		          'ISSUE_DEPIN',
		          inputs,
		          burnInfo,
		          changeAddress,
		          xnaChangeSats > 0n ? this.satsToDisplay(xnaChangeSats) : null,
		          {
		            toAddress,
		            assetName,
		            quantityRaw: this.toSatoshis(quantity, 0),
		            ipfsHash: hasIpfs ? ipfsHash : undefined,
		            ownerTokenAddress: changeAddress,
		            reissuable
		          }
		        )
		      }
		    );
		  }
		}

		IssueDepinBuilder_1 = IssueDepinBuilder;
		return IssueDepinBuilder_1;
	}

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

	var ReissueBuilder_1;
	var hasRequiredReissueBuilder;

	function requireReissueBuilder () {
		if (hasRequiredReissueBuilder) return ReissueBuilder_1;
		hasRequiredReissueBuilder = 1;
		const BaseAssetTransactionBuilder = requireBaseAssetTransactionBuilder();
		const { OutputFormatter, AssetNameParser } = requireUtils();
		const {
		  AssetNotFoundError,
		  AssetNotReissuableError,
		  OwnerTokenNotFoundError,
		  MaxSupplyExceededError
		} = requireErrors();
		const { IpfsValidator } = requireValidators();
		const { ASSET_LIMITS } = requireConstants();

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
		    const isDepinAsset = AssetNameParser.isDepin(assetName);

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
		    // Outputs: burn + change + owner token return + reissue operation
		    const outputAddresses = [
		      burnInfo.address,
		      changeAddress,
		      { address: changeAddress, assetName: ownerTokenName, kind: 'owner' },
		      { address: toAddress, assetName, kind: 'reissue', hasIpfs: Boolean(newIpfs) },
		    ];
		    // Fund the XNA side. The owner-token input counts towards the size
		    // estimate from the first round and is excluded from XNA selection.
		    const burnSats = this.xnaAmountToSats(burnInfo.amount, { label: 'burn amount' });
		    const funding = await this.fundXnaInputs({
		      outputs: outputAddresses,
		      burnSats,
		      extraInputs: [ownerTokenUTXO],
		      exclude: [ownerTokenUTXO],
		      initialInputHint: 1
		    });

		    const baseCurrencyUTXOs = funding.utxos;
		    const actualFee = this.satsToDisplay(funding.feeSats);
		    const xnaChangeSats = funding.changeSats;

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
		    if (xnaChangeSats > 0n) {
		      outputs.push({ [changeAddress]: this.satsToDisplay(xnaChangeSats) });
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
		      owner_change_address: isDepinAsset ? toAddress : changeAddress
		    });

		    outputs.push({ [toAddress]: reissueOutput });

		    // 16. Order outputs (protocol requirement)
		    const orderedOutputs = this.outputOrderer.order(outputs);

		    // 17. Canonical build — also the source of the raw transaction. The
		    // node's `createrawtransaction` has no units field for a reissue and
		    // assumes 0, so it rejects any asset with units > 0; the local codec
		    // encodes "keep the current units" (0xff) and emits the same outputs the
		    // node would (owner-token return included), so the RPC is not needed for
		    // this step.
		    const createTransactionBuild = await this.buildCreateTransactionBuild(
		      'REISSUE',
		      inputs,
		      { burnAddress: burnInfo.address, burnSats, changeAddress, changeSats: xnaChangeSats },
		      {
		        toAddress,
		        assetName,
		        quantityRaw: this.assetAmountToRaw(quantity, units, 'quantity'),
		        // `units` is deliberately omitted: this library has no API to
		        // change an asset's units, so the honest statement is "keep the
		        // current ones", which create-transaction >= 0.8.0 encodes as
		        // 0xff. Echoing the value read from getassetdata would say "set
		        // units to N" instead, and a stale read — the asset reissued to a
		        // higher precision between the read and the broadcast — would ask
		        // the node to lower them, which it rejects with
		        // `unit must be larger than current unit selection`.
		        // The value is still used above, to validate that `quantity` fits
		        // the asset's precision.
		        reissuable: reissuable !== undefined ? reissuable : undefined,
		        ipfsHash: newIpfs || undefined,
		        ownerChangeAddress: isDepinAsset ? toAddress : changeAddress
		      }
		    );
		    const rawTx = this.buildRawTransactionLocally(createTransactionBuild);

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
		        operationType: 'REISSUE',
		        buildStrategy: 'local-builder',
		        createTransactionBuild,
		        localRawBuild: await this.buildLocalRawBuild(
		          'REISSUE',
		          inputs,
		          burnInfo,
		          changeAddress,
		          xnaChangeSats > 0n ? this.satsToDisplay(xnaChangeSats) : null,
		          {
		            toAddress,
		            assetName,
		            quantityRaw: this.toSatoshis(quantity, units),
		            units,
		            reissuable: reissuable !== undefined ? reissuable : undefined,
		            ipfsHash: newIpfs || undefined,
		            ownerChangeAddress: isDepinAsset ? toAddress : changeAddress
		          }
		        )
		      }
		    );
		  }
		}

		ReissueBuilder_1 = ReissueBuilder;
		return ReissueBuilder_1;
	}

	/**
	 * Transfer Builder
	 * Builds transactions that transfer an existing asset to one or more recipients.
	 *
	 * Works for any asset type (regular, sub, restricted, DePIN). The only
	 * type-specific rule lives in Neurai consensus for DePIN (`&`) assets, which are
	 * soulbound: a DePIN transfer is only valid if the same transaction
	 *   1. SPENDS the asset's owner token `&NAME!` as an input, and
	 *   2. re-creates (transfers) that owner token in an output.
	 * See Neurai-DePIN/src/consensus/tx_verify.cpp (bad-txns-depin-transfer-not-by-owner).
	 * For non-DePIN assets no owner token is required for a plain transfer.
	 *
	 * Owner-token destination: the owner token is returned to the sender's change
	 * address — the asset moves to the recipient but authority stays with the owner
	 * (soulbound semantics). Transferring ownership itself is out of scope here.
	 *
	 * This builder mirrors ReissueBuilder (which also spends + returns an owner
	 * token) but, since a transfer has no reissue entry, it adds the owner-token
	 * return output explicitly via OwnerTokenManager.
	 */

	var TransferBuilder_1;
	var hasRequiredTransferBuilder;

	function requireTransferBuilder () {
		if (hasRequiredTransferBuilder) return TransferBuilder_1;
		hasRequiredTransferBuilder = 1;
		const BaseAssetTransactionBuilder = requireBaseAssetTransactionBuilder();
		const { OutputFormatter, AssetNameParser } = requireUtils();
		const { OwnerTokenNotFoundError } = requireErrors();

		class TransferBuilder extends BaseAssetTransactionBuilder {
		  /**
		   * Validate transfer parameters
		   * @param {object} params - Transfer parameters
		   * @throws {Error} If validation fails
		   */
		  validateParams(params) {
		    if (!params.assetName) {
		      throw new Error('assetName is required');
		    }

		    if (!Array.isArray(params.recipients) || params.recipients.length === 0) {
		      throw new Error('recipients is required (non-empty array of { address, amount })');
		    }

		    params.recipients.forEach((recipient, index) => {
		      if (!recipient || !recipient.address) {
		        throw new Error(`recipients[${index}].address is required`);
		      }
		      if (recipient.amount === undefined || recipient.amount === null) {
		        throw new Error(`recipients[${index}].amount is required`);
		      }
		      if (recipient.amount <= 0) {
		        throw new Error(`recipients[${index}].amount must be greater than 0`);
		      }
		    });

		    return true;
		  }

		  /**
		   * Build transfer transaction
		   * @returns {Promise<object>} Transaction result
		   */
		  async build() {
		    // 1. Validate parameters
		    this.validateParams(this.params);

		    const { assetName, recipients, units } = this.params;

		    // Every recipient is converted to its protocol integer FIRST and the
		    // totals are summed in raw. Summing display amounts and scaling the total
		    // afterwards (`Math.round(totalAssetUnits * 1e8)`) accumulates the float
		    // error of every recipient into the asset change.
		    const recipientsRaw = recipients.map((recipient, index) => ({
		      address: recipient.address,
		      assetName,
		      amountRaw: this.assetAmountToRaw(
		        recipient.amount,
		        units,
		        `recipients[${index}].amount`
		      )
		    }));
		    const totalRecipientRaw = recipientsRaw.reduce((sum, r) => sum + r.amountRaw, 0n);

		    // 2. Addresses
		    const addresses = await this._getAddresses();
		    const changeAddress = await this.getChangeAddress();

		    // 3. DePIN detection + owner token lookup (soulbound rule)
		    const isDepin = AssetNameParser.isDepin(assetName);
		    let ownerTokenName = null;
		    let ownerTokenUTXO = null;
		    if (isDepin) {
		      ownerTokenName = AssetNameParser.getOwnerTokenName(assetName); // &NAME -> &NAME!
		      try {
		        ownerTokenUTXO = await this.ownerTokenManager.findOwnerTokenUTXO(
		          ownerTokenName,
		          addresses
		        );
		      } catch (error) {
		        if (error instanceof OwnerTokenNotFoundError) {
		          throw new OwnerTokenNotFoundError(
		            `You must own the asset's owner token (${ownerTokenName}) to transfer ` +
		            `this DePIN asset. DePIN assets are soulbound: the transfer must be ` +
		            `authorized by the owner.`,
		            ownerTokenName
		          );
		        }
		        throw error;
		      }
		    }

		    // 4. Output addresses used only for the fee (vsize) estimate. Include every
		    //    potential output so the fee is never under-estimated.
		    const outputAddresses = [
		      changeAddress, // XNA change
		      // One transfer per recipient. These carry an asset payload, so they must
		      // be declared as such: sized as bare P2PKH the fee falls below the node's
		      // minimum relay fee as soon as its fee rate approaches that floor.
		      ...recipients.map(r => ({ address: r.address, assetName })),
		      { address: changeAddress, assetName }, // asset change (harmless over-count if absent)
		      ...(isDepin
		        ? [{ address: changeAddress, assetName: ownerTokenName, kind: 'owner' }]
		        : []),
		    ];

		    // 5. Select the asset UTXOs from the raw total, so the requirement is not
		    //    a display float that was scaled back up.
		    const assetSelection = await this.utxoSelector.selectAssetUTXOs(
		      addresses,
		      assetName,
		      undefined,
		      { requiredRaw: totalRecipientRaw }
		    );
		    const assetUTXOs = assetSelection.utxos;
		    const assetChangeRaw = assetSelection.totalRaw - totalRecipientRaw;

		    // 6. Fund the XNA side. The asset and owner-token inputs count towards the
		    //    size estimate from the first round (they are what makes a PQ transfer
		    //    expensive) and are excluded from XNA selection. fundXnaInputs
		    //    recomputes the fee after every top-up and never reuses an outpoint.
		    const committedInputs = [...assetUTXOs, ...(isDepin ? [ownerTokenUTXO] : [])];
		    const funding = await this.fundXnaInputs({
		      outputs: outputAddresses,
		      extraInputs: committedInputs,
		      exclude: committedInputs,
		      initialInputHint: 1
		    });

		    const baseCurrencyUTXOs = funding.utxos;
		    const feeSats = funding.feeSats;
		    const xnaChangeSats = funding.changeSats;
		    const actualFee = this.satsToDisplay(feeSats);

		    // 8. Build inputs: asset UTXOs + [owner token] + XNA UTXOs
		    const inputs = [];

		    assetUTXOs.forEach(utxo => {
		      inputs.push({
		        txid: utxo.txid,
		        vout: utxo.outputIndex,
		        address: utxo.address,
		        assetName: utxo.assetName,
		        satoshis: utxo.satoshis,
		      });
		    });

		    if (isDepin) {
		      inputs.push({
		        txid: ownerTokenUTXO.txid,
		        vout: ownerTokenUTXO.outputIndex,
		        address: ownerTokenUTXO.address,
		        assetName: ownerTokenUTXO.assetName,
		        satoshis: ownerTokenUTXO.satoshis,
		      });
		    }

		    baseCurrencyUTXOs.forEach(utxo => {
		      inputs.push({
		        txid: utxo.txid,
		        vout: utxo.outputIndex,
		        address: utxo.address,
		        satoshis: utxo.satoshis,
		      });
		    });

		    // 9. Build outputs (unordered — outputOrderer enforces protocol order).
		    //    These carry DISPLAY amounts: createrawtransaction runs them through
		    //    AmountFromValue and does the 10^8 scaling itself.
		    const outputs = [];
		    const hasXnaChange = xnaChangeSats > 0n;
		    const assetChangeUnits = assetChangeRaw > 0n ? this.satsToDisplay(assetChangeRaw) : 0;

		    // XNA change
		    if (hasXnaChange) {
		      outputs.push({ [changeAddress]: this.satsToDisplay(xnaChangeSats) });
		    }

		    // One transfer per recipient (display units; the daemon scales by 10^8)
		    recipients.forEach(r => {
		      outputs.push({ [r.address]: OutputFormatter.formatTransferOutput(assetName, r.amount) });
		    });

		    // Asset change back to the sender
		    if (assetChangeRaw > 0n) {
		      outputs.push({
		        [changeAddress]: OutputFormatter.formatTransferOutput(assetName, assetChangeUnits),
		      });
		    }

		    // DePIN: return the owner token (required so the tx contains a transfer of
		    // &NAME! — satisfies the consensus `transfersOwnerToken` check).
		    if (isDepin) {
		      outputs.push(
		        this.ownerTokenManager.createOwnerTokenReturnOutput(ownerTokenName, changeAddress)
		      );
		    }

		    // 10. Order outputs (protocol requirement)
		    const orderedOutputs = this.outputOrderer.order(outputs);

		    // 11. Create raw transaction
		    const rawTx = await this.buildRawTransaction(inputs, orderedOutputs);

		    // 12. Format and return result
		    const allUTXOs = [
		      ...assetUTXOs,
		      ...(isDepin ? [ownerTokenUTXO] : []),
		      ...baseCurrencyUTXOs,
		    ];
		    const xnaChangeOut = hasXnaChange ? this.satsToDisplay(xnaChangeSats) : null;

		    // Canonical transfers: recipients plus, at most, one asset change. The
		    // DePIN owner escort is NOT listed here — createDepinTransferTransaction
		    // emits it itself, and adding it would produce two "&NAME!" outputs.
		    const canonicalTransfers = [
		      ...recipientsRaw,
		      ...(assetChangeRaw > 0n
		        ? [{ address: changeAddress, assetName, amountRaw: assetChangeRaw }]
		        : [])
		    ];

		    const createTransactionBuild = isDepin
		      ? await this.buildCreateTransactionBuild(
		          'TRANSFER_DEPIN',
		          inputs,
		          { changeAddress, changeSats: xnaChangeSats },
		          {
		            transfers: canonicalTransfers,
		            ownerChangeAddress: changeAddress,
		            network: this.canonicalNetwork()
		          }
		        )
		      : await this.buildCreateTransactionBuild(
		          'STANDARD_TRANSFER',
		          inputs,
		          {}, // STANDARD_TRANSFER has no XNA envelope; change travels as a payment
		          {
		            payments: hasXnaChange
		              ? [{ address: changeAddress, valueSats: xnaChangeSats }]
		              : [],
		            transfers: canonicalTransfers
		          }
		        );

		    return this.formatResult(
		      rawTx,
		      allUTXOs,
		      inputs,
		      orderedOutputs,
		      actualFee,
		      0, // burnAmount — transfers don't burn
		      {
		        assetName,
		        recipients: recipients.map(r => ({ address: r.address, amount: r.amount })),
		        assetChange: assetChangeUnits,
		        isDepin,
		        ownerTokenUsed: isDepin ? ownerTokenName : null,
		        operationType: 'TRANSFER',
		        createTransactionBuild,
		        localRawBuild: await this.buildLocalRawBuild(
		          'TRANSFER',
		          inputs,
		          null, // no burn
		          changeAddress,
		          xnaChangeOut,
		          {
		            assetName,
		            transfers: recipients.map(r => ({
		              address: r.address,
		              assetName,
		              amount: r.amount,
		            })),
		            assetChange: assetChangeRaw > 0n
		              ? { address: changeAddress, assetName, amount: assetChangeUnits }
		              : null,
		            ownerReturn: isDepin
		              ? { address: changeAddress, assetName: ownerTokenName, amount: 1 }
		              : null,
		          }
		        ),
		      }
		    );
		  }
		}

		TransferBuilder_1 = TransferBuilder;
		return TransferBuilder_1;
	}

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

	var IssueUniqueBuilder_1;
	var hasRequiredIssueUniqueBuilder;

	function requireIssueUniqueBuilder () {
		if (hasRequiredIssueUniqueBuilder) return IssueUniqueBuilder_1;
		hasRequiredIssueUniqueBuilder = 1;
		const BaseAssetTransactionBuilder = requireBaseAssetTransactionBuilder();
		const { OutputFormatter, AssetNameParser } = requireUtils();
		const {
		  ParentAssetNotFoundError,
		  OwnerTokenNotFoundError,
		  AssetExistsError
		} = requireErrors();
		const { IpfsValidator } = requireValidators();

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
		    const outputAddresses = [
		      burnInfo.address,
		      changeAddress,
		      { address: changeAddress, assetName: ownerTokenName, kind: 'owner' },
		      ...assetTags.map(tag => ({
		        address: toAddress,
		        assetName: `${rootName}#${tag}`,
		        kind: 'issue',
		      })),
		    ];
		    // 8-12. Fund the XNA side. The root owner-token input counts towards the
		    //       size estimate from the first round and is excluded from selection.
		    const burnSats = this.xnaAmountToSats(burnInfo.amount, { label: 'burn amount' });
		    const funding = await this.fundXnaInputs({
		      outputs: outputAddresses,
		      burnSats,
		      extraInputs: [ownerTokenUTXO],
		      exclude: [ownerTokenUTXO],
		      initialInputHint: 1
		    });

		    const baseCurrencyUTXOs = funding.utxos;
		    const actualFee = this.satsToDisplay(funding.feeSats);
		    const xnaChangeSats = funding.changeSats;

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
		    if (xnaChangeSats > 0n) {
		      outputs.push({ [changeAddress]: this.satsToDisplay(xnaChangeSats) });
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
		        operationType: 'ISSUE_UNIQUE',
		        createTransactionBuild: await this.buildCreateTransactionBuild(
		          'ISSUE_UNIQUE',
		          inputs,
		          { burnAddress: burnInfo.address, burnSats, changeAddress, changeSats: xnaChangeSats },
		          {
		            toAddress,
		            rootName,
		            assetTags,
		            ipfsHashes: ipfsHashes.length > 0 ? ipfsHashes : undefined,
		            ownerTokenAddress: changeAddress
		          }
		        ),
		        localRawBuild: await this.buildLocalRawBuild(
		          'ISSUE_UNIQUE',
		          inputs,
		          burnInfo,
		          changeAddress,
		          xnaChangeSats > 0n ? this.satsToDisplay(xnaChangeSats) : null,
		          {
		            toAddress,
		            rootName,
		            assetTags,
		            ipfsHashes: ipfsHashes.length > 0 ? ipfsHashes : undefined,
		            ownerTokenAddress: changeAddress
		          }
		        )
		      }
		    );
		  }
		}

		IssueUniqueBuilder_1 = IssueUniqueBuilder;
		return IssueUniqueBuilder_1;
	}

	/**
	 * Issue Qualifier Builder
	 * Builds transactions for creating QUALIFIER assets
	 *
	 * QUALIFIER assets:
	 * - KYC/compliance tags (e.g., #KYC_VERIFIED, #ACCREDITED)
	 * - Format: #NAME or #ROOT/#SUB
	 * - Cost: 2000 XNA (root) or 200 XNA (sub-qualifier)
	 * - Quantity: 1-10 units only
	 * - Units: Always 0 (non-divisible)
	 * - Used to tag addresses for restricted asset compliance
	 * - Root qualifiers do not create owner tokens
	 * - Sub-qualifiers consume and return the parent qualifier asset itself
	 */

	var IssueQualifierBuilder_1;
	var hasRequiredIssueQualifierBuilder;

	function requireIssueQualifierBuilder () {
		if (hasRequiredIssueQualifierBuilder) return IssueQualifierBuilder_1;
		hasRequiredIssueQualifierBuilder = 1;
		const BaseAssetTransactionBuilder = requireBaseAssetTransactionBuilder();
		const { OutputFormatter, AssetNameParser } = requireUtils();
		const { AssetExistsError, ParentAssetNotFoundError, OwnerTokenNotFoundError } = requireErrors();
		const { IpfsValidator, AmountValidator } = requireValidators();

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
		    const outputAddresses = [
		      burnInfo.address,
		      changeAddress,
		      { address: toAddress, assetName, kind: 'issue', hasIpfs },
		      ...(isSub ? [{ address: changeAddress, assetName: parentQualifierName }] : []),
		    ];
		    // 8-12. Fund the XNA side. The parent qualifier inputs count towards the
		    //       size estimate from the first round and are excluded from selection.
		    const burnSats = this.xnaAmountToSats(burnInfo.amount, { label: 'burn amount' });
		    const funding = await this.fundXnaInputs({
		      outputs: outputAddresses,
		      burnSats,
		      extraInputs: parentQualifierUTXOs,
		      exclude: parentQualifierUTXOs,
		      initialInputHint: 1
		    });

		    const baseCurrencyUTXOs = funding.utxos;
		    const actualFee = this.satsToDisplay(funding.feeSats);
		    const xnaChangeSats = funding.changeSats;

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
		    if (xnaChangeSats > 0n) {
		      outputs.push({ [changeAddress]: this.satsToDisplay(xnaChangeSats) });
		    }

		    // Last: Issue qualifier operation
		    const issueQualifierOutput = OutputFormatter.formatIssueQualifierOutput({
		      asset_name: assetName,
		      asset_quantity: this.toSatoshis(quantity, 0),
		      has_ipfs: hasIpfs,
		      ipfs_hash: ipfsHash,
		      root_change_address: isSub ? changeAddress : undefined,
		      change_quantity: isSub && parentQualifierQuantity !== null
		        ? this.toSatoshis(parentQualifierQuantity, 0)
		        : undefined
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
		        operationType: isSub ? 'ISSUE_SUB_QUALIFIER' : 'ISSUE_QUALIFIER',
		        createTransactionBuild: await this.buildCreateTransactionBuild(
		          isSub ? 'ISSUE_SUB_QUALIFIER' : 'ISSUE_QUALIFIER',
		          inputs,
		          { burnAddress: burnInfo.address, burnSats, changeAddress, changeSats: xnaChangeSats },
		          {
		            toAddress,
		            assetName,
		            quantityRaw: this.assetAmountToRaw(quantity, 0, 'quantity'),
		            ipfsHash: hasIpfs ? ipfsHash : undefined,
		            rootChangeAddress: isSub ? changeAddress : undefined,
		            changeQuantityRaw: isSub && parentQualifierQuantity !== null
		              ? this.assetAmountToRaw(parentQualifierQuantity, 0, 'parent qualifier change')
		              : undefined
		          }
		        ),
		        localRawBuild: await this.buildLocalRawBuild(
		          isSub ? 'ISSUE_SUB_QUALIFIER' : 'ISSUE_QUALIFIER',
		          inputs,
		          burnInfo,
		          changeAddress,
		          xnaChangeSats > 0n ? this.satsToDisplay(xnaChangeSats) : null,
		          {
		            toAddress,
		            assetName,
		            quantityRaw: this.toSatoshis(quantity, 0),
		            ipfsHash: hasIpfs ? ipfsHash : undefined,
		            rootChangeAddress: isSub ? changeAddress : undefined,
		            changeQuantityRaw: isSub && parentQualifierQuantity !== null
		              ? this.toSatoshis(parentQualifierQuantity, 0)
		              : undefined
		          }
		        )
		      }
		    );
		  }
		}

		IssueQualifierBuilder_1 = IssueQualifierBuilder;
		return IssueQualifierBuilder_1;
	}

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

	var IssueRestrictedBuilder_1;
	var hasRequiredIssueRestrictedBuilder;

	function requireIssueRestrictedBuilder () {
		if (hasRequiredIssueRestrictedBuilder) return IssueRestrictedBuilder_1;
		hasRequiredIssueRestrictedBuilder = 1;
		const BaseAssetTransactionBuilder = requireBaseAssetTransactionBuilder();
		const { OutputFormatter, AssetNameParser } = requireUtils();
		const { AssetExistsError, OwnerTokenNotFoundError } = requireErrors();
		const { IpfsValidator, VerifierValidator } = requireValidators();

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
		    const outputAddresses = [
		      burnInfo.address,
		      changeAddress,
		      changeAddress, // owner token return goes to change address
		      toAddress,
		    ];
		    // Fund the XNA side. The owner-token input counts towards the size
		    // estimate from the first round and is excluded from XNA selection.
		    const burnSats = this.xnaAmountToSats(burnInfo.amount, { label: 'burn amount' });
		    const funding = await this.fundXnaInputs({
		      outputs: outputAddresses,
		      burnSats,
		      extraInputs: [ownerTokenUTXO],
		      exclude: [ownerTokenUTXO],
		      initialInputHint: 1
		    });

		    const baseCurrencyUTXOs = funding.utxos;
		    const actualFee = this.satsToDisplay(funding.feeSats);
		    const xnaChangeSats = funding.changeSats;

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
		    if (xnaChangeSats > 0n) {
		      outputs.push({ [changeAddress]: this.satsToDisplay(xnaChangeSats) });
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
		        operationType: 'ISSUE_RESTRICTED',
		        createTransactionBuild: await this.buildCreateTransactionBuild(
		          'ISSUE_RESTRICTED',
		          inputs,
		          { burnAddress: burnInfo.address, burnSats, changeAddress, changeSats: xnaChangeSats },
		          {
		            toAddress,
		            assetName,
		            quantityRaw: this.assetAmountToRaw(quantity, units, 'quantity'),
		            verifierString,
		            units,
		            reissuable,
		            ipfsHash: hasIpfs ? ipfsHash : undefined,
		            ownerChangeAddress: changeAddress
		          }
		        ),
		        localRawBuild: await this.buildLocalRawBuild(
		          'ISSUE_RESTRICTED',
		          inputs,
		          burnInfo,
		          changeAddress,
		          xnaChangeSats > 0n ? this.satsToDisplay(xnaChangeSats) : null,
		          {
		            toAddress,
		            assetName,
		            quantityRaw: this.toSatoshis(quantity, units),
		            verifierString,
		            units,
		            reissuable,
		            ipfsHash: hasIpfs ? ipfsHash : undefined,
		            ownerChangeAddress: changeAddress
		          }
		        )
		      }
		    );
		  }
		}

		IssueRestrictedBuilder_1 = IssueRestrictedBuilder;
		return IssueRestrictedBuilder_1;
	}

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

	var ReissueRestrictedBuilder_1;
	var hasRequiredReissueRestrictedBuilder;

	function requireReissueRestrictedBuilder () {
		if (hasRequiredReissueRestrictedBuilder) return ReissueRestrictedBuilder_1;
		hasRequiredReissueRestrictedBuilder = 1;
		const BaseAssetTransactionBuilder = requireBaseAssetTransactionBuilder();
		const { OutputFormatter, AssetNameParser } = requireUtils();
		const {
		  AssetNotFoundError,
		  AssetNotReissuableError,
		  OwnerTokenNotFoundError,
		  MaxSupplyExceededError
		} = requireErrors();
		const { IpfsValidator, VerifierValidator } = requireValidators();
		const { ASSET_LIMITS } = requireConstants();

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
		    const outputAddresses = [
		      burnInfo.address,
		      changeAddress,
		      changeAddress, // owner token return goes to change address
		      toAddress,
		    ];
		    // Fund the XNA side. The owner-token input counts towards the size
		    // estimate from the first round and is excluded from XNA selection.
		    const burnSats = this.xnaAmountToSats(burnInfo.amount, { label: 'burn amount' });
		    const funding = await this.fundXnaInputs({
		      outputs: outputAddresses,
		      burnSats,
		      extraInputs: [ownerTokenUTXO],
		      exclude: [ownerTokenUTXO],
		      initialInputHint: 1
		    });

		    const baseCurrencyUTXOs = funding.utxos;
		    const actualFee = this.satsToDisplay(funding.feeSats);
		    const xnaChangeSats = funding.changeSats;

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
		    if (xnaChangeSats > 0n) {
		      outputs.push({ [changeAddress]: this.satsToDisplay(xnaChangeSats) });
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

		    // 17. Canonical build — also the source of the raw transaction. Same
		    // reasoning as in ReissueBuilder: the node's `createrawtransaction` has no
		    // units field for a reissue (the `reissue_restricted` object included), so
		    // that path rejects any asset with units > 0; the local codec encodes
		    // "keep the current units" (0xff).
		    const createTransactionBuild = await this.buildCreateTransactionBuild(
		      'REISSUE_RESTRICTED',
		      inputs,
		      { burnAddress: burnInfo.address, burnSats, changeAddress, changeSats: xnaChangeSats },
		      {
		        toAddress,
		        assetName,
		        quantityRaw: this.assetAmountToRaw(quantity, assetData.units || 0, 'quantity'),
		        // Omitted on purpose — see the note in ReissueBuilder: this
		        // library never changes an asset's units, so it says "keep them"
		        // (0xff) rather than echoing a value that could be stale.

		        reissuable: reissuable !== undefined ? reissuable : undefined,
		        ipfsHash: newIpfs || undefined,
		        ownerChangeAddress: this.params.ownerChangeAddress || changeAddress,
		        verifierString: changeVerifier ? newVerifier : undefined
		      }
		    );
		    const rawTx = this.buildRawTransactionLocally(createTransactionBuild);

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
		        operationType: 'REISSUE_RESTRICTED',
		        buildStrategy: 'local-builder',
		        createTransactionBuild,
		        localRawBuild: await this.buildLocalRawBuild(
		          'REISSUE_RESTRICTED',
		          inputs,
		          burnInfo,
		          changeAddress,
		          xnaChangeSats > 0n ? this.satsToDisplay(xnaChangeSats) : null,
		          {
		            toAddress,
		            assetName,
		            quantityRaw: this.toSatoshis(quantity, assetData.units || 0),
		            units: assetData.units || 0,
		            reissuable: reissuable !== undefined ? reissuable : undefined,
		            ipfsHash: newIpfs || undefined,
		            ownerChangeAddress: this.params.ownerChangeAddress || changeAddress,
		            verifierString: changeVerifier ? newVerifier : undefined
		          }
		        )
		      }
		    );
		  }
		}

		ReissueRestrictedBuilder_1 = ReissueRestrictedBuilder;
		return ReissueRestrictedBuilder_1;
	}

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

	var TagAddressBuilder_1;
	var hasRequiredTagAddressBuilder;

	function requireTagAddressBuilder () {
		if (hasRequiredTagAddressBuilder) return TagAddressBuilder_1;
		hasRequiredTagAddressBuilder = 1;
		const BaseAssetTransactionBuilder = requireBaseAssetTransactionBuilder();
		const { OutputFormatter } = requireUtils();
		const { AssetNotFoundError, OwnerTokenNotFoundError, InvalidAddressError } = requireErrors();

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
		    // Outputs: burn + XNA change + tag/untag operation (sent to changeAddress)
		    const outputAddresses = [burnInfo.address, changeAddress, changeAddress];
		    // 7-11. Fund the XNA side. The qualifier inputs count towards the size
		    //       estimate from the first round and are excluded from XNA selection.
		    const burnSats = this.xnaAmountToSats(burnInfo.amount, { label: 'burn amount' });
		    const funding = await this.fundXnaInputs({
		      outputs: outputAddresses,
		      burnSats,
		      extraInputs: qualifierUTXOs,
		      exclude: qualifierUTXOs,
		      initialInputHint: 1
		    });

		    const baseCurrencyUTXOs = funding.utxos;
		    const actualFee = this.satsToDisplay(funding.feeSats);
		    const xnaChangeSats = funding.changeSats;

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
		    if (xnaChangeSats > 0n) {
		      outputs.push({ [changeAddress]: this.satsToDisplay(xnaChangeSats) });
		    }

		    // Last: Tag/Untag operation. The node creates the qualifier change output
		    // from the operation object itself, so this must be sent to the change address.
		    const operationOutput = isUntag
		      ? OutputFormatter.formatUntagAddressesOutput({
		          qualifier: qualifierName,
		          addresses: targetAddresses,
		          change_quantity: this.toSatoshis(qualifierQuantity, 0)
		        })
		      : OutputFormatter.formatTagAddressesOutput({
		          qualifier: qualifierName,
		          addresses: targetAddresses,
		          change_quantity: this.toSatoshis(qualifierQuantity, 0)
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
		        operationType: isUntag ? 'UNTAG_ADDRESSES' : 'TAG_ADDRESSES',
		        createTransactionBuild: await this.buildCreateTransactionBuild(
		          isUntag ? 'UNTAG_ADDRESSES' : 'TAG_ADDRESSES',
		          inputs,
		          { burnAddress: burnInfo.address, burnSats, changeAddress, changeSats: xnaChangeSats },
		          {
		            qualifierName,
		            targetAddresses,
		            qualifierChangeAddress: changeAddress,
		            qualifierChangeAmountRaw: this.assetAmountToRaw(
		              qualifierQuantity,
		              0,
		              'qualifier change'
		            )
		          }
		        ),
		        localRawBuild: await this.buildLocalRawBuild(
		          isUntag ? 'UNTAG_ADDRESSES' : 'TAG_ADDRESSES',
		          inputs,
		          burnInfo,
		          changeAddress,
		          xnaChangeSats > 0n ? this.satsToDisplay(xnaChangeSats) : null,
		          {
		            qualifierName,
		            targetAddresses,
		            qualifierChangeAddress: changeAddress,
		            qualifierChangeAmountRaw: this.toSatoshis(qualifierQuantity, 0)
		          }
		        )
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

		TagAddressBuilder_1 = TagAddressBuilder;
		return TagAddressBuilder_1;
	}

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

	var FreezeAddressBuilder_1;
	var hasRequiredFreezeAddressBuilder;

	function requireFreezeAddressBuilder () {
		if (hasRequiredFreezeAddressBuilder) return FreezeAddressBuilder_1;
		hasRequiredFreezeAddressBuilder = 1;
		const BaseAssetTransactionBuilder = requireBaseAssetTransactionBuilder();
		const { OutputFormatter, AssetNameParser } = requireUtils();
		const { AssetNotFoundError, OwnerTokenNotFoundError, InvalidAddressError } = requireErrors();

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
		    // Outputs: XNA change + freeze/unfreeze operation (sent to changeAddress)
		    const outputAddresses = [changeAddress, changeAddress];
		    // 7-10. Fund the XNA side (fee only, this operation does not burn). The
		    //       owner-token input counts towards the size estimate from the first
		    //       round and is excluded from XNA selection.
		    const funding = await this.fundXnaInputs({
		      outputs: outputAddresses,
		      extraInputs: [ownerTokenUTXO],
		      exclude: [ownerTokenUTXO],
		      initialInputHint: 1
		    });

		    const baseCurrencyUTXOs = funding.utxos;
		    const actualFee = this.satsToDisplay(funding.feeSats);
		    const xnaChangeSats = funding.changeSats;

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
		    if (xnaChangeSats > 0n) {
		      outputs.push({ [changeAddress]: this.satsToDisplay(xnaChangeSats) });
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
		        operationType,
		        createTransactionBuild: await this.buildCreateTransactionBuild(
		          operationType,
		          inputs,
		          { changeAddress, changeSats: xnaChangeSats },
		          operationType === 'FREEZE_ADDRESSES' || operationType === 'UNFREEZE_ADDRESSES'
		            ? {
		                assetName,
		                targetAddresses,
		                ownerChangeAddress: changeAddress
		              }
		            : {
		                assetName,
		                ownerChangeAddress: changeAddress
		              }
		        ),
		        localRawBuild: await this.buildLocalRawBuild(
		          operationType,
		          inputs,
		          null,
		          xnaChangeSats > 0n ? changeAddress : null,
		          xnaChangeSats > 0n ? this.satsToDisplay(xnaChangeSats) : null,
		          operationType === 'FREEZE_ADDRESSES' || operationType === 'UNFREEZE_ADDRESSES'
		            ? {
		                assetName,
		                targetAddresses,
		                ownerChangeAddress: changeAddress
		              }
		            : {
		                assetName,
		                ownerChangeAddress: changeAddress
		              }
		        )
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

		FreezeAddressBuilder_1 = FreezeAddressBuilder;
		return FreezeAddressBuilder_1;
	}

	/**
	 * Builders Module
	 * Exports all transaction builder classes
	 */

	var builders$1;
	var hasRequiredBuilders;

	function requireBuilders () {
		if (hasRequiredBuilders) return builders$1;
		hasRequiredBuilders = 1;
		// Base
		const BaseAssetTransactionBuilder = requireBaseAssetTransactionBuilder();

		// Basic Builders
		const IssueRootBuilder = requireIssueRootBuilder();
		const IssueSubBuilder = requireIssueSubBuilder();
		const IssueDepinBuilder = requireIssueDepinBuilder();
		const ReissueBuilder = requireReissueBuilder();
		const TransferBuilder = requireTransferBuilder();

		// Advanced Builders
		const IssueUniqueBuilder = requireIssueUniqueBuilder();
		const IssueQualifierBuilder = requireIssueQualifierBuilder();
		const IssueRestrictedBuilder = requireIssueRestrictedBuilder();
		const ReissueRestrictedBuilder = requireReissueRestrictedBuilder();
		const TagAddressBuilder = requireTagAddressBuilder();
		const FreezeAddressBuilder = requireFreezeAddressBuilder();

		builders$1 = {
		  // Base
		  BaseAssetTransactionBuilder,

		  // Basic Builders
		  IssueRootBuilder,
		  IssueSubBuilder,
		  IssueDepinBuilder,
		  ReissueBuilder,
		  TransferBuilder,

		  // Advanced Builders
		  IssueUniqueBuilder,
		  IssueQualifierBuilder,
		  IssueRestrictedBuilder,
		  ReissueRestrictedBuilder,
		  TagAddressBuilder,
		  FreezeAddressBuilder
		};
		return builders$1;
	}

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

	var NeuraiAssets_1;
	var hasRequiredNeuraiAssets;

	function requireNeuraiAssets () {
		if (hasRequiredNeuraiAssets) return NeuraiAssets_1;
		hasRequiredNeuraiAssets = 1;
		const { AssetQueries } = requireQueries();
		const {
		  IssueRootBuilder,
		  IssueSubBuilder,
		  IssueDepinBuilder,
		  IssueUniqueBuilder,
		  IssueQualifierBuilder,
		  IssueRestrictedBuilder,
		  ReissueBuilder,
		  ReissueRestrictedBuilder,
		  TagAddressBuilder,
		  FreezeAddressBuilder,
		  TransferBuilder
		} = requireBuilders();

		class NeuraiAssets {
		  /**
		   * @param {Function} rpc - RPC function to call Neurai node
		   * @param {object} config - Configuration options
		   * @param {string} config.network - Network identifier ('xna' or 'xna-test')
		   * @param {Array<string>} config.addresses - Wallet addresses
		   * @param {string} config.changeAddress - Default change address
		   * @param {string} config.toAddress - Default receiving address
		   * @param {('rvn'|'xna')} [config.assetMarker] - NIP-040 marker for locally
		   *   built raw transactions. Omit to use the node's
		   *   getblockchaininfo.asset_marker (falls back to 'rvn' on nodes that do
		   *   not report it). Per-operation params.assetMarker overrides this.
		   * @param {('strict'|'legacy-fallback')} [config.assetMarkerPolicy] - What to
		   *   do when getblockchaininfo FAILS. 'legacy-fallback' (default in 1.x)
		   *   resolves 'rvn'; 'strict' propagates the error instead, because on a
		   *   post-NIP-040 chain a guessed 'rvn' builds a transaction the node
		   *   rejects. A node that simply predates the field still resolves 'rvn'
		   *   under both policies — that is an answer, not a failure.
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
		      toAddress: config.toAddress || null,
		      // NIP-040: documented since 1.4.0 but dropped here until 1.4.1, which
		      // made the config-level override silently inoperative (per-operation
		      // params.assetMarker was unaffected).
		      assetMarker: config.assetMarker,
		      assetMarkerPolicy: config.assetMarkerPolicy
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
		      walletAddresses: this.config.addresses,
		      changeAddress: params.changeAddress || this.config.changeAddress,
		      toAddress: params.toAddress || this.config.toAddress,
		      // NIP-040: marker for the localRawBuild metadata. Undefined lets the
		      // builder ask the node (getblockchaininfo.asset_marker).
		      assetMarker: params.assetMarker !== undefined ? params.assetMarker : this.config.assetMarker,
		      assetMarkerPolicy: params.assetMarkerPolicy !== undefined
		        ? params.assetMarkerPolicy
		        : this.config.assetMarkerPolicy
		    };
		  }

		  // ========================================
		  // ROOT ASSET OPERATIONS
		  // ========================================

		  /**
		   * Create a ROOT asset
		   * @param {object} params - Asset creation parameters
		    * @param {string} params.assetName - Asset name (3-31 visible chars on mainnet, A-Z 0-9 _ .)
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
		   * Create a DEPIN asset
		   * @param {object} params - DEPIN creation parameters
		   * @param {string} params.assetName - Asset name (&NAME or &NAME/SUB)
		   * @param {number} params.quantity - Total supply
		   * @param {boolean} [params.reissuable=true] - Can mint more later
		   * @param {boolean} [params.hasIpfs=false] - Has IPFS metadata
		   * @param {string} [params.ipfsHash] - IPFS hash
		   * @returns {Promise<object>} Transaction data
		   */
		  async createDepinAsset(params) {
		    const builder = new IssueDepinBuilder(this.rpc, this._buildParams(params));
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
		  // TRANSFER OPERATIONS
		  // ========================================

		  /**
		   * Transfer an existing asset to one or more recipients.
		   *
		   * Works for any asset type. DePIN (`&`) assets are soulbound: this method
		   * automatically spends and returns the asset's owner token (`&NAME!`) so the
		   * transfer satisfies Neurai consensus (bad-txns-depin-transfer-not-by-owner).
		   * The owner token is returned to the change address (authority stays with the
		   * sender). For non-DePIN assets no owner token is involved.
		   *
		   * @param {object} params - Transfer parameters
		   * @param {string} params.assetName - Asset to transfer (e.g. 'TOKEN', '$SEC', '&DEVICE')
		   * @param {Array<object>} params.recipients - Recipients
		   * @param {string} params.recipients[].address - Destination address
		   * @param {number} params.recipients[].amount - Amount in asset display units (> 0)
		   * @param {string} [params.changeAddress] - Override change/owner-return address
		   * @returns {Promise<object>} Transaction data
		   */
		  async transferAsset(params) {
		    const builder = new TransferBuilder(this.rpc, this._buildParams(params));
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
		   * List DEPIN holders with validity status
		   * @param {string} assetName - DEPIN asset name
		   * @returns {Promise<Array>} Holder entries
		   */
		  async listDepinHolders(assetName) {
		    return await this.queries.listDepinHolders(assetName);
		  }

		  /**
		   * Check DEPIN validity for an address
		   * @param {string} assetName - DEPIN asset name
		   * @param {string} address - Address to query
		   * @returns {Promise<object>} Validity details
		   */
		  async checkDepinValidity(assetName, address) {
		    return await this.queries.checkDepinValidity(assetName, address);
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
		   * @returns {string} Asset type ('ROOT', 'SUB', 'UNIQUE', 'QUALIFIER', 'RESTRICTED', 'DEPIN', 'OWNER')
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

		NeuraiAssets_1 = NeuraiAssets;
		return NeuraiAssets_1;
	}

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
	 * - DEPIN assets (soulbound assets)
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

	var hasRequiredSrc;

	function requireSrc () {
		if (hasRequiredSrc) return src.exports;
		hasRequiredSrc = 1;
		// Main API class
		const NeuraiAssets = requireNeuraiAssets();

		// Builders
		const builders = requireBuilders();

		// Queries
		const { AssetQueries } = requireQueries();

		// Constants
		const constants = requireConstants();

		// Errors
		const errors = requireErrors();

		// Validators
		const validators = requireValidators();

		// Utils
		const utils = requireUtils();

		// Export main class as default
		src.exports = NeuraiAssets;

		// Export everything as named exports
		src.exports.NeuraiAssets = NeuraiAssets;
		src.exports.AssetQueries = AssetQueries;
		src.exports.builders = builders;
		src.exports.constants = constants;
		src.exports.errors = errors;
		src.exports.validators = validators;
		src.exports.utils = utils;
		return src.exports;
	}

	var srcExports = requireSrc();
	var packageApi = /*@__PURE__*/getDefaultExportFromCjs(srcExports);

	const NeuraiAssets = packageApi?.NeuraiAssets ?? packageApi;
	const AssetQueries = packageApi?.AssetQueries;
	const builders = packageApi?.builders ?? {};
	const constants = packageApi?.constants ?? {};
	const errors = packageApi?.errors ?? {};
	const validators = packageApi?.validators ?? {};
	const utils = packageApi?.utils ?? {};

	const publicApi = Object.assign(NeuraiAssets, {
	  NeuraiAssets,
	  AssetQueries,
	  builders,
	  constants,
	  errors,
	  validators,
	  utils
	});

	const globalScope =
	  typeof globalThis !== 'undefined'
	    ? globalThis
	    : typeof self !== 'undefined'
	      ? self
	      : window;

	globalScope.NeuraiAssets = publicApi;

	exports.AssetQueries = AssetQueries;
	exports.NeuraiAssets = NeuraiAssets;
	exports.builders = builders;
	exports.constants = constants;
	exports.default = publicApi;
	exports.errors = errors;
	exports.utils = utils;
	exports.validators = validators;

	Object.defineProperty(exports, '__esModule', { value: true });

	return exports;

})({});
//# sourceMappingURL=NeuraiAssets.global.js.map
