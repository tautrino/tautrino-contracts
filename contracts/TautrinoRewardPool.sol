pragma solidity 0.6.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TautrinoRewardPool is Ownable() {

    using SafeERC20 for IERC20;

    mapping (address => address) public wants;

    /**
     * @dev withdraw reward to user. must be called by farming pool
     * @param _to user to receive reward.
     * @param _token address of reward token.
     * @param _amount amount of reward.
     */

    function withdrawReward(address _to, address _token, uint256 _amount) external {
        require(wants[msg.sender] == _token, "not farming pool!");
        IERC20(_token).safeTransfer(_to, _amount);
    }

    /**
     * @dev set reward token of pool. must be called by owner
     * @param _token address of reward token.
     * @param _pool address of farming pool.
     */

    function setRewardToken(address _token, address _pool) external onlyOwner {
        wants[_pool] = _token;
    }

    /**
     * @dev remove pool. must be called by owner
     * @param _pool address of farming pool.
     */

    function removePool(address _pool) external onlyOwner {
        delete wants[_pool];
    }

    /**
     * @dev withdraw all tokens(used to migrate reward pool). must be called by owner
     * @param _token address of token.
     * @param _to address of receiver.
     */

    function withdrawAllToken(IERC20 _token, address _to) external onlyOwner {
        _token.safeTransfer(_to, _token.balanceOf(address(this)));
    }
}
