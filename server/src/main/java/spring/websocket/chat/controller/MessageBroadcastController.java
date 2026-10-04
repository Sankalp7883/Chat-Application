package spring.websocket.chat.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
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

    @MessageMapping("/grp-chat")
    @SendTo("/topic/messages")
    public OutputMessage send(ChatMessage chatMessage) throws Exception {
        spring.websocket.chat.entity.ChatMessage saved = chatService.saveMessage(
                chatMessage.getFrom(),
                null,
                "group_chat",
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
        return new OutputMessage(
                saved.getId(),
                chatMessage.getFrom(),
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
    }

    @MessageMapping("/grp-chat/typing")
    @SendTo("/topic/messages/typing")
    public TypingEvent grpTyping(TypingEvent event) {
        return event;
    }

    @RequestMapping("test")
    @ResponseBody
    public String testResponse() {
        return "CHAT APP IS RUNNING...";
    }
}
