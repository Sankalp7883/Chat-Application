package spring.websocket.chat.listener;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import spring.websocket.chat.util.ActiveSessionManager;
import spring.websocket.chat.service.ChatService;

import java.security.Principal;

@Component
public class WebSocketSessionListener {

    @Autowired
    private ActiveSessionManager activeSessionManager;

    @Autowired
    private ChatService chatService;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    private static final String SESSIONS_HASH = "chat:websocket_sessions";

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor sha = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = sha.getUser();
        String sessionId = sha.getSessionId();
        if (principal != null && sessionId != null) {
            redisTemplate.opsForHash().put(SESSIONS_HASH, sessionId, principal.getName());
            activeSessionManager.add(principal.getName());
            chatService.deliverPendingMessages(principal.getName());
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor sha = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = sha.getSessionId();
        if (sessionId != null) {
            String username = (String) redisTemplate.opsForHash().get(SESSIONS_HASH, sessionId);
            if (username == null) {
                Principal principal = sha.getUser();
                if (principal == null) {
                    principal = (Principal) sha.getHeader("simpUser");
                }
                if (principal != null) {
                    username = principal.getName();
                }
            }
            if (username != null) {
                activeSessionManager.remove(username);
                redisTemplate.opsForHash().delete(SESSIONS_HASH, sessionId);
            }
        }
    }
}
