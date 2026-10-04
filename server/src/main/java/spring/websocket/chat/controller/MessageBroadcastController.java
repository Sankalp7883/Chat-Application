package spring.websocket.chat.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.beans.factory.annotation.Autowired;
import spring.web.socket.chat.dto.ChatMessage;
import spring.web.socket.chat.dto.OutputMessage;
import spring.web.socket.chat.dto.TypingEvent;
import spring.websocket.chat.util.CommonUtils;

/**
 * Implements web socket and sock js based one-to-multiple user
 * message broadcasting controller methods.
 *
 * @author Yasitha Thilakaratne
 */
@Controller
public class MessageBroadcastController {

    @RequestMapping("/")
    public String home() {
        return "home";
    }


    @RequestMapping("/chatbot")
    public String getChatBot() {
        return "sockJsGrpChat";
    }

    @RequestMapping("/web-sock")
    public String getWebSocket() {
        return "webSocketChat";
    }

    @Autowired
    private spring.websocket.chat.service.ChatService chatService;

    @MessageMapping("/grp-chat/{roomId}")
    public OutputMessage send(@DestinationVariable Long roomId, ChatMessage chatMessage,
                              SimpMessageHeaderAccessor headers) throws Exception {
        String username = headers.getUser() != null ? headers.getUser().getName() : chatMessage.getFrom();
        if (!chatService.isMember(roomId, username)) {
            throw new IllegalArgumentException("Join the room before sending messages");
        }
        spring.websocket.chat.dto.ChatRoomDto room = chatService.getRoomForUser(roomId, username);
        spring.websocket.chat.entity.ChatMessage saved = chatService.saveMessage(
                username,
                null,
                room.getName(),
                chatMessage.getText(),
                chatMessage.getIsAttachment(),
                chatMessage.getAttachmentName(),
                chatMessage.getAttachmentPath(),
                chatMessage.getAttachmentType(),
                chatMessage.getAttachmentSize()
        );
        String time = CommonUtils.getCurrentTimeStamp();
        String downloadUrl = null;
        if (Boolean.TRUE.equals(saved.getIsAttachment()) && saved.getId() != null) {
            downloadUrl = "/api/files/download/" + saved.getId();
        }
        OutputMessage output = new OutputMessage(
                saved.getId(),
                username,
                chatMessage.getText(),
                time,
                false,
                saved.getDeliveryStatus(),
                saved.getIsAttachment(),
                saved.getAttachmentName(),
                downloadUrl,
                saved.getAttachmentType(),
                saved.getAttachmentSize()
        );
        messagingTemplate.convertAndSend("/topic/groups/" + roomId, output);
        return output;
    }

    @Autowired
    private org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/grp-chat/{roomId}/typing")
    public TypingEvent grpTyping(@DestinationVariable Long roomId, TypingEvent event,
                                 SimpMessageHeaderAccessor headers) {
        if (headers.getUser() == null || !chatService.isMember(roomId, headers.getUser().getName())) {
            throw new IllegalArgumentException("Join the room before sending typing events");
        }
        messagingTemplate.convertAndSend("/topic/groups/" + roomId + "/typing", event);
        return event;
    }

    @RequestMapping("test")
    @ResponseBody
    public String testResponse() {
        return "CHAT APP IS RUNNING...";
    }
}
