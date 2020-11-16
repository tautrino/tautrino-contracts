pragma solidity 0.6.6;

import "../RebaseResult.sol";

interface ITautrinoToken {
    function rebase(RebaseResult result) external returns (uint);
    function setGovernance(address _governance) external;
    function factor2() external view returns (uint);
}
