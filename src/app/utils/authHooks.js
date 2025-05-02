import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase/config';

/**
 * Custom hook to get the current Firebase authentication state
 * @returns {Object} The current user and loading state
 */
export function useAuth() {
    const [user, setUser] = useState < User | null > (null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            // If we have a user, store their token in a variable accessible to the Google Sheets client
            if (currentUser) {
                if (typeof window !== 'undefined') {
                    window.user = currentUser;

                    // As a fallback, also store token in session storage
                    currentUser.getIdToken().then(token => {
                        sessionStorage.setItem('authToken', token);
                    });
                }
            } else {
                // Clear stored user and token if logged out
                if (typeof window !== 'undefined') {
                    window.user = null;
                    sessionStorage.removeItem('authToken');
                }
            }

            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { user, loading };
}