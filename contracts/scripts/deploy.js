const hre = require("hardhat");
const { ethers, upgrades } = hre;

async function main() {
  const signers = await ethers.getSigners();
  
  if (signers.length === 0) {
    throw new Error("No signers found. Make sure PRIVATE_KEY is set in your .env file");
  }
  
  const [deployer] = signers;
  console.log("Deploying contracts with account:", deployer.address);

  // Get USDC token address for the network
  const USDC_ADDRESSES = {
    84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia
    8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"   // Base Mainnet
  };

  const network = await ethers.provider.getNetwork();
  const usdcAddress = USDC_ADDRESSES[Number(network.chainId)];
  
  if (!usdcAddress) {
    throw new Error(`USDC address not found for chain ID: ${network.chainId}`);
  }

  console.log(`Deploying on network: ${network.name} (${network.chainId})`);
  console.log(`Using USDC address: ${usdcAddress}`);

  // Deploy CollateralManager first
  console.log("\n1. Deploying CollateralManager...");
  const CollateralManager = await ethers.getContractFactory("CollateralManager");
  const collateralManager = await CollateralManager.deploy();
  await collateralManager.waitForDeployment();
  const collateralManagerAddress = await collateralManager.getAddress();
  console.log("CollateralManager deployed to:", collateralManagerAddress);

  // Deploy a minimal RiskEngine first with placeholder address
  console.log("\n2. Deploying RiskEngine (placeholder)...");
  const RiskEngine = await ethers.getContractFactory("RiskEngine");
  const riskEngine = await RiskEngine.deploy("0x0000000000000000000000000000000000000001"); // Dummy address
  await riskEngine.waitForDeployment();
  const riskEngineAddress = await riskEngine.getAddress();
  console.log("RiskEngine deployed to:", riskEngineAddress);

  // Deploy LendingPool with actual RiskEngine address
  console.log("\n3. Deploying LendingPool...");
  const LendingPool = await ethers.getContractFactory("contracts/LendingPool.sol:LendingPool");
  const lendingPool = await LendingPool.deploy(
    usdcAddress,
    riskEngineAddress,
    "0x0000000000000000000000000000000000000002", // Dummy PaymentController
    collateralManagerAddress
  );
  await lendingPool.waitForDeployment();
  const lendingPoolAddress = await lendingPool.getAddress();
  console.log("LendingPool deployed to:", lendingPoolAddress);

  // Deploy PaymentController
  console.log("\n4. Deploying PaymentController...");
  const PaymentController = await ethers.getContractFactory("PaymentController");
  const paymentController = await PaymentController.deploy(
    usdcAddress,
    lendingPoolAddress,
    riskEngineAddress,
    collateralManagerAddress
  );
  await paymentController.waitForDeployment();
  const paymentControllerAddress = await paymentController.getAddress();
  console.log("PaymentController deployed to:", paymentControllerAddress);

  // Update RiskEngine with correct LendingPool address
  console.log("\n5. Updating RiskEngine with correct LendingPool address...");
  try {
    await riskEngine.updateLendingPool(lendingPoolAddress);
    console.log("Updated RiskEngine with LendingPool address");
  } catch (error) {
    console.log("Note: Could not update RiskEngine LendingPool:", error.message);
  }

  console.log("\n6. Updating LendingPool with PaymentController...");
  try {
    await lendingPool.updatePaymentController(paymentControllerAddress);
    console.log("Updated LendingPool payment controller");
  } catch (error) {
    console.log("Note: Could not update PaymentController:", error.message);
  }

  console.log("\n7. Setting up roles and permissions...");
  
  // Grant roles to PaymentController
  const PAYMENT_CONTROLLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAYMENT_CONTROLLER_ROLE"));
  
  try {
    await lendingPool.grantRole(PAYMENT_CONTROLLER_ROLE, paymentControllerAddress);
    console.log("Granted PAYMENT_CONTROLLER_ROLE to PaymentController in LendingPool");
  } catch (error) {
    console.log("Note: PAYMENT_CONTROLLER_ROLE grant may have failed:", error.message);
  }

  try {
    await riskEngine.grantRole(PAYMENT_CONTROLLER_ROLE, paymentControllerAddress);
    console.log("Granted PAYMENT_CONTROLLER_ROLE to PaymentController in RiskEngine");
  } catch (error) {
    console.log("Note: PAYMENT_CONTROLLER_ROLE grant may have failed:", error.message);
  }

  try {
    await collateralManager.grantRole(PAYMENT_CONTROLLER_ROLE, paymentControllerAddress);
    console.log("Granted PAYMENT_CONTROLLER_ROLE to PaymentController in CollateralManager");
  } catch (error) {
    console.log("Note: PAYMENT_CONTROLLER_ROLE grant may have failed:", error.message);
  }

  // Configure supported collateral tokens
  console.log("\n8. Configuring collateral tokens...");
  
  // Configure ETH (using WETH on Base)
  const WETH_ADDRESSES = {
    84532: "0x4200000000000000000000000000000000000006", // Base Sepolia WETH
    8453: "0x4200000000000000000000000000000000000006"   // Base WETH
  };
  
  const wethAddress = WETH_ADDRESSES[Number(network.chainId)];
  
  if (wethAddress) {
    try {
      await collateralManager.configureToken(
        wethAddress,
        11000, // 110% liquidation threshold
        500,   // 5% liquidation bonus
        8000,  // 80% max LTV
        ethers.ZeroAddress // Price feed (would need Chainlink oracle)
      );
      console.log("WETH configured as collateral");
    } catch (error) {
      console.log("Error configuring WETH:", error.message);
    }
  }

  // Configure USDC as collateral
  try {
    await collateralManager.configureToken(
      usdcAddress,
      11000, // 110% liquidation threshold
      300,   // 3% liquidation bonus
      9000,  // 90% max LTV
      ethers.ZeroAddress // Price feed
    );
    console.log("USDC configured as collateral");
  } catch (error) {
    console.log("Error configuring USDC:", error.message);
  }

  // Set initial token prices (in production, use Chainlink oracles)
  console.log("\n9. Setting up price oracle...");
  try {
    const PRICE_ORACLE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PRICE_ORACLE_ROLE"));
    await collateralManager.grantRole(PRICE_ORACLE_ROLE, deployer.address);
    
    if (wethAddress) {
      await collateralManager.updateTokenPrice(wethAddress, ethers.parseUnits("2500", 8)); // $2500
      console.log("Set WETH price to $2500");
    }
    await collateralManager.updateTokenPrice(usdcAddress, ethers.parseUnits("1", 8)); // $1
    console.log("Set USDC price to $1");
  } catch (error) {
    console.log("Error setting prices:", error.message);
  }

  console.log("\n✅ Deployment Summary:");
  console.log("======================");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("Deployer:", deployer.address);
  console.log("USDC Token:", usdcAddress);
  console.log("WETH Token:", wethAddress || "Not available");
  console.log("CollateralManager:", collateralManagerAddress);
  console.log("RiskEngine:", riskEngineAddress);
  console.log("LendingPool:", lendingPoolAddress);
  console.log("PaymentController:", paymentControllerAddress);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      USDC: usdcAddress,
      WETH: wethAddress,
      CollateralManager: collateralManagerAddress,
      RiskEngine: riskEngineAddress,
      LendingPool: lendingPoolAddress,
      PaymentController: paymentControllerAddress,
    }
  };

  // Write to file
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(deploymentsDir, `deployment-${network.chainId}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`\nDeployment info saved to deployments/deployment-${network.chainId}.json`);
  
  console.log("\n📝 Next Steps:");
  console.log("1. Verify contracts on Basescan");
  console.log("2. Update your .env file with contract addresses");
  console.log("3. Configure price oracles for production");
  console.log("4. Set up merchant accounts");
  console.log("5. Fund the lending pool");

  console.log("\n🔧 Contract Verification Commands:");
  console.log(`npx hardhat verify --network baseSepolia ${collateralManagerAddress}`);
  console.log(`npx hardhat verify --network baseSepolia ${riskEngineAddress} "${ethers.ZeroAddress}"`);
  console.log(`npx hardhat verify --network baseSepolia ${lendingPoolAddress} "${usdcAddress}" "${riskEngineAddress}" "${ethers.ZeroAddress}" "${collateralManagerAddress}"`);
  console.log(`npx hardhat verify --network baseSepolia ${paymentControllerAddress} "${usdcAddress}" "${lendingPoolAddress}" "${riskEngineAddress}" "${collateralManagerAddress}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });