import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useWallet } from "../../hooks/useWallet";
import WalletSignupModal from "./WalletSignupModal";

import { toast } from "react-toastify";

/**
 * WalletAuthBridge
 *
 * Invisible component that sits inside the Router/Auth/Wallet providers.
 * Watches for wallet address changes (from Freighter) and
 * automatically calls walletLogin so the auth context stays in sync.
 * Also renders the WalletSignupModal when a new wallet needs to complete signup.
 *
 * Key: only calls the API when the address actually changes and the user
 * is not already authenticated with that address.
 */
const WalletAuthBridge = () => {
  const { 
    walletAddress, 
    isConnected, 
    showSignupModal, 
    pendingWalletAddress,
    signupLoading,
    completeSignup,
    cancelSignup 
  } = useWallet();
  const { logout, user, token } = useAuth();
  const navigate = useNavigate();
  const prevAddress = useRef(null);
  const processing = useRef(false);
  
  const normalizeWalletAddress = (value) => {
    if (!value) return "";
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return "";
      if (/^[gG][a-zA-Z2-7]{55}$/.test(trimmed)) return trimmed.toUpperCase();
      return trimmed;
    }
    if (typeof value === "object") {
      return (
        normalizeWalletAddress(value.publicKey) ||
        normalizeWalletAddress(value.address) ||
        normalizeWalletAddress(value.walletAddress) ||
        normalizeWalletAddress(value.account) ||
        ""
      );
    }
    return "";
  };
  const normalizedWalletAddress = normalizeWalletAddress(walletAddress);

  const syncAuth = useCallback(async () => {
    // ── Wallet disconnected ──
    if (!isConnected || !normalizedWalletAddress) {
      if (prevAddress.current) {
        prevAddress.current = null;
        if (user?.isWalletUser) {
          logout();
        }
      }
      return;
    }

    const addr = normalizedWalletAddress.toLowerCase();

    // ── Same address & already authenticated -> skip ──
    if (prevAddress.current?.toLowerCase() === addr) return;

    // ── Already have a valid session for this address -> just track it ──
    if (token && user && user.walletAddress?.toLowerCase() === addr) {
      prevAddress.current = normalizedWalletAddress;
      return;
    }

    // ── New address (first connect or account switch) ──
    // Note: The actual wallet login is now handled by WalletContext.connectWallet()
    // This bridge just handles navigation after successful authentication
    if (processing.current) return;
    processing.current = true;

    try {
      // Log out the previous user if switching accounts
      if (prevAddress.current && prevAddress.current.toLowerCase() !== addr) {
        logout();
        toast.info("Wallet changed — switching account...");
      }

      prevAddress.current = normalizedWalletAddress;
      
      // Check if we need to do anything - WalletContext now handles the login
      // But we still need to handle navigation for admin and business owners
      if (user?.role === 'admin') {
        navigate("/admin");
      } else if (
        user?.role === "business_owner" &&
        !user?.isWalletUser
      ) {
        if (user.kycStatus === "verified") {
          navigate("/dashboard/business");
        } else {
          navigate("/raise-funds");
        }
      }
    } catch (err) {
      console.error("WalletAuthBridge: sync failed", err);
      prevAddress.current = null;
    } finally {
      processing.current = false;
    }
  }, [
    normalizedWalletAddress,
    isConnected,
    user,
    token,
    logout,
    navigate,
  ]);

  useEffect(() => {
    syncAuth();
  }, [syncAuth]);

  // Navigate admin users when they log in via wallet
  useEffect(() => {
    if (user?.role === 'admin' && isConnected) {
      navigate("/admin");
    }
  }, [user, isConnected, navigate]);

  // Render the signup modal when needed
  if (showSignupModal && pendingWalletAddress) {
    return (
      <WalletSignupModal
        walletAddress={pendingWalletAddress}
        onSubmit={completeSignup}
        onCancel={cancelSignup}
        isLoading={signupLoading}
      />
    );
  }

  return null;
};

export default WalletAuthBridge;
