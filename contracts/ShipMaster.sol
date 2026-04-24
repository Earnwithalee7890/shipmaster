// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ShipMaster
 * @dev A contract for Celo builders to log their "shipping" activity for the Proof of Ship event.
 * It tracks reputation and allows builders to broadcast their contributions on-chain.
 */
contract ShipMaster {
    struct Shipment {
        string update;
        uint256 timestamp;
        string link; // Optional link to PR/Repo/Demo
    }

    mapping(address => Shipment[]) private _shipments;
    mapping(address => uint256) public totalShipped;
    
    event Shipped(address indexed builder, uint256 indexed shipmentId, string update, uint256 timestamp);

    /**
     * @dev Log a new achievement or shipment.
     * @param update A short description of what was shipped.
     * @param link A link to the work (GitHub, Vercel, etc).
     */
    function ship(string memory update, string memory link) public {
        require(bytes(update).length > 0, "Update cannot be empty");
        
        _shipments[msg.sender].push(Shipment({
            update: update,
            timestamp: block.timestamp,
            link: link
        }));
        
        uint256 shipmentId = totalShipped[msg.sender];
        totalShipped[msg.sender]++;
        
        emit Shipped(msg.sender, shipmentId, update, block.timestamp);
    }

    /**
     * @dev Get all shipments for a specific builder.
     */
    function getShipments(address builder) public view returns (Shipment[] memory) {
        return _shipments[builder];
    }

    /**
     * @dev Get a specific shipment for a builder.
     */
    function getShipment(address builder, uint256 index) public view returns (Shipment memory) {
        require(index < _shipments[builder].length, "Index out of bounds");
        return _shipments[builder][index];
    }
}
