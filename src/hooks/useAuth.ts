import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { ensureUserDocument } from '../services/auth';
import type { User } from '../types';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeSnapshot: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            // Clean up previous snapshot listener
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }

            if (firebaseUser) {
                try {
                    await ensureUserDocument(firebaseUser);
                } catch (e) {
                    console.error("Auth ensure doc error", e);
                }

                const userRef = doc(db, 'users', firebaseUser.uid);
                unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setUser(docSnap.data() as User);
                    } else {
                        setUser(null);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("User snapshot error:", error);
                    setLoading(false);
                });
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
            }
        };
    }, []);

    return { user, loading };
};
