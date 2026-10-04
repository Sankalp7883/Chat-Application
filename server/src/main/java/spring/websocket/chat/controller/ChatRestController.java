package spring.websocket.chat.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import spring.websocket.chat.util.ActiveSessionManager;
import spring.websocket.chat.service.UserService;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ChatRestController extends BaseSecurityController {

    @Autowired
    private ActiveSessionManager activeSessionManager;

    @Autowired
    private UserService userService;

    @GetMapping("/user/me")
    public ResponseEntity<?> getMe() {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body("{\"status\":\"unauthorized\"}");
        }
        Map<String, Object> response = new HashMap<>();
        response.put("status", "authenticated");
        response.put("username", getCurrentUserName());
        response.put("onlineUsers", activeSessionManager.getAllExceptCurrentUser(getCurrentUserName()));
        response.put("usersPresence", userService.getAllUsersPresence());
        return ResponseEntity.ok(response);
    }
}
