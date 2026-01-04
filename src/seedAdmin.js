import { dataService } from './services/dataService';
import { doc, updateDoc, getDocs, query, collection, where } from 'firebase/firestore';
import { db } from './firebase';

export const seedAdmin = async () => {
    const adminEmail = 'asteeds30@gmail.com';
    const adminPassword = 'password123';
    const adminName = 'Admin User';

    console.log(`Starting admin seed process for ${adminEmail}...`);

    try {
        // 1. Try to create the user
        await dataService.createUser({
            email: adminEmail,
            password: adminPassword,
            name: adminName,
            role: 'ADMIN'
        });
        console.log('Admin account created successfully.');
        alert('Admin account created successfully! You can now log in.');
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            console.log('User already exists. Updating role to ADMIN...');

            // 2. Find the user profile in Firestore
            try {
                const q = query(collection(db, 'users'), where("email", "==", adminEmail));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    const userDoc = snapshot.docs[0];
                    await updateDoc(userDoc.ref, { role: 'ADMIN' });
                    console.log(`Role updated to ADMIN for user ID: ${userDoc.id}`);
                    alert('Existing user updated to ADMIN role successfully!');
                } else {
                    console.error('Auth user exists but Firestore profile not found. Could not update role.');
                    alert('Error: Auth user exists but profile missing.');
                }
            } catch (innerError) {
                console.error('Error updating existing user role:', innerError);
            }
        } else {
            console.error('Error creating admin account:', error);
            alert(`Error seeding admin: ${error.message}`);
        }
    }
};
