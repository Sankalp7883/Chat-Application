package spring.web.socket.chat.dto;

import java.util.List;

/**
 * ReceiptEvent dto class to represent message receipt notifications (sent, delivered, read)
 */
public class ReceiptEvent {

    private String sender;
    private String recipient;
    private String status;
    private List<Long> messageIds;

    public ReceiptEvent() {
    }

    public ReceiptEvent(String sender, String recipient, String status, List<Long> messageIds) {
        this.sender = sender;
        this.recipient = recipient;
        this.status = status;
        this.messageIds = messageIds;
    }

    public String getSender() {
        return sender;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }

    public String getRecipient() {
        return recipient;
    }

    public void setRecipient(String recipient) {
        this.recipient = recipient;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<Long> getMessageIds() {
        return messageIds;
    }

    public void setMessageIds(List<Long> messageIds) {
        this.messageIds = messageIds;
    }
}
