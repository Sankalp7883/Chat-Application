package spring.web.socket.chat.dto;

/**
 * Json serializable message DTO
 *
 * @author Yasitha Thilakarathne
 */
public class OutputMessage {

    private Long id;
    private String from;
    private String message;
    private String time;
    private boolean myMsg;
    private String deliveryStatus;
    private Boolean isAttachment = false;
    private String attachmentName;
    private String attachmentUrl;
    private String attachmentType;
    private Long attachmentSize;

    public OutputMessage(String from, String message, String time, boolean myMsg) {
        this.from = from;
        this.message = message;
        this.time = time;
        this.myMsg = myMsg;
    }

    public OutputMessage(Long id, String from, String message, String time, boolean myMsg, String deliveryStatus) {
        this.id = id;
        this.from = from;
        this.message = message;
        this.time = time;
        this.myMsg = myMsg;
        this.deliveryStatus = deliveryStatus;
    }

    public OutputMessage(Long id, String from, String message, String time, boolean myMsg, String deliveryStatus,
                         Boolean isAttachment, String attachmentName, String attachmentUrl, String attachmentType, Long attachmentSize) {
        this.id = id;
        this.from = from;
        this.message = message;
        this.time = time;
        this.myMsg = myMsg;
        this.deliveryStatus = deliveryStatus;
        this.isAttachment = isAttachment;
        this.attachmentName = attachmentName;
        this.attachmentUrl = attachmentUrl;
        this.attachmentType = attachmentType;
        this.attachmentSize = attachmentSize;
    }

    public OutputMessage() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFrom() {
        return from;
    }

    public void setFrom(String from) {
        this.from = from;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getTime() {
        return time;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public boolean isMyMsg() {
        return myMsg;
    }

    public void setMyMsg(boolean myMsg) {
        this.myMsg = myMsg;
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
