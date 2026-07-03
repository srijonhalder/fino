require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('../src/models/Notification');
const Business = require('../src/models/Business');
const { ethers } = require('ethers');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const provider = new ethers.JsonRpcProvider(process.env.CELO_RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org');

  const bal = await provider.getBalance('0xED5A7599F025D32fD101bff551f7b08B0Ad46539');
  console.log('Business owner balance:', ethers.formatEther(bal), 'CELO');

  const escBal = await provider.getBalance('0x371f3204316D79E2d4a93480C519cc23291956B1');
  console.log('Escrow contract balance:', ethers.formatEther(escBal), 'CELO');

  const biz = await Business.findOne({ name: /dranker/i });
  console.log('Business status:', biz.status);
  console.log('Business owner:', biz.owner, 'userId:', biz.userId);

  const ownerId = biz.ownerId;
  if (ownerId) {
    await Notification.create({
      userId: ownerId,
      type: 'escrow_released',
      title: 'Funds Released to Your Wallet!',
      message: "The escrowed CELO for Dranker's Den has been released to your wallet.",
      link: '/dashboard/business',
    });
    console.log('Notification created');
  }

  await mongoose.disconnect();
})();
