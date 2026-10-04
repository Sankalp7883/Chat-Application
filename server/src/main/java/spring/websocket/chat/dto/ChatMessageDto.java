package spring.websocket.chat.dto;

import java.io.Serializable;
import java.time.LocalDateTime;

public class ChatMessageDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String roomName;
    private String senderName;
    private String recipientName;
    private String content;
    private LocalDateTime timestamp;
    private String messageType;
    private String deliveryStatus;
    private Boolean isAttachment = false;
    private String attachmentName;
    private String attachmentUrl;
    private String attachmentType;
    private Long attachmentSize;

    public ChatMessageDto() {}

    public ChatMessageDto(Long id, String roomName, String senderName, String recipientName, String content, LocalDateTime timestamp) {
        this(id, roomName, senderName, recipientName, content, timestamp, "GROUP", "DELIVERED");
    }

    public ChatMessageDto(Long id, String roomName, String senderName, String recipientName, String content, LocalDateTime timestamp, String messageType, String deliveryStatus) {
        this.id = id;
        this.roomName = roomName;
        this.senderName = senderName;
        this.recipientName = recipientName;
        this.content = content;
        this.timestamp = timestamp;
        this.messageType = messageType;
        this.deliveryStatus = deliveryStatus;
    }

    public ChatMessageDto(Long id, String roomName, String senderName, String recipientName, String content, LocalDateTime timestamp, String messageType, String deliveryStatus,
                          Boolean isAttachment, String attachmentName, String attachmentUrl, String attachmentType, Long attachmentSize) {
        this.id = id;
        this.roomName = roomName;
        this.senderName = senderName;
        this.recipientName = recipientName;
        this.content = content;
        this.timestamp = timestamp;
        this.messageType = messageType;
        this.deliveryStatus = deliveryStatus;
        this.isAttachment = isAttachment;
        this.attachmentName = attachmentName;
        this.attachmentUrl = attachmentUrl;
        this.attachmentType = attachmentType;
        this.attachmentSize = attachmentSize;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getRoomName() {
        return roomName;
    }

    public void setRoomName(String roomName) {
        this.roomName = roomName;
    }

    public String getSenderName() {
        return senderName;
    }

    public void setSenderName(String senderName) {
        this.senderName = senderName;
    }

    public String getRecipientName() {
        return recipientName;
    }

    public void setRecipientName(String recipientName) {
        this.recipientName = recipientName;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getMessageType() {
        return messageType;
    }

    public void setMessageType(String messageType) {
        this.messageType = messageType;
    }

    public String getDeliveryStatus() {
        return deliveryStatus;
    }

    public void setDeliveryStatus(String deliveryStatus) {
        this.deliveryStatus = deliveryStatus;
    }

    public Boolean getIsAttachment() {
        return isAttachment;
    }

    public void setIsAttachment(Boolean isAttachment) {
        this.isAttachment = isAttachment;
    }

    public String getAttachmentName() {
        return attachmentName;
    }

    public void setAttachmentName(String attachmentName) {
        this.attachmentName = attachmentName;
    }

    public String getAttachmentUrl() {
        return attachmentUrl;
    }

    public void setAttachmentUrl(String attachmentUrl) {
        this.attachmentUrl = attachmentUrl;
    }

    public String getAttachmentType() {
        return attachmentType;
    }

    public void setAttachmentType(String attachmentType) {
        this.attachmentType = attachmentType;
    }

    public Long getAttachmentSize() {
        return attachmentSize;
    }

    public void setAttachmentSize(Long attachmentSize) {
        this.attachmentSize = attachmentSize;
    }
}
