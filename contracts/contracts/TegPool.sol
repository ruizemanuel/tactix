// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";

interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

/// @title TegPool — standalone no-loss tournament pool (TACTIX).
/// @notice Deposits (USDT) are supplied to Aave V3 for yield and are ALWAYS fully
/// withdrawable. At settlement the single top-of-leaderboard player wins the prize
/// (net yield + seed) minus a platformFee taken only from the yield. The oracle (an
/// owner-settable address) reports final scores; it is the backend in Plan 5c.
contract TegPool is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20    public immutable usdt;
    IAavePool public immutable aavePool;
    IERC20    public immutable aUsdt;
    address   public immutable platformWallet;

    uint256 public immutable lockTime;
    uint256 public immutable endTime;
    uint256 public immutable deposit;
    uint256 public immutable tournamentId;
    string  public label;
    uint16  public platformFeeBps;

    address public oracle;

    uint16  public constant MAX_PLATFORM_FEE_BPS = 2000; // 20%
    uint256 public constant MAX_PARTICIPANTS = 500;
    uint256 public constant EMERGENCY_DELAY = 30 days;
    uint256 public constant ADMIN_EMERGENCY_DELAY = 60 days;

    uint256 public seedAmount;
    mapping(address => bool) public hasJoined;
    address[] public participants;

    mapping(address => uint128) public scores;
    bool    public scoresSubmitted;
    address public winner;
    uint128 public winningScore;

    bool    public finalized;
    uint128 public prizeAmount;
    uint128 public feePaid;
    mapping(address => bool) public depositWithdrawn;
    bool    public prizeClaimed;

    bool public emergencyActive;
    mapping(address => bool) public emergencyWithdrawn;
    uint256 public emergencyWithdrawnCount;

    event OracleUpdated(address indexed oracle);
    event PlatformFeeUpdated(uint16 bps);
    event Seeded(uint256 amount);
    event Joined(address indexed user, uint256 participantIndex);
    event ScoresSubmitted(address indexed winner, uint128 winningScore);
    event TieBreak(address[] tied, address winner, uint256 seed);
    event Finalized(uint256 prizeAmount, uint256 yieldEarned, uint256 fee);
    event DepositWithdrawn(address indexed user, uint256 amount);
    event PrizeClaimed(address indexed winner, uint256 amount);
    event EmergencyTriggered(address indexed by, uint256 timestamp);
    event EmergencyUserWithdrawn(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed admin, uint256 amount);

    error BadTimes();
    error ZeroAmount();
    error ZeroAddress();
    error FeeTooHigh();
    error AlreadySeeded();
    error AlreadyJoined();
    error TournamentLocked();
    error PoolFull();
    error NotOracle();
    error TournamentNotEnded();
    error AlreadySubmitted();
    error LengthMismatch();
    error UserMismatch();
    error NoParticipants();
    error ScoresNotSubmitted();
    error AlreadyFinalized();
    error AlreadyWithdrawn();
    error AlreadyClaimed();
    error NotWinner();
    error NotJoined();
    error EmergencyAlreadyActive();
    error EmergencyNotElapsed();
    error EmergencyActiveErr();
    error EmergencyNotActive();
    error AlreadyEmergencyWithdrawn();
    error HasParticipants();
    error TooEarly();

    constructor(
        IERC20 _usdt,
        IAavePool _aavePool,
        IERC20 _aUsdt,
        address _platformWallet,
        uint256 _lockTime,
        uint256 _endTime,
        uint256 _deposit,
        uint256 _tournamentId,
        string memory _label,
        uint16 _platformFeeBps,
        address _owner
    ) Ownable(_owner) {
        if (_lockTime >= _endTime) revert BadTimes();
        if (_deposit == 0) revert ZeroAmount();
        if (_platformFeeBps > MAX_PLATFORM_FEE_BPS) revert FeeTooHigh();
        if (
            address(_usdt) == address(0) ||
            address(_aavePool) == address(0) ||
            address(_aUsdt) == address(0) ||
            _platformWallet == address(0)
        ) revert ZeroAddress();
        usdt = _usdt;
        aavePool = _aavePool;
        aUsdt = _aUsdt;
        platformWallet = _platformWallet;
        lockTime = _lockTime;
        endTime = _endTime;
        deposit = _deposit;
        tournamentId = _tournamentId;
        label = _label;
        platformFeeBps = _platformFeeBps;
        oracle = _owner;
    }

    function setOracle(address _oracle) external onlyOwner {
        if (_oracle == address(0)) revert ZeroAddress();
        oracle = _oracle;
        emit OracleUpdated(_oracle);
    }

    function setPlatformFee(uint16 bps) external onlyOwner {
        if (bps > MAX_PLATFORM_FEE_BPS) revert FeeTooHigh();
        platformFeeBps = bps;
        emit PlatformFeeUpdated(bps);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function seedPool(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (seedAmount > 0) revert AlreadySeeded();
        seedAmount = amount;
        usdt.safeTransferFrom(msg.sender, address(this), amount);
        usdt.forceApprove(address(aavePool), amount);
        aavePool.supply(address(usdt), amount, address(this), 0);
        emit Seeded(amount);
    }

    function join() external nonReentrant whenNotPaused {
        if (block.timestamp >= lockTime) revert TournamentLocked();
        if (hasJoined[msg.sender]) revert AlreadyJoined();
        if (participants.length >= MAX_PARTICIPANTS) revert PoolFull();
        hasJoined[msg.sender] = true;
        uint256 idx = participants.length;
        participants.push(msg.sender);
        usdt.safeTransferFrom(msg.sender, address(this), deposit);
        usdt.forceApprove(address(aavePool), deposit);
        aavePool.supply(address(usdt), deposit, address(this), 0);
        emit Joined(msg.sender, idx);
    }

    function submitScores(
        address[] calldata users,
        uint128[] calldata points,
        uint256 randomSeed
    ) external {
        if (msg.sender != oracle) revert NotOracle();
        if (emergencyActive) revert EmergencyActiveErr();
        if (block.timestamp < endTime) revert TournamentNotEnded();
        if (scoresSubmitted) revert AlreadySubmitted();
        if (users.length != points.length) revert LengthMismatch();
        if (users.length != participants.length) revert LengthMismatch();
        if (users.length == 0) revert NoParticipants();

        uint128 maxScore;
        uint256 tieCount;
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] != participants[i]) revert UserMismatch();
            scores[users[i]] = points[i];
            if (points[i] > maxScore) {
                maxScore = points[i];
                tieCount = 1;
            } else if (points[i] == maxScore) {
                tieCount++;
            }
        }

        address[] memory tied = new address[](tieCount);
        uint256 ti;
        for (uint256 i = 0; i < users.length; i++) {
            if (points[i] == maxScore) tied[ti++] = users[i];
        }

        address w;
        if (tied.length == 1) {
            w = tied[0];
        } else {
            uint256 idx = uint256(
                keccak256(abi.encode(randomSeed, blockhash(block.number - 1), tied.length))
            ) % tied.length;
            w = tied[idx];
            emit TieBreak(tied, w, randomSeed);
        }

        winner = w;
        winningScore = maxScore;
        scoresSubmitted = true;
        emit ScoresSubmitted(w, maxScore);
    }

    function finalizeAndDistribute() external nonReentrant {
        if (emergencyActive) revert EmergencyActiveErr();
        if (!scoresSubmitted) revert ScoresNotSubmitted();
        if (finalized) revert AlreadyFinalized();
        finalized = true;

        uint256 aBal = aUsdt.balanceOf(address(this));
        aavePool.withdraw(address(usdt), aBal, address(this));

        uint256 totalDeposits = deposit * participants.length;
        // Safe floor: a true Aave shortfall (bal < totalDeposits) must NOT underflow-revert and
        // brick settlement. Degrade to prize 0; deposits remain withdrawable first-come from the
        // available balance. (With healthy Aave aTokens — non-rebasing, 1:1 — bal >= totalDeposits
        // always, so this is identical to the previous behavior on every real path.)
        uint256 bal = usdt.balanceOf(address(this));
        uint256 gross = bal > totalDeposits ? bal - totalDeposits : 0; // seed + yield
        uint256 yieldEarned = gross > seedAmount ? gross - seedAmount : 0;
        uint256 fee = (yieldEarned * platformFeeBps) / 10000;
        if (fee > 0) usdt.safeTransfer(platformWallet, fee);
        feePaid = uint128(fee);
        prizeAmount = uint128(gross - fee);
        emit Finalized(prizeAmount, yieldEarned, fee);
    }

    function withdrawDeposit() external nonReentrant {
        if (!finalized) revert ScoresNotSubmitted();
        if (!hasJoined[msg.sender]) revert NotJoined();
        if (depositWithdrawn[msg.sender]) revert AlreadyWithdrawn();
        depositWithdrawn[msg.sender] = true;
        usdt.safeTransfer(msg.sender, deposit);
        emit DepositWithdrawn(msg.sender, deposit);
    }

    function claimPrize() external nonReentrant {
        if (emergencyActive) revert EmergencyActiveErr();
        if (!finalized) revert ScoresNotSubmitted();
        if (msg.sender != winner) revert NotWinner();
        if (prizeClaimed) revert AlreadyClaimed();
        prizeClaimed = true;
        usdt.safeTransfer(winner, prizeAmount);
        emit PrizeClaimed(winner, prizeAmount);
    }

    function triggerEmergency() external nonReentrant {
        if (emergencyActive) revert EmergencyAlreadyActive();
        if (block.timestamp < endTime + EMERGENCY_DELAY) revert EmergencyNotElapsed();
        if (scoresSubmitted) revert AlreadySubmitted();
        emergencyActive = true;
        uint256 aBal = aUsdt.balanceOf(address(this));
        if (aBal > 0) aavePool.withdraw(address(usdt), aBal, address(this));
        emit EmergencyTriggered(msg.sender, block.timestamp);
    }

    function emergencyUserWithdraw() external nonReentrant {
        if (!emergencyActive) revert EmergencyNotActive();
        if (!hasJoined[msg.sender]) revert NotJoined();
        if (emergencyWithdrawn[msg.sender]) revert AlreadyEmergencyWithdrawn();
        emergencyWithdrawn[msg.sender] = true;
        emergencyWithdrawnCount++;
        usdt.safeTransfer(msg.sender, deposit);
        emit EmergencyUserWithdrawn(msg.sender, deposit);
    }

    function emergencyAdminWithdraw() external onlyOwner nonReentrant {
        bool emergencyOwnerWindow =
            emergencyActive && block.timestamp >= endTime + ADMIN_EMERGENCY_DELAY;
        if (!emergencyOwnerWindow) {
            if (block.timestamp < endTime + 7 days) revert TooEarly();
            if (participants.length > 0) revert HasParticipants();
        }
        if (!emergencyActive) {
            uint256 aBal = aUsdt.balanceOf(address(this));
            if (aBal > 0) aavePool.withdraw(address(usdt), aBal, address(this));
        }
        // Reserve deposit principal still owed to participants who have not yet
        // emergency-withdrawn, so the owner can only recover the surplus (seed + yield),
        // never user deposits. Abandoned deposits remain claimable via emergencyUserWithdraw.
        uint256 reserve = deposit * (participants.length - emergencyWithdrawnCount);
        uint256 bal = usdt.balanceOf(address(this));
        uint256 sweepable = bal > reserve ? bal - reserve : 0;
        usdt.safeTransfer(owner(), sweepable);
        emit EmergencyWithdraw(owner(), sweepable);
    }

    function participantsLength() external view returns (uint256) {
        return participants.length;
    }
}
