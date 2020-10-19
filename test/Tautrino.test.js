const { catchRevert }  = require("./exceptionsHelpers.js");
const { expect } = require('chai');

const Tautrino = artifacts.require('Tautrino');
const TautrinoToken = artifacts.require('TautrinoToken');
const PriceManager = artifacts.require('PriceManager');
const PriceProvider = artifacts.require('PriceProvider');

contract('Tautrino', async function (accounts) {
  const tauSymbol = "TAU";
  const trinoSymbol = "TRINO";
  const zeroAddress = '0x0000000000000000000000000000000000000000'

  let tauToken;
  let trinoToken;
  let tautrino;
  let priceManager;

  before(async function() {
    tauToken = await TautrinoToken.new(tauSymbol, { from: accounts[0] });
    trinoToken = await TautrinoToken.new(trinoSymbol, { from: accounts[0] });
    tautrino = await Tautrino.new(tauToken.address, trinoToken.address);
    priceManager = await PriceManager.new(tautrino.address);

    await tauToken.setTautrino(tautrino.address, { from: accounts[0]});
    await trinoToken.setTautrino(tautrino.address, { from: accounts[0]});
  });

  describe('Default values', function() {
    it('nextRebaseEpoch', async function() {
      const now = Date.now() / 1000;
      const nextRebase = now - now % 3600 + 3600;
      expect((await tautrino.nextRebaseEpoch()).toString()).to.equal(nextRebase.toString());
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

    it('revert to update priceManager from non-governance', async function() {
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

    it('revert to update rebaseOffset from non-governance', async function() {
      await catchRevert(tautrino.setRebaseOffset('240', {from: accounts[1]}));
    });

    it('should update rebaseOffset', async function() {
      tautrino.setRebaseOffset('240', {from: accounts[0]});
      expect((await tautrino.rebaseOffset()).toString()).to.equal('240');
    });
  });
});
