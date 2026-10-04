package spring.websocket.chat.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import spring.websocket.chat.security.JwtHandshakeHandler;
import spring.websocket.chat.security.JwtHandshakeInterceptor;
import spring.websocket.chat.util.ActiveSessionManager;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Web socket handler based configuration.
 *
 * Does not uses STOMP protocol or Sock JS fallback mechanisms.
 * In the client side a javascript based WebSocket object can be used.
 *
 * @author Yasitha Thilakaratne
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private static final Logger LOGGER = LoggerFactory.getLogger(WebSocketConfig.class);

    @Autowired
    private JwtHandshakeInterceptor jwtHandshakeInterceptor;

    @Autowired
    private JwtHandshakeHandler jwtHandshakeHandler;

    @Autowired
    private ActiveSessionManager activeSessionManager;

    @Autowired
    private spring.websocket.chat.service.ChatService chatService;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry webSocketHandlerRegistry) {
        webSocketHandlerRegistry.addHandler(new SocketHandler(), "/web-socket")
                .setAllowedOrigins("http://localhost:5173")
                .addInterceptors(jwtHandshakeInterceptor)
                .setHandshakeHandler(jwtHandshakeHandler);
    }

    public class SocketHandler extends TextWebSocketHandler {

        private List<WebSocketSession> sessions = new CopyOnWriteArrayList<>();

        @Override
        public void afterConnectionEstablished(WebSocketSession session) throws Exception {
            sessions.add(session);
            String username = (String) session.getAttributes().get("username");
            if (username != null) {
                activeSessionManager.add(username);
            }
            super.afterConnectionEstablished(session);
        }

        @Override
        public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
            sessions.remove(session);
            String username = (String) session.getAttributes().get("username");
            if (username != null) {
                activeSessionManager.remove(username);
            }
            super.afterConnectionClosed(session, status);
        }

        @Override
        protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
            String username = (String) session.getAttributes().get("username");
            if (username != null) {
                chatService.saveMessage(username, null, "raw_chat", message.getPayload());
            }
            super.handleTextMessage(session, message);
            sessions.forEach(webSocketSession -> {
                try {
                    webSocketSession.sendMessage(message);
                } catch (IOException e) {
                    LOGGER.error("Error occurred.", e);
                }
            });
        }
    }
}
