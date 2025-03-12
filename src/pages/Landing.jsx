import { useState } from "react";
import {
  Title,
  Text,
  TextInput,
  Button,
  Stack,
  Paper,
} from "@mantine/core";
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";

// Importa la instancia de Firestore de tu configuración
import { db } from "../firebase/firebaseConfig";

// Importamos QRCode de la librería qrcode.react
import QRCode from "qrcode.react";

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

  // Opción de desconexión (si deseas añadirla):
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
    // Pintamos el fondo con el color asignado.
    // Para un mejor estilo, ajusta spacing o añade minHeight.
    <div
      style={{
        backgroundColor: color,
        minHeight: "100vh",
        padding: "1rem",
      }}
    >
      <Paper
        shadow="md"
        p="xl"
        style={{ 
          maxWidth: 400, 
          margin: "2rem auto",
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
              <QRCode value={phone} size={128} />

              {/* Ejemplo de botón para desconectarse (opcional) */}
              <Button variant="light" color="red" onClick={handleDisconnect}>
                Desconectarme
              </Button>
            </Stack>
          </>
        )}
      </Paper>
    </div>
  );
};

export default Landing;
