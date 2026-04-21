export {};

declare global {
  interface NeuraiScriptsAssetTransferPayload {
    assetName: string;
    amountRaw: bigint;
    payloadHex: string;
  }

  interface NeuraiScriptsSplitAssetWrappedResult {
    /** Bytes before the OP_XNA_ASSET wrapper, hex. Equal to input if bare. */
    prefixHex: string;
    assetTransfer: NeuraiScriptsAssetTransferPayload | null;
  }

  interface NeuraiScriptsParsedPartialFillOrder {
    network: string;
    sellerPubKeyHash: Uint8Array;
    unitPriceSats: bigint;
    tokenId: string;
    scriptHex: string;
  }

  interface NeuraiScriptsParsedPartialFillOrderPQ {
    network: string;
    pubKeyCommitment: Uint8Array;
    txHashSelector: number;
    unitPriceSats: bigint;
    tokenId: string;
    scriptHex: string;
  }

  interface NeuraiScriptsStatic {
    splitAssetWrappedScriptPubKey(spkHex: string): NeuraiScriptsSplitAssetWrappedResult;
    parsePartialFillScript(
      script: Uint8Array | string,
      network?: string
    ): NeuraiScriptsParsedPartialFillOrder;
    parsePartialFillScriptPQ(
      script: Uint8Array | string,
      network?: string
    ): NeuraiScriptsParsedPartialFillOrderPQ;
    isPartialFillScriptPQ(script: Uint8Array | string): boolean;
  }

  var NeuraiScripts: NeuraiScriptsStatic;
}
