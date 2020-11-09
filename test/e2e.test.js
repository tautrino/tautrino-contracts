const BN = require('bn.js');
const truffleContract = require('@truffle/contract');

const { expectRevert, time } = require('@openzeppelin/test-helpers');

const TautrinoToken = artifacts.require("TautrinoToken");
const TautrinoGovernance = artifacts.require("TautrinoGovernance");
const PriceManager = artifacts.require("PriceManager");
const PriceProviderChainLink = artifacts.require("PriceProviderChainLink");
const PriceProviderUniswap = artifacts.require("PriceProviderUniswap");
const TestPriceProvider = artifacts.require("TestPriceProvider");
const TestChainLinkAggregator = artifacts.require("TestChainLinkAggregator");
const TestERC20 = artifacts.require("TestERC20");

const UniswapV2FactoryJson = require("@uniswap/v2-core/build/UniswapV2Factory");
const UniswapV2Router02Json = require("@uniswap/v2-periphery/build/UniswapV2Router02");
const UniswapV2PairJson = require("@uniswap/v2-core/build/UniswapV2Pair");

const UniswapV2Factory = truffleContract(UniswapV2FactoryJson);
const UniswapV2Router02 = truffleContract(UniswapV2Router02Json);
const UniswapV2Pair = truffleContract(UniswapV2PairJson);

UniswapV2Factory.setProvider(web3._provider);
UniswapV2Router02.setProvider(web3._provider);
UniswapV2Pair.setProvider(web3._provider);

const decimals = new BN('18');

contract('TautrinoToken', (accounts) => {
    let tautrinoGovernance;
    let tau;
    let trino;
    let priceManager;
    let deployer;

    before('Get contract references', async () => {
        tautrinoGovernance = await TautrinoGovernance.deployed();

        tau = await TautrinoToken.at(await tautrinoGovernance.tauToken());
        trino = await TautrinoToken.at(await tautrinoGovernance.trinoToken());

        priceManager = await tautrinoGovernance.priceManager();

        deployer = accounts[0];
    });

    it('Check TAU token basics', async () => {
        const totalSupply = new BN('300').mul(new BN('10').pow(decimals));

        assert.equal((await tau.totalSupply()).toString(), totalSupply.toString());
        assert.equal(await tau.name(), 'Tautrino');
        assert.equal(await tau.symbol(), 'TAU');
        assert.equal(await tau.decimals(), 18);
        assert.equal((await tau.balanceOf(deployer)).toString(), totalSupply);

        assert.equal(await tau.governance(), tautrinoGovernance.address);
        assert.equal(await tau.lastRebaseEpoch(), 0);
        assert.equal(await tau.lastRebaseResult(), 0);
        assert.equal(await tau.factor2(), 0);

        const transferBalance1 = new BN('20').mul(new BN('10').pow(decimals));
        const transferBalance2 = new BN('9').mul(new BN('10').pow(decimals));
        const allowance1 = new BN('10').mul(new BN('10').pow(decimals));

        await tau.transfer(accounts[2], transferBalance1, {from: deployer});
        assert.equal((await tau.balanceOf(accounts[2])).toString(), transferBalance1);

        await tau.approve(accounts[3], allowance1, {from: deployer});
        assert.equal((await tau.allowance(deployer, accounts[3])).toString(), allowance1);
        await tau.increaseAllowance(accounts[3], allowance1, {from: deployer});
        assert.equal((await tau.allowance(deployer, accounts[3])).toString(), allowance1.mul(new BN(2)));
        await tau.decreaseAllowance(accounts[3], allowance1, {from: deployer});
        assert.equal((await tau.allowance(deployer, accounts[3])).toString(), allowance1);

        await tau.transferFrom(deployer, accounts[4], transferBalance2, {from: accounts[3]});
        assert.equal((await tau.allowance(deployer, accounts[3])).toString(), allowance1.sub(transferBalance2));
        assert.equal((await tau.balanceOf(accounts[4])).toString(), transferBalance2);

        await trino.decreaseAllowance(accounts[3], allowance1, {from: deployer});
        assert.equal((await trino.allowance(deployer, accounts[3])).toString(), 0);
    });

    it('Check TRINO token basics', async () => {
        const totalSupply = new BN('300').mul(new BN('10').pow(decimals));

        assert.equal((await tau.totalSupply()).toString(), totalSupply.toString());
        assert.equal(await trino.name(), 'Tautrino');
        assert.equal(await trino.symbol(), 'TRINO');
        assert.equal(await trino.decimals(), 18);
        assert.equal((await trino.balanceOf(deployer)).toString(), totalSupply);

        assert.equal(await trino.governance(), tautrinoGovernance.address);
        assert.equal(await trino.lastRebaseEpoch(), 0);
        assert.equal(await trino.lastRebaseResult(), 0);
        assert.equal(await trino.factor2(), 0);

        const transferBalance1 = new BN('20').mul(new BN('10').pow(decimals));
        const transferBalance2 = new BN('9').mul(new BN('10').pow(decimals));
        const allowance1 = new BN('10').mul(new BN('10').pow(decimals));

        await trino.transfer(accounts[2], transferBalance1, {from: deployer});
        assert.equal((await trino.balanceOf(accounts[2])).toString(), transferBalance1);

        await trino.approve(accounts[3], allowance1, {from: deployer});
        assert.equal((await trino.allowance(deployer, accounts[3])).toString(), allowance1);
        await trino.increaseAllowance(accounts[3], allowance1, {from: deployer});
        assert.equal((await trino.allowance(deployer, accounts[3])).toString(), allowance1.mul(new BN(2)));
        await trino.decreaseAllowance(accounts[3], allowance1, {from: deployer});
        assert.equal((await trino.allowance(deployer, accounts[3])).toString(), allowance1);

        await trino.transferFrom(deployer, accounts[4], transferBalance2, {from: accounts[3]});
        assert.equal((await trino.allowance(deployer, accounts[3])).toString(), allowance1.sub(transferBalance2));
        assert.equal((await trino.balanceOf(accounts[4])).toString(), transferBalance2);

        await trino.decreaseAllowance(accounts[3], allowance1, {from: deployer});
        assert.equal((await trino.allowance(deployer, accounts[3])).toString(), 0);
    });
});

contract('PriceManager', (accounts) => {
    let priceManager;
    let deployer;

    before('Get contract references', async () => {
        priceManager = await PriceManager.deployed();

        deployer = accounts[0];
    });

    it('Check addPrimeNumber by anonymous', async () => {
        await expectRevert(
            priceManager.addPrimeNumber(101, {from: accounts[3]}),
            'Ownable: caller is not the owner'
        );
    });

    it('Check addPrimeNumber', async () => {
        await priceManager.addPrimeNumber(101, {from: deployer});

        assert.equal(await priceManager.primeNumbers(7), 101);
    });

    it('Check removePrimeNumber by anonymous', async () => {
        await expectRevert(
            priceManager.removePrimeNumber(7, {from: accounts[3]}),
            'Ownable: caller is not the owner'
        );
    });

    it('Check removePrimeNumber', async () => {
        await priceManager.removePrimeNumber(7, {from: deployer});

        await expectRevert(priceManager.primeNumbers(7), 'invalid opcode');

        await priceManager.removePrimeNumber(0, {from: deployer});
        await expectRevert(priceManager.primeNumbers(6), 'invalid opcode');
    });

    it('Check addProvider by anonymous', async () => {
        let priceProviderNoWin = await TestPriceProvider.new(1001, priceManager.address);

        await expectRevert(
            priceManager.addProvider(priceProviderNoWin.address, {from: accounts[3]}),
            'Ownable: caller is not the owner'
        );
    });

    it('Check addProvider', async () => {
        let priceProviderNoWin = await TestPriceProvider.new(1001, priceManager.address);

        await priceManager.addProvider(priceProviderNoWin.address, {from: deployer});
        await priceManager.addProvider(priceProviderNoWin.address, {from: deployer});

        assert.equal(await priceManager.providers(0), priceProviderNoWin.address);
        assert.equal(await priceManager.providers(1), priceProviderNoWin.address);

        assert.equal(await priceManager.providerSize(), 2);
    });

    it('Check removeProvider by anonymous', async () => {
        await expectRevert(
            priceManager.removeProvider(1, {from: accounts[3]}),
            'Ownable: caller is not the owner'
        );
    });

    it('Check removeProvider', async () => {
        let priceProviderNoWin = await TestPriceProvider.new(1001, priceManager.address);

        await priceManager.removeProvider(0, {from: deployer});
        await priceManager.removeProvider(0, {from: deployer});

        assert.equal(await priceManager.providerSize(), 0);
    });
});

contract('PriceProvider', (accounts) => {
    let deployer;

    before('Get contract references', async () => {
        deployer = accounts[0];
    });

    it('Check setManager by anonymous', async () => {
        let priceProviderNoWin = await TestPriceProvider.new(1001, accounts[4]);

        await expectRevert(
            priceProviderNoWin.setManager(accounts[4], {from: accounts[3]}),
            'Ownable: caller is not the owner'
        );
    });

    it('Check setManager', async () => {
        let priceProviderNoWin = await TestPriceProvider.new(1001, accounts[4]);

        assert.equal(await priceProviderNoWin.manager(), accounts[4]);

        priceProviderNoWin.setManager(accounts[3], { from: deployer });
        assert.equal(await priceProviderNoWin.manager(), accounts[3]);
    });
});

contract('PriceProviderChainLink', (accounts) => {
    let deployer;
    let priceProviderChainLink;
    let testChainLinkAggregator;

    before('Get contract references', async () => {
        deployer = accounts[0];

        testChainLinkAggregator = await TestChainLinkAggregator.new(1001 * 1000000);
        priceProviderChainLink = await PriceProviderChainLink.new(testChainLinkAggregator.address, accounts[4]);
    });

    it('Check lastPrice by anonymous', async () => {
        assert.equal(await priceProviderChainLink.lastPrice(), 1001);
    });
});

contract('PriceProviderUniswap', (accounts) => {
    let deployer;
    let priceProviderUniswap1;
    let priceProviderUniswap2;
    let uniswapV2Factory;
    let uniswapV2Router02;

    let uniswapV2Pair1;
    let uniswapV2Pair2;

    let weth;
    let stableToken;
    let stableToken2;

    let wethAmount;
    let stableTokenAmount;

    before('Get contract references', async () => {
        deployer = accounts[0];

        stableToken = await TestERC20.new('Token', web3.utils.toWei(
            new BN('10000').mul(new BN(10).pow(new BN(18)))
        ), { from: deployer });

        while(true) {
            weth = await TestERC20.new('WETH', web3.utils.toWei(
                new BN('10000').mul(new BN(10).pow(new BN(18)))
            ), { from: deployer });

            if (new BN(weth.address, 16).gt(new BN(stableToken.address, 16))) {
                break;
            }
        }

        while(true) {
            stableToken2 = await TestERC20.new('Token', web3.utils.toWei(
                new BN('10000').mul(new BN(10).pow(new BN(18)))
            ), { from: deployer });

            if (new BN(stableToken2.address, 16).gt(new BN(weth.address, 16))) {
                break;
            }
        }

        uniswapV2Factory = await UniswapV2Factory.new(deployer, { from: deployer });
        uniswapV2Router02 = await UniswapV2Router02.new(uniswapV2Factory.address, weth.address, { from: deployer });

        let result = await uniswapV2Factory.createPair(weth.address, stableToken.address, {
            from: deployer
        });

        let result2 = await uniswapV2Factory.createPair(stableToken2.address, weth.address, {
            from: deployer
        });

        uniswapV2Pair1 = await UniswapV2Pair.at(
            result.logs[0].args.pair
        );

        uniswapV2Pair2 = await UniswapV2Pair.at(
            result2.logs[0].args.pair
        );

        wethAmount = new BN(5).mul(new BN(10).pow(new BN(18)));
        stableTokenAmount = new BN(10).mul(new BN(10).pow(new BN(18)));

        await weth.approve(uniswapV2Router02.address, wethAmount.mul(new BN(2)), {from: deployer});
        await stableToken.approve(uniswapV2Router02.address, stableTokenAmount, {from: deployer});
        await stableToken2.approve(uniswapV2Router02.address, stableTokenAmount, {from: deployer});

        const deadline = (await web3.eth.getBlock('latest')).timestamp + 10000;

        await uniswapV2Router02.addLiquidity(
            weth.address,
            stableToken.address,
            wethAmount,
            stableTokenAmount,
            '0',
            '0',
            deployer,
            deadline,
            { from: deployer }
        );

        await uniswapV2Router02.addLiquidity(
            weth.address,
            stableToken2.address,
            wethAmount,
            stableTokenAmount,
            '0',
            '0',
            deployer,
            deadline,
            { from: deployer }
        );

        priceProviderUniswap1 = await PriceProviderUniswap.new(deployer, uniswapV2Factory.address, weth.address, stableToken.address);
        priceProviderUniswap2 = await PriceProviderUniswap.new(deployer, uniswapV2Factory.address, weth.address, stableToken2.address);
    });

    it('Check values', async () => {
        assert.equal(await priceProviderUniswap1.pair(), uniswapV2Pair1.address);
        assert.equal(await priceProviderUniswap1.stableToken(), stableToken.address);

        assert.equal(await priceProviderUniswap2.pair(), uniswapV2Pair2.address);
        assert.equal(await priceProviderUniswap2.stableToken(), stableToken2.address);
    });

    it('Check update by anonymous', async() => {
       await expectRevert(priceProviderUniswap1.update({from: accounts[3]}), 'manager!');
       await expectRevert(priceProviderUniswap2.update({from: accounts[3]}), 'manager!');
    });

    it('Check lastPrice by anonymous 1', async () => {
        await time.increase(1);

        await priceProviderUniswap1.update({from: deployer});

        expect((await priceProviderUniswap1.lastPrice()).toString()).to.eq('200');

        await time.increase(24 * 3600);

        await priceProviderUniswap1.update({from: deployer});

        expect((await priceProviderUniswap1.lastPrice()).toString()).to.eq('200');
    });

    it('Check lastPrice by anonymous 2', async () => {
        await time.increase(1);

        await priceProviderUniswap2.update({from: deployer});

        expect((await priceProviderUniswap2.lastPrice()).toString()).to.eq('200');

        await time.increase(24 * 3600);

        await priceProviderUniswap2.update({from: deployer});

        expect((await priceProviderUniswap2.lastPrice()).toString()).to.eq('200');
    });
});

contract('TautrinoGovernance', (accounts) => {
    let tautrinoGovernance;
    let tau;
    let trino;
    let priceManager;
    let deployer;
    let priceProviderNoWin;
    let priceProviderTauWin;
    let priceProviderTrinoWin;

    before('Get contract references', async () => {
        tautrinoGovernance = await TautrinoGovernance.deployed();

        tau = await TautrinoToken.at(await tautrinoGovernance.tauToken());
        trino = await TautrinoToken.at(await tautrinoGovernance.trinoToken());

        priceManager = await PriceManager.at(await tautrinoGovernance.priceManager());

        priceProviderNoWin = await TestPriceProvider.new(1001, priceManager.address);
        priceProviderTauWin = await TestPriceProvider.new(1000, priceManager.address);
        priceProviderTrinoWin = await TestPriceProvider.new(1110, priceManager.address);

        deployer = accounts[0];
    });

    it('Check TautrinoGovernance', async () => {
        assert.equal(await tautrinoGovernance.tauToken(), tau.address);
        assert.equal(await tautrinoGovernance.trinoToken(), trino.address);
        assert.equal(await tautrinoGovernance.priceManager(), priceManager.address);

        assert.equal(await tautrinoGovernance.lastAvgPrice(), 0);
        assert.equal(await tautrinoGovernance.lastRebaseEpoch(), 0);

        const lastRebaseResult = await tautrinoGovernance.lastRebaseResult();
        assert.equal(lastRebaseResult[0], 0);
        assert.equal(lastRebaseResult[1], 0);
    });

    it('Check rebase', async () => {
        await expectRevert(tautrinoGovernance.rebase({from: deployer}), 'Not ready to rebase!');

        await time.increaseTo(
            (await tautrinoGovernance.nextRebaseEpoch()).add(await tautrinoGovernance.rebaseOffset())
        );

        await expectRevert(tautrinoGovernance.rebase(), 'No providers');

        priceManager.addProvider(priceProviderNoWin.address);

        await tautrinoGovernance.rebase();

        let lastRebaseResult = await tautrinoGovernance.lastRebaseResult();
        assert.equal(lastRebaseResult[0], 2);
        assert.equal(lastRebaseResult[1], 2);

        assert.equal(await tau.factor2(), 0);
        assert.equal(await trino.factor2(), 0);

        await priceManager.removeProvider(0);
        await priceManager.addProvider(priceProviderTauWin.address);

        await time.increaseTo(
            (await tautrinoGovernance.nextRebaseEpoch()).add(await tautrinoGovernance.rebaseOffset())
        );

        await tautrinoGovernance.rebase();

        lastRebaseResult = await tautrinoGovernance.lastRebaseResult();
        assert.equal(lastRebaseResult[0], 0);
        assert.equal(lastRebaseResult[1], 1);

        assert.equal(await tau.factor2(), 1);
        assert.equal(await trino.factor2(), 0);

        const totalSupply = new BN('300').mul(new BN('10').pow(decimals));

        assert.equal((await tau.totalSupply()).toString(), totalSupply.mul(new BN(2)).toString());
        assert.equal((await trino.totalSupply()).toString(), totalSupply.toString());

        await time.increaseTo(
            (await tautrinoGovernance.nextRebaseEpoch()).add(await tautrinoGovernance.rebaseOffset())
        );

        await tautrinoGovernance.rebase();

        lastRebaseResult = await tautrinoGovernance.lastRebaseResult();
        assert.equal(lastRebaseResult[0], 0);
        assert.equal(lastRebaseResult[1], 1);

        assert.equal(await tau.factor2(), 2);
        assert.equal(await trino.factor2(), 0);

        assert.equal((await tau.totalSupply()).toString(), totalSupply.mul(new BN(4)).toString());
        assert.equal((await trino.totalSupply()).toString(), totalSupply.toString());

        await priceManager.removeProvider(0);
        await priceManager.addProvider(priceProviderTrinoWin.address);


        await time.increaseTo(
            (await tautrinoGovernance.nextRebaseEpoch()).add(await tautrinoGovernance.rebaseOffset())
        );

        await tautrinoGovernance.rebase();

        lastRebaseResult = await tautrinoGovernance.lastRebaseResult();
        assert.equal(lastRebaseResult[0], 1);
        assert.equal(lastRebaseResult[1], 0);

        assert.equal(await tau.factor2(), 0);
        assert.equal(await trino.factor2(), 1);

        assert.equal((await tau.totalSupply()).toString(), totalSupply.toString());
        assert.equal((await trino.totalSupply()).toString(), totalSupply.mul(new BN(2)).toString());

        assert.equal(await priceManager.lastPricesSize(), 1);
    });

    it('Check setRebaseOffset by anonymous', async () => {
        await expectRevert(
            tautrinoGovernance.setRebaseOffset(3600, {from: accounts[2]}),
            'Ownable: caller is not the owner'
        );
    });

    it('Check setRebaseOffset', async () => {
        await tautrinoGovernance.setRebaseOffset(3600, {from: deployer});
        assert.equal((await tautrinoGovernance.rebaseOffset()).toString(), 3600);
    });

    it('Check setPriceManager by anonymous', async () => {
        await expectRevert(
            tautrinoGovernance.setPriceManager(accounts[4], {from: accounts[2]}),
            'Ownable: caller is not the owner'
        );
    });

    it('Check setPriceManager', async () => {
        await tautrinoGovernance.setPriceManager(accounts[4], {from: deployer});
        assert.equal(await tautrinoGovernance.priceManager(), accounts[4]);
        await tautrinoGovernance.setPriceManager(priceManager.address, {from: deployer});
    });

    it('Check migrateGovernance by anonymous', async () => {
        await expectRevert(
            tautrinoGovernance.migrateGovernance(accounts[4], {from: accounts[3]}),
            'Ownable: caller is not the owner'
        );
    });

    it('Check migrateGovernance', async () => {
        assert.equal(await priceManager.tautrino(), tautrinoGovernance.address);

        await tautrinoGovernance.migrateGovernance(accounts[4], {from: deployer});

        assert.equal(await tau.governance(), accounts[4]);
        assert.equal(await trino.governance(), accounts[4]);
        assert.equal(await priceManager.tautrino(), accounts[4]);
    });

});
