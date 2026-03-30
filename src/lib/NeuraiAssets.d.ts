export {};

declare global {
  interface NeuraiAssetsConfig {
    network?: string;
    addresses?: string[];
    changeAddress?: string | null;
    toAddress?: string | null;
  }

  interface NeuraiAssetsBuildResult {
    rawTx: string;
    inputs: Array<{ txid: string; vout: number; address: string; satoshis: number }>;
    outputs: Record<string, unknown>;
    fee: number;
    burnAmount: number;
    assetName?: string;
    ownerTokenName?: string;
    operationType?: string;
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

  interface NeuraiAssetsCreateUniqueParams {
    rootAssetName: string;
    assetTags: Array<{ tag: string; hasIpfs?: boolean; ipfsHash?: string }>;
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

  class NeuraiAssets {
    constructor(rpc: (method: string, params: unknown[]) => Promise<unknown>, config?: NeuraiAssetsConfig);
    updateConfig(config: Partial<NeuraiAssetsConfig>): void;
    createRootAsset(params: NeuraiAssetsCreateRootParams): Promise<NeuraiAssetsBuildResult>;
    createSubAsset(params: NeuraiAssetsCreateSubParams): Promise<NeuraiAssetsBuildResult>;
    createUniqueAssets(params: NeuraiAssetsCreateUniqueParams): Promise<NeuraiAssetsBuildResult>;
    createQualifier(params: NeuraiAssetsCreateQualifierParams): Promise<NeuraiAssetsBuildResult>;
    createRestrictedAsset(params: NeuraiAssetsCreateRestrictedParams): Promise<NeuraiAssetsBuildResult>;
    reissueAsset(params: NeuraiAssetsReissueParams): Promise<NeuraiAssetsBuildResult>;
    assetExists(assetName: string): Promise<boolean>;
    getAssetType(assetName: string): string;
    getAssetData(assetName: string): Promise<unknown>;
    listAssets(filter?: string, verbose?: boolean, count?: number, start?: number): Promise<unknown>;
    listMyAssets(assetName?: string, verbose?: boolean, count?: number, start?: number, confs?: number): Promise<unknown>;
  }

  var NeuraiAssets: typeof NeuraiAssets;
}
