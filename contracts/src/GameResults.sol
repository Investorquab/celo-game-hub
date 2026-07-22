// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PlayerRegistry.sol";

/// @title GameResults
/// @notice Records match outcomes for supported games and forwards XP/win
///         updates to PlayerRegistry. Matches are submitted by an authorized
///         relayer on the player's behalf (see backend/src/relayer) so
///         players without CELO can still play; the relayer only forwards
///         a result the player already signed off-chain.
contract GameResults {
    enum Result {
        Win,
        Loss,
        Draw
    }

    struct Match {
        address player;
        bytes32 gameId;
        Result result;
        uint64 timestamp;
    }

    address public owner;
    address public relayer;
    PlayerRegistry public playerRegistry;

    Match[] public matchHistory;
    mapping(address => uint256[]) private _matchesByPlayer;

    uint64 public constant XP_WIN = 30;
    uint64 public constant XP_DRAW = 10;
    uint64 public constant XP_LOSS = 5;

    event MatchRecorded(address indexed player, bytes32 gameId, Result result, uint256 matchIndex);

    error NotOwner();
    error NotRelayer();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert NotRelayer();
        _;
    }

    constructor(address _playerRegistry) {
        owner = msg.sender;
        playerRegistry = PlayerRegistry(_playerRegistry);
    }

    function setRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
    }

    /// @notice Submits a finalized match result. Only callable by the
    ///         configured relayer, which is expected to have already
    ///         verified the player's off-chain signature over the match
    ///         data before calling this.
    function submitMatch(address player, bytes32 gameId, Result result) external onlyRelayer {
        matchHistory.push(Match(player, gameId, result, uint64(block.timestamp)));
        uint256 index = matchHistory.length - 1;
        _matchesByPlayer[player].push(index);

        uint64 xpGain = result == Result.Win ? XP_WIN : result == Result.Draw ? XP_DRAW : XP_LOSS;
        playerRegistry.recordMatchResult(player, uint8(result), xpGain);

        emit MatchRecorded(player, gameId, result, index);
    }

    function getMatchesForPlayer(address player) external view returns (uint256[] memory) {
        return _matchesByPlayer[player];
    }

    function totalMatches() external view returns (uint256) {
        return matchHistory.length;
    }
}
