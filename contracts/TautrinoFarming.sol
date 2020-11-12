pragma solidity 0.6.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ITautrinoRewardPool {
    function withdrawReward(address _to, address _token, uint256 _amount) external;
}

contract TautrinoFarming is Ownable {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    ITautrinoRewardPool public rewardPool;

    struct UserInfo {
        uint256 amount;     // How many LP tokens the user has provided.
        uint256 rewardDebt; // Total reward distributed.
    }

    struct PoolInfo {
        IERC20 lpToken;                                     // Address of LP token contract.
        address rewardToken;                                 // Address of reward token.
        mapping (address => uint256) userLastRewardEpoch;   // last reward epoch of user in this pool.
        uint256 rewardPerShare;                             // Reward per share, times 1e12. See below.
        uint256 totalRewardPaid;                            // Total reward paid in this pool.
        uint256 rewardEndEpoch;                             // Pool farming reward end timestamp. 0: no end
    }

    PoolInfo[] public poolInfo;
    mapping (address => bool) public tokenAdded;

    mapping (uint256 => mapping (address => UserInfo)) public userInfo;

    event onDeposit(address indexed user, uint256 indexed pid, uint256 amount);
    event onWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event onClaimReward(address indexed user, uint256 indexed pid, uint256 reward);

    /**
     * @dev Constructor.
     * @param _rewardPool reward pool address.
     */

    constructor(ITautrinoRewardPool _rewardPool) public Ownable() {
        rewardPool = _rewardPool;
    }

    /**
     * @return return pool length.
     */

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    /**
     * @dev add new pool. must be called by owner
     * @param _lpToken lpToken for farming.
     * @param _rewardToken reward token by farming.
     * @param _rewardPerShare reward per lp share.
     */

    function add(address _lpToken, address _rewardToken, uint256 _rewardPerShare) public onlyOwner {
        require(tokenAdded[_lpToken] == false, "already exist!");
        poolInfo.push(PoolInfo({
            lpToken: IERC20(_lpToken),
            rewardToken: _rewardToken,
            rewardPerShare: _rewardPerShare,
            totalRewardPaid: 0,
            rewardEndEpoch: 0
        }));
        tokenAdded[_lpToken] = true;
    }

    /**
     * @dev update rewardPerShare of pool. must be called by owner
     * @param _pid id of pool.
     * @param _rewardPerShare new reward per lp share. 0 - no update
     * @param _rewardEndEpoch reward end epoch. 0 - no update
     */

    function set(uint256 _pid, uint256 _rewardPerShare, uint256 _rewardEndEpoch) public onlyOwner {
        if (_rewardPerShare > 0) {
            poolInfo[_pid].rewardPerShare = _rewardPerShare;
        }
        if (_rewardEndEpoch > 0) {
            poolInfo[_pid].rewardEndEpoch = _rewardEndEpoch;
        }
    }

    /**
     * @dev pending reward of user in the pool.
     * @param _pid id of pool.
     * @param _user user address.
     * @return pending reward amount.
     */

    function pendingReward(uint256 _pid, address _user) public view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];

        uint256 lastRewardEpoch = pool.userLastRewardEpoch[_user];
        uint rewardEndEpoch = block.timestamp;
        if (pool.rewardEndEpoch > 0 && pool.rewardEndEpoch < block.timestamp) {
            rewardEndEpoch = pool.rewardEndEpoch;
        }
        if (rewardEndEpoch > lastRewardEpoch) {
            return user.amount.mul(pool.rewardPerShare).div(1e12).mul(rewardEndEpoch - lastRewardEpoch);
        }
        return 0;
    }

    /**
     * @dev deposit lp token.
     * @param _pid id of pool.
     * @param _amount lp amount.
     */

    function deposit(uint256 _pid, uint256 _amount) external {
        PoolInfo storage pool = poolInfo[_pid];
        require(pool.rewardEndEpoch == 0 || pool.rewardEndEpoch > block.timestamp, "paused!");

        UserInfo storage user = userInfo[_pid][msg.sender];

        _claimReward(_pid, msg.sender);

        if(_amount > 0) {
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            user.amount = user.amount.add(_amount);
        }

        emit onDeposit(msg.sender, _pid, _amount);
    }

    /**
     * @dev withdraw lp token.
     * @param _pid id of pool.
     * @param _amount lp amount.
     */

    function withdraw(uint256 _pid, uint256 _amount) external {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "insufficient!");

        _claimReward(_pid, msg.sender);

        if(_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.lpToken.safeTransfer(address(msg.sender), _amount);
        }
        emit onWithdraw(msg.sender, _pid, _amount);
    }

    /**
     * @dev claim pending reward.
     * @param _pid id of pool.
     */

    function claimReward(uint256 _pid) external {
        _claimReward(_pid, msg.sender);
    }

    /**
     * @dev claim pending reward to user - internal method.
     * @param _pid id of pool.
     * @param _user user address.
     */

    function _claimReward(uint256 _pid, address _user) internal {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];

        uint256 reward = pendingReward(_pid, _user);

        if (reward > 0) {
            rewardPool.withdrawReward(_user, pool.rewardToken, reward);
            user.rewardDebt = user.rewardDebt.add(reward);
            pool.totalRewardPaid = pool.totalRewardPaid.add(reward);
            emit onClaimReward(_user, _pid, reward);
        }
        pool.userLastRewardEpoch[_user] = block.timestamp;
    }

    /**
     * @dev last reward timestamp of user.
     * @param _pid id of pool.
     * @param _user user address.
     */

    function userLastRewardEpoch(uint256 _pid, address _user) external view returns (uint256) {
        return poolInfo[_pid].userLastRewardEpoch[_user];
    }

    /**
     * @dev set reward pool. must be called by owner
     * @param _rewardPool new reward pool address.
     */

    function setRewardPool(ITautrinoRewardPool _rewardPool) public onlyOwner {
        rewardPool = _rewardPool;
    }
}
