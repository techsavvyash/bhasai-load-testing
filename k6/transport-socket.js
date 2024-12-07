import ws from "k6/ws";
import { check } from "k6";
import { sleep } from "k6";
import http from "k6/http";
import exec from "k6/execution";
// Test configuration
export const options = {
  stages: [
    { duration: "30s", target: 2000 }, // Ramp up to 1000 users
    { duration: "1m", target: 2000 }, // Stay at 1000 users for 1 minute
    { duration: "30s", target: 0 }, // Ramp down to 0 users
  ],
};

export default function () {
  // Socket.IO requires an initial HTTP request to get the session ID
  const handshakeResp = http.get(
    "https://transport-socket.dev.ks.samagra.io/socket.io/?EIO=4&transport=polling"
  );
  check(handshakeResp, {
    "handshake status is 200": (r) => r.status === 200,
  });

  // Extract session ID from response
  // console.log('handshakeResp.body.toString()', handshakeResp);
  const sessionId = handshakeResp.body.match(/"sid":"(.+?)"/)[1];

  // Construct WebSocket URL with Socket.IO parameters
  const wsUrl = `wss://transport-socket.dev.ks.samagra.io/socket.io/?EIO=4&transport=websocket&sid=${sessionId}`;

  const params = {
    headers: {
      Origin: "https://transport-socket.dev.ks.samagra.io",
    },
  };
  const payload = {
    app: "6d4943ce-b474-4790-9a60-90d51f6a678e",
    payload: {
      text: "hi",
    },
    from: {
      userID: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },
    messageId: {
      Id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      channelMessageId: `${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    },
  };

  const response = ws.connect(wsUrl, params, function (socket) {
    // Socket.IO opening handshake
    socket.send("2probe");
    socket.send("5"); // Socket.IO upgrade packet

    // Verify connection succeeded
    check(socket, { "Connected successfully": (socket) => socket !== null });

    // Send the botRequest event with payload
    socket.send(`42["botRequest",${JSON.stringify(payload)}]`);
    console.log("Sent botRequest");

    // Setup ping message every 25 seconds (Socket.IO default)
    const pingInterval = setInterval(() => {
      socket.send("2"); // Socket.IO ping packet
    }, 25000);

    // Handle incoming messages
    socket.on("botResponse", (data) => {
      console.log("Message received:", data);
      // Handle Socket.IO specific messages
      if (data === "3") {
        // Socket.IO pong
        console.log("Received pong");
      } else if (data.startsWith('42["botResponse"')) {
        // Handle botResponse event
        const responseData = JSON.parse(data.substring(2)).slice(1)[0];
        console.log("Bot Response:", responseData);
        check(responseData, {
          "Bot response received": (r) => r !== null,
        });
      }
    });

    // Handle possible errors
    socket.on("error", (e) => {
      console.log("Error:", e);
    });

    socket.on("disconnect", (e) => {
      console.log("========Disconnected!=======");
    });

    // Stay connected for 30 seconds
    sleep(30 * 4);

    // Cleanup
    clearInterval(pingInterval);
    socket.close();
  });

  // Verify the connection was successful
  check(response, { "status is 101": (r) => r && r.status === 101 });
  //   console.log(`Execution context

  // Instance info
  // -------------
  // Vus active: ${exec.instance.vusActive}
  // Iterations completed: ${exec.instance.iterationsCompleted}
  // Iterations interrupted:  ${exec.instance.iterationsInterrupted}
  // Iterations completed:  ${exec.instance.iterationsCompleted}
  // Iterations active:  ${exec.instance.vusActive}
  // Initialized vus:  ${exec.instance.vusInitialized}
  // Time passed from start of run(ms):  ${exec.instance.currentTestRunDuration}

  // Scenario info
  // -------------
  // Name of the running scenario: ${exec.scenario.name}
  // Executor type: ${exec.scenario.executor}
  // Scenario start timestamp: ${exec.scenario.startTime}
  // Percenatage complete: ${exec.scenario.progress}
  // Iteration in instance: ${exec.scenario.iterationInInstance}
  // Iteration in test: ${exec.scenario.iterationInTest}

  // Test info
  // ---------
  // All test options: ${exec.test.options}

  // VU info
  // -------
  // Iteration id: ${exec.vu.iterationInInstance}
  // Iteration in scenario: ${exec.vu.iterationInScenario}
  // VU ID in instance: ${exec.vu.idInInstance}
  // VU ID in test: ${exec.vu.idInTest}
  // VU tags: ${exec.vu.tags}`);
}
