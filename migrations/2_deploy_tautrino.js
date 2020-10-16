const TautrinoToken = artifacts.require("TautrinoToken");
const Tautrino = artifacts.require("Tautrino");

module.exports = async function (deployer, _network) {
  await deployer.deploy(TautrinoToken, "TAU");
  const tauTokenInstance = await TautrinoToken.deployed();
  const tauAddress = tauTokenInstance.address;

  await deployer.deploy(TautrinoToken, "TRINO");
  const trinoTokenInstance = await TautrinoToken.deployed();
  const trinoAddress = trinoTokenInstance.address;

  await deployer.deploy(Tautrino, tauAddress, trinoAddress);
  const tautrinoInstance = await Tautrino.deployed();

  await tauTokenInstance.setTautrino(tautrinoInstance.address);
  await trinoTokenInstance.setTautrino(tautrinoInstance.address);
};
