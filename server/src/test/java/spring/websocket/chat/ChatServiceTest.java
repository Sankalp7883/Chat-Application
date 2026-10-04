package spring.websocket.chat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import spring.websocket.chat.entity.ChatMessage;
import spring.websocket.chat.entity.User;
import spring.websocket.chat.repository.ChatMessageRepository;
import spring.websocket.chat.repository.ChatRoomRepository;
import spring.websocket.chat.repository.UserRepository;
import spring.websocket.chat.service.ChatService;
import spring.websocket.chat.service.UserService;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class ChatServiceTest {

    @Autowired
    private ChatService chatService;

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChatRoomRepository chatRoomRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Test
    public void testFullPersistenceFlow() {
        // 1. Test User Registration
        String username = "TestUser_" + System.currentTimeMillis();
        User registeredUser = userService.registerUser(username, "password");
        assertNotNull(registeredUser.getId());
        assertEquals(username, registeredUser.getUsername());

        // 2. Test User Login Auditing
        assertDoesNotThrow(() -> userService.logLogin(username));

        // 3. Test Room Creation/Retrieval & Message Persistence
        String peerName = "Peer_" + System.currentTimeMillis();
        userService.registerUser(peerName, "password");

        ChatMessage message = chatService.saveMessage(username, peerName, null, "Hello, peer!");
        assertNotNull(message.getId());
        assertEquals("Hello, peer!", message.getContent());
        assertNotNull(message.getChatRoom());
        assertTrue(message.getChatRoom().isPrivate());
        assertEquals("PRIVATE", message.getMessageType());
        assertEquals("DELIVERED", message.getDeliveryStatus());

        // 4. Test group message persistence and properties
        ChatMessage groupMsg = chatService.saveMessage(username, null, "group_chat", "Hello group!");
        assertEquals("GROUP", groupMsg.getMessageType());
        assertEquals("DELIVERED", groupMsg.getDeliveryStatus());

        // 5. Test history retrieval DTOs
        List<spring.websocket.chat.dto.ChatMessageDto> groupHistory = chatService.getGroupMessages("group_chat");
        assertFalse(groupHistory.isEmpty());
        assertEquals("Hello group!", groupHistory.get(groupHistory.size() - 1).getContent());

        List<spring.websocket.chat.dto.ChatMessageDto> privateHistory = chatService.getPrivateMessages(username, peerName);
        assertFalse(privateHistory.isEmpty());
        assertEquals("Hello, peer!", privateHistory.get(0).getContent());
        assertEquals("PRIVATE", privateHistory.get(0).getMessageType());

        // 6. Test recent messages
        List<spring.websocket.chat.dto.ChatMessageDto> recent = chatService.getRecentMessages();
        assertFalse(recent.isEmpty());

        // 7. Test content search
        List<spring.websocket.chat.dto.ChatMessageDto> searchResults = chatService.searchMessages("peer");
        assertFalse(searchResults.isEmpty());
        assertEquals("Hello, peer!", searchResults.get(0).getContent());
    }

    @Test
    public void testUserPresence() {
        String username = "PresenceUser_" + System.currentTimeMillis();
        User user = userService.registerUser(username, "password");
        assertFalse(user.isOnline());
        assertNull(user.getLastSeen());

        userService.setUserOnline(username, true);
        User onlineUser = userRepository.findByUsername(username).orElseThrow();
        assertTrue(onlineUser.isOnline());

        userService.setUserOnline(username, false);
        User offlineUser = userRepository.findByUsername(username).orElseThrow();
        assertFalse(offlineUser.isOnline());
        assertNotNull(offlineUser.getLastSeen());

        List<spring.websocket.chat.dto.UserPresenceDto> presenceList = userService.getAllUsersPresence();
        assertTrue(presenceList.stream().anyMatch(dto -> dto.getUsername().equals(username) && !dto.isOnline() && dto.getLastSeen() != null));
    }
}
