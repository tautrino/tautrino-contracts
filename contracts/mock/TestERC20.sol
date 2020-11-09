pragma solidity 0.6.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20 {
    constructor(string memory symbol, uint256 totalSupply) public ERC20("TestToken", symbol) {
        _mint(msg.sender, totalSupply);
    }
}
