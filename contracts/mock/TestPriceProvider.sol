pragma solidity 0.6.6;

import "../PriceProvider.sol";

// Fake provider for test

contract TestPriceProvider is PriceProvider {

    uint32 fakePrice;

    /**
     * @dev Constructor.
     * @param _manager Address of price manager.
     */

    constructor(uint32 _fakePrice, address _manager) public PriceProvider("FakeProvider", _manager, false) {
        fakePrice = _fakePrice;
    }

    /**
     * @return fake price.
     */

    function lastPrice() public override view returns (uint32) {
        return fakePrice;
    }
}
