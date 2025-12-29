import { db, firebaseConfig } from '../firebase';
import {
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    addDoc
} from 'firebase/firestore';
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";

// Initialize secondary app to create users without logging out admin
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

const USERS_COL = 'users';
const METRICS_COL = 'metrics';

export const dataService = {
    // User Management
    getUsers: async () => {
        const snapshot = await getDocs(collection(db, USERS_COL));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    getUserById: async (id) => {
        const docRef = doc(db, USERS_COL, id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    },

    // Not strictly needed with AuthContext flow, but good for checks
    getUserByEmail: async (email) => {
        const q = query(collection(db, USERS_COL), where("email", "==", email));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    },

    ensureAdminProfile: async (uid, email) => {
        const docRef = doc(db, USERS_COL, uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            console.log("Creating missing Admin profile in Firestore...");
            const adminProfile = {
                email,
                role: 'ADMIN',
                name: 'Administrator',
                biometrics: {}, // Empty for admin
                createdAt: new Date().toISOString()
            };
            await setDoc(docRef, adminProfile);
            return adminProfile;
        }
        return docSnap.data();
    },

    createUser: async (userData) => {
        // 1. Create Auth User
        // Use secondary auth instance to prevent current user (Admin) from being signed out
        let userCredential;
        try {
            userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, userData.password);
            // Immediately sign out the secondary user so the instance remains clean
            await signOut(secondaryAuth);
        } catch (error) {
            console.error("Error creating auth user:", error);
            throw error;
        }

        const uid = userCredential.user.uid;

        // 2. Create Firestore Profile
        const newUserProfile = {
            email: userData.email,
            role: 'USER', // Default role
            name: userData.name,
            team: userData.team || '',
            biometrics: userData.biometrics || {},
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, USERS_COL, uid), newUserProfile);

        return { id: uid, ...newUserProfile };
    },

    updateUserPassword: async (id, newPassword) => {
        // This is complex with Firebase Client SDK. 
        // Admin cannot update another user's password without their credential.
        // We will skip this for now or rely on "Forgot Password" flow effectively.
        console.warn("Password update via Admin not fully supported in client-only Firebase mode");
        return false;
    },

    deleteUser: async (id) => {
        // 1. Delete Firestore Profile
        await deleteDoc(doc(db, USERS_COL, id));

        // 2. Delete Metrics
        const q = query(collection(db, METRICS_COL), where("userId", "==", id));
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);

        // Note: We cannot delete the Auth User from client SDK easily without their credential.
        // In a real app, this should be a Cloud Function.
        // For now, we accept the orphaned Auth user.
        return true;
    },

    // Metrics Management
    getMetrics: async () => {
        const snapshot = await getDocs(collection(db, METRICS_COL));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    getUserMetrics: async (userId) => {
        const q = query(collection(db, METRICS_COL), where("userId", "==", userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    addMetric: async (metricData) => {
        const docRef = await addDoc(collection(db, METRICS_COL), {
            ...metricData,
            timestamp: new Date().toISOString()
        });
        return { id: docRef.id, ...metricData };
    },

    deleteMetric: async (id) => {
        await deleteDoc(doc(db, METRICS_COL, id));
        return true;
    },

    init: async () => {
        // Check if admin exists in Firestore?
        // With Firebase Auth, we usually seed via script or manual console.
        // We'll leave this empty or use it to seed initial categories if needed.
    }
};
