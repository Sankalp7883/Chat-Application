package spring.web.socket.chat.dto;

/**
 * TypingEvent dto class to represent typing notifications
 *
 * @author Antigravity
 */
public class TypingEvent {

    private String from;
    private boolean typing;
    private String recipient;

    public TypingEvent(String from, boolean typing, String recipient) {
        this.from = from;
        this.typing = typing;
        this.recipient = recipient;
    }

    public TypingEvent() {
    }

    public String getFrom() {
        return from;
    }

    public void setFrom(String from) {
        this.from = from;
    }

    public boolean isTyping() {
        return typing;
    }

    public void setTyping(boolean typing) {
        this.typing = typing;
    }

    public String getRecipient() {
        return recipient;
    }

    public void setRecipient(String recipient) {
        this.recipient = recipient;
    }
}
