package spring.websocket.chat.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import spring.websocket.chat.entity.User;
import spring.websocket.chat.service.UserService;
import spring.websocket.chat.util.JwtUtil;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String password = request.get("password");

        if (username == null || password == null) {
            return ResponseEntity.badRequest().body("{\"error\":\"Username and password are required\"}");
        }

        try {
            User user = userService.registerUser(username, password);
            return ResponseEntity.ok("{\"status\":\"success\",\"message\":\"User registered successfully\"}");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String password = request.get("password");

        if (username == null || password == null) {
            return ResponseEntity.badRequest().body("{\"error\":\"Username and password are required\"}");
        }

        try {
            UserDetails userDetails = userService.loadUserByUsername(username);
            PasswordEncoder passwordEncoder = userService.getPasswordEncoder();

            if (passwordEncoder.matches(password, userDetails.getPassword())) {
                userService.logLogin(username);
                String accessToken = jwtUtil.generateAccessToken(username);
                String refreshToken = jwtUtil.generateRefreshToken(username);

                Map<String, Object> response = new HashMap<>();
                response.put("status", "success");
                response.put("username", username);
                response.put("accessToken", accessToken);
                response.put("refreshToken", refreshToken);

                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(401).body("{\"error\":\"Invalid username or password\"}");
            }
        } catch (Exception e) {
            return ResponseEntity.status(401).body("{\"error\":\"Invalid username or password\"}");
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");

        if (refreshToken == null || !jwtUtil.validateToken(refreshToken)) {
            return ResponseEntity.status(401).body("{\"error\":\"Invalid or expired refresh token\"}");
        }

        String username = jwtUtil.getUsernameFromToken(refreshToken);
        String newAccessToken = jwtUtil.generateAccessToken(username);
        String newRefreshToken = jwtUtil.generateRefreshToken(username);

        Map<String, Object> response = new HashMap<>();
        response.put("accessToken", newAccessToken);
        response.put("refreshToken", newRefreshToken);

        return ResponseEntity.ok(response);
    }
}
