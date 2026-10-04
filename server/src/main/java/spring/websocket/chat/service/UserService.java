package spring.websocket.chat.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import spring.websocket.chat.entity.User;
import spring.websocket.chat.repository.UserRepository;

import org.springframework.transaction.annotation.Transactional;
import spring.websocket.chat.dto.UserPresenceDto;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Collections;

@Service
public class UserService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private spring.websocket.chat.repository.LoginLogRepository loginLogRepository;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public void logLogin(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
        loginLogRepository.save(new spring.websocket.chat.entity.LoginLog(user, java.time.LocalDateTime.now()));
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(),
                Collections.singletonList(new SimpleGrantedAuthority(user.getRole()))
        );
    }

    public User registerUser(String username, String password) {
        if (userRepository.findByUsername(username).isPresent()) {
            throw new IllegalArgumentException("Username already exists");
        }
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole("ROLE_CHAT-USER");
        return userRepository.save(user);
    }

    public PasswordEncoder getPasswordEncoder() {
        return passwordEncoder;
    }

    @PostConstruct
    public void initDefaultUsers() {
        if (userRepository.count() == 0) {
            String[] defaultUsers = {"Nio", "Jason", "Lana", "Max", "Joe", "Mike"};
            for (String username : defaultUsers) {
                User user = new User();
                user.setUsername(username);
                user.setPassword(passwordEncoder.encode(username.toLowerCase()));
                user.setRole("ROLE_CHAT-USER");
                userRepository.save(user);
            }
        }
    }

    @Transactional
    public void setUserOnline(String username, boolean online) {
        userRepository.findByUsername(username).ifPresent(user -> {
            user.setOnline(online);
            if (!online) {
                user.setLastSeen(java.time.LocalDateTime.now());
            }
            userRepository.save(user);
        });
    }

    public List<UserPresenceDto> getAllUsersPresence() {
        return userRepository.findAll().stream()
                .map(user -> new UserPresenceDto(user.getUsername(), user.isOnline(), user.getLastSeen()))
                .collect(Collectors.toList());
    }
}
