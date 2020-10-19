const PriceManager = artifacts.require("PriceManager");
const PriceProviderProvable = artifacts.require("PriceProviderProvable");
const PriceProviderChainLink = artifacts.require("PriceProviderChainLink");

const providers = require("../priceProviders/providers.json");

module.exports = async function (deployer, _network) {
  const priceManagerInstance = await PriceManager.deployed();

  for (let i = 0; i < providers.length; i += 1) {
    await deployer.deploy(PriceProviderProvable, providers[i].name, providers[i].json, priceManagerInstance.address);
    const priceProviderProvableInstance = await PriceProviderProvable.deployed();
    await priceManagerInstance.addProvider(priceProviderProvableInstance.address);
  }

  const addresses = require("../addresses/" + _network + ".json");

  await deployer.deploy(PriceProviderChainLink, addresses.chainLinkPriceFeed, priceManagerInstance.address);
  const priceProviderChainLinkInstance = await PriceProviderChainLink.deployed();
  await priceManagerInstance.addProvider(priceProviderChainLinkInstance.address);
};
