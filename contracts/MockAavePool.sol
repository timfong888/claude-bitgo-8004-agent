// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MockERC20.sol";

/**
 * @title MockAavePool
 * @notice Simplified Aave V3 Pool that implements the core interface for demo purposes.
 *         Deployed on Hoodi testnet to enable end-to-end flow with BitGo custody.
 *
 * Implements: supply(), borrow(), getUserAccountData()
 * Matches Aave V3 function signatures so the agent's calldata encoding works identically.
 */
contract MockAavePool {
    struct UserData {
        uint256 collateralAmount;  // in collateral token decimals
        uint256 debtAmount;        // in borrow token decimals
        address collateralToken;
        address borrowToken;
    }

    mapping(address => UserData) public userData;

    // Simplified: 1 collateral token, 1 borrow token
    address public collateralToken; // e.g., WETH
    address public borrowToken;     // e.g., MockUSDC

    // Oracle prices (8 decimals, matching Aave)
    uint256 public collateralPriceUSD = 2500_00000000; // $2500
    uint256 public borrowPriceUSD = 1_00000000;        // $1

    // Aave-like parameters
    uint256 public constant LTV = 8250;                // 82.5% (basis points)
    uint256 public constant LIQUIDATION_THRESHOLD = 8600; // 86% (basis points)

    address public owner;

    event Supply(address indexed user, address indexed asset, uint256 amount);
    event Borrow(address indexed user, address indexed asset, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _collateralToken, address _borrowToken) {
        collateralToken = _collateralToken;
        borrowToken = _borrowToken;
        owner = msg.sender;
    }

    /**
     * @notice Supply collateral — matches Aave V3 Pool.supply() signature
     */
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 /* referralCode */
    ) external {
        require(asset == collateralToken, "Unsupported collateral");
        require(amount > 0, "Amount must be > 0");

        // Transfer tokens from sender
        MockERC20(asset).transferFrom(msg.sender, address(this), amount);

        userData[onBehalfOf].collateralAmount += amount;
        userData[onBehalfOf].collateralToken = asset;

        emit Supply(onBehalfOf, asset, amount);
    }

    /**
     * @notice Borrow tokens — matches Aave V3 Pool.borrow() signature
     */
    function borrow(
        address asset,
        uint256 amount,
        uint256 /* interestRateMode */,
        uint16 /* referralCode */,
        address onBehalfOf
    ) external {
        require(asset == borrowToken, "Unsupported borrow token");
        require(amount > 0, "Amount must be > 0");

        // Check health factor would remain >= 1.0
        UserData storage user = userData[onBehalfOf];
        uint256 newDebt = user.debtAmount + amount;

        uint256 collateralValueUSD = (user.collateralAmount * collateralPriceUSD) /
            (10 ** MockERC20(collateralToken).decimals());
        uint256 debtValueUSD = (newDebt * borrowPriceUSD) /
            (10 ** MockERC20(borrowToken).decimals());

        if (debtValueUSD > 0) {
            uint256 hf = (collateralValueUSD * LIQUIDATION_THRESHOLD) / (debtValueUSD * 10000);
            require(hf >= 1, "Health factor would be < 1.0");
        }

        // Mint borrow tokens to the borrower
        MockERC20(asset).mint(onBehalfOf, amount);

        user.debtAmount = newDebt;
        user.borrowToken = asset;

        emit Borrow(onBehalfOf, asset, amount);
    }

    /**
     * @notice Get user account data — matches Aave V3 Pool.getUserAccountData() signature
     * @return totalCollateralBase   Total collateral in USD (8 decimals)
     * @return totalDebtBase         Total debt in USD (8 decimals)
     * @return availableBorrowsBase  Available borrows in USD (8 decimals)
     * @return currentLiquidationThreshold  Liquidation threshold (basis points)
     * @return ltv                   Loan-to-value (basis points)
     * @return healthFactor          Health factor (18 decimals, 1e18 = 1.0)
     */
    function getUserAccountData(address user)
        external
        view
        returns (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            uint256 availableBorrowsBase,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        )
    {
        UserData storage u = userData[user];

        if (u.collateralToken != address(0)) {
            totalCollateralBase = (u.collateralAmount * collateralPriceUSD) /
                (10 ** MockERC20(collateralToken).decimals());
        }

        if (u.borrowToken != address(0) && u.debtAmount > 0) {
            totalDebtBase = (u.debtAmount * borrowPriceUSD) /
                (10 ** MockERC20(borrowToken).decimals());
        }

        currentLiquidationThreshold = LIQUIDATION_THRESHOLD;
        ltv = LTV;

        if (totalCollateralBase > 0) {
            availableBorrowsBase = (totalCollateralBase * LTV / 10000) - totalDebtBase;
        }

        if (totalDebtBase > 0) {
            // healthFactor = (collateral * liquidationThreshold) / debt
            // Returned with 18 decimals (1e18 = 1.0)
            healthFactor = (totalCollateralBase * LIQUIDATION_THRESHOLD * 1e18) /
                (totalDebtBase * 10000);
        } else {
            healthFactor = type(uint256).max; // No debt = infinite health
        }
    }

    // Owner functions for demo control

    function setCollateralPrice(uint256 priceUSD8Decimals) external onlyOwner {
        collateralPriceUSD = priceUSD8Decimals;
    }

    function setBorrowPrice(uint256 priceUSD8Decimals) external onlyOwner {
        borrowPriceUSD = priceUSD8Decimals;
    }
}
