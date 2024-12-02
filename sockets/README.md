# Socket Tests

| File | Comments |
| -- | -- |
| [single-socket.js](./single-socket.js) | Single socket connection. Does not store the data in SQLite |
| [multi-socket.js](./multi-socket.js) | Multiple socket connections, does not store the responses in SQLite |
| [mini-testbed.js](./mini-testbed.js) | Single connection but can store in SQLite (hence can help in analytics) |
| [sink.js](./sink.js) | Acts as a sink to just receive and ack msgs from TS when it is overwhelmed |