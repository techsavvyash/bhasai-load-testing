/**
 *
 * Single Socket Connection
 * Script to test end to end flow/transport socket with support for storing responses in SQLite
 *
 */
const { randomUUID } = require("crypto");
const io = require("socket.io-client");
const chalk = require("colors");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient(); // Initialize Prisma client

// Configuration
const url = "http://4.240.110.59:3001";
// const url = "https://transport-socket.dev.ks.samagra.io"; // Replace with your Socket.IO server URL
const messagesPerSecond = 500; // Number of messages to send per second

const questionMap = [
  "_about_mahakumbh",
  "_about_mahakumbh__mahakumbh_2025",
  "_about_mahakumbh__mahakumbh_2025__triveni_sangam",
  "ये मेला अभी काहे हो रहा है",
];

// Connect to the Socket.IO server
const socket = io(url, {
  transports: ["websocket"], // Ensures the use of WebSocket for communication
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
});

socket.on("connect", () => {
  console.log(chalk.green("✅ Connected to Socket.IO server."));

  // Send messages at the specified rate
  const interval = setInterval(async () => {
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

      socket.emit("botRequest", messagePayload); // Replace 'botRequest' with your server's event name
      // Store the payload in the database
      try {
        await prisma.message.create({
          data: {
            userId: messagePayload.from.userID,
            messageId: messagePayload.messageId.Id,
            channelMessageId: messagePayload.messageId.channelMessageId,
            payload: JSON.stringify(messagePayload),
          },
        });
        console.log(chalk.magenta("📥 Payload stored in database."));
      } catch (error) {
        console.error(
          chalk.red(`❌ Failed to store payload: ${error.message}`)
        );
      }

      // Emit the message
      console.log(
        chalk.blue(
          `📤 Message sent with testSequenceId: ${messagePayload.testSequenceId}`
        )
      );
    } else {
      console.log(
        chalk.red("❌ Socket is not connected. Stopping message sending.")
      );
      clearInterval(interval);
    }
  }, 1000 / messagesPerSecond);
});

// Listen for bot responses
socket.on("botResponse", async (response) => {
  console.log(
    chalk.cyan(
      `📥 Received response with testSequenceId: ${response.testSequenceId} and payload: ${response.payload.text}`
    )
  );

  // Emit acknowledgement
  const msgType = response.messageType;
  response.messageType = "ACKNOWLEDGEMENT";
  socket.emit("botRequest", response);
  console.log(
    chalk.blue(
      `📤 Acknowledgement sent for testSequenceId: ${response.testSequenceId}`
    )
  );
  response.messageType = msgType;
  if (response.testSequenceId == 4) {
    console.log(
      chalk.green(
        `📥 Received UNGUIDED response with testSequenceId: ${response.testSequenceId} and payload: ${response.payload.text}`
      )
    );
  }

  try {
    await prisma.message.create({
      data: {
        userId: response.from.userID,
        messageId: response.messageId.Id,
        channelMessageId: response.messageId.channelMessageId,
        payload: JSON.stringify(response),
      },
    });
    console.log(chalk.magenta("📥 Response payload stored in database."));
  } catch (error) {
    console.error(
      chalk.red(`❌ Failed to store response payload: ${error.message}`)
    );
  }
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
    // Handle message sequence
    if (
      response.testSequenceId < 3 ||
      (response.testSequenceId == 3 &&
        response.payload.text.includes("महाकुंभ से संबंधित एक और प्रश्न है?"))
    ) {
      response.payload.text = questionMap[response.testSequenceId];
      response.messageId.Id = `${randomUUID()}`;
      response.testSequenceId += 1;

      socket.emit("botRequest", response);
      // Store the response payload in the database
      console.log(
        chalk.blue(
          `📤 Message sent with payload: ${response.payload.text} testSequenceId: ${response.testSequenceId}`
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
