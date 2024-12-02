/**
 *
 * Single socket connection.
 * Does not store the data in SQLite
 *
 */
const { randomUUID } = require("crypto"); // Import the randomUUID method
const io = require("socket.io-client");
// const chalk = require('chalk'); // Import chalk for colorful logging

const chalk = require("colors");

// Configuration
const url = "http://4.240.110.59:3001";
// const url = "https://transport-socket.dev.ks.samagra.io"; // Replace with your Socket.IO server URL
const messagesPerSecond = 5; // Number of messages to send per second

// Connect to the Socket.IO server
const socket = io(url, {
  transports: ["websocket"], // Ensures the use of WebSocket for communication
});

const questionMap = [
  "_about_mahakumbh",
  "_about_mahakumbh__mahakumbh_2025",
  "_about_mahakumbh__mahakumbh_2025__triveni_sangam",
  "ये मेला अभी काहे हो रहा है",
];

socket.on("connect", () => {
  console.log(chalk.green("✅ Connected to Socket.IO server."));

  // Send messages at the specified rate
  const interval = setInterval(() => {
    if (socket.connected) {
      // Generate a new payload for each message
      const messagePayload = {
        app: "6d4943ce-b474-4790-9a60-90d51f6a678e",
        payload: {
          text: "hi",
        },
        from: {
          userID: `${randomUUID()}`,
        },
        messageId: {
          Id: `${randomUUID()}`,
          channelMessageId: `${randomUUID()}`,
        },
        testSequenceId: 0,
      };

      // Emit the message
      socket.emit("botRequest", messagePayload); // Replace 'botRequest' with your server's event name
      console.log(chalk.blue(`📤 Message sent with testSequenceId: 0`));
    } else {
      console.log(
        chalk.red("❌ Socket is not connected. Stopping message sending.")
      );
      clearInterval(interval);
    }
  }, 1000 / messagesPerSecond);
});

// Listen for bot responses
socket.on("botResponse", (response) => {
  console.log(
    chalk.cyan(
      `📥 Received response with testSequenceId: ${response.testSequenceId}`
    )
  ); //:${JSON.stringify(response, null, 2)}`));
  // emit acknowledgement so that TS can rest easy
  const msgType = response.messageType;
  response.messageType = "ACKNOWLEDGEMENT";
  socket.emit("botRequest", response);
  console.log(
    chalk.blue(
      `📤 Acknowledgement sent for testSequenceId: ${response.testSequenceId}`
    )
  );
  response.messageType = msgType;

  // Check if the response contains "Please try again"
  if (typeof response === "string" && response.includes("Please try again")) {
    console.warn(
      chalk.yellow(
        `⚠️ Warning: Received an unwanted response: "Please try again" with conv Id: ${response.messageId.channelMessageId}`
      )
    );
  } else if (
    response.payload &&
    typeof response.payload.text === "string" &&
    response.payload.text.includes("Please try again")
  ) {
    console.warn(
      chalk.yellow(
        `⚠️ Warning: Received an unwanted response: "Please try again" with conv Id: ${response.messageId.channelMessageId} and id: ${response.messageId.Id} and replyId: ${response.messageId?.replyId}`
      )
    );
  } else {
    // switch(response.testSequenceId) {
    //     case 0:
    //     case 1:
    //     case 2:
    //     case 4:
    // }
    if (
      response.testSequenceId < 3 ||
      (response.testSequenceId == 3 &&
        response.payload.text.includes("महाकुंभ से संबंधित एक और प्रश्न है?"))
    ) {
      response.payload.text = questionMap[0];
      response.messageId.Id = `${randomUUID()}`;
      response.testSequenceId += 1;
      socket.emit("botRequest", response);
      console.log(
        chalk.blue(
          `📤 Message sent with testSequenceId: ${response.testSequenceId}`
        )
      );
    }
  }
});

// Handle disconnection
socket.on("disconnect", () => {
  console.log(chalk.red("❌ Disconnected from Socket.IO server."));
});

// Handle connection errors
socket.on("connect_error", (error) => {
  console.error(chalk.red(`❌ Connection error: ${error.message}`));
});
