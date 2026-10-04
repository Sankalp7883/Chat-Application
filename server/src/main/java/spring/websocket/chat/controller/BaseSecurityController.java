package spring.websocket.chat.controller;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;

/**
 * Implements common security utility methods.
 * Extend controller classes from this class to use common security
 * methods.
 *
 * @author Yasitha Thilakaratne
 */
public abstract class BaseSecurityController {

    /**
     * checks whether the current user is authenticated.
     * @return true if logged in
     */
    protected boolean isAuthenticated() {
        return !(SecurityContextHolder.getContext().getAuthentication() instanceof AnonymousAuthenticationToken);
    }

    private User getSecurityContextHeldUserObject() {
        if (isAuthenticated()) {
            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            if (principal instanceof User) {
                return (User) principal;
            }
        }
        return null;
    }

    /**
     * @return username of the current user
     */
    protected String getCurrentUserName() {
        User authUser = getSecurityContextHeldUserObject();
        if (authUser != null) {
            return authUser.getUsername();
        }
        return null;
    }
}
