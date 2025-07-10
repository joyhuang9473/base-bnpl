const { ethers } = require("hardhat");

async function main() {
  try {
    const signers = await ethers.getSigners();
    
    if (signers.length === 0) {
      console.log("❌ No signers found. Check your PRIVATE_KEY in .env file");
      return;
    }
    
    const [deployer] = signers;
    console.log("✅ Wallet connected!");
    console.log("Address:", deployer.address);
    
    // Check balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");
    
    // Check network
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "ChainID:", network.chainId.toString());
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main();