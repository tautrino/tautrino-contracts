pragma solidity 0.6.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TautrinoRewardPool is Ownable() {

    using SafeERC20 for IERC20;

    address public farm;

    /**
     * @dev withdraw reward to user. must be called by farming pool
     * @param _to user to receive reward.
     * @param _token address of reward token.
     * @param _amount amount of reward.
     */

    function withdrawReward(address _to, IERC20 _token, uint256 _amount) external {
        require(msg.sender == farm, "not farm!");
        _token.safeTransfer(_to, _amount);
    }

    /**
     * @dev set farm. must be called by owner
     * @param _farm address of farm.
     */

    function setFarm(address _farm) external onlyOwner {
        farm = _farm;
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
