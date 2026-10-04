package spring.websocket.chat.dto;

import java.time.LocalDateTime;

public class UserPresenceDto {
    private String username;
    private boolean online;
    private LocalDateTime lastSeen;

    public UserPresenceDto() {}

    public UserPresenceDto(String username, boolean online, LocalDateTime lastSeen) {
        this.username = username;
        this.online = online;
        this.lastSeen = lastSeen;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public boolean isOnline() {
        return online;
    }

    public void setOnline(boolean online) {
        this.online = online;
    }

    public LocalDateTime getLastSeen() {
        return lastSeen;
    }

    public void setLastSeen(LocalDateTime lastSeen) {
        this.lastSeen = lastSeen;
    }
}
