# Spring WebSocket Chat - Interview Defense Guide

## Elevator pitch

This is a full-stack real-time chat application built with Spring Boot 3.5,
Java 21, React, WebSocket, STOMP, SockJS, JWT authentication, JPA, Redis,
and MySQL/H2. It supports group chat, private user-to-user chat, presence,
typing indicators, receipts, history, search, and file attachments. A Java
Swing STOMP client is included as a desktop example.

The project uses WebSocket/STOMP for live server-to-client communication.
SSE, Docker, Docker Compose, and Nginx container configuration were removed
from the current architecture.

## Architecture

```text
React/Vite browser ── REST/Axios ──┐
React/Vite browser ── STOMP/SockJS ├── Spring Boot WAR
React/Vite browser ── raw WebSocket┘        │
                                            ├── H2/MySQL
                                            └── Redis

Java Swing STOMP client ─────────────── Spring Boot WAR
```

REST is used for authentication, user information, group discovery,
creation/joining/approval/removal/deletion, history, search, and file
transfers. WebSocket is used for isolated room messages, private messages,
presence, typing events, delivery/read receipts, and raw broadcast messages.

## Main features

- JWT registration, login, refresh, and stateless request authentication.
- User-created public groups through room-specific STOMP topics and SockJS.
- Group discovery, joining, and member lists.
- Owner-controlled group creation, deletion, membership approval, and member
  removal.
- The creator is the sole owner of each group; there is no global administrator
  username.
- Approved members can access history, messages, typing events, and files but
  cannot perform owner actions.
- Group history is isolated by room ID, while raw WebSocket messages remain
  outside STOMP group channels.
- Private chat through authenticated STOMP user queues.
- Raw WebSocket broadcast demonstration.
- Online/offline presence backed by Redis and persisted user state.
- Typing indicators and delivery/read receipts.
- Message history, recent-message loading, and search.
- File upload and download support.
- React browser client and Java Swing client.

## Backend

The `server` module is a Spring Boot WAR application:

- `SecurityConfig` configures JWT security, CORS, and endpoint access.
- `JwtFilter` authenticates REST requests.
- `JwtHandshakeInterceptor` and `JwtHandshakeHandler` authenticate WebSocket
  connections and set the WebSocket principal.
- `WebSocketConfig` registers the raw WebSocket endpoint.
- `WebSocketSockJsBrokerConfig` configures STOMP destinations and SockJS
  endpoints.
- `AuthController` provides registration, login, and token refresh.
- `ChatRestController` provides authenticated user and presence information.
- `MessageHistoryController` provides group/private history and search.
- `FileController` handles attachment upload and download.
- `MessageBroadcastController` handles group STOMP messages.
- `MessageForwardController` handles private messages, typing events, receipts,
  and active-user updates.
- `ChatService` owns message persistence, room operations, caching, and
  delivery/read state.
- `UserService` owns registration, BCrypt password hashing, login auditing,
  default-user initialization, and presence persistence.

## Frontend

The `frontend` module is a React/Vite application:

- `Login.jsx` handles registration and login.
- `Home.jsx` provides the authenticated dashboard.
- `GroupChat.jsx` implements STOMP group chat.
- `PrivateChat.jsx` implements private user-to-user messaging.
- `RawChat.jsx` demonstrates native browser WebSocket communication.
- `api.js` centralizes Axios configuration, token injection, and refresh.
- `App.jsx` maps the active application routes.

The current routes are `/login`, `/group-chat`, `/private-chat`,
`/raw-chat`, and `/`.

The group client subscribes to `/topic/groups/{roomId}` and
`/topic/groups/{roomId}/typing`. It clears the previous room state when
switching rooms, merges history with live messages by message ID, and
refreshes membership metadata periodically so approvals do not require a
manual reload.

## Data and presence

JPA entities and repositories persist users, login logs, rooms, messages, and
attachments. H2 is available for local/test use and MySQL is available for
production. Redis stores active-user sets, online flags, WebSocket session
mappings, and chat-history cache entries.

`ActiveSessionManager` tracks connected users and notifies listeners when
presence changes. WebSocket connect and disconnect listeners update this state,
while `MessageForwardController` broadcasts active-user changes over STOMP.

## Security explanation

The application is stateless and uses JWTs:

1. The client submits credentials to `/api/auth/login`.
2. The server verifies the BCrypt password and returns access and refresh
   tokens.
3. Axios attaches the access token to REST requests.
4. `JwtFilter` validates REST requests.
5. WebSocket clients provide the token during the handshake.
6. The handshake interceptor validates the token and establishes the principal.

Each group stores its creator as the owner. The owner is the only account
allowed to approve or remove members and delete that group. Approved members
can load history, send messages, and send typing events, but cannot perform
group-management actions.

Any authenticated user may create a group. Ownership is assigned to that
creator only and cannot be transferred through the current UI.

For production, use a secret manager for the JWT secret, restrict CORS to the
frontend origin, validate file MIME types and size, and enforce authorization
on private history and file downloads.

## Build and deployment

The root `pom.xml` is a Maven parent with modules `model`, `server`, and
`java-web-sock-client`. It targets Java 21 and uses Spring Boot 3.5.

```bash
mvn clean package
```

Deploy `server/target/sample-chat.war` with a Java 21 runtime or compatible
servlet container. Build the browser client separately:

```bash
cd frontend
npm ci
npm run lint
npm run build
```

Publish `frontend/dist` using a static hosting provider and configure the
backend URL and CORS origin through the application settings.

There is no Docker or Nginx deployment layer in the current repository.

## Good interview answers

### Why WebSocket instead of polling?

Polling makes the browser repeatedly ask for updates and increases latency and
traffic. WebSocket keeps a connection open so either side can send events
immediately.

### Why STOMP?

STOMP adds destinations, subscriptions, user queues, and message semantics on
top of WebSocket. This avoids implementing routing and subscription handling
manually.

### Why SockJS?

SockJS provides fallback transports for environments where a native WebSocket
connection is unavailable or unreliable.

### Why Redis?

Redis provides fast access to active-user state, session mappings, and selected
chat-history cache entries. Durable application data remains in the relational
database.

### Why JWT?

JWT supports stateless REST authentication and can also be validated during a
WebSocket handshake. Access and refresh tokens allow the client to renew an
expired access token without re-entering credentials.

### What should be improved next?

- Derive the sender from the authenticated principal for every message.
- Enforce participant authorization on private history and attachments.
- Add validation and size limits to all API inputs and uploads.
- Add database indexes and pagination for large histories.
- Use constructor injection consistently.
- Add integration tests for authenticated REST and WebSocket flows.
