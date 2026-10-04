package spring.websocket.chat.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import java.util.concurrent.TimeUnit;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import spring.websocket.chat.entity.ChatMessage;
import spring.websocket.chat.entity.ChatRoom;
import spring.websocket.chat.entity.User;
import spring.websocket.chat.repository.ChatMessageRepository;
import spring.websocket.chat.repository.ChatRoomRepository;
import spring.websocket.chat.repository.UserRepository;
import spring.websocket.chat.util.ActiveSessionManager;

import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class ChatService {

    @Autowired
    private ChatRoomRepository chatRoomRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ActiveSessionManager activeSessionManager;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Resolves an existing chat room or creates a new one.
     */
    public ChatRoom getOrCreateRoom(String name, boolean isPrivate) {
        return chatRoomRepository.findByName(name).orElseGet(() -> {
            ChatRoom room = new ChatRoom(name, isPrivate);
            return chatRoomRepository.save(room);
        });
    }

    /**
     * Resolves an existing private chat room between two users or creates it.
     */
    public ChatRoom getOrCreatePrivateRoom(String user1, String user2) {
        String[] users = {user1, user2};
        Arrays.sort(users);
        String roomName = "private_" + users[0] + "_" + users[1];

        return chatRoomRepository.findByName(roomName).orElseGet(() -> {
            ChatRoom room = new ChatRoom(roomName, true);
            HashSet<User> members = new HashSet<>();
            userRepository.findByUsername(user1).ifPresent(members::add);
            userRepository.findByUsername(user2).ifPresent(members::add);
            room.setMembers(members);
            return chatRoomRepository.save(room);
        });
    }

    /**
     * Persists a chat message in the database.
     */
    public ChatMessage saveMessage(String fromUsername, String toUsername, String roomName, String content) {
        return saveMessage(fromUsername, toUsername, roomName, content, false, null, null, null, null);
    }

    public ChatMessage saveMessage(String fromUsername, String toUsername, String roomName, String content,
                                  Boolean isAttachment, String attachmentName, String attachmentPath, String attachmentType, Long attachmentSize) {
        User sender = userRepository.findByUsername(fromUsername)
                .orElseThrow(() -> new IllegalArgumentException("Sender user not found: " + fromUsername));

        User recipient = null;
        if (toUsername != null && !toUsername.trim().isEmpty()) {
            recipient = userRepository.findByUsername(toUsername).orElse(null);
        }

        ChatRoom room;
        String messageType = "GROUP";
        if (toUsername != null && !toUsername.trim().isEmpty()) {
            // Private message room resolution
            room = getOrCreatePrivateRoom(fromUsername, toUsername);
            messageType = "PRIVATE";
        } else {
            // Group or raw message room resolution
            room = getOrCreateRoom(roomName, false);
            if ("raw_chat".equals(roomName) || "web-socket".equals(roomName)) {
                messageType = "RAW";
            }
        }

        String initialStatus = "DELIVERED";
        if ("PRIVATE".equals(messageType) && recipient != null) {
            if (activeSessionManager.getAll().contains(recipient.getUsername())) {
                initialStatus = "DELIVERED";
            } else {
                initialStatus = "SENT";
            }
        }

        ChatMessage message = new ChatMessage(room, sender, recipient, content, LocalDateTime.now(), messageType, initialStatus,
                isAttachment, attachmentName, attachmentPath, attachmentType, attachmentSize);
        ChatMessage saved = chatMessageRepository.save(message);

        // Evict Caches
        try {
            redisTemplate.delete("chat:history:recent");
            if (recipient != null) {
                String[] users = {fromUsername, recipient.getUsername()};
                Arrays.sort(users);
                String pRoomName = "private_" + users[0] + "_" + users[1];
                redisTemplate.delete("chat:history:private:" + pRoomName);
            } else {
                redisTemplate.delete("chat:history:group:" + roomName);
                if (room.getId() != null) {
                    redisTemplate.delete("chat:history:group:" + room.getId());
                }
            }
        } catch (Exception e) {
            // Ignore
        }

        return saved;
    }

    private spring.websocket.chat.dto.ChatMessageDto convertToDto(ChatMessage message) {
        String downloadUrl = null;
        if (Boolean.TRUE.equals(message.getIsAttachment()) && message.getId() != null) {
            downloadUrl = "/api/files/download/" + message.getId();
        }
        return new spring.websocket.chat.dto.ChatMessageDto(
                message.getId(),
                message.getChatRoom().getName(),
                message.getSender().getUsername(),
                message.getRecipient() != null ? message.getRecipient().getUsername() : null,
                message.getContent(),
                message.getTimestamp(),
                message.getMessageType(),
                message.getDeliveryStatus(),
                message.getIsAttachment(),
                message.getAttachmentName(),
                downloadUrl,
                message.getAttachmentType(),
                message.getAttachmentSize()
        );
    }

    public java.util.List<spring.websocket.chat.dto.ChatMessageDto> getGroupMessages(String groupIdOrName) {
        String cacheKey = "chat:history:group:" + groupIdOrName;
        try {
            String cached = (String) redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.readValue(cached, new TypeReference<java.util.List<spring.websocket.chat.dto.ChatMessageDto>>() {});
            }
        } catch (Exception e) {
            // Fallback
        }

        java.util.List<ChatMessage> messages;
        try {
            Long roomId = Long.parseLong(groupIdOrName);
            messages = chatMessageRepository.findByChatRoomIdOrderByTimestampAsc(roomId);
        } catch (NumberFormatException e) {
            messages = chatMessageRepository.findByChatRoomNameOrderByTimestampAsc(groupIdOrName);
        }
        java.util.List<spring.websocket.chat.dto.ChatMessageDto> dtoList = messages.stream().map(this::convertToDto).collect(java.util.stream.Collectors.toList());

        try {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(dtoList), 10, TimeUnit.MINUTES);
        } catch (Exception e) {
            // Ignore
        }
        return dtoList;
    }

    public java.util.List<spring.websocket.chat.dto.ChatMessageDto> getPrivateMessages(String user1, String user2) {
        String[] users = {user1, user2};
        Arrays.sort(users);
        String roomName = "private_" + users[0] + "_" + users[1];

        String cacheKey = "chat:history:private:" + roomName;
        try {
            String cached = (String) redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.readValue(cached, new TypeReference<java.util.List<spring.websocket.chat.dto.ChatMessageDto>>() {});
            }
        } catch (Exception e) {
            // Fallback
        }

        java.util.List<spring.websocket.chat.dto.ChatMessageDto> dtoList = chatMessageRepository.findByChatRoomNameOrderByTimestampAsc(roomName).stream()
                .map(this::convertToDto)
                .collect(java.util.stream.Collectors.toList());

        try {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(dtoList), 10, TimeUnit.MINUTES);
        } catch (Exception e) {
            // Ignore
        }
        return dtoList;
    }

    public java.util.List<spring.websocket.chat.dto.ChatMessageDto> getRecentMessages() {
        String cacheKey = "chat:history:recent";
        try {
            String cached = (String) redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.readValue(cached, new TypeReference<java.util.List<spring.websocket.chat.dto.ChatMessageDto>>() {});
            }
        } catch (Exception e) {
            // Fallback
        }

        java.util.List<spring.websocket.chat.dto.ChatMessageDto> dtoList = chatMessageRepository.findFirst50ByOrderByTimestampDesc().stream()
                .map(this::convertToDto)
                .collect(java.util.stream.Collectors.toList());

        try {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(dtoList), 5, TimeUnit.MINUTES);
        } catch (Exception e) {
            // Ignore
        }
        return dtoList;
    }

    public java.util.List<spring.websocket.chat.dto.ChatMessageDto> searchMessages(String query) {
        return chatMessageRepository.findByContentContainingIgnoreCaseOrderByTimestampDesc(query).stream()
                .map(this::convertToDto)
                .collect(java.util.stream.Collectors.toList());
    }

    public void deliverPendingMessages(String recipientUsername) {
        List<ChatMessage> sentMessages = chatMessageRepository.findByRecipientUsernameAndDeliveryStatus(recipientUsername, "SENT");
        if (sentMessages.isEmpty()) {
            return;
        }

        Set<String> affectedPrivateRooms = new HashSet<>();
        Map<String, List<Long>> senderToMessageIds = new HashMap<>();
        for (ChatMessage msg : sentMessages) {
            msg.setDeliveryStatus("DELIVERED");
            chatMessageRepository.save(msg);
            
            String senderName = msg.getSender().getUsername();
            senderToMessageIds.computeIfAbsent(senderName, k -> new ArrayList<>()).add(msg.getId());

            String[] users = {senderName, recipientUsername};
            Arrays.sort(users);
            affectedPrivateRooms.add("private_" + users[0] + "_" + users[1]);
        }

        // Evict affected caches
        try {
            redisTemplate.delete("chat:history:recent");
            for (String pRoom : affectedPrivateRooms) {
                redisTemplate.delete("chat:history:private:" + pRoom);
            }
        } catch (Exception e) {
            // Ignore
        }

        // Notify each sender that their messages were delivered
        for (Map.Entry<String, List<Long>> entry : senderToMessageIds.entrySet()) {
            String senderName = entry.getKey();
            List<Long> ids = entry.getValue();
            spring.web.socket.chat.dto.ReceiptEvent receipt = new spring.web.socket.chat.dto.ReceiptEvent(
                senderName, recipientUsername, "DELIVERED", ids
            );
            messagingTemplate.convertAndSendToUser(senderName, "/queue/receipts", receipt);
        }
    }

    public List<Long> readMessagesFromSender(String senderUsername, String recipientUsername) {
        List<ChatMessage> unreadMessages = chatMessageRepository.findBySenderUsernameAndRecipientUsernameAndDeliveryStatusNot(
                senderUsername, recipientUsername, "READ"
        );
        if (unreadMessages.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> ids = new ArrayList<>();
        for (ChatMessage msg : unreadMessages) {
            msg.setDeliveryStatus("READ");
            chatMessageRepository.save(msg);
            ids.add(msg.getId());
        }

        // Evict affected caches
        try {
            String[] users = {senderUsername, recipientUsername};
            Arrays.sort(users);
            String pRoom = "private_" + users[0] + "_" + users[1];
            redisTemplate.delete("chat:history:private:" + pRoom);
            redisTemplate.delete("chat:history:recent");
        } catch (Exception e) {
            // Ignore
        }

        // Notify sender in real-time
        spring.web.socket.chat.dto.ReceiptEvent receipt = new spring.web.socket.chat.dto.ReceiptEvent(
            senderUsername, recipientUsername, "READ", ids
        );
        messagingTemplate.convertAndSendToUser(senderUsername, "/queue/receipts", receipt);

        return ids;
    }
}
