import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  role: 'client' | 'admin' | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, role: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'client' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (isProcessingRef.current) {
          setLoading(false);
          return;
        }
        isProcessingRef.current = true;
        let isGet = true;
        try {
          if (!currentUser) return;
          const userDocRef = doc(db, 'users', currentUser.uid);
          console.log("Fetching user document:", userDocRef.path);
          const userDoc = await getDoc(userDocRef);
          console.log("User document fetched:", userDoc.exists());
          
          const isAdminEmail = currentUser.email?.toLowerCase() === 'kartikdas.kd21@gmail.com';
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // If it's the admin email but role is client, we might want to update it, 
            // but for now let's just trust the doc if it exists, 
            // or override if it's the admin email.
            setRole(isAdminEmail ? 'admin' : userData.role);
          } else {
            if (!currentUser) return;
            isGet = false;
            // Create user
            const newUser = {
               uid: currentUser.uid,
               email: currentUser.email,
               displayName: currentUser.displayName,
               photoURL: currentUser.photoURL,
               role: isAdminEmail ? 'admin' : 'client',
               createdAt: serverTimestamp()
            };
            console.log('Creating user document:', currentUser.uid);
            await setDoc(userDocRef, newUser, { merge: true });
            setRole(isAdminEmail ? 'admin' : 'client');
          }
        } catch (error) {
           // If it's a write error, check if the document was created by a concurrent request
           if (!isGet) {
             try {
               const checkDoc = await getDoc(doc(db, 'users', currentUser.uid));
               if (checkDoc.exists()) {
                 setRole(checkDoc.data().role);
                 return; // Ignore the error since the document exists
               }
             } catch (e) {
               // Ignore
             }
           }
           try {
             handleFirestoreError(error, isGet ? OperationType.GET : OperationType.WRITE, `users/${currentUser.uid}`);
           } catch (e) { /* Logged by handleFirestoreError */ }
        } finally {
          isProcessingRef.current = false;
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
