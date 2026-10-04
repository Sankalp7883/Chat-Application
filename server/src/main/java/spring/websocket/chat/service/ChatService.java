package spring.websocket.chat.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import java.util.concurrent.TimeUnit;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
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

    public List<spring.websocket.chat.dto.ChatRoomDto> getPublicRooms(String username) {
        return chatRoomRepository.findAll().stream()
                .filter(room -> !room.isPrivate() && room.getOwner() != null)
                .map(room -> toRoomDto(room, username))
                .collect(java.util.stream.Collectors.toList());
    }

    public spring.websocket.chat.dto.ChatRoomDto createPublicRoom(String name, String username) {
        String normalizedName = name == null ? "" : name.trim();
        if (!StringUtils.hasText(normalizedName) || normalizedName.length() > 80) {
            throw new IllegalArgumentException("Room name must be between 1 and 80 characters");
        }
        if (chatRoomRepository.findByName(normalizedName).isPresent()) {
            throw new IllegalArgumentException("A room with that name already exists");
        }
        ChatRoom room = new ChatRoom(normalizedName, false);
        User creator = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        room.setOwner(creator);
        room.getMembers().add(creator);
        return toRoomDto(chatRoomRepository.save(room), username);
    }

    public spring.websocket.chat.dto.ChatRoomDto requestToJoinPublicRoom(Long roomId, String username) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));
        if (room.isPrivate()) {
            throw new IllegalArgumentException("Private rooms cannot be joined this way");
        }
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!room.getMembers().contains(user)) {
            room.getJoinRequests().add(user);
        }
        return toRoomDto(chatRoomRepository.save(room), username);
    }

    public spring.websocket.chat.dto.ChatRoomDto approveMember(Long roomId, String memberUsername, String admin) {
        ChatRoom room = getManagedRoom(roomId, admin);
        User user = userRepository.findByUsername(memberUsername)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        room.getJoinRequests().remove(user);
        room.getMembers().add(user);
        return toRoomDto(chatRoomRepository.save(room), admin);
    }

    public spring.websocket.chat.dto.ChatRoomDto removeMember(Long roomId, String memberUsername, String admin) {
        ChatRoom room = getManagedRoom(roomId, admin);
        User user = userRepository.findByUsername(memberUsername)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.equals(room.getOwner())) {
            throw new IllegalArgumentException("The group owner cannot be removed");
        }
        if (!room.getMembers().remove(user)) {
            throw new IllegalArgumentException("User is not a member of this group");
        }
        return toRoomDto(chatRoomRepository.save(room), admin);
    }

    public void deletePublicRoom(Long roomId, String admin) {
        ChatRoom room = getManagedRoom(roomId, admin);
        chatMessageRepository.deleteByChatRoom(room);
        room.getMembers().clear();
        room.getJoinRequests().clear();
        chatRoomRepository.delete(room);
    }

    private ChatRoom getManagedRoom(Long roomId, String username) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));
        if (room.isPrivate() || room.getOwner() == null || !username.equals(room.getOwner().getUsername())) {
            throw new IllegalArgumentException("Only the group owner can manage this room");
        }
        return room;
    }

    public spring.websocket.chat.dto.ChatRoomDto getRoomForUser(Long roomId, String username) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));
        if (room.isPrivate() || room.getOwner() == null
                || !room.getMembers().stream().anyMatch(user -> username.equals(user.getUsername()))) {
            throw new IllegalArgumentException("Join the room before accessing it");
        }
        return toRoomDto(room, username);
    }

    public boolean isMember(Long roomId, String username) {
        return chatRoomRepository.findById(roomId)
                .map(room -> room.getMembers().stream().anyMatch(user -> username.equals(user.getUsername())))
                .orElse(false);
    }

    public boolean isPublicGroup(Long roomId) {
        return chatRoomRepository.findById(roomId)
                .map(room -> !room.isPrivate() && room.getOwner() != null)
                .orElse(false);
    }

    private spring.websocket.chat.dto.ChatRoomDto toRoomDto(ChatRoom room) {
        return toRoomDto(room, null);
    }

    private spring.websocket.chat.dto.ChatRoomDto toRoomDto(ChatRoom room, String username) {
        List<String> members = room.getMembers().stream()
                .map(User::getUsername)
                .sorted()
                .collect(java.util.stream.Collectors.toList());
        spring.websocket.chat.dto.ChatRoomDto dto =
                new spring.websocket.chat.dto.ChatRoomDto(room.getId(), room.getName(), room.isPrivate(), members);
        dto.setOwner(room.getOwner() == null ? null : room.getOwner().getUsername());
        dto.setPendingMembers(room.getJoinRequests().stream().map(User::getUsername).sorted().collect(java.util.stream.Collectors.toList()));
        dto.setMember(username != null && members.contains(username));
        dto.setPending(username != null && room.getJoinRequests().stream().anyMatch(user -> username.equals(user.getUsername())));
        dto.setCanManage(username != null && room.getOwner() != null
                && username.equals(room.getOwner().getUsername()));
        return dto;
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
            if (room.getId() != null && !room.getMembers().contains(sender)) {
                room.getMembers().add(sender);
                chatRoomRepository.save(room);
            }
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
