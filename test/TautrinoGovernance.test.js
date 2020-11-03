const ethers = require('ethers');
const { catchRevert }  = require("./exceptionsHelpers.js");
const { expect } = require('chai');
require("./utils");

const TautrinoGovernance = artifacts.require('TautrinoGovernance');
const TautrinoToken = artifacts.require('TautrinoToken');
const PriceManager = artifacts.require('PriceManager');
const TestPriceProvider = artifacts.require('TestPriceProvider');

contract('TautrinoGovernance', async function (accounts) {
  const tauSymbol = "TAU";
  const trinoSymbol = "TRINO";
  const zeroAddress = '0x0000000000000000000000000000000000000000'

  let tauToken;
  let trinoToken;
  let tautrinoGovernance;
  let newTautrinoGovernance;
  let priceManager;
  let nextRebaseTime;
  let testPriceProvider1;
  let testPriceProvider2;
  let testPriceProvider3;
  let tauResult;
  let trinoResult;

  before(async function() {
    tauToken = await TautrinoToken.new(tauSymbol, { from: accounts[0] });
    trinoToken = await TautrinoToken.new(trinoSymbol, { from: accounts[0] });
    tautrinoGovernance = await TautrinoGovernance.new(tauToken.address, trinoToken.address);
    priceManager = await PriceManager.new(tautrinoGovernance.address);

    await tauToken.setGovernance(tautrinoGovernance.address, { from: accounts[0]});
    await trinoToken.setGovernance(tautrinoGovernance.address, { from: accounts[0]});
    
    testPriceProvider1 = await TestPriceProvider.new('41122', priceManager.address);
    testPriceProvider2 = await TestPriceProvider.new('31122', priceManager.address);
    testPriceProvider3 = await TestPriceProvider.new('111222', priceManager.address);

    await priceManager.addProvider(testPriceProvider1.address);
    await priceManager.addProvider(testPriceProvider2.address);
  });

  describe('Default values', function() {
    it('nextRebaseEpoch', async function() {
      const now = Date.now() / 1000;
      nextRebaseTime = now - now % 3600 + 3600 + 3600 * 24 * 14;
      expect((await tautrinoGovernance.nextRebaseEpoch()).toString()).to.equal(nextRebaseTime.toString());
    });

    it('lastRebaseEpoch', async function() {
      expect((await tautrinoGovernance.lastRebaseEpoch()).toString()).to.equal('0');
    });

    it('lastRebaseResult', async function() {
      const lastRebaseResult = await tautrinoGovernance.lastRebaseResult();
      expect(lastRebaseResult['0'].toString()).to.equal('0');
      expect(lastRebaseResult['1'].toString()).to.equal('0');
    });

    it('tauToken', async function() {
      expect((await tautrinoGovernance.tauToken()).toString()).to.equal(tauToken.address);
    });

    it('trinoToken', async function() {
      expect((await tautrinoGovernance.trinoToken()).toString()).to.equal(trinoToken.address);
    });
  });

  describe('PriceManager test', function() {
    it('priceManager', async function() {
      expect((await tautrinoGovernance.priceManager()).toString()).to.equal(zeroAddress);
    });

    it('revert to update priceManager from non-owner', async function() {
      await catchRevert(tautrinoGovernance.setPriceManager(priceManager.address, {from: accounts[1]}));
    });

    it('should update priceManager', async function() {
      await tautrinoGovernance.setPriceManager(priceManager.address, { from: accounts[0]});
      expect((await tautrinoGovernance.priceManager()).toString()).to.equal(priceManager.address);
      expect((await priceManager.tautrino()).toString()).to.equal(tautrinoGovernance.address);
    });
  });

  describe('RebaseOffset test', function() {
    it('rebaseOffset', async function() {
      expect((await tautrinoGovernance.rebaseOffset()).toString()).to.equal('180');
    });

    it('revert to update rebaseOffset from non-owner', async function() {
      await catchRevert(tautrinoGovernance.setRebaseOffset('240', {from: accounts[1]}));
    });

    it('should update rebaseOffset', async function() {
      tautrinoGovernance.setRebaseOffset('240', {from: accounts[0]});
      expect((await tautrinoGovernance.rebaseOffset()).toString()).to.equal('240');
    });
  });

  describe('Ownership test', function() {
    it('owner', async function() {
      expect((await tautrinoGovernance.owner()).toString()).to.equal(accounts[0]);
    });

    describe('transferOwnership', function() {
      it('should update owner', async function() {
        await tautrinoGovernance.transferOwnership(accounts[1], { from: accounts[0]});
        expect((await tautrinoGovernance.owner()).toString()).to.equal(accounts[1]);
      });

      it('revert to update owner from non-owner', async function() {
        await catchRevert(tautrinoGovernance.transferOwnership(accounts[2], {from: accounts[0]}));
      });
    })
  });
  
  describe('Rebase', function() {
    it('revert to rebase from non-owner', async function() {
      await catchRevert(tautrinoGovernance.rebase({from: accounts[0]}));
    });

    it('should rebase', async function() {
      const now = Math.trunc(Date.now() / 1000);
      await advanceTime(nextRebaseTime - now);
      const tx = await tautrinoGovernance.rebase({from: accounts[1]});
      const event = tx.logs.find(item => item.event === "LogRebase");
      expect(event).to.not.a('null');

      const ethPrice = Number("0x" + event.args.ethPrice);
      
      expect(event.args).to.satisfy((args) => {
        tauResult = args.tauResult.toString();
        const tauTotalSupply = args.tauTotalSupply.toString();
        trinoResult = args.trinoResult.toString();
        const trinoTotalSupply = args.trinoTotalSupply.toString();
        
        let even = 0;
        let odd = 0;
        let ethP = ethPrice;
        while (ethP > 0) {
          const last = ethP % 10;
          if (last % 2 === 0) {
            even += 1;
          } else {
            odd += 1;
          }
          ethP = ethP / 10;
        }
        if (even > odd) {
          return tauResult === "0" && tauTotalSupply === "600000000000000000000" && trinoResult === "1" && trinoTotalSupply === "300000000000000000000";
        } else {
          return tauResult === "1" && tauTotalSupply === "300000000000000000000" && trinoResult === "0" && trinoTotalSupply === "600000000000000000000";
        }
      });

      const lastAvgPrice = (await tautrinoGovernance.lastAvgPrice({from: accounts[1]})).toString();
      expect(lastAvgPrice).to.not.equal('0').to.equal(ethPrice);

      expect((await priceManager.lastPricesSize()).toString()).to.equal('2');
      expect((await priceManager.lastAvgPrice()).toString()).to.equal(lastAvgPrice);
    });

    it('revert to rebase when executed before next rebase time', async function() {
      await advanceTime(1800);
      await catchRevert(tautrinoGovernance.rebase({from: accounts[1]}));
    });

    it('should draw', async function() {
      await priceManager.removeProvider(0);
      await priceManager.removeProvider(0);
      await priceManager.addProvider(testPriceProvider3.address);
      await advanceTime(1800);
      const tx = await tautrinoGovernance.rebase({from: accounts[1]});
      const event = tx.logs.find(item => item.event === "LogRebase");
      expect(event).to.not.a('null');

      const ethPrice = Number("0x" + event.args.ethPrice);
      
      expect(event.args).to.satisfy((args) => {
        const tauDrawResult = args.tauResult.toString();
        const tauTotalSupply = args.tauTotalSupply.toString();
        const trinoDrawResult = args.trinoResult.toString();
        const trinoTotalSupply = args.trinoTotalSupply.toString();

        if (tauResult === "0") {
          return tauDrawResult === "2" && tauTotalSupply === "600000000000000000000" && trinoDrawResult === "2" && trinoTotalSupply === "300000000000000000000";
        } else {
          return tauDrawResult === "2" && tauTotalSupply === "300000000000000000000" && trinoDrawResult === "2" && trinoTotalSupply === "600000000000000000000";
        }
      });

      const lastAvgPrice = (await tautrinoGovernance.lastAvgPrice({from: accounts[1]})).toString();
      expect(lastAvgPrice).to.not.equal('0').to.equal(ethPrice);
      expect(lastAvgPrice).to.not.equal('0').to.equal(111222);
    });
  });

  describe('Governance migrate test', function() {
    it('migrate', async function() {
      newTautrinoGovernance = await TautrinoGovernance.new(tauToken.address, trinoToken.address);
      await tautrinoGovernance.migrateGovernance(newTautrinoGovernance.address, { from: accounts[1]});
      await newTautrinoGovernance.setPriceManager(priceManager.address, {from: accounts[0]});

      expect((await tauToken.governance()).toString()).to.equal(newTautrinoGovernance.address);
      expect((await trinoToken.governance()).toString()).to.equal(newTautrinoGovernance.address);
      expect((await priceManager.tautrino()).toString()).to.equal(newTautrinoGovernance.address);
    });
  });

  describe('Rebase after migrate', function() {
    it('revert to rebase from non-owner', async function() {
      await catchRevert(newTautrinoGovernance.rebase({from: accounts[1]}));
    });

    it('should rebase', async function() {
      await advanceTime(3600 * 24 * 14 + 3600);
      const tx = await newTautrinoGovernance.rebase({from: accounts[0]});
      const event = tx.logs.find(item => item.event === "LogRebase");
      expect(event).to.not.a('null');

      const ethPrice = Number("0x" + event.args.ethPrice);

      const lastAvgPrice = (await newTautrinoGovernance.lastAvgPrice({from: accounts[1]})).toString();
      expect(lastAvgPrice).to.not.equal('0').to.equal(ethPrice);

      // expect((await priceManager.lastPricesSize()).toString()).to.equal('2');
      expect((await priceManager.lastAvgPrice()).toString()).to.equal(lastAvgPrice);
    });

    it('revert to rebase when executed before next rebase time', async function() {
      await advanceTime(1800);
      await catchRevert(newTautrinoGovernance.rebase({from: accounts[1]}));
    });

    // it('should draw', async function() {
    //   await priceManager.removeProvider(0);
    //   await priceManager.removeProvider(0);
    //   await priceManager.addProvider(testPriceProvider3.address);
    //   await advanceTime(1800);
    //   const tx = await tautrinoGovernance.rebase({from: accounts[1]});
    //   const event = tx.logs.find(item => item.event === "LogRebase");
    //   expect(event).to.not.a('null');

    //   const ethPrice = Number("0x" + event.args.ethPrice);
      
    //   expect(event.args).to.satisfy((args) => {
    //     const tauDrawResult = args.tauResult.toString();
    //     const tauTotalSupply = args.tauTotalSupply.toString();
    //     const trinoDrawResult = args.trinoResult.toString();
    //     const trinoTotalSupply = args.trinoTotalSupply.toString();

    //     if (tauResult === "0") {
    //       return tauDrawResult === "2" && tauTotalSupply === "600000000000000000000" && trinoDrawResult === "2" && trinoTotalSupply === "300000000000000000000";
    //     } else {
    //       return tauDrawResult === "2" && tauTotalSupply === "300000000000000000000" && trinoDrawResult === "2" && trinoTotalSupply === "600000000000000000000";
    //     }
    //   });

    //   const lastAvgPrice = (await tautrinoGovernance.lastAvgPrice({from: accounts[1]})).toString();
    //   expect(lastAvgPrice).to.not.equal('0').to.equal(ethPrice);
    //   expect(lastAvgPrice).to.not.equal('0').to.equal(111222);
    // });
  });
});
