const TautrinoToken = artifacts.require("TautrinoToken");
const TautrinoGovernance = artifacts.require("TautrinoGovernance");

module.exports = async function (deployer, _network) {
  await deployer.deploy(TautrinoToken, "TAU");
  const tauTokenInstance = await TautrinoToken.deployed();
  const tauAddress = tauTokenInstance.address;

  await deployer.deploy(TautrinoToken, "TRINO");
  const trinoTokenInstance = await TautrinoToken.deployed();
  const trinoAddress = trinoTokenInstance.address;

  const delay = _network === "mainnet" ? 14 * 24 * 3600 : 0;
  await deployer.deploy(TautrinoGovernance, tauAddress, trinoAddress, delay);
  const tautrinoGovernanceInstance = await TautrinoGovernance.deployed();

  await tauTokenInstance.setGovernance(tautrinoGovernanceInstance.address);
  await trinoTokenInstance.setGovernance(tautrinoGovernanceInstance.address);
};
