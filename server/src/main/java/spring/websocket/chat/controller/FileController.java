package spring.websocket.chat.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import spring.websocket.chat.entity.ChatMessage;
import spring.websocket.chat.repository.ChatMessageRepository;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api/files")
public class FileController {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
            "jpg", "jpeg", "png", "gif", "webp", "svg",
            "mp4", "webm", "ogg", "mov", "avi",
            "pdf",
            "doc", "docx",
            "zip", "rar", "tar", "gz", "7z"
    );

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.contains(".")) {
            return ResponseEntity.badRequest().body("Invalid filename");
        }

        String ext = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            return ResponseEntity.badRequest().body("File type not allowed");
        }

        // Generate a secure, unique filename for disk storage
        String fileUuid = UUID.randomUUID().toString();
        File uploadDir = new File(System.getProperty("user.dir") + "/uploads");
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }

        File destFile = new File(uploadDir, fileUuid);
        try {
            file.transferTo(destFile);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to store file: " + e.getMessage());
        }

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("isAttachment", true);
        metadata.put("attachmentName", originalFilename);
        metadata.put("attachmentPath", destFile.getAbsolutePath());
        metadata.put("attachmentType", determineAttachmentType(originalFilename));
        metadata.put("attachmentSize", file.getSize());

        return ResponseEntity.ok(metadata);
    }

    @GetMapping("/download/{messageId}")
    public ResponseEntity<?> downloadFile(@PathVariable("messageId") Long messageId, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        ChatMessage message = chatMessageRepository.findById(messageId).orElse(null);
        if (message == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Message not found");
        }

        if (message.getIsAttachment() == null || !message.getIsAttachment()) {
            return ResponseEntity.badRequest().body("Message has no attachment");
        }

        String path = message.getAttachmentPath();
        if (path == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Attachment path not found");
        }

        File file = new File(path);
        if (!file.exists() || !file.isFile()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("File does not exist on disk");
        }

        Resource resource = new FileSystemResource(file);
        HttpHeaders headers = new HttpHeaders();
        
        // Try to determine content type
        MediaType mediaType = MediaTypeFactory.getMediaType(resource).orElse(MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentType(mediaType);
        
        // Inline disposition for images/videos so they render directly in browser if possible, otherwise attachment
        String disposition = "attachment";
        String type = message.getAttachmentType();
        if ("IMAGE".equals(type) || "VIDEO".equals(type)) {
            disposition = "inline";
        }
        
        headers.setContentDispositionFormData(disposition, message.getAttachmentName());
        headers.setContentLength(file.length());

        return ResponseEntity.ok()
                .headers(headers)
                .body(resource);
    }

    private String determineAttachmentType(String filename) {
        if (filename == null) return "OTHER";
        String ext = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
        switch (ext) {
            case "jpg":
            case "jpeg":
            case "png":
            case "gif":
            case "webp":
            case "svg":
                return "IMAGE";
            case "mp4":
            case "webm":
            case "ogg":
            case "mov":
            case "avi":
                return "VIDEO";
            case "pdf":
                return "PDF";
            case "doc":
            case "docx":
                return "WORD";
            case "zip":
            case "rar":
            case "tar":
            case "gz":
            case "7z":
                return "ZIP";
            default:
                return "OTHER";
        }
    }
}
