import { format, formatDistanceToNow, differenceInDays } from "date-fns";

export const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

export const formatXLM = (amount) =>
  `${parseFloat(amount || 0).toFixed(4)} XLM`;

export const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return format(new Date(dateString), "dd MMM yyyy");
};

export const formatRelativeTime = (dateString) => {
  if (!dateString) return "N/A";
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
};

export const shortenWalletAddress = (address) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const shortenTxId = (txId) => {
  if (!txId) return "";
  return `${txId.slice(0, 10)}...${txId.slice(-6)}`;
};

export const formatPercentage = (value) =>
  `${parseFloat(value || 0).toFixed(1)}%`;

export const formatOwnership = (value) => {
  const num = parseFloat(value || 0);
  if (num === 0) return "0%";
  if (num > 0 && num < 0.01) return "< 0.01%";
  if (num < 1) return `${num.toFixed(4)}%`;
  return `${num.toFixed(2)}%`;
};

export const calculateDaysRemaining = (deadline) => {
  if (!deadline) return 0;
  const days = differenceInDays(new Date(deadline), new Date());
  return Math.max(0, days);
};

export const getStellarExplorerUrl = (type, hash) => {
  const base =
    process.env.REACT_APP_STELLAR_EXPLORER_URL ||
    "https://stellar.expert/explorer/testnet";
  if (type === "tx") return `${base}/tx/${hash}`;
  if (type === "address") return `${base}/account/${hash}`;
  if (type === "token") return `${base}/contract/${hash}`;
  return base;
};
