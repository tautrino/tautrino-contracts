const PriceManager = artifacts.require("PriceManager");
const PriceProviderChainLink = artifacts.require("PriceProviderChainLink");
const PriceProviderUniswap = artifacts.require("PriceProviderUniswap");

module.exports = async function (deployer, _network) {
  const priceManagerInstance = await PriceManager.deployed();

  if (! ["develop", "soliditycoverage"].includes(_network)) {
    const addresses = require("../addresses/" + _network + ".json");

    await deployer.deploy(PriceProviderChainLink, addresses.chainLinkPriceFeed, priceManagerInstance.address);
    const priceProviderChainLinkInstance = await PriceProviderChainLink.deployed();
    await priceManagerInstance.addProvider(priceProviderChainLinkInstance.address);

    await deployer.deploy(PriceProviderUniswap, priceManagerInstance.address, addresses.uniswapFactory, addresses.weth, addresses.usdc);
    const priceProviderUniswapInstance = await PriceProviderUniswap.deployed();
    await priceManagerInstance.addProvider(priceProviderUniswapInstance.address);

    await deployer.deploy(PriceProviderUniswap, priceManagerInstance.address, addresses.uniswapFactory, addresses.weth, addresses.dai);
    const priceProviderUniswapInstance2 = await PriceProviderUniswap.deployed();
    await priceManagerInstance.addProvider(priceProviderUniswapInstance2.address);
  }
};
