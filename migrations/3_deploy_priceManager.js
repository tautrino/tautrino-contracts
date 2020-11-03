const PriceManager = artifacts.require("PriceManager");
const TautrinoGovernance = artifacts.require("TautrinoGovernance");

module.exports = async function (deployer, _network) {
  const tautrinoGovernanceInstance = await TautrinoGovernance.deployed();
  await deployer.deploy(PriceManager, tautrinoGovernanceInstance.address);

  const priceManagerInstance = await PriceManager.deployed();
  await tautrinoGovernanceInstance.setPriceManager(priceManagerInstance.address);
};
