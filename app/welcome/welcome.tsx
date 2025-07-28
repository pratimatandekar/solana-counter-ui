import React, { useEffect, useState, useCallback } from "react";
import { PublicKey, Connection } from "@solana/web3.js";
import { AnchorProvider, Program, web3 } from "@coral-xyz/anchor";
import idl from "../target/idl/counter_contract.json";
import {
  WalletAdapterNetwork,
  useWallet,
  useConnection,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

// Replace with your program ID from Anchor.toml
const PROGRAM_ID = new PublicKey(idl.metadata.address);

function CounterApp() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [program, setProgram] = useState(null);
  const [counterPda, setCounterPda] = useState(null);
  const [count, setCount] = useState(null);

  // Initialize Anchor program and PDA
  useEffect(() => {
    if (!wallet.connected) return;
    const provider = new AnchorProvider(
      connection,
      wallet,
      AnchorProvider.defaultOptions()
    );
    const prog = new Program(idl, PROGRAM_ID, provider);
    setProgram(prog);

    (async () => {
      const [pda] = await PublicKey.findProgramAddress(
        [Buffer.from("counter"), provider.wallet.publicKey.toBuffer()],
        prog.programId
      );
      setCounterPda(pda);
    })();
  }, [wallet.connected]);

  // Fetch current count
  const fetchCount = useCallback(async () => {
    if (!program || !counterPda) return;
    try {
      const account = await program.account.counter.fetch(counterPda);
      setCount(account.count.toNumber());
    } catch (err) {
      console.error("Error fetching count", err);
      setCount(null);
    }
  }, [program, counterPda]);

  useEffect(() => {
    if (program && counterPda) fetchCount();
  }, [program, counterPda, fetchCount]);

  const initialize = async () => {
    if (!program || !counterPda) return;
    await program.methods
      .initialize()
      .accounts({ user: wallet.publicKey, counter: counterPda })
      .rpc();
    await fetchCount();
  };

  const increment = async () => {
    if (!program || !counterPda) return;
    await program.methods
      .increment()
      .accounts({ user: wallet.publicKey, counter: counterPda })
      .rpc();
    await fetchCount();
  };

  const decrement = async () => {
    if (!program || !counterPda) return;
    await program.methods
      .decrement()
      .accounts({ user: wallet.publicKey, counter: counterPda })
      .rpc();
    await fetchCount();
  };

  return (
    <div className="p-8 max-w-md mx-auto text-center shadow-lg rounded-2xl">
      <h1 className="text-xl font-bold mb-4">Solana Counter</h1>
      <WalletMultiButton className="mb-4" />
      {wallet.connected ? (
        <>
          <p className="mb-4">
            <strong>Count:</strong>{" "}
            {count !== null ? count : "Not initialized"}
          </p>
          <button onClick={initialize} className="px-4 py-2 m-2 bg-blue-500 rounded-xl">
            Initialize
          </button>
          <button onClick={increment} className="px-4 py-2 m-2 bg-green-500 rounded-xl">
            + Increment
          </button>
          <button onClick={decrement} className="px-4 py-2 m-2 bg-red-500 rounded-xl">
            - Decrement
          </button>
        </>
      ) : (
        <p>Please connect your wallet.</p>
      )}
    </div>
  );
}

export default function App() {
  const network = WalletAdapterNetwork.Devnet;
  const wallets = [new PhantomWalletAdapter()];

  return (
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <ConnectionProvider endpoint={"https://api.devnet.solana.com"}>
          <CounterApp />
        </ConnectionProvider>
      </WalletModalProvider>
    </WalletProvider>
  );
}
