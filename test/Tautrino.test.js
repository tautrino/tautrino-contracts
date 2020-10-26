const { catchRevert }  = require("./exceptionsHelpers.js");
const { expect } = require('chai');
require("./utils");

const Tautrino = artifacts.require('Tautrino');
const TautrinoToken = artifacts.require('TautrinoToken');
const PriceManager = artifacts.require('PriceManager');
const PriceProviderChainLink = artifacts.require('PriceProviderChainLink');

contract('Tautrino', async function (accounts) {
  const tauSymbol = "TAU";
  const trinoSymbol = "TRINO";
  const zeroAddress = '0x0000000000000000000000000000000000000000'

  let tauToken;
  let trinoToken;
  let tautrino;
  let priceManager;
  let nextRebaseTime;

  before(async function() {
    tauToken = await TautrinoToken.new(tauSymbol, { from: accounts[0] });
    trinoToken = await TautrinoToken.new(trinoSymbol, { from: accounts[0] });
    tautrino = await Tautrino.new(tauToken.address, trinoToken.address);
    priceManager = await PriceManager.new(tautrino.address);

    await tauToken.setTautrino(tautrino.address, { from: accounts[0]});
    await trinoToken.setTautrino(tautrino.address, { from: accounts[0]});

    priceProviderChainLink = await PriceProviderChainLink.new("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", priceManager.address);
  });

  describe('Default values', function() {
    it('nextRebaseEpoch', async function() {
      const now = Date.now() / 1000;
      nextRebaseTime = now - now % 3600 + 3600;
      expect((await tautrino.nextRebaseEpoch()).toString()).to.equal(nextRebaseTime.toString());
    });

    it('lastRebaseEpoch', async function() {
      expect((await tautrino.lastRebaseEpoch()).toString()).to.equal('0');
    });

    it('lastRebaseResult', async function() {
      const lastRebaseResult = await tautrino.lastRebaseResult();
      expect(lastRebaseResult['0'].toString()).to.equal('0');
      expect(lastRebaseResult['1'].toString()).to.equal('0');
    });

    it('tauToken', async function() {
      expect((await tautrino.tauToken()).toString()).to.equal(tauToken.address);
    });

    it('trinoToken', async function() {
      expect((await tautrino.trinoToken()).toString()).to.equal(trinoToken.address);
    });
  });

  describe('PriceManager test', function() {
    it('priceManager', async function() {
      expect((await tautrino.priceManager()).toString()).to.equal(zeroAddress);
    });

    it('revert to update priceManager from non-owner', async function() {
      await catchRevert(tautrino.setPriceManager(priceManager.address, {from: accounts[1]}));
    });

    it('should update priceManager', async function() {
      await tautrino.setPriceManager(priceManager.address, { from: accounts[0]});
      expect((await tautrino.priceManager()).toString()).to.equal(priceManager.address);
    });
  });

  describe('RebaseOffset test', function() {
    it('rebaseOffset', async function() {
      expect((await tautrino.rebaseOffset()).toString()).to.equal('180');
    });

    it('revert to update rebaseOffset from non-owner', async function() {
      await catchRevert(tautrino.setRebaseOffset('240', {from: accounts[1]}));
    });

    it('should update rebaseOffset', async function() {
      tautrino.setRebaseOffset('240', {from: accounts[0]});
      expect((await tautrino.rebaseOffset()).toString()).to.equal('240');
    });
  });

  describe('Ownership test', function() {
    it('owner', async function() {
      expect((await tautrino.owner()).toString()).to.equal(accounts[0]);
    });

    describe('transferOwnership', function() {
      it('should update owner', async function() {
        await tautrino.transferOwnership(accounts[1], { from: accounts[0]});
        expect((await tautrino.owner()).toString()).to.equal(accounts[1]);
      });

      it('revert to update owner from non-owner', async function() {
        await catchRevert(tautrino.transferOwnership(accounts[2], {from: accounts[0]}));
      });
    })
  });

  // describe('Rebase', function() {
  //   it('revert to rebase from non-owner', async function() {
  //     await catchRevert(tautrino.rebase({from: accounts[0]}));
  //   });

  //   it('revert to rebase when executed before next rebase time', async function() {
  //     await catchRevert(tautrino.rebase({from: accounts[1]}));
  //   });

  //   it('should rebase', async function() {
  //     const now = Date.now() / 1000;
  //     await advanceTime(nextRebaseTime - now);
  //     await tautrino.rebase({from: accounts[1]});
      
  //     const lastPrice = (await priceManager.averagePrice({from: accounts[1]})).toString()
  //     expect(lastPrice).to.not.equal('0');

  //     expect((await priceManager.lastPricesSize()).toString()).to.equal('1');
  //     expect((await priceManager.lastAvgPrice()).toString()).to.equal(lastPrice);
  //   });
  // });
});
