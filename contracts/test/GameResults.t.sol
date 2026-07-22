// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/PlayerRegistry.sol";
import "../src/GameResults.sol";

contract GameResultsTest is Test {
    PlayerRegistry playerRegistry;
    GameResults gameResults;

    address relayer = address(0xBEEF);
    address player = address(0xCAFE);

    function setUp() public {
        playerRegistry = new PlayerRegistry();
        gameResults = new GameResults(address(playerRegistry));
        playerRegistry.setGameResultsContract(address(gameResults));
        gameResults.setRelayer(relayer);

        vm.prank(player);
        playerRegistry.register();
    }

    function test_RevertWhen_NonRelayerSubmitsMatch() public {
        vm.expectRevert(GameResults.NotRelayer.selector);
        gameResults.submitMatch(player, keccak256("tic-tac-toe"), GameResults.Result.Win);
    }

    function test_WinIncreasesXpAndWins() public {
        vm.prank(relayer);
        gameResults.submitMatch(player, keccak256("tic-tac-toe"), GameResults.Result.Win);

        PlayerRegistry.Player memory p = playerRegistry.getPlayer(player);
        assertEq(p.wins, 1);
        assertEq(p.xp, 30);
        assertEq(gameResults.totalMatches(), 1);
    }

    function test_LevelUpAfterEnoughXp() public {
        for (uint256 i = 0; i < 4; i++) {
            vm.prank(relayer);
            gameResults.submitMatch(player, keccak256("tic-tac-toe"), GameResults.Result.Win);
        }
        PlayerRegistry.Player memory p = playerRegistry.getPlayer(player);
        // 4 wins * 30 xp = 120 xp -> level 2
        assertEq(p.xp, 120);
        assertEq(p.level, 2);
    }

    function test_RevertWhen_UnregisteredPlayerResultRecorded() public {
        address stranger = address(0xD00D);
        vm.prank(relayer);
        vm.expectRevert(PlayerRegistry.NotRegistered.selector);
        gameResults.submitMatch(stranger, keccak256("tic-tac-toe"), GameResults.Result.Win);
    }
}
