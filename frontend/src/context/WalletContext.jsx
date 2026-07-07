import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
} from "react";
import {
  isConnected as checkFreighter,
  requestAccess,
  signTransaction,
  getNetwork,
} from "@stellar/freighter-api";
import { Horizon, Networks, Transaction } from "@stellar/stellar-sdk";
import { toast } from "react-toastify";
import { AuthContext } from "./AuthContext";

export const WalletContext = createContext(null);

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;

const normalizeWalletAddress = (value) => {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return normalizeWalletAddress(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }
    if (/^[gG][a-zA-Z2-7]{55}$/.test(trimmed)) return trimmed.toUpperCase();
    return trimmed;
  }
  if (typeof value === "object") {
    return (
      normalizeWalletAddress(value.publicKey) ||
      normalizeWalletAddress(value.address) ||
      normalizeWalletAddress(value.walletAddress) ||
      normalizeWalletAddress(value.account) ||
      null
    );
  }
  return null;
};

export const WalletProvider = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [pendingWalletAddress, setPendingWalletAddress] = useState(null);
  const [signupLoading, setSignupLoading] = useState(false);

  // Get auth context for wallet login/signup
  const auth = useContext(AuthContext);

  useEffect(() => {
    const stored = localStorage.getItem("fino_stellar_address");
    if (stored) {
      const normalized = normalizeWalletAddress(stored);
      if (normalized) {
        setWalletAddress(normalized);
        setIsConnected(true);
      } else {
        localStorage.removeItem("fino_stellar_address");
      }
    }
  }, []);

  const connectWallet = useCallback(async () => {
    try {
      if (await checkFreighter()) {
        const accessResult = await requestAccess();
        const publicKey = normalizeWalletAddress(accessResult);
        if (publicKey) {
          // Check network - Freighter can return string or object
          const networkResult = await getNetwork();
          console.log("[Wallet] Freighter network result:", networkResult);
          
          // Handle both string and object responses
          let currentNetwork = networkResult;
          if (typeof networkResult === 'object' && networkResult !== null) {
            // Try common property names
            currentNetwork = networkResult.network || 
                           networkResult.networkPassphrase || 
                           networkResult.name ||
                           JSON.stringify(networkResult);
          }
          
          // Check if on testnet (various possible values)
          const isTestnet = currentNetwork === "TEST" || 
                          currentNetwork === "TESTNET" ||
                          currentNetwork === "Test SDF Network ; September 2015" ||
                          (typeof currentNetwork === 'string' && currentNetwork.toLowerCase().includes('test'));
          
          if (!isTestnet) {
            toast.warn(`Please switch Freighter to Testnet (currently on ${currentNetwork})`);
            console.error("[Wallet] Wrong network:", currentNetwork);
            return;
          }
          
          console.log("[Wallet] Network check passed - on Testnet");

          // Call backend to check if this is a new or existing wallet
          if (auth?.walletLogin) {
            try {
              const result = await auth.walletLogin(publicKey);
              
              if (result.isNewUser) {
                // New wallet - show signup modal
                setPendingWalletAddress(publicKey);
                setShowSignupModal(true);
                toast.info("New wallet detected. Please complete your profile.");
                return;
              }
              
              // Existing user - complete connection
              setWalletAddress(publicKey);
              setIsConnected(true);
              localStorage.setItem("fino_stellar_address", publicKey);
              toast.success("Wallet connected successfully!");
            } catch (err) {
              console.error("Wallet login failed:", err);
              toast.error(
                err.response?.data?.message ||
                  err.message ||
                  "Failed to connect wallet",
              );
            }
          } else {
            // No auth context - just store wallet locally (shouldn't happen normally)
            setWalletAddress(publicKey);
            setIsConnected(true);
            localStorage.setItem("fino_stellar_address", publicKey);
            toast.success("Connected via Freighter");
          }
        } else {
          throw new Error("Freighter did not return a valid wallet address");
        }
      } else {
        toast.error("Freighter extension not found! Please install it.");
        window.open("https://freighter.app/", "_blank");
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
      toast.error("Connection failed: " + err.message);
    }
  }, [auth]);

  const completeSignup = useCallback(async (walletAddr, name, email) => {
    if (!auth?.walletSignup) {
      throw new Error("Auth context not available");
    }

    setSignupLoading(true);
    try {
      await auth.walletSignup(walletAddr, name, email);
      
      // Signup successful - complete wallet connection
      setWalletAddress(walletAddr);
      setIsConnected(true);
      localStorage.setItem("fino_stellar_address", walletAddr);
      setShowSignupModal(false);
      setPendingWalletAddress(null);
      toast.success("Welcome to Fino! Your account has been created.");
    } catch (err) {
      console.error("Wallet signup failed:", err);
      throw err; // Re-throw to let modal handle the error display
    } finally {
      setSignupLoading(false);
    }
  }, [auth]);

  const cancelSignup = useCallback(() => {
    setShowSignupModal(false);
    setPendingWalletAddress(null);
    if (auth?.cancelWalletSignup) {
      auth.cancelWalletSignup();
    }
  }, [auth]);

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    setIsConnected(false);
    setShowSignupModal(false);
    setPendingWalletAddress(null);
    localStorage.removeItem("fino_stellar_address");
    if (auth?.logout) {
      auth.logout();
    }
    toast.info("Disconnected from Freighter");
  }, [auth]);

  /**
   * Sign an XDR transaction with Freighter and submit it to Horizon.
   * This is used for native XLM payment operations (not Soroban contract calls).
   *
   * @param {string} transactionXDR - Base64-encoded XDR of the unsigned transaction
   * @returns {{ txHash: string, success: boolean }}
   */
  const signAndSendTransaction = useCallback(
    async (transactionXDR) => {
      if (!isConnected || !walletAddress)
        throw new Error("Wallet not connected");
      try {
        console.log("[Wallet] Requesting Freighter signature...");
        // Step 1: Sign with Freighter
        const response = await signTransaction(transactionXDR, {
          network: "TESTNET",
          networkPassphrase: NETWORK_PASSPHRASE,
        });

        if (response.error) throw new Error(response.error);
        const signedXdr = response.signedTxXdr || response;

        // Step 2: Parse the signed XDR back into a Transaction object
        const tx = new Transaction(signedXdr, NETWORK_PASSPHRASE);

        // Step 3: Submit to Stellar Testnet Horizon
        console.log("[Wallet] Submitting to Horizon...");
        const horizonServer = new Horizon.Server(HORIZON_URL);
        const result = await horizonServer.submitTransaction(tx);

        console.log("[Wallet] Transaction submitted:", result.hash);
        return { txHash: result.hash, success: true };
      } catch (err) {
        // Horizon returns structured extras on failure
        const detail = err?.response?.data?.extras?.result_codes;
        const msg = detail
          ? `Transaction failed: ${JSON.stringify(detail)}`
          : err.message;
        console.error("[Wallet] signAndSendTransaction error:", msg);
        throw new Error(msg);
      }
    },
    [isConnected, walletAddress],
  );

  /**
   * Sign a Soroban contract call transaction with Freighter.
   * Returns the signed XDR without submitting (backend will submit).
   *
   * @param {string} transactionXDR - Base64-encoded XDR of the unsigned Soroban transaction
   * @returns {string} Signed XDR string
   */
  const signSorobanTransaction = useCallback(
    async (transactionXDR) => {
      if (!isConnected || !walletAddress)
        throw new Error("Wallet not connected");
      try {
        console.log("[Wallet] Requesting Freighter signature for Soroban transaction...");
        
        // Sign with Freighter
          const response = await signTransaction(transactionXDR, {
            network: "TESTNET",
            networkPassphrase: NETWORK_PASSPHRASE,
          });

          if (response.error) throw new Error(response.error);
          const signedXdr = response.signedTxXdr || response;

          console.log("[Wallet] Soroban transaction signed successfully");
          return signedXdr;
      } catch (err) {
        console.error("[Wallet] signSorobanTransaction error:", err);
        
        // Handle user rejection
        if (err.message.includes('User declined') || err.message.includes('rejected')) {
          throw new Error('Transaction signature was rejected by user');
        }
        
        throw new Error(err.message || 'Failed to sign transaction');
      }
    },
    [isConnected, walletAddress],
  );

  const value = useMemo(
    () => ({
      walletAddress,
      isConnected,
      connectWallet,
      disconnectWallet,
      signAndSendTransaction,
      signSorobanTransaction,
      // Signup modal state
      showSignupModal,
      pendingWalletAddress,
      signupLoading,
      completeSignup,
      cancelSignup,
    }),
    [
      walletAddress,
      isConnected,
      connectWallet,
      disconnectWallet,
      signAndSendTransaction,
      signSorobanTransaction,
      showSignupModal,
      pendingWalletAddress,
      signupLoading,
      completeSignup,
      cancelSignup,
    ],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};




