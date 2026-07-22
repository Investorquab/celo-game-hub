// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PlayerRegistry.sol";

/// @title Leaderboard
/// @notice Maintains a bounded top-N leaderboard by XP. Ranking by wins can
///         be derived off-chain from PlayerRegistry data (see backend
///         leaderboard service) to avoid a second on-chain sort; this
///         contract focuses on the canonical, gas-cheap XP ranking.
contract Leaderboard {
    uint256 public constant MAX_ENTRIES = 100;

    address public owner;
    PlayerRegistry public playerRegistry;

    address[] public topPlayers; // sorted descending by XP, best-effort

    error NotOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _playerRegistry) {
        owner = msg.sender;
        playerRegistry = PlayerRegistry(_playerRegistry);
    }

    /// @notice Re-inserts a player into the ranking based on their current
    ///         XP. Called by the backend indexer after a match is recorded.
    ///         O(n) insertion is acceptable given MAX_ENTRIES is small.
    function updateRanking(address player) external {
        _removeIfPresent(player);

        (, uint64 xp, , , , ) = _unpackPlayer(player);

        uint256 insertAt = topPlayers.length;
        for (uint256 i = 0; i < topPlayers.length; i++) {
            (, uint64 otherXp, , , , ) = _unpackPlayer(topPlayers[i]);
            if (xp > otherXp) {
                insertAt = i;
                break;
            }
        }

        topPlayers.push(player); // grow by one
        for (uint256 i = topPlayers.length - 1; i > insertAt; i--) {
            topPlayers[i] = topPlayers[i - 1];
        }
        if (insertAt < topPlayers.length) {
            topPlayers[insertAt] = player;
        }

        if (topPlayers.length > MAX_ENTRIES) {
            topPlayers.pop();
        }
    }

    function getTopPlayers() external view returns (address[] memory) {
        return topPlayers;
    }

    function _removeIfPresent(address player) internal {
        for (uint256 i = 0; i < topPlayers.length; i++) {
            if (topPlayers[i] == player) {
                for (uint256 j = i; j < topPlayers.length - 1; j++) {
                    topPlayers[j] = topPlayers[j + 1];
                }
                topPlayers.pop();
                break;
            }
        }
    }

    function _unpackPlayer(address player) internal view returns (bool, uint64, uint32, uint32, uint32, uint32) {
        PlayerRegistry.Player memory p = playerRegistry.getPlayer(player);
        return (p.registered, p.xp, p.level, p.wins, p.losses, p.draws);
    }
}
