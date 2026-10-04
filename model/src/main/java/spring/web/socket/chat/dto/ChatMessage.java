package spring.web.socket.chat.dto;

/**
 * ChatMessage dto class to be used in MVC pattern
 *
 * @author Yasitha Thilakaratne
 */
public class ChatMessage {

    private String from;
    private String text;
    private String recipient;
    private Boolean isAttachment = false;
    private String attachmentName;
    private String attachmentUrl;
    private String attachmentType;
    private Long attachmentSize;
    private String attachmentPath;

    public ChatMessage(String from, String text, String recipient) {
        this.from = from;
        this.text = text;
        this.recipient = recipient;
    }

    public ChatMessage(String from, String text, String recipient, Boolean isAttachment, String attachmentName,
                       String attachmentUrl, String attachmentType, Long attachmentSize, String attachmentPath) {
        this.from = from;
        this.text = text;
        this.recipient = recipient;
        this.isAttachment = isAttachment;
        this.attachmentName = attachmentName;
        this.attachmentUrl = attachmentUrl;
        this.attachmentType = attachmentType;
        this.attachmentSize = attachmentSize;
        this.attachmentPath = attachmentPath;
    }

    public ChatMessage() {
    }

    public String getFrom() {
        return from;
    }

    public void setFrom(String from) {
        this.from = from;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getRecipient() {
        return recipient;
    }

    public void setRecipient(String recipient) {
        this.recipient = recipient;
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

    public String getAttachmentPath() {
        return attachmentPath;
    }

    public void setAttachmentPath(String attachmentPath) {
        this.attachmentPath = attachmentPath;
    }
}
