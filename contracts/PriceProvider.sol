pragma solidity ^0.6.8;

import "./provableAPI_0.6.sol";

interface PriceManagerInterface {
    function payProvableFee(uint _amount) external;
}

contract PriceProvider is usingProvable {

    address public governance;
    address public manager;

    string public lastPriceString;
    string public apiUrl;
    string public providerName;

    uint32 public lastPrice;
    uint64 public lastUpdatedTime;
    uint8 public decimals = 2; // decimals of ethereum price

    /**
     * @dev Constructor.
     * @param _providerName Name of provider.
     * @param _apiUrl Url of api. ex. json(https://api.pro.coinbase.com/products/ETH-USD/ticker).price
     * @param _manager Address of price manager.
     */

    constructor(string memory _providerName, string memory _apiUrl, address _manager) public {
        governance = msg.sender;
        providerName = _providerName;
        apiUrl = _apiUrl;
        manager = _manager;
    }

    /**
     * @dev Set Price manager.
     * @param _manager Address of price manager.
     */

    function setManager(address _manager) external {
        require(msg.sender == governance, "governance!");
        manager = _manager;
    }

    /**
     * @dev Callback with api result.
     * @param result Result of api.
     */

    function __callback(bytes32 myid, string memory result) public override {
        if (msg.sender != provable_cbAddress()) revert();
        lastUpdatedTime = uint64(block.timestamp);
        lastPriceString = result;
        lastPrice = stringToUint(result);
    }

    /**
     * @dev Send api request to fetch price.
     */

    function fetchPrice() external {
        require(msg.sender == manager, "manager!");

        if (provable_getPrice("URL") > address(this).balance) {
            PriceManagerInterface(manager).payProvableFee(provable_getPrice("URL") + 0.5 ether);
        }

        provable_query(1 minutes, "URL", apiUrl);
    }

    /**
     * @dev Convert string number to uint256.
     * @param s String number.
     * @return uint256.
     */

    function stringToUint(string memory s) internal view returns (uint32) {
        bool _decimalDetected = false;
        uint8 _currentDecimals = 0;
        bytes memory b = bytes(s);
        uint32 result = 0;
        for (uint8 i = 0; i < b.length; i++) {
            if (b[i] >= 0x30 && b[i] <= 0x39) { // 0~9
                result = result * 10 + uint32(uint8(b[i]) - 0x30); // bytes and int are not compatible with the operator -.
                if (_decimalDetected) {
                    _currentDecimals += 1;
                    if (_currentDecimals >= decimals) {
                        break;
                    }
                }
            } else if (b[i] == 0x2C || b[i] == 0x2E) { // check if b[i] == '.' || b[i] == ','
                _decimalDetected = true;
                if (decimals == 0) {
                    break;
                }
            } else {
                result = 0;
                break;
            }
        }

        if (_currentDecimals < decimals) {
            result = uint32(result * 10**uint(decimals - _currentDecimals));
        }
        return result;
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
