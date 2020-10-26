pragma solidity ^0.6.6;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "./PriceProvider.sol";

contract PriceProviderChainLink is PriceProvider {

    AggregatorV3Interface public priceFeed;

    /**
     * @dev Constructor.
     * @param _manager Address of price manager.
     */

    constructor(address _priceFeed, address _manager) public PriceProvider("ChainLink", _manager, false) {
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    /**
     * @return Last ethereum price.
     */

    function lastPrice() public override view returns (uint32) {
        (,int price,,uint timeStamp,) = priceFeed.latestRoundData();
        require(timeStamp > 0, "Round not complete");
        return uint32(price / 1000000);
    }
}
