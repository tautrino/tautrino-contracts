const TautrinoFarm = artifacts.require("TautrinoFarm");
const TautrinoRewardPool = artifacts.require("TautrinoRewardPool");

module.exports = async function (deployer, _network) {
  await deployer.deploy(TautrinoRewardPool);
  const tautrinoRewardPoolInstance = await TautrinoRewardPool.deployed();

  await deployer.deploy(TautrinoFarm, tautrinoRewardPoolInstance.address);
};
