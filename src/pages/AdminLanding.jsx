import { useEffect, useState } from "react";
import {
  Paper,
  Title,
  Text,
  Button,
  Stack,
  Loader,
  Divider,
  ActionIcon,
  Group,
} from "@mantine/core";
import { ColorPicker } from "@mantine/core";
import { IconDeviceMobile, IconPalette } from "@tabler/icons-react";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";

const firestore = getFirestore();

const AdminLanding = () => {
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Almacena el color temporal escogido para cada usuario
  const [tempColor, setTempColor] = useState({});
  // Controla si el picker está abierto o cerrado para cada usuario
  const [pickerOpen, setPickerOpen] = useState({});

  useEffect(() => {
    // Escuchamos en tiempo real usuarios que estén conectados
    const q = query(
      collection(firestore, "users"),
      where("isConnected", "==", true)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const users = [];
      snapshot.forEach((docSnap) => {
        users.push({ id: docSnap.id, ...docSnap.data() });
      });
      setConnectedUsers(users);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Manejador para el color (cuando el admin arrastra el picker)
  const handleChangeColor = (userId, newColor) => {
    setTempColor((prev) => ({
      ...prev,
      [userId]: newColor,
    }));
  };

  // Manejador para abrir/cerrar el picker
  const togglePicker = (userId) => {
    setPickerOpen((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // Asigna el color en Firestore
  const handleAssignColor = async (userId) => {
    try {
      const colorToSet = tempColor[userId];
      if (!colorToSet) return; // Si no se eligió color, no hace nada

      await updateDoc(doc(firestore, "users", userId), {
        color: colorToSet,
      });
      // (Opcional) cerrar picker después de asignar
      setPickerOpen((prev) => ({ ...prev, [userId]: false }));
    } catch (error) {
      console.error("Error al asignar color:", error);
    }
  };

  if (loading) return <Loader />;

  return (
    <Paper shadow="md" p="xl" style={{ maxWidth: 600, margin: "40px auto" }}>
      <Title order={2} align="center" mb="lg">
        Panel de Administración
      </Title>
      <Divider mb="lg" />

      {connectedUsers.map((user) => (
        <Paper key={user.id} shadow="sm" p="md" mb="md" withBorder>
          <Stack spacing="xs">
            {/* Fila con ícono de teléfono + teléfono del usuario */}
            <Group position="apart">
              <Group spacing="xs">
                <IconDeviceMobile size={20} />
                <Text weight={500}>{user.id}</Text>
              </Group>

              {/* Indicador del color actual (un pequeño círculo de 20px) */}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  backgroundColor: user.color || "#ffffff",
                  border: "1px solid #ccc",
                }}
              />
            </Group>

            <Stack spacing="xs">
              {/* Botón/ícono para abrir/ocultar el ColorPicker */}
              <ActionIcon
                variant="outline"
                onClick={() => togglePicker(user.id)}
                title="Cambiar color"
              >
                <IconPalette size={18} />
              </ActionIcon>

              {pickerOpen[user.id] && (
                <>
                  <ColorPicker
                    format="hex"
                    swatchesPerRow={8}
                    withPicker={true}
                    // Valor inicial: lo que tengamos en tempColor o en user.color
                    value={tempColor[user.id] || user.color || "#ffffff"}
                    onChange={(value) => handleChangeColor(user.id, value)}
                  />
                  <Button
                    variant="light"
                    mt="sm"
                    onClick={() => handleAssignColor(user.id)}
                  >
                    Asignar Color
                  </Button>
                </>
              )}
            </Stack>
          </Stack>
        </Paper>
      ))}

      {connectedUsers.length === 0 && (
        <Text>No hay usuarios conectados en este momento.</Text>
      )}
    </Paper>
  );
};

export default AdminLanding;
