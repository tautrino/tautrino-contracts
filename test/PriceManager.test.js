const { catchRevert }  = require("./exceptionsHelpers.js");
const { expect } = require('chai');

const TautrinoGovernance = artifacts.require('TautrinoGovernance');
const TautrinoToken = artifacts.require('TautrinoToken');
const PriceManager = artifacts.require('PriceManager');
const PriceProviderChainLink = artifacts.require('PriceProviderChainLink');

contract('PriceManager', async function (accounts) {
  const tauSymbol = "TAU";
  const trinoSymbol = "TRINO";

  let priceManager;
  let priceProviderChainLink;

  before(async function() {
    tauToken = await TautrinoToken.new(tauSymbol, { from: accounts[0] });
    trinoToken = await TautrinoToken.new(trinoSymbol, { from: accounts[0] });
    tautrinoGovernance = await TautrinoGovernance.new(tauToken.address, trinoToken.address, 14 * 24 * 3600);

    await tauToken.setGovernance(tautrinoGovernance.address, { from: accounts[0]});
    await trinoToken.setGovernance(tautrinoGovernance.address, { from: accounts[0]});
    
    priceManager = await PriceManager.new(accounts[1]);
    priceProviderChainLink = await PriceProviderChainLink.new("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", priceManager.address);
  });

  describe('Default values', function() {
    it('lastPricesSize', async function() {
      expect((await priceManager.lastPricesSize()).toString()).to.equal('0');
    });

    it('lastAvgPrice', async function() {
      expect((await priceManager.lastAvgPrice()).toString()).to.equal('0');
    });
  });

  describe('Ownership test', function() {
    it('owner', async function() {
      expect((await priceManager.owner()).toString()).to.equal(accounts[0]);
    });

    describe('transferOwnership', function() {
      it('should update owner', async function() {
        await priceManager.transferOwnership(accounts[1], { from: accounts[0]});
        expect((await priceManager.owner()).toString()).to.equal(accounts[1]);
      });

      it('revert to update owner by anonymous', async function() {
        await catchRevert(priceManager.transferOwnership(accounts[2], {from: accounts[0]}));
      });
    });
  });

  describe('TautrinoGovernance test', function() {
    it('tautrinoGovernance', async function() {
      expect((await priceManager.tautrino()).toString()).to.equal(accounts[1]);
    });

    describe('setTautrino', function() {
      it('revert to update tautrinoGovernance by anonymous', async function() {
        await catchRevert(priceManager.setTautrino(accounts[2], {from: accounts[0]}));
      });

      it('should update tautrinoGovernance', async function() {
        await priceManager.setTautrino(accounts[2], { from: accounts[1]});
        expect((await priceManager.tautrino()).toString()).to.equal(accounts[2]);
      });
    });
  });

  describe('addProvider', function() {
    it('providerSize', async function() {
      expect((await priceManager.providerSize()).toString()).to.equal('0');
    });

    it('revert to add provider by anonymous', async function() {
      await catchRevert(priceManager.addProvider(priceProviderChainLink.address, {from: accounts[0]}));
    });

    it('should add provider', async function() {
      await priceManager.addProvider(priceProviderChainLink.address, {from: accounts[1]});
      expect((await priceManager.providerSize()).toString()).to.equal('1');
    });
  });

  describe('removeProvider', function() {
    it('revert to remove provider by anonymous', async function() {
      await catchRevert(priceManager.removeProvider(0, {from: accounts[0]}));
    });

    it('should remove provider', async function() {
      await priceManager.removeProvider(0, {from: accounts[1]})
      expect((await priceManager.providerSize()).toString()).to.equal('0');
    });

    it('revert to remove provider when no provider exists', async function() {
      await catchRevert(priceManager.removeProvider(0, {from: accounts[1]}));
    });
  });
});
