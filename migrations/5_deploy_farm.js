const TautrinoFarming = artifacts.require("TautrinoFarming");
const TautrinoRewardPool = artifacts.require("TautrinoRewardPool");

module.exports = async function (deployer, _network) {
  await deployer.deploy(TautrinoRewardPool);
  const tautrinoRewardPoolInstance = await TautrinoRewardPool.deployed();

  await deployer.deploy(TautrinoFarming, tautrinoRewardPoolInstance.address);
  const tautrinoFarmingInstance = await TautrinoFarming.deployed();
  await tautrinoRewardPoolInstance.setFarm(tautrinoFarmingInstance.address);
};
