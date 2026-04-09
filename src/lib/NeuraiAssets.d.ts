export {};

declare global {
  interface NeuraiAssetsConfig {
    network?: string;
    addresses?: string[];
    changeAddress?: string | null;
    toAddress?: string | null;
  }

  type NeuraiAssetsOperationType =
    | 'ISSUE_ROOT'
    | 'ISSUE_SUB'
    | 'ISSUE_DEPIN'
    | 'ISSUE_UNIQUE'
    | 'ISSUE_QUALIFIER'
    | 'ISSUE_SUB_QUALIFIER'
    | 'ISSUE_RESTRICTED'
    | 'REISSUE'
    | 'REISSUE_RESTRICTED'
    | 'TAG_ADDRESSES'
    | 'UNTAG_ADDRESSES'
    | 'FREEZE_ADDRESSES'
    | 'UNFREEZE_ADDRESSES'
    | 'FREEZE_ASSET'
    | 'UNFREEZE_ASSET';

  type NeuraiAssetsBuildStrategy = 'rpc-node' | 'local-builder';

  interface NeuraiAssetsBuildInput {
    txid: string;
    vout: number;
    address: string;
    satoshis: number;
    assetName?: string;
  }

  interface NeuraiAssetsLocalRawBuild {
    operationType: NeuraiAssetsOperationType;
    params: Record<string, unknown>;
  }

  interface NeuraiAssetsBuildResult {
    rawTx: string;
    fee: number;
    burnAmount: number;
    network: string;
    buildStrategy: NeuraiAssetsBuildStrategy;
    burnAddress: string | null;
    changeAddress: string | null;
    changeAmount: number | null;
    inputs: NeuraiAssetsBuildInput[];
    outputs: Array<Record<string, unknown>>;
    utxos?: unknown[];
    assetData?: Record<string, unknown>;
    assetName?: string;
    ownerTokenName?: string;
    operationType?: NeuraiAssetsOperationType;
    localRawBuild?: NeuraiAssetsLocalRawBuild;
    [key: string]: unknown;
  }

  interface NeuraiAssetsCreateRootParams {
    assetName: string;
    quantity: number;
    units?: number;
    reissuable?: boolean;
    hasIpfs?: boolean;
    ipfsHash?: string;
    toAddress?: string;
    changeAddress?: string;
  }

  interface NeuraiAssetsCreateSubParams extends NeuraiAssetsCreateRootParams {}

  interface NeuraiAssetsCreateDepinParams {
    assetName: string;
    quantity: number;
    reissuable?: boolean;
    hasIpfs?: boolean;
    ipfsHash?: string;
    toAddress?: string;
    changeAddress?: string;
  }

  interface NeuraiAssetsCreateUniqueParams {
    rootName: string;
    assetTags: string[];
    ipfsHashes?: string[];
    toAddress?: string;
    changeAddress?: string;
  }

  interface NeuraiAssetsCreateQualifierParams {
    qualifierName: string;
    quantity?: number;
    hasIpfs?: boolean;
    ipfsHash?: string;
    toAddress?: string;
    changeAddress?: string;
  }

  interface NeuraiAssetsCreateRestrictedParams {
    assetName: string;
    quantity: number;
    verifierString: string;
    units?: number;
    reissuable?: boolean;
    hasIpfs?: boolean;
    ipfsHash?: string;
    toAddress?: string;
    changeAddress?: string;
  }

  interface NeuraiAssetsReissueParams {
    assetName: string;
    quantity: number;
    reissuable?: boolean;
    newIpfs?: string;
    changeAddress?: string;
  }

  interface NeuraiAssetsTagParams {
    qualifierName: string;
    addresses: string[];
    assetData?: string;
    changeAddress?: string;
  }

  interface NeuraiAssetsReissueRestrictedParams {
    assetName: string;
    quantity: number;
    changeVerifier?: boolean;
    newVerifier?: string;
    reissuable?: boolean;
    newIpfs?: string;
    changeAddress?: string;
  }

  interface NeuraiAssetsFreezeParams {
    assetName: string;
    addresses?: string[];
    changeAddress?: string;
  }

  class NeuraiAssets {
    constructor(rpc: (method: string, params: unknown[]) => Promise<unknown>, config?: NeuraiAssetsConfig);
    updateConfig(config: Partial<NeuraiAssetsConfig>): void;
    createRootAsset(params: NeuraiAssetsCreateRootParams): Promise<NeuraiAssetsBuildResult>;
    createSubAsset(params: NeuraiAssetsCreateSubParams): Promise<NeuraiAssetsBuildResult>;
    createDepinAsset(params: NeuraiAssetsCreateDepinParams): Promise<NeuraiAssetsBuildResult>;
    createUniqueAssets(params: NeuraiAssetsCreateUniqueParams): Promise<NeuraiAssetsBuildResult>;
    createQualifier(params: NeuraiAssetsCreateQualifierParams): Promise<NeuraiAssetsBuildResult>;
    createRestrictedAsset(params: NeuraiAssetsCreateRestrictedParams): Promise<NeuraiAssetsBuildResult>;
    reissueAsset(params: NeuraiAssetsReissueParams): Promise<NeuraiAssetsBuildResult>;
    tagAddresses(params: NeuraiAssetsTagParams): Promise<NeuraiAssetsBuildResult>;
    untagAddresses(params: NeuraiAssetsTagParams): Promise<NeuraiAssetsBuildResult>;
    reissueRestrictedAsset(params: NeuraiAssetsReissueRestrictedParams): Promise<NeuraiAssetsBuildResult>;
    freezeAddresses(params: NeuraiAssetsFreezeParams): Promise<NeuraiAssetsBuildResult>;
    unfreezeAddresses(params: NeuraiAssetsFreezeParams): Promise<NeuraiAssetsBuildResult>;
    freezeAssetGlobally(params: NeuraiAssetsFreezeParams): Promise<NeuraiAssetsBuildResult>;
    unfreezeAssetGlobally(params: NeuraiAssetsFreezeParams): Promise<NeuraiAssetsBuildResult>;
    checkAddressTag(address: string, qualifierName: string): Promise<boolean>;
    listTagsForAddress(address: string): Promise<string[]>;
    listDepinHolders(assetName: string): Promise<unknown[]>;
    checkDepinValidity(assetName: string, address: string): Promise<unknown>;
    assetExists(assetName: string): Promise<boolean>;
    getAssetType(assetName: string): string;
    getAssetData(assetName: string): Promise<unknown>;
    listAssets(filter?: string, verbose?: boolean, count?: number, start?: number): Promise<unknown>;
    listMyAssets(assetName?: string, verbose?: boolean, count?: number, start?: number, confs?: number): Promise<unknown>;
  }

  var NeuraiAssets: typeof NeuraiAssets;
}
