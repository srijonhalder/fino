/**
 * Deploy DividendDistributor to Stellar Testnet
 * 
 * Usage:
 *   npx hardhat run scripts/deployDividendDistributor.js --network stellarTestnet
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying DividendDistributor with:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "XLM");

  // Deploy — pass deployer as the backend wallet (authorized distributor)
  const Factory = await hre.ethers.getContractFactory("DividendDistributor");
  const contract = await Factory.deploy(deployer.address);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("✅ DividendDistributor deployed at:", address);

  // Copy ABI to backend
  const artifactPath = path.join(__dirname, "../artifacts/contracts/DividendDistributor.sol/DividendDistributor.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const backendContractsDir = path.join(__dirname, "../../backend/src/contracts");
  if (!fs.existsSync(backendContractsDir)) fs.mkdirSync(backendContractsDir, { recursive: true });
  fs.writeFileSync(
    path.join(backendContractsDir, "DividendDistributor.json"),
    JSON.stringify({ abi: artifact.abi }, null, 2)
  );
  console.log("📋 ABI copied to backend/src/contracts/DividendDistributor.json");

  // Update deployed-governance.json
  const deployedPath = path.join(__dirname, "../deployed-governance.json");
  let deployed = {};
  if (fs.existsSync(deployedPath)) {
    deployed = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
  }
  deployed.contracts = deployed.contracts || {};
  deployed.contracts.DividendDistributor = address;
  deployed.dividendDistributorDeployedAt = new Date().toISOString();
  fs.writeFileSync(deployedPath, JSON.stringify(deployed, null, 2));
  console.log("💾 Address saved to deployed-governance.json");

  console.log("\n📝 Add to backend .env:");
  console.log(`DIVIDEND_DISTRIBUTOR_ADDRESS=${address}`);
  console.log("\nDone!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
