const {ethers} = require("ethers");
const HDWalletProvider = require("@truffle/hdwallet-provider");

const infuraUri = process.env.INFURA_URI; // "wss://mainnet.infura.io/ws/v3/<--key-->";
const privKey = process.env.PRIVATE_KEY; // "0x....."
const etherscanApiKey = process.env.ETHER_API_KEY;

module.exports = {
  networks: {
    mainnet: {
      networkCheckTimeout: 10000,
      provider: () => new HDWalletProvider(privKey, infuraUri),
      network_id: 1,
      gasPrice: ethers.utils.parseUnits("130", "gwei").toString(),
    },
    kovan: {
      networkCheckTimeout: 10000,
      provider: () => new HDWalletProvider(privKey, infuraUri),
      network_id: 42,
      // gasPrice: ethers.utils.parseUnits("41", "gwei").toString(),
      // gas: 1700000
    },
    test: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
    },
  },
  compilers: {
    solc: {
      version: "0.6.6",    // Fetch exact version from solc-bin (default: truffle's version)
      // settings: {
      //   optimizer: {
      //     enabled: true,
      //     runs: 999999
      //   }
      // }
    },
  },
  plugins: [
    'truffle-plugin-verify'
  ],
  api_keys: {
    etherscan: etherscanApiKey
  }
};
