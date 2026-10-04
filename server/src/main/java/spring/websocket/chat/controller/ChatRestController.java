package spring.websocket.chat.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import spring.websocket.chat.util.ActiveSessionManager;
import spring.websocket.chat.service.UserService;
import spring.websocket.chat.service.ChatService;

import java.util.HashMap;
import java.util.Map;
import java.security.Principal;

@RestController
@RequestMapping("/api")
public class ChatRestController extends BaseSecurityController {

    @Autowired
    private ActiveSessionManager activeSessionManager;

    @Autowired
    private UserService userService;

    @Autowired
    private ChatService chatService;

    @GetMapping("/groups")
    public ResponseEntity<?> getGroups(Principal principal) {
        return ResponseEntity.ok(chatService.getPublicRooms(principal.getName()));
    }

    @PostMapping("/groups")
    public ResponseEntity<?> createGroup(@RequestBody Map<String, String> request, Principal principal) {
        try {
            return ResponseEntity.ok(chatService.createPublicRoom(request.get("name"), principal.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/groups/{id}/join")
    public ResponseEntity<?> joinGroup(@PathVariable Long id, Principal principal) {
        try {
            return ResponseEntity.ok(chatService.requestToJoinPublicRoom(id, principal.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/groups/{id}/members/{username}/approve")
    public ResponseEntity<?> approveMember(@PathVariable Long id, @PathVariable String username, Principal principal) {
        try {
            return ResponseEntity.ok(chatService.approveMember(id, username, principal.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/groups/{id}/members/{username}")
    public ResponseEntity<?> removeMember(@PathVariable Long id, @PathVariable String username, Principal principal) {
        try {
            return ResponseEntity.ok(chatService.removeMember(id, username, principal.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/groups/{id}")
    public ResponseEntity<?> deleteGroup(@PathVariable Long id, Principal principal) {
        try {
            chatService.deletePublicRoom(id, principal.getName());
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

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
