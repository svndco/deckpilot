// Simple OSC test script to test visual feedback
import osc from 'osc';

const udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 0,
    metadata: true
});

udpPort.open();

udpPort.on("ready", function () {
    console.log("Sending OSC test message to DeckPilot...");
    console.log("Address: /deckpilot/all/setAll");
    console.log("Target: localhost:8012");
    
    udpPort.send({
        address: "/deckpilot/all/setAll",
        args: []
    }, "127.0.0.1", 8012);
    
    console.log("✓ OSC message sent!");
    console.log("You should see a red flash in DeckPilot if a recorder is configured.");
    
    setTimeout(() => {
        udpPort.close();
        process.exit(0);
    }, 500);
});

console.log("OSC Test Script");
console.log("===============");
console.log("This will send an OSC 'setAll' command to DeckPilot");
console.log("Make sure DeckPilot is running with at least one recorder configured.\n");
