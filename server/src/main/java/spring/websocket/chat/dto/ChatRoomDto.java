package spring.websocket.chat.dto;

import java.util.List;

public class ChatRoomDto {
    private Long id;
    private String name;
    private boolean isPrivate;
    private List<String> members;
    private String owner;
    private List<String> pendingMembers;
    private boolean member;
    private boolean pending;
    private boolean canManage;

    public ChatRoomDto() {}

    public ChatRoomDto(Long id, String name, boolean isPrivate, List<String> members) {
        this.id = id;
        this.name = name;
        this.isPrivate = isPrivate;
        this.members = members;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public boolean isPrivate() {
        return isPrivate;
    }

    public void setPrivate(boolean aPrivate) {
        isPrivate = aPrivate;
    }

    public List<String> getMembers() {
        return members;
    }

    public void setMembers(List<String> members) {
        this.members = members;
    }

    public String getOwner() { return owner; }
    public void setOwner(String owner) { this.owner = owner; }
    public List<String> getPendingMembers() { return pendingMembers; }
    public void setPendingMembers(List<String> pendingMembers) { this.pendingMembers = pendingMembers; }
    public boolean isMember() { return member; }
    public void setMember(boolean member) { this.member = member; }
    public boolean isPending() { return pending; }
    public void setPending(boolean pending) { this.pending = pending; }
    public boolean isCanManage() { return canManage; }
    public void setCanManage(boolean canManage) { this.canManage = canManage; }
}
