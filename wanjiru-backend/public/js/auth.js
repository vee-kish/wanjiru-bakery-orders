/* ============================================================
   auth.js — Authentication helper for Wanjiru Bakery frontend
   Works with Node.js + Express JWT authentication
   ============================================================ */

const Auth = {
    /* Get the JWT token saved after login */
    getToken() {
        return localStorage.getItem('wb_token');
    },

    /* Get the currently logged-in user object */
    getUser() {
        const user = localStorage.getItem('wb_user');

        if (!user) {
            return null;
        }

        try {
            return JSON.parse(user);
        } catch (error) {
            return null;
        }
    },

    /* Check whether a user is logged in */
    isLoggedIn() {
        return Boolean(localStorage.getItem('wb_token'));
    },

    /* Check access to pages that require login */
    guard() {
        if (Auth.isLoggedIn()) {
            return true;
        }

        window.location.href = 'index.html';
        return false;
    },

    /* Save login session returned by the backend */
    setSession(token, user) {
        localStorage.setItem('wb_token', token);
        localStorage.setItem('wb_user', JSON.stringify(user));
    },

    /* Clear session and return to login page */
    logout() {
        localStorage.removeItem('wb_token');
        localStorage.removeItem('wb_user');
        window.location.href = 'index.html';
    },

    /* Protect pages that require login */
    protectPage() {
        if (!Auth.isLoggedIn()) {
            window.location.href = 'index.html';
        }
    },

    /* Restrict a page to certain roles */
    requireRole(...allowedRoles) {
        const user = Auth.getUser();

        if (!user || !allowedRoles.includes(user.role)) {
            window.location.href = 'dashboard.html';
        }
    },
};
