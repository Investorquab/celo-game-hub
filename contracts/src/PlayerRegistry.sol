// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PlayerRegistry
/// @notice Stores player registration, XP, level, and achievement badges.
/// @dev Only the GameResults contract (set via setGameResultsContract) may
///      award XP, so match outcomes are the single source of truth for
///      progression. The deployer owns admin functions.
contract PlayerRegistry {
    struct Player {
        bool registered;
        uint64 xp;
        uint32 level;
        uint32 wins;
        uint32 losses;
        uint32 draws;
    }

    address public owner;
    address public gameResultsContract;

    mapping(address => Player) public players;
    mapping(address => mapping(bytes32 => bool)) public achievements;
    mapping(address => bytes32[]) private _achievementList;

    event PlayerRegistered(address indexed player);
    event XpAwarded(address indexed player, uint64 amount, uint32 newLevel);
    event AchievementUnlocked(address indexed player, bytes32 achievementId);

    error NotOwner();
    error NotGameResultsContract();
    error AlreadyRegistered();
    error NotRegistered();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyGameResults() {
        if (msg.sender != gameResultsContract) revert NotGameResultsContract();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setGameResultsContract(address _contract) external onlyOwner {
        gameResultsContract = _contract;
    }

    function register() external {
        if (players[msg.sender].registered) revert AlreadyRegistered();
        players[msg.sender] = Player({
            registered: true,
            xp: 0,
            level: 1,
            wins: 0,
            losses: 0,
            draws: 0
        });
        emit PlayerRegistered(msg.sender);
    }

    /// @notice Called by GameResults after a match is finalized.
    function recordMatchResult(address player, uint8 result, uint64 xpGain) external onlyGameResults {
        Player storage p = players[player];
        if (!p.registered) revert NotRegistered();

        if (result == 0) p.wins += 1;
        else if (result == 1) p.losses += 1;
        else p.draws += 1;

        p.xp += xpGain;
        uint32 newLevel = uint32(p.xp / 100) + 1;
        if (newLevel != p.level) {
            p.level = newLevel;
        }
        emit XpAwarded(player, xpGain, p.level);
    }

    function unlockAchievement(address player, bytes32 achievementId) external onlyGameResults {
        if (achievements[player][achievementId]) return;
        achievements[player][achievementId] = true;
        _achievementList[player].push(achievementId);
        emit AchievementUnlocked(player, achievementId);
    }

    function getAchievements(address player) external view returns (bytes32[] memory) {
        return _achievementList[player];
    }

    function getPlayer(address player) external view returns (Player memory) {
        return players[player];
    }
}
