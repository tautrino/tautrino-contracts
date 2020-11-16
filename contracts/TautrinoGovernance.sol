pragma solidity 0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./RebaseResult.sol";
import "./interfaces/ITautrinoToken.sol";

interface IPriceManager {
    function averagePrice() external returns (uint32);
    function lastAvgPrice() external view returns (uint32);
    function setTautrino(address _tautrino) external;
}

contract TautrinoGovernance is Ownable {

    event LogRebase(uint64 epoch, uint32 ethPrice, RebaseResult tauResult, uint tauTotalSupply, RebaseResult trinoResult, uint trinoTotalSupply);

    uint64 public constant REBASE_CYCLE = 1 hours;

    ITautrinoToken public tauToken;
    ITautrinoToken public trinoToken;

    IPriceManager public priceManager;

    RebaseResult private _lastTauRebaseResult;
    RebaseResult private _lastTrinoRebaseResult;

	uint64 private _nextRebaseEpoch;
	uint64 private _lastRebaseEpoch;

    uint64 public rebaseOffset = 3 minutes;

    /**
     * @dev Constructor.
     * @param _tauToken The address of TAU token.
     * @param _trinoToken The address of TRINO token.
     */

    constructor(address _tauToken, address _trinoToken, uint64 _delay) public Ownable() {
        tauToken = ITautrinoToken(_tauToken);
        trinoToken = ITautrinoToken(_trinoToken);
        _nextRebaseEpoch = uint64(block.timestamp - block.timestamp % 3600) + REBASE_CYCLE + _delay;
    }

    /**
     * @dev Update rebase offset.
     * @param _rebaseOffset new rebase offset.
     */

    function setRebaseOffset(uint64 _rebaseOffset) external onlyOwner {
        rebaseOffset = _rebaseOffset;
    }

    /**
     * @dev Rebase TAU and TRINO tokens.
     */

    function rebase() external onlyOwner {
        require(_nextRebaseEpoch <= uint64(block.timestamp) + rebaseOffset, "Not ready to rebase!");

        uint32 _ethPrice = priceManager.averagePrice();
        uint32 _number = _ethPrice;

        uint8 _even = 0;
        uint8 _odd = 0;

        while (_number > 0) {
            if (_number % 2 == 1) {
                _odd += 1;
            } else {
                _even += 1;
            }
            _number /= 10;
        }

        if (_even > _odd) {
            // double balance
            _lastTauRebaseResult = RebaseResult.Double;
            _lastTrinoRebaseResult = RebaseResult.Park;
        } else if (_even < _odd) {
            // park balance
            _lastTauRebaseResult = RebaseResult.Park;
            _lastTrinoRebaseResult = RebaseResult.Double;
        } else {
            _lastTauRebaseResult = RebaseResult.Draw;
            _lastTrinoRebaseResult = RebaseResult.Draw;
        }

        _lastRebaseEpoch = uint64(block.timestamp);
        _nextRebaseEpoch = _nextRebaseEpoch + 1 hours;
        if (_nextRebaseEpoch <= _lastRebaseEpoch) {
            _nextRebaseEpoch = uint64(block.timestamp - block.timestamp % 3600) + REBASE_CYCLE;
        }

        uint _tauTotalSupply = tauToken.rebase(_lastTauRebaseResult);
        uint _trinoTotalSupply = trinoToken.rebase(_lastTrinoRebaseResult);

        emit LogRebase(_lastRebaseEpoch, _ethPrice, _lastTauRebaseResult, _tauTotalSupply, _lastTrinoRebaseResult, _trinoTotalSupply);
    }

    /**
     * @return Price of eth used for last rebasing.
     */

    function lastAvgPrice() public view returns (uint32) {
        return priceManager.lastAvgPrice();
    }

    /**
     * @return Next rebase epoch.
     */

    function nextRebaseEpoch() public view returns (uint64) {
        return _nextRebaseEpoch;
    }

    /**
     * @return Last rebase epoch.
     */

    function lastRebaseEpoch() public view returns (uint64) {
        return _lastRebaseEpoch;
    }

    /**
     * @return Last rebase result.
     */

    function lastRebaseResult() public view returns (RebaseResult, RebaseResult) {
        return (_lastTauRebaseResult, _lastTrinoRebaseResult);
    }

    /**
     * @dev Migrate governance.
     * @param _newGovernance new TautrinoGovernance address.
     */

    function migrateGovernance(address _newGovernance) external onlyOwner {
        require(_newGovernance != address(0), "invalid governance");
        tauToken.setGovernance(_newGovernance);
        trinoToken.setGovernance(_newGovernance);

        if (address(priceManager) != address(0)) {
            priceManager.setTautrino(_newGovernance);
        }
    }

    /**
     * @dev Update price manager.
     * @param _priceManager The address of new price manager.
     */

    function setPriceManager(address _priceManager) external onlyOwner {
        priceManager = IPriceManager(_priceManager);
    }
}
