package spring.websocket.chat.util;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import spring.websocket.chat.service.UserService;

import java.util.*;
import java.util.concurrent.*;

/**
 * Data store class to store active user sessions. Stores users
 * as the string username. Allows thread safe access to this store.
 * <p>
 * Implement {@link ActiveUserChangeListener} interface to listen
 * change in data in the store.
 * Calling {@link ActiveUserChangeListener#notifyActiveUserChange()}
 * will be done asynchronously by a thread pool with a internal queue.
 *
 * @author Yasitha Thilakaratne
 */
@Component
public class ActiveSessionManager {

    @Autowired
    private UserService userService;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    private static final String REDIS_KEY = "chat:active_users";

    private List<ActiveUserChangeListener> listeners;

    private ThreadPoolExecutor notifyPool;

    private ActiveSessionManager() {
        listeners = new CopyOnWriteArrayList<>();
        notifyPool = new ThreadPoolExecutor(1, 5, 10, TimeUnit.SECONDS, new ArrayBlockingQueue<>(100));
    }

    /**
     * Adds new username to the data set.
     *
     * @param username - to be added
     */
    public void add(String username) {
        if (userService != null) {
            userService.setUserOnline(username, true);
        }
        redisTemplate.opsForSet().add(REDIS_KEY, username);
        redisTemplate.opsForValue().set("user:online:" + username, "true");
        notifyListeners();
    }

    /**
     * Removes username from the store.
     *
     * @param username - to be removed
     */
    public void remove(String username) {
        if (userService != null) {
            userService.setUserOnline(username, false);
        }
        redisTemplate.opsForSet().remove(REDIS_KEY, username);
        redisTemplate.opsForValue().set("user:online:" + username, "false");
        notifyListeners();
    }

    /**
     * Clears all data
     */
    public void clear() {
        redisTemplate.delete(REDIS_KEY);
        notifyListeners();
    }

    /**
     * Get all active user data
     *
     * @return - Set of active username.
     */
    public Set<String> getAll() {
        Set<Object> members = redisTemplate.opsForSet().members(REDIS_KEY);
        if (members == null) {
            return Collections.emptySet();
        }
        Set<String> activeUsers = new HashSet<>();
        for (Object member : members) {
            activeUsers.add(String.valueOf(member));
        }
        return activeUsers;
    }

    /**
     * Get a set of all active usernames except username passed as
     * the argument.
     *
     * @param currentUsername - current username
     * @return - set of usernames except passed username
     */
    public Set<String> getAllExceptCurrentUser(String currentUsername) {
        Set<String> users = getAll();
        users.remove(currentUsername);
        return users;
    }

    /**
     * Add all values in the collection
     *
     * @param usernames - Collection of usernames
     */
    public void addAll(Collection<String> usernames) {
        if (usernames != null && !usernames.isEmpty()) {
            redisTemplate.opsForSet().add(REDIS_KEY, usernames.toArray(new Object[0]));
            for (String u : usernames) {
                redisTemplate.opsForValue().set("user:online:" + u, "true");
            }
        }
        notifyListeners();
    }

    /**
     * Register {@link ActiveUserChangeListener} instance to get notified
     * when active users changed. Starts sending notification calls
     * asynchronously after registered.
     *
     * @param listener - instance of class that implements
     *                   {@link ActiveUserChangeListener}
     *                   interface
     */
    public void registerListener(ActiveUserChangeListener listener) {
        listeners.add(listener);
    }

    /**
     * Unregister {@link ActiveUserChangeListener} instance to stop
     * receiving notifying method calls.
     *
     * @param listener - instance of class that implements
     *                 {@link ActiveUserChangeListener}
     *                 interface
     */
    public void removeListener(ActiveUserChangeListener listener) {
        listeners.remove(listener);
    }

    private void notifyListeners() {
        notifyPool.submit(() -> listeners.forEach(ActiveUserChangeListener::notifyActiveUserChange));
    }

    /**
     * Implement this interface to get register as an Observer for
     * ActiveSessionManager class. Pass instant through
     * {@link ActiveSessionManager#registerListener(ActiveUserChangeListener)}
     * method to get notified when active user sessions are changed.
     * <p>
     * ${@link ActiveUserChangeListener#notifyActiveUserChange()} will be
     * called when internal object status is changed.
     */
    public interface ActiveUserChangeListener {
        /**
         * This method will get called when Observable's internal state
         * is changed.
         */
        void notifyActiveUserChange();
    }
}
