const BN = require('bn.js');
const { catchRevert }  = require("./exceptionsHelpers.js");
const { expect } = require('chai');

const TautrinoFarming = artifacts.require('TautrinoFarming');
const TautrinoRewardPool = artifacts.require('TautrinoRewardPool');
const TestERC20 = artifacts.require('TestERC20');

const decimals = new BN('18');

contract('TautrinoFarming', async function (accounts) {
  let rewardToken;
  let lpToken;
  let tautrinoRewardPool;
  let tautrinoFarming;
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const initBalance = new BN('1000').mul(new BN('10').pow(decimals));
  const user1Lp = new BN('100').mul(new BN('10').pow(decimals));
  const user2Lp = new BN('50').mul(new BN('10').pow(decimals));
  const deposit1 = new BN('20').mul(new BN('10').pow(decimals));
  const deposit2 = new BN('50').mul(new BN('10').pow(decimals));
  let deposit1Epoch;
  let deposit2Epoch;
  const user1 = accounts[2];
  const user2 = accounts[3];
  const rewardPerShare = '500000000000';
  const rewardBalance = '100000000000000000000';
  const rewardAmount = '50000000000000000000';
  const remainBalance = '50000000000000000000';

  before(async function() {
    tautrinoRewardPool = await TautrinoRewardPool.new({ from: accounts[0] });
    tautrinoFarming = await TautrinoFarming.new(tautrinoRewardPool.address, { from: accounts[0] });
    rewardToken = await TestERC20.new("REWARD", initBalance, { from: accounts[0] });
    lpToken = await TestERC20.new("TESTLP", initBalance, { from: accounts[0] });
    await rewardToken.transfer(tautrinoRewardPool.address, initBalance, { from: accounts[0] });
    await lpToken.transfer(user1, user1Lp, { from: accounts[0] });
    await lpToken.transfer(user2, user2Lp, { from: accounts[0] });
    await tautrinoRewardPool.setFarm(tautrinoFarming.address, { from: accounts[0] })
    await lpToken.approve(tautrinoFarming.address, user1Lp, { from: user1 });
    await lpToken.approve(tautrinoFarming.address, user2Lp, { from: user2 });
  });

  describe('Ownership test', function() {
    it('owner', async function() {
      expect((await tautrinoFarming.owner()).toString()).to.equal(accounts[0]);
    });

    describe('transferOwnership', function() {
      it('should update owner', async function() {
        await tautrinoFarming.transferOwnership(accounts[1], { from: accounts[0]});
        expect((await tautrinoFarming.owner()).toString()).to.equal(accounts[1]);
      });

      it('revert to update owner by anonymous', async function() {
        await catchRevert(tautrinoFarming.transferOwnership(accounts[2], {from: accounts[0]}));
      });
    });
  });

  describe('add pool test', function() {
    it('revert adding pool by anonymous', async function() {
      await catchRevert(tautrinoFarming.add(lpToken.address, rewardToken.address, rewardPerShare, {from: accounts[0]}));
    });

    it('add pool by owner', async function() {
      await tautrinoFarming.add(lpToken.address, rewardToken.address, rewardPerShare, { from: accounts[1]});
      expect((await tautrinoFarming.poolLength()).toString()).to.equal("1");
      const pool = await tautrinoFarming.poolInfo(0);
      expect(pool.lpToken).to.equal(lpToken.address);
      expect(pool.rewardToken).to.equal(rewardToken.address);
      expect(pool.rewardPerShare.toString()).to.equal(rewardPerShare);
      expect(pool.totalRewardPaid.toString()).to.equal("0");
      expect(pool.rewardEndEpoch.toString()).to.equal("0");
      expect((await tautrinoFarming.tokenAdded(lpToken.address)).toString()).to.equal("true");
    });

    it('revert adding duplicated pool', async function() {
      await catchRevert(tautrinoFarming.add(lpToken.address, rewardToken.address, rewardPerShare, {from: accounts[1]}));
    });
  });

  describe('deposit test', function() {
    it('deposit', async function() {
      await tautrinoFarming.deposit("0", deposit1, { from: user1});
      expect((await lpToken.balanceOf(tautrinoFarming.address)).toString()).to.equal(deposit1.toString());
      expect((await lpToken.balanceOf(user1)).toString()).to.equal(user1Lp.sub(deposit1).toString());
      const userInfo = await tautrinoFarming.userInfo(0, user1);
      expect(userInfo.amount.toString()).to.equal(deposit1.toString());
      expect(userInfo.rewardDebt.toString()).to.equal("0");
    });
  });
});
