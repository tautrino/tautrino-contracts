const { catchRevert }  = require("./exceptionsHelpers.js");
const { expect } = require('chai');

const Tautrino = artifacts.require('Tautrino');
const TautrinoToken = artifacts.require('TautrinoToken');
const PriceManager = artifacts.require('PriceManager');
const PriceProvider = artifacts.require('PriceProvider');

contract('TautrinoToken', async function (accounts) {
  const name = "Tautrino";
  const tauSymbol = "TAU";
  const trinoSymbol = "TRINO";
  const decimals = '18';
  const initBalance = '300000000000000000000'

  let tauToken;
  let trinoToken;

  describe('Tautrino Tokens', async function () {    
    before(async function() {
      tauToken = await TautrinoToken.new(tauSymbol, { from: accounts[0] });
    });

    it('Basic information', async function() {
      expect(await tauToken.name()).to.equal(name);
      expect(await tauToken.symbol()).to.equal(tauSymbol);
      expect((await tauToken.decimals()).toString()).to.equal(decimals);
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
  
        it('revert to update governance from non-governance', async function() {
          await catchRevert(tauToken.setGovernance(accounts[2], {from: accounts[0]}));
        });
      })
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
  });
});
