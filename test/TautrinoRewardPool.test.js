const { catchRevert }  = require("./exceptionsHelpers.js");
const { expect } = require('chai');

const TautrinoRewardPool = artifacts.require('TautrinoRewardPool');
const TautrinoToken = artifacts.require('TautrinoToken');

contract('TautrinoRewardPool', async function (accounts) {
  let erc20Token1;
  let erc20Token2;
  let tautrinoRewardPool;
  const rewardBalance = '100000000000000000000';
  const rewardAmount = '50000000000000000000';
  const remainBalance = '50000000000000000000';

  before(async function() {
    tautrinoRewardPool = await TautrinoRewardPool.new({ from: accounts[0] });
    erc20Token1 = await TautrinoToken.new("TAU", { from: accounts[0] });
    erc20Token2 = await TautrinoToken.new("TRINO", { from: accounts[0] });
    await erc20Token1.transfer(tautrinoRewardPool.address, rewardBalance);
    await erc20Token2.transfer(tautrinoRewardPool.address, rewardBalance);
  });

  describe('Ownership test', function() {
    it('owner', async function() {
      expect((await tautrinoRewardPool.owner()).toString()).to.equal(accounts[0]);
    });

    describe('transferOwnership', function() {
      it('should update owner', async function() {
        await tautrinoRewardPool.transferOwnership(accounts[1], { from: accounts[0]});
        expect((await tautrinoRewardPool.owner()).toString()).to.equal(accounts[1]);
      });

      it('revert to update owner by anonymous', async function() {
        await catchRevert(tautrinoRewardPool.transferOwnership(accounts[2], {from: accounts[0]}));
      });
    });
  });

  describe('setFarm test', function() {
    it('revert setting farming pool by anonymous', async function() {
      await catchRevert(tautrinoRewardPool.setFarm(accounts[0], {from: accounts[0]}));
    });

    it('setFarm by owner', async function() {
      await tautrinoRewardPool.setFarm(accounts[0], { from: accounts[1]});
      expect((await tautrinoRewardPool.farm()).toString()).to.equal(accounts[0]);
    });
  });

  describe('withdrawReward test', function() {
    it('revert withdrawing reward to user from by anonymous', async function() {
      await catchRevert(tautrinoRewardPool.withdrawReward(accounts[2], erc20Token1.address, rewardAmount, {from: accounts[2]}));
    });

    it('withdrawReward by farm', async function() {
      await tautrinoRewardPool.withdrawReward(accounts[2], erc20Token1.address, rewardAmount, { from: accounts[0]});
      expect((await erc20Token1.balanceOf(accounts[2])).toString()).to.equal(rewardAmount);
      expect((await erc20Token1.balanceOf(tautrinoRewardPool.address)).toString()).to.equal(remainBalance);
    });
  });

  describe('withdrawAllToken test', function() {
    it('revert withdrawing all token by anonymous', async function() {
      await catchRevert(tautrinoRewardPool.withdrawAllToken(erc20Token2.address, accounts[2], {from: accounts[0]}));
    });

    it('withdrawAllToken by owner', async function() {
      await tautrinoRewardPool.withdrawAllToken(erc20Token2.address, accounts[2], { from: accounts[1]});
      expect((await erc20Token2.balanceOf(tautrinoRewardPool.address)).toString()).to.equal("0");
      expect((await erc20Token2.balanceOf(accounts[2])).toString()).to.equal(rewardBalance);
    });
  });
});
