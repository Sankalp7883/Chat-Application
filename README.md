# Spring WebSocket Chat

Full-stack real-time chat application built with Spring Boot, WebSocket,
STOMP, SockJS, React, JWT authentication, JPA, and Redis.

The application demonstrates:

- Raw WebSocket broadcasting, isolated from STOMP group channels.
- User-created group chat with STOMP topics and SockJS.
- Public group discovery, joining, and member lists.
- Owner-controlled groups: the creator becomes the sole administrator.
- Owner-only deletion, membership approval, and member removal.
- Authenticated private user-to-user chat.
- Online presence, typing indicators, and delivery/read receipts.
- Message history, search, and recent-message loading.
- File upload and download support.
- A React/Vite browser client.
- A Java Swing STOMP client.

The current project uses WebSocket/STOMP for live events. Server-Sent Events
(SSE), Docker, Docker Compose, and Nginx container configuration are not part
of the current implementation.

Raw WebSocket messages use a separate legacy `raw_chat` room and are not
listed in or displayed inside STOMP group channels.

## Technology stack

### Backend

- Java 21
- Spring Boot 3.5
- Spring MVC and Spring WebSocket
- STOMP and SockJS
- Spring Security with JWT
- Spring Data JPA with H2 and MySQL support
- Spring Data Redis
- Maven

### Frontend

- React 19
- Vite
- React Router
- Axios
- `@stomp/stompjs`
- `sockjs-client`
- Bootstrap 5

## Project structure

```text
spring-web-socket-chat/
├── model/                 Shared chat DTOs
├── server/                Spring Boot WAR backend
├── java-web-sock-client/  Java Swing STOMP client
└── frontend/              React/Vite browser client
```

The `model` module contains shared message DTOs. The `server` module contains
the Spring Boot application, persistence layer, security, WebSocket
configuration, REST APIs, and legacy JSP examples. The `frontend` module
contains the modern React client.

## Communication model

REST is used for authentication, user information, message history, search,
and file transfers.

WebSocket is used for:

- Isolated group messages through `/topic/groups/{roomId}` topics.
- Private messages through authenticated user queues.
- Presence and active-user updates.
- Typing indicators and delivery/read receipts.
- The raw WebSocket demonstration.

The Java desktop client connects through Spring's STOMP client and SockJS
transports.

## Authentication and data

The application uses stateless JWT authentication:

1. The client registers or logs in through `/api/auth`.
2. The server returns access and refresh tokens.
3. Axios attaches access tokens to REST requests.
4. The JWT filter validates REST requests.
5. The WebSocket handshake interceptor validates tokens for WebSocket
   connections.

Passwords are hashed with BCrypt. JPA persists users, login logs, chat rooms,
messages, and attachment metadata. H2 is suitable for local or test use;
MySQL is supported for production. Redis stores active-user state, WebSocket
session mappings, and room-specific chat-history cache entries.

The creator of each public group is its only administrator. Approved members
can access history, messages, typing events, and attachments, but cannot
approve or remove members or delete the group. The frontend refreshes group
metadata automatically, so approvals and membership changes appear without a
manual page refresh. Attachments are fetched through authenticated Axios
requests so protected file downloads work for authorized users.

## Build and run

### Backend

From the repository root:

```bash
mvn clean package
```

The deployable backend artifact is:

```text
server/target/sample-chat.war
```

Run it with Java 21 or deploy it to a compatible servlet container.

### Frontend

From the `frontend` directory:

```bash
npm ci
npm run lint
npm run build
```

The production frontend is generated in `frontend/dist`. Serve that directory
with a static hosting provider and configure the frontend API base URL and
backend CORS origin appropriately.

### Java client

After building the Maven project:

```bash
cd java-web-sock-client
mvn spring-boot:run
```

## Local configuration

Configure the backend database, Redis connection, JWT secret, and allowed
frontend origin through Spring properties or environment variables. The user
who creates a group becomes that group's only administrator. The owner can
approve or remove members and delete the group; approved members can access
history, messaging, and typing events but cannot manage the group. Production
deployments should use a strong externally managed JWT secret, restrict CORS,
validate uploaded files, and keep database and Redis services private.

For local development, the frontend normally runs at
`http://localhost:5173` and the backend at
`http://localhost:8080/sample-chat`. Redis is required for active-session and
presence state; Redis Cloud or another managed Redis service can be used.

## Documentation

- [Project analysis](PROJECT_ANALYSIS.md)
- [Interview defense guide](PROJECT_DEFENSE_GUIDE.md)
- [Deployment instructions](deployment_instructions.md)
