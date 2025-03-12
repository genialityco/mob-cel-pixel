import { useState } from "react";
import {
  Title,
  Text,
  TextInput,
  Button,
  Stack,
  Paper,
  Center,
} from "@mantine/core";
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { QRCodeCanvas } from "qrcode.react";

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

  // Opción de desconexión (opcional)
  const handleDisconnect = async () => {
    try {
      await updateDoc(doc(db, "users", phone), {
        isConnected: false,
      });
      setConnected(false);
      setPhone("");
      setColor("#ffffff");
    } catch (error) {
      console.error("Error al desconectarse:", error);
    }
  };

  return (
    <div
      style={{
        backgroundColor: color,
        minHeight: "100vh",
        padding: "2rem",
        position: "relative", // Para poder posicionar el watermark
      }}
    >
      {/* 
        Si el usuario está conectado, mostramos un gran texto en el fondo
        (watermark) con el número de teléfono. Puedes personalizar tamaño,
        color, opacidad, etc.
      */}

      {/* Contenido principal al frente */}
      <Center style={{ height: "100%", zIndex: 1 }}>
        <Paper
          shadow="md"
          p="xl"
          style={{
            maxWidth: 400,
            width: "100%",
            backgroundColor: color,
          }}
        >
          {!connected ? (
            <>
              <Title order={3} align="center" mb="lg">
                Conectar Usuario
              </Title>
              <Stack spacing="md">
                <TextInput
                  label="Teléfono"
                  placeholder="Ingresa tu teléfono"
                  value={phone}
                  onChange={(e) => setPhone(e.currentTarget.value)}
                />
                <Button onClick={handleConnect} disabled={!phone}>
                  Conectarme
                </Button>
              </Stack>
            </>
          ) : (
            <>
              <Title order={3} align="center" mb="md">
                ¡Estás Conectado!
              </Title>
              <Stack spacing="sm" align="center">
                <Text weight={600}>Teléfono: {phone}</Text>
                <Text>Color actual: {color}</Text>

                {/* Código QR para identificar al usuario */}
                <QRCodeCanvas value={phone} size={128} />

                {/* Ejemplo de botón para desconectarse (opcional) */}
                <Button variant="light" color="red" onClick={handleDisconnect}>
                  Desconectarme
                </Button>
              </Stack>
            </>
          )}
        </Paper>
      </Center>
    </div>
  );
};

export default Landing;
