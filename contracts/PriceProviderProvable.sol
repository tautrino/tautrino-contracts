pragma solidity ^0.6.8;

import "./provableAPI_0.6.sol";
import "./PriceProvider.sol";

interface PriceManagerInterface {
    function payProvableFee(uint _amount) external;
}

contract PriceProviderProvable is usingProvable, PriceProvider {

    uint64 private _lastUpdatedTime;
    uint32 private _lastPrice;
    string public apiUrl;

    /**
     * @dev Constructor.
     * @param _providerName Name of provider.
     * @param _apiUrl Url of api. ex. json(https://api.pro.coinbase.com/products/ETH-USD/ticker).price
     * @param _manager Address of price manager.
     */

    constructor(string memory _providerName, string memory _apiUrl, address _manager) public PriceProvider(_providerName, _manager, true) {
        apiUrl = _apiUrl;
    }

    /**
     * @return Last ethereum price.
     */

    function lastPrice() public override view returns (uint32) {
        return _lastPrice;
    }

    /**
     * @return Last price updated time.
     */

    function lastUpdatedTime() public override view returns (uint64) {
        return _lastUpdatedTime;
    }

    /**
     * @dev Callback with api result.
     * @param result Result of api.
     */

    function __callback(bytes32 myid, string memory result) public override {
        if (msg.sender != provable_cbAddress()) revert();
        _lastUpdatedTime = uint64(block.timestamp);
        _lastPrice = stringToUint(result);
    }

    /**
     * @dev Send api request to fetch price.
     */

    function fetchPrice() external {
        require(msg.sender == manager, "manager!");

        uint _requiredFee = provable_getPrice("URL");
        if (_requiredFee > address(this).balance) {
            uint _provableFee = _requiredFee + 0.5 ether;
            if (manager.balance < _requiredFee) {
                return;
            }
            if (manager.balance < _provableFee) {
                _provableFee = _requiredFee;
            }

            PriceManagerInterface(manager).payProvableFee(provable_getPrice("URL") + 0.5 ether);
        }

        provable_query(1 minutes, "URL", apiUrl);
    }

    /**
     * @dev Convert string number to uint256.
     * @param s String number.
     * @return uint256.
     */

    function stringToUint(string memory s) internal pure returns (uint32) {
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
}
