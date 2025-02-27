import { createContext, useState, useEffect } from "react";
import { onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import {
  getDoc,
  doc,
  setDoc,
  query,
  collection,
  where,
  getDocs,
} from "firebase/firestore";
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

        const userData = userDoc.exists() ? userDoc.data() : null;

        setCurrentUser({ ...user, data: userData });
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
      await setDoc(doc(db, "users", uid), data, { merge: true });
      setCurrentUser((prevUser) => ({
        ...prevUser,
        data: { ...prevUser.data, ...data },
      }));
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const loginByCedula = async (cedula) => {
    try {
      const q = query(collection(db, "users"), where("cedula", "==", cedula));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return { error: "No se encontró ningún usuario con esa cédula." };
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // Simular inicio de sesión con este usuario (no Firebase Auth, solo en el contexto)
      setCurrentUser({ uid: userDoc.id, data: userData });

      return { success: true };
    } catch (error) {
      console.error("Error al buscar usuario:", error);
      return { error: "Error al buscar usuario. Intente nuevamente." };
    }
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        userLoading,
        updateUser,
        logout,
        loginByCedula,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
