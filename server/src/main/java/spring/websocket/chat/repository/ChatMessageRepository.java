package spring.websocket.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import spring.websocket.chat.entity.ChatMessage;
import spring.websocket.chat.entity.ChatRoom;
import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByChatRoomNameOrderByTimestampAsc(String roomName);
    List<ChatMessage> findByChatRoomIdOrderByTimestampAsc(Long roomId);
    List<ChatMessage> findFirst50ByOrderByTimestampDesc();
    List<ChatMessage> findByContentContainingIgnoreCaseOrderByTimestampDesc(String content);
    List<ChatMessage> findByRecipientUsernameAndDeliveryStatus(String recipientUsername, String deliveryStatus);
    List<ChatMessage> findBySenderUsernameAndRecipientUsernameAndDeliveryStatusNot(String senderUsername, String recipientUsername, String deliveryStatus);
    void deleteByChatRoom(ChatRoom chatRoom);
}
