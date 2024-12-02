/**
 * Supports making multiple socket connections, does not store the responses in SQLite
 */
const { randomUUID } = require("crypto");
const io = require("socket.io-client");
const colors = require("colors");

// Configuration
const url = "https://transport-socket.dev.ks.samagra.io";
const messagesPerSecond = 5;

const questionMap = [
  "_about_mahakumbh",
  "_about_mahakumbh__mahakumbh_2025",
  "_about_mahakumbh__mahakumbh_2025__triveni_sangam",
  "ये मेला अभी काहे हो रहा है",
];

function createSocketConnection() {
  return new Promise((resolve, reject) => {
    const socket = io(url, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log(colors.green("✅ Connected to Socket.IO server."));
      resolve(socket);
    });

    socket.on("connect_error", (error) => {
      console.error(colors.red(`❌ Connection error: ${error.message}`));
      reject(error);
    });
  });
}

function handleBotResponse(socket, response) {
  console.log(
    colors.cyan(
      `📥 Received response with testSequenceId: ${response.testSequenceId}`
    )
  );

  // Send acknowledgement
  const msgType = response.messageType;
  response.messageType = "ACKNOWLEDGEMENT";
  socket.emit("botRequest", response);
  console.log(
    colors.blue(
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
    // Close the current connection
    socket.disconnect();
    console.log(colors.red("❌ Connection closed after handling response."));
  }

  // Check for "Please try again" responses
  if (typeof response === "string" && response.includes("Please try again")) {
    console.warn(
      colors.yellow(
        `⚠️ Warning: Received an unwanted response: "Please try again" with conv Id: ${response.messageId.channelMessageId}`
      )
    );
  } else if (
    response.payload &&
    typeof response.payload.text === "string" &&
    response.payload.text.includes("Please try again")
  ) {
    console.warn(
      colors.yellow(
        `⚠️ Warning: Received an unwanted response: "Please try again" with conv Id: ${response.messageId.channelMessageId} and id: ${response.messageId.Id} and replyId: ${response.messageId?.replyId}`
      )
    );
  } else {
    if (
      response.testSequenceId < 3 ||
      (response.testSequenceId == 3 &&
        response.payload.text.includes("महाकुंभ से संबंधित एक और प्रश्न है?"))
    ) {
      response.payload.text = questionMap[0];
      response.messageId.Id = `${randomUUID()}`;
      response.testSequenceId += 1;

      // Create a new connection for the next request
      sendMessage(response);
    }
  }
}

async function sendMessage(messagePayload = null) {
  try {
    const socket = await createSocketConnection();

    // If no payload is provided, create a new one
    const payload = messagePayload || {
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

    // Set up response handler for this connection
    socket.on("botResponse", (response) => handleBotResponse(socket, response));

    // Send the message
    socket.emit("botRequest", payload);
    console.log(
      colors.blue(
        `📤 Message sent with testSequenceId: ${payload.testSequenceId}`
      )
    );
  } catch (error) {
    console.error(colors.red(`Failed to send message: ${error.message}`));
  }
}

// Start sending messages at the specified rate
function startMessageLoop() {
  const interval = setInterval(() => {
    sendMessage();
  }, 1000 / messagesPerSecond);

  // Optional: Stop after a certain time or condition
  // setTimeout(() => clearInterval(interval), timeoutDuration);
}

// Start the message sending loop
startMessageLoop();
