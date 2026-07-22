// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PlayerRegistry.sol";
import "../src/GameResults.sol";
import "../src/Leaderboard.sol";

/// @dev Run with:
///   forge script script/Deploy.s.sol --rpc-url alfajores --broadcast --verify -vvvv
/// Requires DEPLOYER_PRIVATE_KEY and RELAYER_ADDRESS in your .env
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address relayerAddress = vm.envAddress("RELAYER_ADDRESS");

        vm.startBroadcast(deployerKey);

        PlayerRegistry playerRegistry = new PlayerRegistry();
        GameResults gameResults = new GameResults(address(playerRegistry));
        Leaderboard leaderboard = new Leaderboard(address(playerRegistry));

        playerRegistry.setGameResultsContract(address(gameResults));
        gameResults.setRelayer(relayerAddress);

        vm.stopBroadcast();

        console.log("PlayerRegistry:", address(playerRegistry));
        console.log("GameResults:", address(gameResults));
        console.log("Leaderboard:", address(leaderboard));
    }
}
