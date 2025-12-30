import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { dataService } from '../services/dataService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // 1. Check for specific admin email to bootstrap if needed
                if (firebaseUser.email === 'admin@baseballmetrics.app') {
                    await dataService.ensureAdminProfile(firebaseUser.uid, firebaseUser.email);
                }

                // 2. Fetch the actual profile from Firestore to get the real role
                const dbUser = await dataService.getUserById(firebaseUser.uid);

                setUser({
                    id: firebaseUser.uid,
                    email: firebaseUser.email,
                    role: dbUser?.role || 'USER'
                });
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const login = async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error) {
            console.error("Login failed", error);
            let msg = error.message;
            if (msg.includes('auth/invalid-email')) msg = 'Invalid email address.';
            if (msg.includes('auth/user-not-found')) msg = 'No user found with this email.';
            if (msg.includes('auth/wrong-password')) msg = 'Incorrect password.';
            return { success: false, error: msg };
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const updatePassword = async (newPassword) => {
        return { success: false, error: "Password update is handled via Firebase Console." };
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updatePassword, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
