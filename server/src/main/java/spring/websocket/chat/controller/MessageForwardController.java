package spring.websocket.chat.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.RequestMapping;

import spring.websocket.chat.service.UserService;
import spring.web.socket.chat.dto.ChatMessage;
import spring.web.socket.chat.dto.OutputMessage;
import spring.web.socket.chat.dto.TypingEvent;
import spring.websocket.chat.util.ActiveSessionManager;
import spring.websocket.chat.util.CommonUtils;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.security.Principal;
import java.util.*;

/**
 * Implements user-to-user sock js based message sending
 * controller methods.
 *
 * @author Yasitha Thilakaratne
 */
@Controller
@RequestMapping("msg-forward")
public class MessageForwardController extends BaseSecurityController implements ActiveSessionManager.ActiveUserChangeListener {

    private final static Logger LOGGER = LoggerFactory.getLogger(MessageForwardController.class);

    @Autowired
    private SimpMessagingTemplate webSocket;

    @Autowired
    private ActiveSessionManager activeSessionManager;

    @Autowired
    private UserService userService;

    @PostConstruct
    private void init() {
        activeSessionManager.registerListener(this);
    }

    @PreDestroy
    private void destroy() {
        activeSessionManager.removeListener(this);
    }

    @RequestMapping("/chatbot")
    public String getChatBot(ModelMap modelMap) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof AnonymousAuthenticationToken)) {
            modelMap.addAttribute("username", getCurrentUserName());
            modelMap.addAttribute("onlineUsers", activeSessionManager.getAllExceptCurrentUser(getCurrentUserName()));
            return "sockJsEndToEndChat";
        }
        return "login";
    }

    @Autowired
    private spring.websocket.chat.service.ChatService chatService;

    @MessageMapping("/chat")
    public void send(Message<ChatMessage> message, @Payload ChatMessage chatMessage) throws Exception {
        Principal principal = message.getHeaders().get(SimpMessageHeaderAccessor.USER_HEADER, Principal.class);
        if (principal == null) {
            LOGGER.error("Principal is null");
            return;
        }
        String authenticatedSender = principal.getName();
        if (chatMessage.getRecipient() == null || chatMessage.getRecipient().trim().isEmpty()) {
            LOGGER.warn("Private message rejected because no recipient was provided by {}", authenticatedSender);
            return;
        }
        String time = CommonUtils.getCurrentTimeStamp();

        // Save private message to database with attachment info
        spring.websocket.chat.entity.ChatMessage saved = chatService.saveMessage(
                authenticatedSender,
                chatMessage.getRecipient(),
                null,
                chatMessage.getText(),
                chatMessage.getIsAttachment(),
                chatMessage.getAttachmentName(),
                chatMessage.getAttachmentPath(),
                chatMessage.getAttachmentType(),
                chatMessage.getAttachmentSize()
        );

        String downloadUrl = null;
        if (Boolean.TRUE.equals(saved.getIsAttachment()) && saved.getId() != null) {
            downloadUrl = "/api/files/download/" + saved.getId();
        }

        if (!authenticatedSender.equals(chatMessage.getRecipient())) {
            webSocket.convertAndSendToUser(authenticatedSender, "/queue/messages",
                    new OutputMessage(saved.getId(), authenticatedSender, chatMessage.getText(), time, true, saved.getDeliveryStatus(),
                            saved.getIsAttachment(), saved.getAttachmentName(), downloadUrl, saved.getAttachmentType(), saved.getAttachmentSize()));
        }

        webSocket.convertAndSendToUser(chatMessage.getRecipient(), "/queue/messages",
                new OutputMessage(saved.getId(), authenticatedSender, chatMessage.getText(), time, false, saved.getDeliveryStatus(),
                        saved.getIsAttachment(), saved.getAttachmentName(), downloadUrl, saved.getAttachmentType(), saved.getAttachmentSize()));

    }

    @MessageMapping("/chat/read")
    public void readMessages(Message<Map<String, String>> message, @Payload Map<String, String> payload) {
        Principal principal = message.getHeaders().get(SimpMessageHeaderAccessor.USER_HEADER, Principal.class);
        if (principal == null) {
            return;
        }
        String recipient = principal.getName();
        String sender = payload.get("sender");
        if (sender != null) {
            chatService.readMessagesFromSender(sender, recipient);
        }
    }

    public void notifyActiveUserChange() {
        webSocket.convertAndSend("/topic/active", userService.getAllUsersPresence());
    }

    @MessageMapping("/chat/typing")
    public void privateTyping(Message<TypingEvent> message, @Payload TypingEvent event) {
        Principal principal = message.getHeaders().get(SimpMessageHeaderAccessor.USER_HEADER, Principal.class);
        if (principal == null) {
            return;
        }
        event.setFrom(principal.getName());
        webSocket.convertAndSendToUser(event.getRecipient(), "/queue/typing", event);
    }
}
