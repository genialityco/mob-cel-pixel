import { useState } from "react";
import {
  Title,
  Text,
  TextInput,
  Button,
  Stack,
} from "@mantine/core";
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const Landing = () => {
  const [phone, setPhone] = useState("");
  const [color, setColor] = useState("#ffffff");
  const [connected, setConnected] = useState(false);

  // Función para conectarse (ingresar a Firestore, pedir ubicación)
  const handleConnect = async () => {
    if (!phone) return;

    try {
      // Creamos o actualizamos documento con ID = phone
      await setDoc(
        doc(db, "users", phone),
        {
          phone,
          isConnected: true,
          color,
        },
        { merge: true } // para no sobreescribir campos
      );

      // Solicitamos geolocalización
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            await updateDoc(doc(db, "users", phone), {
              location: { latitude, longitude },
            });
          },
          (error) => {
            console.error("Error al obtener ubicación:", error);
          }
        );
      }

      // Suscripción para escuchar cambios en el color
      const userDocRef = doc(db, "users", phone);
      onSnapshot(userDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.color) {
            setColor(data.color);
          }
        }
      });

      setConnected(true);
    } catch (error) {
      console.error("Error al conectarse:", error);
    }
  };

  return (
    /* 
      Opción 1: Pintar el FONDO COMPLETO con el color asignado 
      (puedes darle un minHeight para que sea visible aunque no haya mucho contenido).
    */
    <div
      style={{
        backgroundColor: color,
        minHeight: "100vh",
        padding: "1rem",
      }}
    >
      {/* 
        Opción 2 (alternativa): 
        Usar un Paper en el centro y pintarlo, 
        dejando el fondo blanco o con otro color. 
        Para ello, descomenta la línea de Paper y 
        comenta la línea del <div> anterior.
      */}

      {/* 
      <Paper
        shadow="md"
        p="xl"
        style={{ backgroundColor: color, minHeight: 400, margin: "2rem auto", maxWidth: 400 }}
      > 
      */}

      <Stack spacing="md" align="center" style={{ maxWidth: 400, margin: "0 auto" }}>
        <Title order={3} align="center">
          Conectar Usuario
        </Title>
        <TextInput
          label="Teléfono"
          placeholder="Ingresa tu teléfono"
          value={phone}
          onChange={(e) => setPhone(e.currentTarget.value)}
        />
        <Button onClick={handleConnect} disabled={!phone}>
          Conectarme
        </Button>

        {connected && (
          <>
            <Title order={5} align="center">
              Estás Conectado
            </Title>
            <Text>Teléfono: {phone}</Text>
            <Text>Color actual: {color}</Text>
          </>
        )}
      </Stack>

      {/* Cerrar el Paper si eliges esa opción */}
      {/* </Paper> */}
    </div>
  );
};

export default Landing;
