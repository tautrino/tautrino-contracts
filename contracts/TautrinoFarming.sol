pragma solidity 0.6.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ITautrinoToken.sol";

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
        address rewardToken;                                // Address of reward token - TAU or TRINO.
        mapping (address => uint256) userLastRewardEpoch;   // last reward epoch of user in this pool.
        uint256 rewardPerShare;                             // Reward per share, times 1e12. See below.
        uint256 totalRewardPaid;                            // Total reward paid in this pool.
        uint256 deposits;                                   // Current deposited amount.
        uint256 rewardEndEpoch;                             // Pool farming reward end timestamp. 0: no end
    }

    PoolInfo[] _poolInfo;
    mapping (address => bool) public tokenAdded;
    mapping (uint256 => mapping (address => UserInfo)) _userInfo;

    event onDeposit(address indexed user, uint256 indexed pid, uint256 amount);
    event onWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event onClaimReward(address indexed user, uint256 indexed pid, uint256 reward, uint256 baseReward);

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
        return _poolInfo.length;
    }

    /**
     * @dev add new pool. must be called by owner
     * @param _lpToken lpToken for farming.
     * @param _rewardToken reward token by farming.
     * @param _rewardPerShare reward per lp share.
     */

    function add(address _lpToken, address _rewardToken, uint256 _rewardPerShare) external onlyOwner {
        require(tokenAdded[_lpToken] == false, "already exist!");
        _poolInfo.push(PoolInfo({
            lpToken: IERC20(_lpToken),
            rewardToken: _rewardToken,
            rewardPerShare: _rewardPerShare,
            totalRewardPaid: 0,
            deposits: 0,
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

    function set(uint256 _pid, uint256 _rewardPerShare, uint256 _rewardEndEpoch) external onlyOwner {
        if (_rewardPerShare > 0) {
            _poolInfo[_pid].rewardPerShare = _rewardPerShare;
        }
        if (_rewardEndEpoch > 0) {
            _poolInfo[_pid].rewardEndEpoch = _rewardEndEpoch;
        }
    }

    /**
     * @dev pending reward of user in the pool.
     * @param _pid id of pool.
     * @param _user user address.
     * @return pending reward amount.
     */

    function pendingReward(uint256 _pid, address _user) public view returns (uint256) {
        uint256 factor2 = ITautrinoToken(_poolInfo[_pid].rewardToken).factor2();
        return pendingBaseReward(_pid, _user).mul(2 ** factor2);
    }

    /**
     * @dev pending base reward of user in the pool.
     * @param _pid id of pool.
     * @param _user user address.
     * @return pending reward amount.
     */

    function pendingBaseReward(uint256 _pid, address _user) internal view returns (uint256) {
        PoolInfo storage pool = _poolInfo[_pid];
        UserInfo storage user = _userInfo[_pid][_user];
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
        PoolInfo storage pool = _poolInfo[_pid];
        require(pool.rewardEndEpoch == 0 || pool.rewardEndEpoch > block.timestamp, "paused!");

        UserInfo storage user = _userInfo[_pid][msg.sender];

        _claimReward(_pid, msg.sender);

        if(_amount > 0) {
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            user.amount = user.amount.add(_amount);
            pool.deposits = pool.deposits.add(_amount);
        }

        emit onDeposit(msg.sender, _pid, _amount);
    }

    /**
     * @dev withdraw lp token.
     * @param _pid id of pool.
     * @param _amount lp amount.
     */

    function withdraw(uint256 _pid, uint256 _amount) external {
        PoolInfo storage pool = _poolInfo[_pid];
        UserInfo storage user = _userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "insufficient!");

        _claimReward(_pid, msg.sender);

        if(_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.deposits = pool.deposits.sub(_amount);
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
        PoolInfo storage pool = _poolInfo[_pid];
        UserInfo storage user = _userInfo[_pid][_user];

        uint256 baseReward = pendingBaseReward(_pid, _user);

        if (baseReward > 0) {
            uint256 factor2 = ITautrinoToken(pool.rewardToken).factor2();
            uint256 reward = baseReward.mul(2 ** factor2);
            rewardPool.withdrawReward(_user, pool.rewardToken, reward);
            user.rewardDebt = user.rewardDebt.add(baseReward);

            pool.totalRewardPaid = pool.totalRewardPaid.add(baseReward);
            emit onClaimReward(_user, _pid, reward, baseReward);
        }
        pool.userLastRewardEpoch[_user] = block.timestamp;
    }

    /**
     * @dev last reward timestamp of user.
     * @param _pid id of pool.
     * @param _user user address.
     */

    function userLastRewardEpoch(uint256 _pid, address _user) external view returns (uint256) {
        return _poolInfo[_pid].userLastRewardEpoch[_user];
    }

    /**
     * @dev User info.
     * @param _pid id of pool.
     * @param _user user address.
     */

    function userInfo(uint256 _pid, address _user) external view returns (uint256, uint256, uint256) {
        UserInfo memory user = _userInfo[_pid][_user];
        uint256 factor2 = ITautrinoToken(_poolInfo[_pid].rewardToken).factor2();
        uint256 rewardDistributed = user.rewardDebt.mul(2 ** factor2);
        uint256 reward = pendingReward(_pid, _user);
        return (user.amount, rewardDistributed, reward);
    }

    /**
     * @dev Pool info.
     * @param _pid id of pool.
     */

    function poolInfo(uint256 _pid) external view returns (address, address, uint256, uint256, uint256, uint256) {
        PoolInfo memory pool = _poolInfo[_pid];
        address rewardToken = pool.rewardToken;
        uint256 factor2 = ITautrinoToken(rewardToken).factor2();
        uint256 rewardDistributed = pool.totalRewardPaid.mul(2 ** factor2);
        return (address(pool.lpToken), rewardToken, pool.rewardPerShare, rewardDistributed, pool.deposits, pool.rewardEndEpoch);
    }

    /**
     * @dev set reward pool. must be called by owner
     * @param _rewardPool new reward pool address.
     */

    function setRewardPool(ITautrinoRewardPool _rewardPool) public onlyOwner {
        rewardPool = _rewardPool;
    }
}
