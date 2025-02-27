import { createContext, useState, useEffect } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getDoc, doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;
        const userDoc = await getDoc(doc(db, "users", uid));
        user.data = null;
        if (userDoc.exists()) {
          user.data = userDoc.data();
        }
        setCurrentUser(user);
      } else {
        try {
          const userCredential = await signInAnonymously(auth);
          setCurrentUser(userCredential.user);
        } catch (error) {
          console.error("Error initializing user:", error);
        }
      }
      setUserLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateUser = async (uid, data) => {
    try {
      await setDoc(doc(db, "users", uid), data);
      setCurrentUser((prevUser) => ({
        ...prevUser,
        data: { ...prevUser.data, ...data },
      }));
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  return (
    <UserContext.Provider value={{ 
      currentUser, 
      userLoading, 
      updateUser 
    }}>
      {children}
    </UserContext.Provider>
  );
};
