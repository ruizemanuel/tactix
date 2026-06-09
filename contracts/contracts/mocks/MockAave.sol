// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockAUsdt is ERC20 {
    constructor() ERC20("Mock aUSDT", "aUSDT") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
    function burn(address from, uint256 amount) external { _burn(from, amount); }
}

contract MockAavePool {
    IERC20  public immutable usdt;
    MockAUsdt public immutable aUsdt;

    constructor(IERC20 _usdt, MockAUsdt _aUsdt) {
        usdt = _usdt;
        aUsdt = _aUsdt;
    }

    function supply(address /*asset*/, uint256 amount, address onBehalfOf, uint16 /*referralCode*/) external {
        usdt.transferFrom(msg.sender, address(this), amount);
        aUsdt.mint(onBehalfOf, amount);
    }

    function withdraw(address /*asset*/, uint256 amount, address to) external returns (uint256) {
        aUsdt.burn(msg.sender, amount);
        usdt.transfer(to, amount);
        return amount;
    }
}
