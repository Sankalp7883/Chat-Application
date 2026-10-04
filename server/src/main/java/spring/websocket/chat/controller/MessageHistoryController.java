package spring.websocket.chat.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import spring.websocket.chat.dto.ChatMessageDto;
import spring.websocket.chat.service.ChatService;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/messages")
public class MessageHistoryController {

    @Autowired
    private ChatService chatService;

    @GetMapping("/group/{id}")
    public ResponseEntity<List<ChatMessageDto>> getGroupMessages(@PathVariable("id") String id) {
        return ResponseEntity.ok(chatService.getGroupMessages(id));
    }

    @GetMapping("/private/{user1}/{user2}")
    public ResponseEntity<List<ChatMessageDto>> getPrivateMessages(
            @PathVariable("user1") String user1,
            @PathVariable("user2") String user2,
            Principal principal) {
        String recipient = principal != null ? principal.getName() : user1;
        String sender = recipient.equals(user1) ? user2 : user1;
        chatService.readMessagesFromSender(sender, recipient);
        return ResponseEntity.ok(chatService.getPrivateMessages(user1, user2));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<ChatMessageDto>> getRecentMessages() {
        return ResponseEntity.ok(chatService.getRecentMessages());
    }

    @GetMapping("/search")
    public ResponseEntity<List<ChatMessageDto>> searchMessages(@RequestParam("q") String query) {
        return ResponseEntity.ok(chatService.searchMessages(query));
    }
}
