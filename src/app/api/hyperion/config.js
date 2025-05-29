import { Network } from "@aptos-labs/ts-sdk";
import { initHyperionSDK } from '@hyperionxyz/sdk';

const sdk = initHyperionSDK({
    network: Network.MAINNET,
    APTOS_API_KEY: process.env.APTOS_API_KEY
});

export default sdk; 