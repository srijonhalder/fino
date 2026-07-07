import api from './api';

export const initiateInvestment = (businessId, tokenAmount) =>
  api.post('/api/investments/initiate', { businessId, tokenAmount });
export const confirmInvestment = (businessId, tokenAmount, txHash) =>
  api.post('/api/investments/confirm', { businessId, tokenAmount, xlmTransactionHash: txHash }, { timeout: 120000 });
export const getMyInvestments = () => api.get('/api/investments/my-investments');
export const getMyDividendEarnings = () => api.get('/api/dividends/my-earnings');
export const getOnChainPortfolio = () => api.get('/api/investments/on-chain-portfolio');
