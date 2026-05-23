export {};

declare global {
  type NeuraiCreateTransactionTagOperation = 'tag' | 'untag';
  type NeuraiCreateTransactionFreezeOperation = 'freeze' | 'unfreeze';
  type NeuraiCreateTransactionNullAssetDestinationMode = 'strict' | 'hash20';

  interface NeuraiCreateTransactionTxInput {
    txid: string;
    vout: number;
    sequence?: number;
    scriptSigHex?: string;
  }

  interface NeuraiCreateTransactionBuiltTransaction {
    rawTx: string;
    outputs: Array<{
      valueSats: bigint;
      scriptPubKeyHex: string;
    }>;
  }

  interface NeuraiCreateTransactionXnaEnvelope {
    burnAddress?: string;
    burnAmountSats?: bigint | number;
    xnaChangeAddress?: string;
    xnaChangeSats?: bigint | number;
  }

  interface NeuraiCreateTransactionTxPaymentOutput {
    address: string;
    valueSats: bigint | number;
  }

  interface NeuraiCreateTransactionTransferOutput {
    address: string;
    assetName: string;
    amountRaw: bigint | number;
  }

  interface NeuraiCreateTransactionStatic {
    xnaToSatoshis(amount: number): bigint;
    assetUnitsToRaw(amount: number): bigint;
    inferNetworkFromAnyAddress(address: string): string;
    getBurnAddressForOperation(network: string, operation: string): string;
    createFromOperation(build: {
      operationType: string;
      params: Record<string, unknown>;
    }): NeuraiCreateTransactionBuiltTransaction;

    createPaymentTransaction(params: {
      version?: number;
      locktime?: number;
      inputs: NeuraiCreateTransactionTxInput[];
      payments: NeuraiCreateTransactionTxPaymentOutput[];
    }): NeuraiCreateTransactionBuiltTransaction;

    createStandardAssetTransferTransaction(params: {
      version?: number;
      locktime?: number;
      inputs: NeuraiCreateTransactionTxInput[];
      payments?: NeuraiCreateTransactionTxPaymentOutput[];
      transfers?: NeuraiCreateTransactionTransferOutput[];
    }): NeuraiCreateTransactionBuiltTransaction;

    createIssueAssetTransaction(params: {
      inputs: NeuraiCreateTransactionTxInput[];
      toAddress: string;
      assetName: string;
      quantityRaw: bigint | number;
      units?: number;
      reissuable?: boolean;
      ipfsHash?: string;
      includeOwnerOutput?: boolean;
      ownerTokenAddress?: string;
      ownerTokenName?: string;
    } & NeuraiCreateTransactionXnaEnvelope): NeuraiCreateTransactionBuiltTransaction;

    createIssueSubAssetTransaction(params: {
      inputs: NeuraiCreateTransactionTxInput[];
      toAddress: string;
      assetName: string;
      quantityRaw: bigint | number;
      units?: number;
      reissuable?: boolean;
      ipfsHash?: string;
      parentOwnerAddress?: string;
    } & NeuraiCreateTransactionXnaEnvelope): NeuraiCreateTransactionBuiltTransaction;

    createIssueDepinTransaction(params: {
      inputs: NeuraiCreateTransactionTxInput[];
      toAddress: string;
      assetName: string;
      quantityRaw: bigint | number;
      ipfsHash?: string;
      ownerTokenAddress?: string;
      reissuable?: boolean;
    } & NeuraiCreateTransactionXnaEnvelope): NeuraiCreateTransactionBuiltTransaction;

    createIssueUniqueAssetTransaction(params: {
      inputs: NeuraiCreateTransactionTxInput[];
      toAddress: string;
      rootName: string;
      assetTags: string[];
      ipfsHashes?: Array<string | undefined>;
      ownerTokenAddress?: string;
    } & NeuraiCreateTransactionXnaEnvelope): NeuraiCreateTransactionBuiltTransaction;

    createIssueQualifierTransaction(params: {
      inputs: NeuraiCreateTransactionTxInput[];
      toAddress: string;
      assetName: string;
      quantityRaw: bigint | number;
      ipfsHash?: string;
      rootChangeAddress?: string;
      changeQuantityRaw?: bigint | number;
    } & NeuraiCreateTransactionXnaEnvelope): NeuraiCreateTransactionBuiltTransaction;

    createIssueRestrictedTransaction(params: {
      inputs: NeuraiCreateTransactionTxInput[];
      toAddress: string;
      assetName: string;
      quantityRaw: bigint | number;
      verifierString: string;
      units?: number;
      reissuable?: boolean;
      ipfsHash?: string;
      ownerChangeAddress?: string;
    } & NeuraiCreateTransactionXnaEnvelope): NeuraiCreateTransactionBuiltTransaction;

    createReissueTransaction(params: {
      inputs: NeuraiCreateTransactionTxInput[];
      toAddress: string;
      assetName: string;
      quantityRaw: bigint | number;
      units?: number;
      reissuable?: boolean;
      ipfsHash?: string;
      ownerChangeAddress?: string;
    } & NeuraiCreateTransactionXnaEnvelope): NeuraiCreateTransactionBuiltTransaction;

    createReissueRestrictedTransaction(params: {
      inputs: NeuraiCreateTransactionTxInput[];
      toAddress: string;
      assetName: string;
      quantityRaw: bigint | number;
      units?: number;
      verifierString?: string;
      reissuable?: boolean;
      ipfsHash?: string;
      ownerChangeAddress?: string;
    } & NeuraiCreateTransactionXnaEnvelope): NeuraiCreateTransactionBuiltTransaction;

    createQualifierTagTransaction(params: {
      inputs: NeuraiCreateTransactionTxInput[];
      qualifierName: string;
      operation: NeuraiCreateTransactionTagOperation;
      targetAddresses: string[];
      burnAddress: string;
      burnAmountSats: bigint | number;
      xnaChangeAddress: string;
      xnaChangeSats: bigint | number;
      qualifierChangeAddress: string;
      qualifierChangeAmountRaw: bigint | number;
      nullAssetDestinationMode?: NeuraiCreateTransactionNullAssetDestinationMode;
    }): NeuraiCreateTransactionBuiltTransaction;

    createFreezeAddressesTransaction(params: {
      inputs: NeuraiCreateTransactionTxInput[];
      assetName: string;
      operation: NeuraiCreateTransactionFreezeOperation;
      targetAddresses: string[];
      ownerChangeAddress: string;
      xnaChangeAddress?: string;
      xnaChangeSats?: bigint | number;
      nullAssetDestinationMode?: NeuraiCreateTransactionNullAssetDestinationMode;
    }): NeuraiCreateTransactionBuiltTransaction;

    createFreezeAssetTransaction(params: {
      inputs: NeuraiCreateTransactionTxInput[];
      assetName: string;
      operation: NeuraiCreateTransactionFreezeOperation;
      ownerChangeAddress: string;
      xnaChangeAddress?: string;
      xnaChangeSats?: bigint | number;
    }): NeuraiCreateTransactionBuiltTransaction;
  }

  var NeuraiCreateTransaction: NeuraiCreateTransactionStatic;
}
