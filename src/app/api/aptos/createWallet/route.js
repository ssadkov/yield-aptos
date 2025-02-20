import { mnemonicGenerate } from "@polkadot/util-crypto";
import { Account, SigningScheme } from "@aptos-labs/ts-sdk";

export async function GET() {
  try {
    const mnemonic = mnemonicGenerate(12);
    const derivationPath = "m/44'/637'/0'/0'/0'";

    const account = Account.fromDerivationPath({
      path: derivationPath,
      mnemonic,
      scheme: SigningScheme.Ed25519,
      legacy: true,
    });

    return new Response(
      JSON.stringify({
        mnemonic,
        address: account.accountAddress.toString(),
        privateKeyHex: account.privateKey.toString(),
      }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
