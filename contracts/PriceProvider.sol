pragma solidity ^0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PriceProvider is Ownable {

    address public manager;

    string public providerName;

    uint8 public constant decimals = 2; // decimals of ethereum price
    bool public isProvable;

    /**
     * @dev Constructor.
     * @param _providerName Name of provider.
     * @param _manager Address of price manager.
     */

    constructor(string memory _providerName, address _manager, bool _isProvable) public Ownable() {
        providerName = _providerName;
        manager = _manager;
        isProvable = _isProvable;
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

    function lastPrice() public virtual view returns (uint32) {
        return 0;
    }

    /**
     * @return Last price updated time.
     */

    function lastUpdatedTime() public virtual view returns (uint64) {
        return uint64(block.timestamp);
    }

    /**
     * @dev Withdraw all eth balance to price manager. Used to migrate to another price provider.
     */

    function withdraw() external {
        require(msg.sender == manager, "manager!");
        payable(manager).transfer(address(this).balance);
    }

    /**
     * @dev Receive Ether function.
     */

    receive() external payable {
    }
}
