# BHASAI Load Testing

Contains scripts to load test core BHASAI backend services.

The folder structure is as follows
```
.
├── http
│   └── uci-apis
├── prisma
│   └── migrations
│       └── 20241129133632_init
└── sockets
```

The `http` folder contains scripts to test `http` apis grouped in folders by service name.
The `socket` folder contains scripts to test the recipes end to end via websocket adapters/transport socket.
