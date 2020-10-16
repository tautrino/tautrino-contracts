const PriceManager = artifacts.require("PriceManager");
const Tautrino = artifacts.require("Tautrino");

module.exports = async function (deployer, _network) {
  const tautrinoInstance = await Tautrino.deployed();
  await deployer.deploy(PriceManager, tautrinoInstance.address);

  const priceManagerInstance = await PriceManager.deployed();
  await tautrinoInstance.setPriceManager(priceManagerInstance.address);
};
