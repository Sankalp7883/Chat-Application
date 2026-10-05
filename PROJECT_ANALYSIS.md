# Project Analysis: Spring WebSocket Chat

This repository is a multi-module Maven application for authenticated,
real-time chat. The backend uses Spring Boot 3.5 and Java 21. The browser
client is a React/Vite application, and a separate Java Swing client
demonstrates STOMP connectivity.

## 1. Features

1. **Raw WebSocket chat**: direct browser WebSocket communication through
   `/web-socket`.
2. **Group chat**: authenticated users can create public rooms, join existing
   rooms, see room members, and exchange messages through room-specific STOMP
   topics over SockJS.
   The group creator becomes the room owner and sole administrator. The owner
   can approve or remove members and delete the room; approved members retain
   chat history, messaging, and typing access without management privileges.
   Each group uses its own numeric room ID, STOMP topic, and history cache key,
   preventing messages from overlapping between groups.
3. **Private chat**: authenticated STOMP user destinations for one-to-one
   messaging.
4. **Presence and live events**: connection lifecycle listeners update online
   state and publish active-user changes through STOMP.
5. **Persistence and history**: JPA stores users, rooms, messages, login
   records, and attachments. REST endpoints expose history and search.
6. **Attachments**: authenticated upload and download endpoints support
   messages with files.
7. **Authentication**: registration, login, refresh tokens, BCrypt password
   hashing, and JWT validation for REST and WebSocket handshakes.

The project intentionally uses WebSocket/STOMP for server-pushed chat events.
It does not include Server-Sent Events, Docker, Docker Compose, or an Nginx
runtime configuration.

Raw WebSocket messages use the ownerless legacy `raw_chat` room. Public STOMP
group discovery and numeric group history include only owned public rooms, so
raw broadcast messages cannot appear in STOMP group channels.

## 2. Technology stack

### Backend

- Java 21
- Spring Boot 3.5
- Spring MVC and Spring WebSocket
- STOMP with SockJS
- Spring Security and JWT
- Spring Data JPA with H2 and MySQL drivers
- Spring Data Redis for active-user/session state and chat-history caching
- Maven multi-module build

### Frontend

- React 19 with Vite
- React Router
- Axios for REST calls and token refresh
- `@stomp/stompjs` and `sockjs-client`
- Bootstrap 5

### Desktop client

The `java-web-sock-client` module contains a Java Swing client using Spring's
STOMP client and SockJS transports.

## 3. Modules

```text
spring-websocket-chat/
├── model/                 Shared chat DTOs
├── server/                Spring Boot WAR backend
├── java-web-sock-client/  Java Swing STOMP client
└── frontend/              React/Vite browser client
```

### `model`

Contains shared DTOs such as `ChatMessage`, `OutputMessage`, `TypingEvent`, and
`ReceiptEvent`. The server and desktop client use this module for consistent
message serialization.

### `server`

The server is packaged as `sample-chat.war`. Its important areas are:

- `config`: MVC, security, Redis, raw WebSocket, and STOMP configuration.
- `controller`: authentication, chat, history, files, and WebSocket endpoints.
- `service`: user, chat, authentication, and persistence operations.
- `entity` and `repository`: JPA domain models and database access.
- `security`: JWT filtering and WebSocket handshake authentication.
- `listener`: WebSocket connect/disconnect and presence lifecycle handling.
- `util`: JWT, active-session, and shared utility classes.

### `frontend`

The React application provides login, group chat, private chat, and raw
WebSocket pages. `src/App.jsx` defines the active routes. `src/utils/api.js`
centralizes REST requests, access-token injection, and refresh handling.

## 4. Runtime architecture

```text
Browser React app ── REST/Axios ──┐
Browser React app ── STOMP/SockJS ├── Spring Boot server
Browser React app ── raw WebSocket┘          │
                                             ├── H2 or MySQL
                                             └── Redis

Java Swing STOMP client ──────────────── Spring Boot server
```

REST handles authentication, user information, history, search, and file
transfers, plus group creation, joining, approval, member removal, and
deletion. WebSocket handles room-specific group messages, private messages,
presence, typing indicators, receipts, and raw WebSocket broadcasts.

## 5. Security

The application uses stateless JWT authentication:

- `/api/auth/**` provides registration, login, and refresh operations.
- Axios sends the access token on REST requests.
- `JwtFilter` validates REST requests.
- `JwtHandshakeInterceptor` validates tokens during WebSocket handshakes.
- `JwtHandshakeHandler` assigns the authenticated username as the WebSocket
  principal.
- Passwords are stored using BCrypt.
- Attachment downloads require authentication; the React clients fetch
  protected attachments through Axios before rendering or downloading them.

Production deployments should provide a strong external JWT secret, restrict
CORS origins, validate upload content, and enforce authorization for private
history and file downloads.

## 6. Data and presence

JPA persists users, login logs, rooms, messages, and file metadata. Redis
stores active-user sets, per-user online state, WebSocket session mappings, and
room-specific cache entries used by chat history operations. The frontend
refreshes group metadata periodically so pending approvals and membership
changes appear without a page reload. `ActiveSessionManager` also
notifies registered listeners asynchronously when presence changes.

## 7. Build and run

### Backend

From the repository root:

```bash
mvn clean package
```

The backend artifact is `server/target/sample-chat.war`. It can be started
with a Java 21 runtime or deployed to a compatible servlet container.

### Frontend

From `frontend`:

```bash
npm ci
npm run lint
npm run build
```

Publish `frontend/dist` with a static hosting provider and configure the
frontend API base URL for the deployed backend.

### Desktop client

After building the root project:

```bash
cd java-web-sock-client
mvn spring-boot:run
```

## 8. Current deployment model

The backend and frontend are deployed independently. The backend requires
access to the configured database and Redis service. The frontend is served as
static files by the hosting provider. Dockerfiles, Docker Compose, and
container-specific reverse-proxy configuration are not part of this project.
