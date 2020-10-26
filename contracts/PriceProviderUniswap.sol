pragma solidity ^0.6.6;

import './PriceProvider.sol';
import './ERC20Detailed.sol';
import './uniswap/FixedPoint.sol';
import './uniswap/IUniswapV2Pair.sol';
import './uniswap/UniswapV2OracleLibrary.sol';
import './uniswap/UniswapV2Library.sol';

contract PriceProviderUniswap is PriceProvider {

    using FixedPoint for *;
    using SafeMath for uint;

    IUniswapV2Pair public immutable pair;

    address immutable weth;
    address public immutable stableToken;

    uint priceCumulativeLast;
    uint price1CumulativeLast;
    uint32 blockTimestampLast;
    bool wethIsToken0;
    FixedPoint.uq112x112 priceAverage;

    /**
     * @dev Constructor.
     * @param _manager Address of price manager.
     */

    constructor(address _manager, address _factory, address _weth, address _stableToken) public PriceProvider("Uniswap", _manager, true) {
        IUniswapV2Pair _pair = IUniswapV2Pair(UniswapV2Library.pairFor(_factory, _weth, _stableToken));
        pair = _pair;
        weth = _weth;
        if (_weth == _pair.token0()) {
            wethIsToken0 = true;
        } else {
            wethIsToken0 = false;
        }
        stableToken = _stableToken;

        if (wethIsToken0 == true) {
            priceCumulativeLast = _pair.price0CumulativeLast();
        } else {
            priceCumulativeLast = _pair.price1CumulativeLast();
        }

        (,,blockTimestampLast) = _pair.getReserves();
    }

    function update() external {
        require(msg.sender == manager, "manager!");
        (uint price0Cumulative, uint price1Cumulative, uint32 blockTimestamp) =
            UniswapV2OracleLibrary.currentCumulativePrices(address(pair));
        uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired

        // overflow is desired, casting never truncates
        // cumulative price is in (uq112x112 price * seconds) units so we simply wrap it after division by time elapsed
        if (wethIsToken0 == true) {
            priceAverage = FixedPoint.uq112x112(uint224((price0Cumulative - priceCumulativeLast) / timeElapsed));
            priceCumulativeLast = price0Cumulative;
        } else {
            priceAverage = FixedPoint.uq112x112(uint224((price1Cumulative - priceCumulativeLast) / timeElapsed));
            priceCumulativeLast = price1Cumulative;
        }

        blockTimestampLast = blockTimestamp;
    }

    /**
     * @return Last ethereum price.
     */

    function lastPrice() public override view returns (uint32) {
        uint amountOut = priceAverage.mul(1 ether).decode144();
        uint32 price = uint32(amountOut.div(10 ** uint(ERC20Detailed(stableToken).decimals() - decimals)));
        return price;
    }
}
