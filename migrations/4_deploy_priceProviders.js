const PriceManager = artifacts.require("PriceManager");
const PriceProvider = artifacts.require("PriceProvider");

const providers = require("../priceProviders/providers.json");

module.exports = async function (deployer, _network) {
  const priceManagerInstance = await PriceManager.deployed();

  for (let i = 0; i < providers.length; i += 1) {
    await deployer.deploy(PriceProvider, providers[i].name, providers[i].json, priceManagerInstance.address);
    const priceProviderInstance = await PriceProvider.deployed();
    await priceManagerInstance.addProvider(priceProviderInstance.address);
  }
};
