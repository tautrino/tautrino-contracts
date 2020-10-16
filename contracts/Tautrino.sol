pragma solidity ^0.6.8;

enum RebaseResult { Win, Lose, Draw }

interface IPriceManager {
    function averagePrice() external returns (uint32);
    function lastAvgPrice() external view returns (uint32);
    function updatePrice() external;
}

interface ITautrinoToken {
    function rebase(RebaseResult result) external returns (uint);
}

contract Tautrino {

    event LogRebase(uint64 indexed epoch, uint32 ethPrice, RebaseResult tauResult, uint tauTotalSupply, RebaseResult trinoResult, uint trinoTotalSupply);

    uint64 public constant REBASE_CYCLE = 1 hours;

    address public governance;

    ITautrinoToken public tauToken;
    ITautrinoToken public trinoToken;

    IPriceManager public priceManager;

    RebaseResult private _lastTauRebaseResult;
    RebaseResult private _lastTrinoRebaseResult;

	uint64 private _nextRebaseEpoch;
	uint64 private _lastRebaseEpoch = 0;

    // Since block.timestamp has small differece with human timestamp, we added rebaseOffset
    uint64 public rebaseOffset = 3 minutes;

    /**
     * @dev Constructor.
     * @param _tauToken The address of TAU token.
     * @param _trinoToken The address of TRINO token.
     */

    constructor(address _tauToken, address _trinoToken) public {
        governance = msg.sender;
        tauToken = ITautrinoToken(_tauToken);
        trinoToken = ITautrinoToken(_trinoToken);
        _nextRebaseEpoch = uint64(block.timestamp % 2**64 - block.timestamp % 3600) + REBASE_CYCLE;
    }

    /**
     * @dev Set governance.
     * @param _governance The address of new governance.
     */

    function setGovernance(address _governance) external {
        require(msg.sender == governance, "Must be governance!");
        governance = _governance;
    }

    /**
     * @dev Update price manager.
     * @param _priceManager The address of new price manager.
     */

    function setPriceManager(address _priceManager) external {
        require(msg.sender == governance, "Must be governance!");
        priceManager = IPriceManager(_priceManager);
    }

    /**
     * @dev Update rebase offset.
     * @param _rebaseOffset new rebase offset.
     */

    function setRebaseOffset(uint64 _rebaseOffset) external {
        require(msg.sender == governance, "Must be governance!");
        rebaseOffset = _rebaseOffset;
    }

    /**
     * @dev Prepare rebase - update price of price manager.
     */

    function prepareRebase() external {
        require(msg.sender == governance, "Must be governance!");
        priceManager.updatePrice();
    }

    /**
     * @dev Rebase TAU and TRINO tokens.
     */

    function rebase() external {
        require(msg.sender == governance, "Must be governance!");
        require(_nextRebaseEpoch <= uint64(block.timestamp % 2**64) + rebaseOffset, "Not ready to rebase!");

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
            // positive win
            _lastTauRebaseResult = RebaseResult.Win;
            _lastTrinoRebaseResult = RebaseResult.Lose;
        } else if (_even < _odd) {
            // negative loss
            _lastTauRebaseResult = RebaseResult.Lose;
            _lastTrinoRebaseResult = RebaseResult.Win;
        } else {
            _lastTauRebaseResult = RebaseResult.Draw;
            _lastTrinoRebaseResult = RebaseResult.Draw;
        }

        _lastRebaseEpoch = uint64(block.timestamp % 2**64);
        _nextRebaseEpoch = _nextRebaseEpoch + 1 hours;

        uint _tauTotalSupply = tauToken.rebase(_lastTauRebaseResult);
        uint _trinoTotalSupply = trinoToken.rebase(_lastTrinoRebaseResult);

        emit LogRebase(_lastRebaseEpoch, _ethPrice, _lastTauRebaseResult, _tauTotalSupply, _lastTrinoRebaseResult, _trinoTotalSupply);
    }

    /**
     * @return Price of eth which used for last rebasing.
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
}
