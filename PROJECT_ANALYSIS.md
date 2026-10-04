# Project Analysis: Spring WebSocket Chat

This project is a multi-module Maven-based Java application demonstrating various techniques for real-time web messaging using the Spring Framework. It implements a variety of communication models, ranging from raw WebSockets to STOMP over SockJS, secured user-to-user chat, a standalone Java client, and HTML5 Server-Sent Events (SSE).

---

## 1. Project Overview & Features

The project is structured to demonstrate five main messaging capabilities:

1. **Basic WebSocket Chat**:
   * A low-level connection model using raw WebSockets without additional application-level routing protocols (like STOMP) or fallback mechanisms (like SockJS).
   * Implemented via a custom `TextWebSocketHandler` registering directly to the `/web-socket` URL.
2. **Group Chat with STOMP & SockJS**:
   * A broadcast model (one-to-many) using the STOMP sub-protocol and SockJS failover mechanics.
   * Client devices connect to `/grp-chat`, subscribe to `/topic/messages`, and broadcast to `/app/grp-chat`.
3. **Secured User-to-User Chat**:
   * A private one-to-one messaging system utilizing Spring Security for user authentication.
   * Clients subscribe to a user-specific queue `/user/queue/messages`. The backend uses Spring's `SimpMessagingTemplate.convertAndSendToUser()` to route messages to specific authenticated sessions.
   * Active users are dynamically tracked and broadcasted to all logged-in clients via `/topic/active`.
4. **Standalone Java Swing Client**:
   * A separate desktop application built with Java Swing and Spring Boot that acts as a client.
   * It establishes connection to the server using standard Java WebSocket transport (`StandardWebSocketClient`) and `RestTemplateXhrTransport` for STOMP over SockJS communication.
5. **Server Push Notifications (EventSource / SSE)**:
   * A unidirectional notification feature demonstrating HTML5 Server-Sent Events (SSE).
   * Emitters are managed via Spring’s `SseEmitter` class to push notifications to pages listening on `/sse/subscribe`.

---

## 2. Technology Stack

### Backend
* **Language**: Java 1.8 (Java 8)
* **Framework**: Spring Framework (`4.3.0.RELEASE`), Spring MVC
* **Security**: Spring Security (`4.2.3.RELEASE`)
* **Real-time Protocol & Messaging**: Spring WebSocket, Spring Messaging (STOMP Broker)
* **Client Broker Library**: SockJS Client (Webjars version `0.3.4`)
* **Data Serialization**: Jackson Core & Databind (`2.7.3`) for JSON mapping

### Frontend
* **UI Templating**: JavaServer Pages (JSP), JSTL (`1.2`)
* **CSS Framework**: Twitter Bootstrap (`3.3.5`) via Webjars
* **Libraries**: `sockjs.js` & `stomp.js` for websocket connections

### Desktop Client
* **Framework**: Spring Boot (`1.5.1.RELEASE`)
* **UI**: Java Swing (`JFrame` / GUI toolkit)

### Deployment & Build Tools
* **Build Tool**: Maven
* **Server Environment**: Apache Tomcat `8.5.15` (packaged as a `.war` file)

---

## 3. Project Architecture & Modules

The codebase is split into three Maven modules under a parent POM:

```
                  +-----------------------------------+
                  | spring-websocket-chat (parent POM)|
                  +-----------------------------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
+-----------------------+                       +-----------------------+
|  model (dto classes)  |<---+              +---| java-web-sock-client  |
+-----------------------+    |              |   | (swing app client)    |
                             | dependency   |   +-----------------------+
                             |              |
                             +-------+------+
                                     |
                                     | dependency
                                     v
                        +-----------------------+
                        |  server (web war app) |
                        +-----------------------+
```

### A. Module: `model`
Defines the shared Data Transfer Objects (DTOs) used for message serialization between the server and clients:
* **`ChatMessage`**: Holds the sender (`from`), text payload (`text`), and the intended `recipient`.
* **`OutputMessage`**: Standardized packet sent from the server containing sender (`from`), message content (`message`), timestamp (`time`), and a boolean flag (`myMsg`) to indicate if it belongs to the current user.

### B. Module: `server`
A web application packaged as a `.war` file. Contains all configuration, routing controllers, and JSP views.

#### Core Components & Classes:
1. **Configuration**:
   * `WebApplicationInitializerImpl`: Replaces the traditional `web.xml` by initializing the Spring dispatcher servlet programmatically.
   * `SpringConfig`: Sets up the view resolver (`/WEB-INF/pages/*.jsp`), asset mappings (`/js/**`, `/css/**`, `/webjars/**`), and enables Default Servlet Handling.
   * `SecurityConfig`: Configures form login and logout URLs (`/msg-forward/chatbot`), sets up session limit rules, and registers in-memory users.
   * `WebSocketConfig`: Declares raw WebSocket endpoint registration (`/web-socket`) and handles connections using a `TextWebSocketHandler` list.
   * `WebSocketSockJsBrokerConfig`: Configures the STOMP message broker. Sets destination prefixes (`/app` for app messages, `/topic`, `/queue`, `/user` for brokers) and registers endpoints (`/grp-chat`, `/chat`) with SockJS enabled.
2. **Session & Presence Tracking**:
   * `ActiveSessionManager`: A thread-safe component using a `ConcurrentHashMap` to track currently online usernames. Observes changes and notifies listeners asynchronously using a thread pool.
   * `LoginEventListener`: Implements `ApplicationListener` for `InteractiveAuthenticationSuccessEvent` to register users to the active pool when they log in.
   * `SessionExpireEventListener`: Implements `ApplicationListener` for `SessionDestroyedEvent` to remove users when their session times out or they log out.
3. **Controllers**:
   * `BaseSecurityController`: Utility base controller to check user authentication status and fetch usernames.
   * `MessageBroadcastController`: Manages general landing mappings and maps incoming group messages on `/grp-chat` to `/topic/messages`.
   * `MessageForwardController`: Directs private chats. Translates incoming `/app/chat` messages to the recipient's personal user queue (`/user/queue/messages`). Implements `ActiveUserChangeListener` to push online list updates to `/topic/active`.
   * `PushNotificationController`: Exposes `/sse/subscribe` and `/sse/add-event` endpoints utilizing `SseEmitter` to stream notifications back to client browsers.

### C. Module: `java-web-sock-client`
A desktop client application that connects to the group chat server using Spring's Java Stomp client engine.
* **`Program`**: Bootstraps the application as a Spring Boot application without a web container.
* **`MainFrame`**: Swing GUI window that provides text fields for inputs and displays received chat logs.
* **`SockJsJavaClient`**: Configures the connection using standard transports (`StandardWebSocketClient` and `RestTemplateXhrTransport`), establishing the STOMP session on start and handling messaging frames inside a `StompSessionHandler`.

---

## 4. Security & Authentication Details

Spring Security is configured with **in-memory credentials**. The application contains the following default users:

| Username | Password | Role |
| :--- | :--- | :--- |
| **Nio** | nio | CHAT-USER |
| **Jason** | jason | CHAT-USER |
| **Lana** | lana | CHAT-USER |
| **Max** | max | CHAT-USER |
| **Joe** | joe | CHAT-USER |
| **Mike** | mike | CHAT-USER |

* CSRF protection is disabled for ease of development.
* Maximum concurrent sessions per user is set to `1` to avoid duplicate user issues.

---

## 5. Deployment Instructions

### Prerequisites
* **Java SDK**: JDK 8
* **Build Tool**: Apache Maven
* **Web Container**: Tomcat 8.5.x (or compatible)

### Step-by-Step Build & Run
1. Run `mvn install` in the root folder to compile and build all modules.
2. Deploy the server module:
   * Copy `server/target/sample-chat.war` to the Tomcat webapps directory (`tomcat/webapps/`).
   * Start Tomcat and open `http://localhost:8080/sample-chat/` in your browser.
3. Start the Java client:
   * Navigate to the `java-web-sock-client` directory.
   * Execute `mvn spring-boot:run` to launch the Swing desktop window.
