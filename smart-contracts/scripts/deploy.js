const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("=== Fino Smart Contract Deployment ===");
  console.log("Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "XLM");

  // ── Deploy Escrow Contract ──
  console.log("\n--- Deploying FinoEscrow ---");
  const Escrow = await hre.ethers.getContractFactory("FinoEscrow");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("FinoEscrow deployed to:", escrowAddress);

  // ── Test Deploy a BusinessToken ──
  console.log("\n--- Test-deploying BusinessToken ---");
  const BusinessToken = await hre.ethers.getContractFactory("BusinessToken");
  const testToken = await BusinessToken.deploy(
    "Test Chai Corner Token",
    "TCCT",
    1000,
    "test-business-id-123",
    100,
    100000
  );
  await testToken.waitForDeployment();
  const tokenAddress = await testToken.getAddress();
  console.log("Test BusinessToken deployed to:", tokenAddress);

  // Verify the deployed token info
  const info = await testToken.getBusinessInfo();
  console.log("  businessId:", info._businessId);
  console.log("  tokenPriceINR:", info._tokenPriceINR.toString());
  console.log("  fundingGoalINR:", info._fundingGoalINR.toString());
  console.log("  totalSupply:", info._totalSupply.toString());
  console.log("  circulatingSupply:", info._circulatingSupply.toString());

  // ── Summary ──
  console.log("\n=== Deployment Summary ===");
  console.log("Network:", hre.network.name);
  console.log("Escrow Address:", escrowAddress);
  console.log("Test Token Address:", tokenAddress);
  console.log("\nAdd to backend .env:");
  console.log(`ESCROW_CONTRACT_ADDRESS=${escrowAddress}`);

  const finalBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("\nRemaining balance:", hre.ethers.formatEther(finalBalance), "XLM");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
