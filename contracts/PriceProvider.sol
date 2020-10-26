pragma solidity ^0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract PriceProvider is Ownable {

    address public manager;

    string public providerName;

    uint8 public constant decimals = 2; // decimals of ethereum price
    bool public updateRequred;

    /**
     * @dev Constructor.
     * @param _providerName Name of provider.
     * @param _manager Address of price manager.
     */

    constructor(string memory _providerName, address _manager, bool _updateRequred) public Ownable() {
        providerName = _providerName;
        manager = _manager;
        updateRequred = _updateRequred;
    }

    /**
     * @dev Set Price manager.
     * @param _manager Address of price manager.
     */

    function setManager(address _manager) external onlyOwner {
        manager = _manager;
    }

    /**
     * @return Last ethereum price.
     */

    function lastPrice() public virtual view returns (uint32);
}
