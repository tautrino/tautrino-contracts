const ethers = require('ethers');
const { catchRevert }  = require("./exceptionsHelpers.js");
const { expect } = require('chai');
require("./utils");

const Tautrino = artifacts.require('Tautrino');
const TautrinoToken = artifacts.require('TautrinoToken');
const PriceManager = artifacts.require('PriceManager');
const TestPriceProvider = artifacts.require('TestPriceProvider');

contract('Tautrino', async function (accounts) {
  const tauSymbol = "TAU";
  const trinoSymbol = "TRINO";
  const zeroAddress = '0x0000000000000000000000000000000000000000'

  let tauToken;
  let trinoToken;
  let tautrino;
  let priceManager;
  let nextRebaseTime;
  let testPriceProvider1;
  let testPriceProvider2;

  before(async function() {
    tauToken = await TautrinoToken.new(tauSymbol, { from: accounts[0] });
    trinoToken = await TautrinoToken.new(trinoSymbol, { from: accounts[0] });
    tautrino = await Tautrino.new(tauToken.address, trinoToken.address);
    priceManager = await PriceManager.new(tautrino.address);

    await tauToken.setTautrino(tautrino.address, { from: accounts[0]});
    await trinoToken.setTautrino(tautrino.address, { from: accounts[0]});

    testPriceProvider1 = await TestPriceProvider.new('41122', priceManager.address);
    testPriceProvider2 = await TestPriceProvider.new('31122', priceManager.address);

    await priceManager.addProvider(testPriceProvider1.address);
    await priceManager.addProvider(testPriceProvider2.address);
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

  describe('Rebase', function() {
    it('revert to rebase from non-owner', async function() {
      await catchRevert(tautrino.rebase({from: accounts[0]}));
    });

    it('should rebase', async function() {
      const now = Math.trunc(Date.now() / 1000);
      await advanceTime(nextRebaseTime - now);
      const tx = await tautrino.rebase({from: accounts[1]});
      const event = tx.logs.find(item => item.event === "LogRebase");
      expect(event).to.not.a('null');

      const ethPrice = Number("0x" + event.args.ethPrice);
      
      expect(event.args).to.satisfy((args) => {
        const tauResult = args.tauResult.toString();
        const tauTotalSupply = args.tauTotalSupply.toString();
        const trinoResult = args.trinoResult.toString();
        const trinoTotalSupply = args.trinoTotalSupply.toString();

        if (tauResult === "0") {
          return tauTotalSupply === "600000000000000000000" && trinoResult === "1" && trinoTotalSupply === "300000000000000000000";
        } else {
          return tauResult === "1" && tauTotalSupply === "300000000000000000000" && trinoResult === "0" && trinoTotalSupply === "600000000000000000000";
        }
      });

      const lastAvgPrice = (await tautrino.lastAvgPrice({from: accounts[1]})).toString();
      expect(lastAvgPrice).to.not.equal('0').to.equal(ethPrice);

      expect((await priceManager.lastPricesSize()).toString()).to.equal('2');
      expect((await priceManager.lastAvgPrice()).toString()).to.equal(lastAvgPrice);
    });

    it('revert to rebase when executed before next rebase time', async function() {
      await advanceTime(1800);
      await catchRevert(tautrino.rebase({from: accounts[1]}));
    });
  });
});
