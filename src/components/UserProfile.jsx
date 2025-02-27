import { useState, useContext, useEffect } from "react";
import {
  Card,
  Title,
  Text,
  Button,
  Modal,
  Stack,
  TextInput,
  Textarea,
  Divider,
  Group,
  Loader,
  SimpleGrid,
  Collapse,
  UnstyledButton,
  ActionIcon,
} from "@mantine/core";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { UserContext } from "../context/UserContext";

const UserProfile = () => {
  const { currentUser, updateUser, logout } =
    useContext(UserContext);
  const uid = currentUser?.uid;

  const [editModalOpened, setEditModalOpened] = useState(false);
  const [editProfileData, setEditProfileData] = useState({});
  const [openedCollapse, setOpenedCollapse] = useState(false);

  useEffect(() => {
    if (currentUser?.data) {
      setEditProfileData(currentUser.data);
    }
  }, [currentUser]);

  const saveProfileChanges = async () => {
    if (!uid) return;
    try {
      await updateUser(uid, editProfileData);
      setEditModalOpened(false);
    } catch (error) {
      console.error("Error al actualizar el perfil:", error);
    }
  };

  if (currentUser === undefined) return <Loader />;

  return (
    <Card shadow="md" style={{ maxWidth: 800, margin: "20px auto" }}>
      <UnstyledButton onClick={() => setOpenedCollapse((o) => !o)}>
        <Group position="apart" noWrap style={{ width: "100%" }}>
          <Title order={3}>Ver mi Información</Title>
          <ActionIcon variant="transparent">
            {openedCollapse ? (
              <FaChevronUp size={16} />
            ) : (
              <FaChevronDown size={16} />
            )}
          </ActionIcon>
        </Group>
      </UnstyledButton>
      <Collapse in={openedCollapse}>
        <Divider my="md" />
        {currentUser?.data ? (
          <>
            <SimpleGrid
              cols={2}
              spacing="md"
              breakpoints={[{ maxWidth: "sm", cols: 1 }]}
            >
              <Text>
                <strong>Nombre:</strong> {currentUser.data.nombre}
              </Text>
              <Text>
                <strong>Cédula:</strong> {currentUser.data.cedula}
              </Text>
              <Text>
                <strong>Empresa:</strong> {currentUser.data.empresa}
              </Text>
              <Text>
                <strong>Cargo:</strong> {currentUser.data.cargo}
              </Text>
              <Text span={2}>
                <strong>Descripción:</strong> {currentUser.data.descripcion}
              </Text>
              <Text span={2}>
                <strong>Interés:</strong> {currentUser.data.interesPrincipal}
              </Text>
              <Text span={2}>
                <strong>Necesidad:</strong> {currentUser.data.necesidad}
              </Text>
              <Text span={2}>
                <strong>Contacto:</strong>{" "}
                {currentUser.data.contacto?.correo || "No proporcionado"} -{" "}
                {currentUser.data.contacto?.telefono || "No proporcionado"}
              </Text>
            </SimpleGrid>
            <Group mt="md" position="apart">
              <Button onClick={() => setEditModalOpened(true)} color="blue">
                Editar Perfil
              </Button>
              <Button onClick={logout} color="red">
                Cerrar Sesión
              </Button>
            </Group>
          </>
        ) : (
          <Text align="center">Cargando perfil...</Text>
        )}
      </Collapse>

      {/* Modal de Edición */}
      <Modal
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        title="Editar Perfil"
        centered
      >
        <Stack>
          <TextInput
            label="Cédula"
            value={editProfileData.cedula || ""}
            onChange={(e) =>
              setEditProfileData({ ...editProfileData, cedula: e.target.value })
            }
          />
          <TextInput
            label="Nombre"
            value={editProfileData.nombre || ""}
            onChange={(e) =>
              setEditProfileData({ ...editProfileData, nombre: e.target.value })
            }
          />
          <TextInput
            label="Empresa"
            value={editProfileData.empresa || ""}
            onChange={(e) =>
              setEditProfileData({
                ...editProfileData,
                empresa: e.target.value,
              })
            }
          />
          <TextInput
            label="Cargo"
            value={editProfileData.cargo || ""}
            onChange={(e) =>
              setEditProfileData({ ...editProfileData, cargo: e.target.value })
            }
          />
          <Textarea
            label="Descripción"
            value={editProfileData.descripcion || ""}
            onChange={(e) =>
              setEditProfileData({
                ...editProfileData,
                descripcion: e.target.value,
              })
            }
          />
          <TextInput
            label="Correo de contacto (opcional)"
            value={editProfileData.contacto?.correo || ""}
            onChange={(e) =>
              setEditProfileData({
                ...editProfileData,
                contacto: {
                  ...editProfileData.contacto,
                  correo: e.target.value,
                },
              })
            }
          />
          <TextInput
            label="Teléfono de contacto (opcional)"
            value={editProfileData.contacto?.telefono || ""}
            onChange={(e) =>
              setEditProfileData({
                ...editProfileData,
                contacto: {
                  ...editProfileData.contacto,
                  telefono: e.target.value,
                },
              })
            }
          />
          <Button onClick={saveProfileChanges} color="green">
            Guardar cambios
          </Button>
        </Stack>
      </Modal>
    </Card>
  );
};

export default UserProfile;
