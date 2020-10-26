const { catchRevert }  = require("./exceptionsHelpers.js");
const { expect } = require('chai');

const Tautrino = artifacts.require('Tautrino');
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
    tautrino = await Tautrino.new(tauToken.address, trinoToken.address);

    await tauToken.setTautrino(tautrino.address, { from: accounts[0]});
    await trinoToken.setTautrino(tautrino.address, { from: accounts[0]});
    
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

      it('revert to update owner from non-owner', async function() {
        await catchRevert(priceManager.transferOwnership(accounts[2], {from: accounts[0]}));
      });
    })
  });

  describe('Tautrino test', function() {
    it('tautrino', async function() {
      expect((await priceManager.tautrino()).toString()).to.equal(accounts[1]);
    });

    describe('setTautrino', function() {
      it('revert to update tautrino from non-owner', async function() {
        await catchRevert(priceManager.setTautrino(accounts[2], {from: accounts[0]}));
      });

      it('should update tautrino', async function() {
        await priceManager.setTautrino(accounts[2], { from: accounts[1]});
        expect((await priceManager.tautrino()).toString()).to.equal(accounts[2]);
      });
    })
  });

  describe('addProvider', function() {
    it('providerSize', async function() {
      expect((await priceManager.providerSize()).toString()).to.equal('0');
    });

    it('revert to add provider from non-owner', async function() {
      await catchRevert(priceManager.addProvider(priceProviderChainLink.address, {from: accounts[0]}));
    });

    it('should add provider', async function() {
      await priceManager.addProvider(priceProviderChainLink.address, {from: accounts[1]})
      expect((await priceManager.providerSize()).toString()).to.equal('1');
    });
  });

  describe('removeProvider', function() {
    it('revert to remove provider from non-owner', async function() {
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
