const { catchRevert }  = require("./exceptionsHelpers.js");
const { expect } = require('chai');

const TautrinoGovernance = artifacts.require('TautrinoGovernance');
const TautrinoToken = artifacts.require('TautrinoToken');

contract('TautrinoToken', async function (accounts) {
  const name = "Tautrino";
  const tauSymbol = "TAU";
  const decimals = '18';
  const initBalance = '300000000000000000000';
  const rebasedBalance = '600000000000000000000';
  const doubleRebasedBalance = '1200000000000000000000';

  let tauToken;
  let tautrinoGovernance;

  before(async function() {
    tauToken = await TautrinoToken.new(tauSymbol, { from: accounts[0] });
    tautrinoGovernance = await TautrinoGovernance.deployed();
  });

  describe('Default values', function() {
    it('Token name', async function() {
      expect(await tauToken.name()).to.equal(name);
    });

    it('Token symbol', async function() {
      expect(await tauToken.symbol()).to.equal(tauSymbol);
    });

    it('Token decimals', async function() {
      expect((await tauToken.decimals()).toString()).to.equal(decimals);
    });

    it('lastRebaseEpoch', async function() {
      expect((await tauToken.lastRebaseEpoch()).toString()).to.equal('0');
    });

    it('lastRebaseResult', async function() {
      expect((await tauToken.lastRebaseResult()).toString()).to.equal('0');
    });

    it('factor2', async function() {
      expect((await tauToken.factor2()).toString()).to.equal('0');
    });
  });
  
  describe('Governance test', function() {
    it('governance', async function() {
      expect((await tauToken.governance()).toString()).to.equal(accounts[0]);
    });

    describe('setGovernance', function() {
      it('should update governance', async function() {
        await tauToken.setGovernance(accounts[1], { from: accounts[0]});
        expect((await tauToken.governance()).toString()).to.equal(accounts[1]);
      });

      it('revert to update governance from by anonymous', async function() {
        await catchRevert(tauToken.setGovernance(accounts[2], {from: accounts[0]}));
      });
    });
  });

  describe('ERC20 test', function() {
    it('totalSupply', async function() {
      expect((await tauToken.totalSupply()).toString()).to.equal(initBalance);
    });

    it('balanceOf', async function() {
      expect((await tauToken.balanceOf(accounts[0])).toString()).to.equal(initBalance);
    });

    it('approve', async function() {
      await tauToken.approve(accounts[1], '100000000000000000000', { from: accounts[0] });
      expect((await tauToken.allowance(accounts[0], accounts[1])).toString()).to.equal('100000000000000000000');
    });

    it('increaseAllowance', async function() {
      await tauToken.increaseAllowance(accounts[1], '50000000000000000000', { from: accounts[0] });
      expect((await tauToken.allowance(accounts[0], accounts[1])).toString()).to.equal('150000000000000000000');
    });

    it('decreaseAllowance', async function() {
      await tauToken.decreaseAllowance(accounts[1], '100000000000000000000', { from: accounts[0] });
      expect((await tauToken.allowance(accounts[0], accounts[1])).toString()).to.equal('50000000000000000000');

      await tauToken.decreaseAllowance(accounts[1], '300000000000000000000', { from: accounts[0] });
      expect((await tauToken.allowance(accounts[0], accounts[1])).toString()).to.equal('0');
    });

    describe('transfer', function() {
      it('should success when sender has enough balance to transfer', async function() {
        await tauToken.transfer(accounts[1], '100000000000000000000', { from: accounts[0] });
        expect((await tauToken.balanceOf(accounts[0])).toString()).to.equal('200000000000000000000');
        expect((await tauToken.balanceOf(accounts[1])).toString()).to.equal('100000000000000000000');
        //Temp log test
      });

      it('should revert when sender has insufficient balance to transfer', async function() {
        await catchRevert(tauToken.transfer(accounts[1], '300000000000000000000'));
      });
    });

    describe('transferFrom', function() {
      it('should revert when spender did not get approved sufficient amount', async function() {
        await catchRevert(tauToken.transferFrom(accounts[1], accounts[2], '100000000000000000000', { from: accounts[0] }));
      });

      it('should success when spender got approved sufficient amount', async function() {
        await tauToken.approve(accounts[0], '100000000000000000000', { from: accounts[1] });
        await tauToken.transferFrom(accounts[1], accounts[2], '40000000000000000000', { from: accounts[0] });

        expect((await tauToken.balanceOf(accounts[1])).toString()).to.equal('60000000000000000000');
        expect((await tauToken.balanceOf(accounts[2])).toString()).to.equal('40000000000000000000');

        //TEMP log test
      });
    });
  });

  describe('rebase', function() {
    it('revert to rebase from by anonymous', async function() {
      await tauToken.setGovernance(accounts[1], { from: accounts[1]});
      await catchRevert(tauToken.rebase("0", {from: accounts[0]}));
    });

    it('should rebase', async function() {
      await tauToken.rebase("0", { from: accounts[1]});
      expect((await tauToken.totalSupply()).toString()).to.equal(rebasedBalance);
      expect((await tauToken.factor2()).toString()).to.equal('1');
      expect((await tauToken.balanceOf(accounts[1])).toString()).to.equal('120000000000000000000');
    });

    it('should debase', async function() {
      await tauToken.rebase("1", { from: accounts[1]});
      expect((await tauToken.totalSupply()).toString()).to.equal(initBalance);
      expect((await tauToken.factor2()).toString()).to.equal('0');
      expect((await tauToken.balanceOf(accounts[1])).toString()).to.equal('60000000000000000000');
    });

    it('should double rebase', async function() {
      await tauToken.rebase("0", { from: accounts[1]});
      await tauToken.rebase("0", { from: accounts[1]});
      expect((await tauToken.totalSupply()).toString()).to.equal(doubleRebasedBalance);
      expect((await tauToken.factor2()).toString()).to.equal('2');
      expect((await tauToken.balanceOf(accounts[1])).toString()).to.equal('240000000000000000000');
    });

    it('should keep balance for draw', async function() {
      await tauToken.rebase("2", { from: accounts[1]});
      expect((await tauToken.totalSupply()).toString()).to.equal(doubleRebasedBalance);
      expect((await tauToken.factor2()).toString()).to.equal('2');
      expect((await tauToken.balanceOf(accounts[1])).toString()).to.equal('240000000000000000000');
    });

    it('should debase', async function() {
      await tauToken.rebase("1", { from: accounts[1]});
      expect((await tauToken.totalSupply()).toString()).to.equal(initBalance);
      expect((await tauToken.factor2()).toString()).to.equal('0');
      expect((await tauToken.balanceOf(accounts[1])).toString()).to.equal('60000000000000000000');
    });
  });
});
