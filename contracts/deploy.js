/**
 * Deploy script for MockAavePool + MockERC20 tokens on Hoodi testnet.
 *
 * Usage:
 *   PRIVATE_KEY=0x... node contracts/deploy.js
 *
 * Requires: npm install ethers@6 solc
 */

const { ethers } = require("ethers");
const solc = require("solc");
const fs = require("fs");
const path = require("path");

const RPC_URL = process.env.RPC_URL || "https://sepolia.drpc.org";

async function compile(contractName) {
  const contractPath = path.join(__dirname, `${contractName}.sol`);
  const source = fs.readFileSync(contractPath, "utf8");

  // Resolve imports
  const input = {
    language: "Solidity",
    sources: {},
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  // Add all .sol files in the directory
  const solFiles = fs.readdirSync(__dirname).filter((f) => f.endsWith(".sol"));
  for (const f of solFiles) {
    const content = fs.readFileSync(path.join(__dirname, f), "utf8");
    input.sources[`./${f}`] = { content };
  }

  const output = JSON.parse(
    solc.compile(JSON.stringify(input), {
      import: (importPath) => {
        const resolved = path.join(__dirname, importPath);
        if (fs.existsSync(resolved)) {
          return { contents: fs.readFileSync(resolved, "utf8") };
        }
        return { error: `File not found: ${importPath}` };
      },
    })
  );

  if (output.errors) {
    const errors = output.errors.filter((e) => e.severity === "error");
    if (errors.length > 0) {
      console.error("Compilation errors:", errors);
      process.exit(1);
    }
  }

  const contract =
    output.contracts[`./${contractName}.sol`][contractName];
  return {
    abi: contract.abi,
    bytecode: "0x" + contract.evm.bytecode.object,
  };
}

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("Set PRIVATE_KEY env variable");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("Deploying from:", wallet.address);
  console.log(
    "Balance:",
    ethers.formatEther(await provider.getBalance(wallet.address)),
    "ETH"
  );

  // 1. Deploy MockERC20 for WETH (18 decimals)
  console.log("\n--- Deploying MockWETH ---");
  const mockERC20 = await compile("MockERC20");
  const WETHFactory = new ethers.ContractFactory(
    mockERC20.abi,
    mockERC20.bytecode,
    wallet
  );
  const weth = await WETHFactory.deploy("Mock WETH", "WETH", 18);
  await weth.waitForDeployment();
  const wethAddr = await weth.getAddress();
  console.log("MockWETH deployed:", wethAddr);

  // 2. Deploy MockERC20 for USDC (6 decimals)
  console.log("\n--- Deploying MockUSDC ---");
  const USDCFactory = new ethers.ContractFactory(
    mockERC20.abi,
    mockERC20.bytecode,
    wallet
  );
  const usdc = await USDCFactory.deploy("Mock USDC", "USDC", 6);
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();
  console.log("MockUSDC deployed:", usdcAddr);

  // 3. Deploy MockAavePool
  console.log("\n--- Deploying MockAavePool ---");
  const mockPool = await compile("MockAavePool");
  const PoolFactory = new ethers.ContractFactory(
    mockPool.abi,
    mockPool.bytecode,
    wallet
  );
  const pool = await PoolFactory.deploy(wethAddr, usdcAddr);
  await pool.waitForDeployment();
  const poolAddr = await pool.getAddress();
  console.log("MockAavePool deployed:", poolAddr);

  // 4. Set pool as authorized minter on USDC (for borrow minting)
  console.log("\n--- Configuring permissions ---");
  const setPoolTx = await usdc.setPool(poolAddr);
  await setPoolTx.wait();
  console.log("USDC pool set to:", poolAddr);

  // 5. Mint some WETH to the deployer for testing
  const mintTx = await weth.mint(wallet.address, ethers.parseEther("10"));
  await mintTx.wait();
  console.log("Minted 10 WETH to deployer");

  // Summary
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log(`MockWETH:     ${wethAddr}`);
  console.log(`MockUSDC:     ${usdcAddr}`);
  console.log(`MockAavePool: ${poolAddr}`);
  console.log(`Chain:        Hoodi Testnet`);
  console.log(`RPC:          ${RPC_URL}`);
  console.log(`\nUpdate .env.local with:`);
  console.log(`MOCK_WETH_ADDRESS=${wethAddr}`);
  console.log(`MOCK_USDC_ADDRESS=${usdcAddr}`);
  console.log(`MOCK_POOL_ADDRESS=${poolAddr}`);
  console.log(`RPC_URL_URL=${RPC_URL}`);

  // Write addresses to file for the app to consume
  const addresses = {
    chain: "hoodi",
    rpc: RPC_URL,
    mockWETH: wethAddr,
    mockUSDC: usdcAddr,
    mockAavePool: poolAddr,
    deployer: wallet.address,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(__dirname, "deployed-addresses.json"),
    JSON.stringify(addresses, null, 2)
  );
  console.log("\nAddresses saved to contracts/deployed-addresses.json");
}

main().catch(console.error);
