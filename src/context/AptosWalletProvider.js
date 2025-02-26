"use client";

import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { useState, useEffect, createContext, useContext } from "react";
import { AptosClient } from "aptos";

// RPC-узел Aptos (можно поменять на testnet)
const APTOS_RPC = "https://fullnode.mainnet.aptoslabs.com";
const client = new AptosClient(APTOS_RPC);

// Контекст для управления состоянием кошелька
const WalletContext = createContext();

export function WalletProvider({ children }) {
  const wallets = [new PetraWallet(), new MartianWallet(), new RiseWallet(), new FewchaWallet(), new PontemWallet()];
  const { account, connected, connect, disconnect, signMessage } = useWallet();
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    if (connected && account) {
      fetchBalance();
    }
  }, [connected, account]);

  const fetchBalance = async () => {
    try {
      const resources = await client.getAccountResources(account.address);
      const balanceResource = resources.find((res) => res.type.includes("0x1::coin::CoinStore"));
      const balanceInOctas = balanceResource?.data?.coin?.value || "0";

      setBalance((parseFloat(balanceInOctas) / 1e8).toFixed(2));
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      setBalance("0.00");
    }
  };

  return (
    <WalletContext.Provider value={{ connect, disconnect, account, balance, signMessage }}>
      <AptosWalletAdapterProvider plugins={wallets} autoConnect>
        {children}
      </AptosWalletAdapterProvider>
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  return useContext(WalletContext);
}
