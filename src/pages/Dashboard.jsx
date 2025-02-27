import { useEffect, useState, useContext } from 'react';
import {
  Container,
  Title,
  Card,
  Button,
  Text,
  Group,
  Grid,
  Modal,
  TextInput,
  Textarea,
  Stack,
  Tabs,
} from '@mantine/core';
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  addDoc,
  query,
  where,
  getDoc,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { UserContext } from '../context/UserContext';

const Dashboard = () => {
  const { currentUser, userLoading, updateUser } = useContext(UserContext);
  const uid = currentUser.uid;

  // Estados para la información del usuario, asistentes y reuniones.
  const [assistants, setAssistants] = useState([]);
  const [acceptedMeetings, setAcceptedMeetings] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  // Estados para el modal de edición del perfil
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [profileData, setProfileData] = useState({});
  const [editProfileData, setEditProfileData] = useState({});

  // Cargar perfil del usuario
  useEffect(() => {
    if (currentUser?.data)
      setProfileData(currentUser?.data);
      setEditProfileData(currentUser?.data);

  }, [currentUser]);

  // Cargar lista de asistentes (todos los usuarios excepto el actual)
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const users = [];
      querySnapshot.forEach((docItem) => {
        if (docItem.id !== uid) {
          users.push({ id: docItem.id, ...docItem.data() });
        }
      });
      setAssistants(users);
    });
    return () => unsubscribe();
  }, [uid]);

  // Cargar reuniones aceptadas (donde status es "accepted" y participants incluye uid)
  useEffect(() => {
    const q = query(
      collection(db, 'meetings'),
      where('status', '==', 'accepted'),
      where('participants', 'array-contains', uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meetings = [];
      snapshot.forEach((docItem) => {
        meetings.push({ id: docItem.id, ...docItem.data() });
      });
      setAcceptedMeetings(meetings);
    });
    return () => unsubscribe();
  }, [uid]);

  // Cargar solicitudes de reunión pendientes (donde el usuario es receptor y status es "pending")
  useEffect(() => {
    const q = query(
      collection(db, 'meetings'),
      where('receiverId', '==', uid),
      where('status', '==', 'pending')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = [];
      snapshot.forEach((docItem) => {
        requests.push({ id: docItem.id, ...docItem.data() });
      });
      setPendingRequests(requests);
    });
    return () => unsubscribe();
  }, [uid]);

  // Función para guardar cambios del perfil
  const saveProfileChanges = async () => {
    try {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, editProfileData);
      setProfileData(editProfileData); // Update context
      setEditModalOpened(false);
    } catch (error) {
      console.error('Error al actualizar el perfil:', error);
    }
  };

  // Función para enviar solicitud de reunión a un asistente
  const sendMeetingRequest = async (assistantId) => {
    try {
      await addDoc(collection(db, 'meetings'), {
        requesterId: uid,
        receiverId: assistantId,
        status: 'pending', // Estado por defecto
        createdAt: new Date(),
        participants: [uid, assistantId],
      });
    } catch (error) {
      console.error('Error al enviar la solicitud de reunión:', error);
    }
  };

  // Función para actualizar el estado de una reunión pendiente, asignando un slot si se acepta
  const updateMeetingStatus = async (meetingId, newStatus) => {
    try {
      const meetingDocRef = doc(db, 'meetings', meetingId);
      
      if (newStatus === 'accepted') {
        // 1. Obtener los datos de la reunión
        const meetingSnap = await getDoc(meetingDocRef);
        if (!meetingSnap.exists()) return;
        const meetingData = meetingSnap.data();

        // 2. Validar que el solicitante (o el usuario en cuestión) tenga menos de 4 citas aceptadas
        const acceptedQuery = query(
          collection(db, 'meetings'),
          where('requesterId', '==', meetingData.requesterId),
          where('status', '==', 'accepted')
        );
        const acceptedSnapshot = await getDocs(acceptedQuery);
        if (acceptedSnapshot.size >= 4) {
          alert("El usuario ya tiene 4 citas agendadas.");
          return;
        }
        
        // 3. Recuperar la configuración actual desde el AdminPanel
        const configDocRef = doc(db, 'config', 'meetingConfig');
        const configSnap = await getDoc(configDocRef);
        if (!configSnap.exists()) {
          alert("No se encontró la configuración de la agenda.");
          return;
        }
        const configData = configSnap.data();

        // 4. Buscar un slot disponible en la colección "agenda"
        const agendaQuery = query(
          collection(db, 'agenda'),
          where('available', '==', true),
          orderBy('startTime'),
          limit(1)
        );
        const agendaSnapshot = await getDocs(agendaQuery);
        if (agendaSnapshot.empty) {
          alert("No hay slots disponibles para asignar.");
          return;
        }
        const agendaDoc = agendaSnapshot.docs[0];
        const agendaData = agendaDoc.data();

        // 5. Usar la configuración para obtener el nombre o numeración de la mesa asignada
        // Si se definieron nombres de mesas, se utiliza el nombre; de lo contrario, se usa el número de mesa
        let tableAssignment = agendaData.tableNumber.toString();
        if (configData.tableNames && configData.tableNames.length > 0) {
          // Suponemos que los nombres están ordenados y que tableNumber es 1-indexado
          tableAssignment = configData.tableNames[agendaData.tableNumber - 1];
        }

        // 6. Actualizar la reunión con el slot asignado usando la configuración
        await updateDoc(meetingDocRef, {
          status: 'accepted',
          tableAssigned: tableAssignment,  // Campo con el nombre/numero de mesa
          timeSlot: `${agendaData.startTime} - ${agendaData.endTime}`,
        });

        // 7. Marcar el slot en "agenda" como ocupado
        const agendaDocRef = doc(db, 'agenda', agendaDoc.id);
        await updateDoc(agendaDocRef, {
          available: false,
          meetingId,
        });
      } else if (newStatus === 'rejected') {
        // Actualizar simplemente el estado a rechazado
        await updateDoc(meetingDocRef, { status: newStatus });
      }
    } catch (error) {
      console.error('Error al actualizar el estado de la reunión:', error);
    }
  };

  return (
    <Container>
      <Title order={2} mb="md">
        Dashboard
      </Title>
      <Tabs defaultValue="perfil">
        <Tabs.List>
          <Tabs.Tab value="perfil">Mi Perfil</Tabs.Tab>
          <Tabs.Tab value="asistentes">Asistentes</Tabs.Tab>
          <Tabs.Tab value="reuniones">Reuniones</Tabs.Tab>
        </Tabs.List>

        {/* Pestaña: Mi Perfil */}
        <Tabs.Panel value="perfil" pt="md">
          <Card shadow="sm" p="lg" mb="md">
            <Title order={4}>Mi Perfil</Title>
            {profileData ? (
              <div>
                <Text>
                  <strong>Nombre:</strong> {profileData.nombre}
                </Text>
                <Text>
                  <strong>Empresa:</strong> {profileData.empresa}
                </Text>
                <Text>
                  <strong>Cargo:</strong> {profileData.cargo}
                </Text>
                <Text>
                  <strong>Descripción:</strong> {profileData.descripcion}
                </Text>
                <Text>
                  <strong>Interés:</strong> {profileData.interesPrincipal}
                </Text>
                <Text>
                  <strong>Necesidad:</strong> {profileData.necesidad}
                </Text>
                <Text>
                  <strong>Contacto:</strong>{' '}
                  {profileData.contacto?.correo || 'No proporcionado'} -{' '}
                  {profileData.contacto?.telefono || 'No proporcionado'}
                </Text>
                <Button mt="md" onClick={() => setEditModalOpened(true)}>
                  Editar Perfil
                </Button>
              </div>
            ) : (
              <Text>Cargando perfil...</Text>
            )}
          </Card>

          <Modal
            opened={editModalOpened}
            onClose={() => setEditModalOpened(false)}
            title="Editar Perfil"
          >
            <Stack>
              <TextInput
                label="Nombre"
                value={editProfileData.nombre || ''}
                onChange={(e) =>
                  setEditProfileData({
                    ...editProfileData,
                    nombre: e.target.value,
                  })
                }
              />
              <TextInput
                label="Empresa"
                value={editProfileData.empresa || ''}
                onChange={(e) =>
                  setEditProfileData({
                    ...editProfileData,
                    empresa: e.target.value,
                  })
                }
              />
              <TextInput
                label="Cargo"
                value={editProfileData.cargo || ''}
                onChange={(e) =>
                  setEditProfileData({
                    ...editProfileData,
                    cargo: e.target.value,
                  })
                }
              />
              <Textarea
                label="Descripción"
                value={editProfileData.descripcion || ''}
                onChange={(e) =>
                  setEditProfileData({
                    ...editProfileData,
                    descripcion: e.target.value,
                  })
                }
              />
              <TextInput
                label="Interés principal"
                value={editProfileData.interesPrincipal || ''}
                onChange={(e) =>
                  setEditProfileData({
                    ...editProfileData,
                    interesPrincipal: e.target.value,
                  })
                }
              />
              <Textarea
                label="Necesidad"
                value={editProfileData.necesidad || ''}
                onChange={(e) =>
                  setEditProfileData({
                    ...editProfileData,
                    necesidad: e.target.value,
                  })
                }
              />
              <TextInput
                label="Correo de contacto (opcional)"
                value={editProfileData.contacto?.correo || ''}
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
                value={editProfileData.contacto?.telefono || ''}
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
              <Button onClick={saveProfileChanges}>Guardar cambios</Button>
            </Stack>
          </Modal>
        </Tabs.Panel>

        {/* Pestaña: Asistentes */}
        <Tabs.Panel value="asistentes" pt="md">
          <Grid>
            {assistants.length > 0 ? (
              assistants.map((assistant) => (
                <Grid.Col xs={12} sm={6} md={4} key={assistant.id}>
                  <Card shadow="sm" p="lg">
                    <Title order={5}>{assistant.nombre}</Title>
                    <Text size="sm">{assistant.empresa}</Text>
                    <Text size="sm">{assistant.cargo}</Text>
                    <Button
                      mt="sm"
                      fullWidth
                      onClick={() => sendMeetingRequest(assistant.id)}
                    >
                      Solicitar reunión
                    </Button>
                  </Card>
                </Grid.Col>
              ))
            ) : (
              <Text>No hay asistentes registrados.</Text>
            )}
          </Grid>
        </Tabs.Panel>

        {/* Pestaña: Reuniones */}
        <Tabs.Panel value="reuniones" pt="md">
          <Tabs defaultValue="agenda">
            <Tabs.List>
              <Tabs.Tab value="agenda">Agenda</Tabs.Tab>
              <Tabs.Tab value="solicitudes">Solicitudes</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="agenda" pt="md">
              <Stack>
                {acceptedMeetings.length > 0 ? (
                  acceptedMeetings.map((meeting) => (
                    <Card key={meeting.id} shadow="sm" p="lg">
                      <Text>
                        Reunión con:{' '}
                        {meeting.requesterId === uid
                          ? `Asistente (${meeting.receiverId})`
                          : `Asistente (${meeting.requesterId})`}
                      </Text>
                      <Text>
                        Horario:{' '}
                        {meeting.timeSlot ? meeting.timeSlot : 'Por asignar'} Mesa: {meeting.tableAssigned}
                      </Text>
                    </Card>
                  ))
                ) : (
                  <Text>No tienes reuniones aceptadas.</Text>
                )}
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="solicitudes" pt="md">
              <Stack>
                {pendingRequests.length > 0 ? (
                  pendingRequests.map((request) => {
                    const requester = assistants.find(
                      (user) => user.id === request.requesterId
                    );
                    return (
                      <Card key={request.id} shadow="sm" p="lg">
                        {requester ? (
                          <>
                            <Text>
                              <strong>Solicitud de reunión de:</strong> {requester.nombre}
                            </Text>
                            <Text size="sm">Empresa: {requester.empresa}</Text>
                            <Text size="sm">Cargo: {requester.cargo}</Text>
                            <Text size="sm">
                              Contacto: {requester.contacto?.correo || 'No proporcionado'} -{' '}
                              {requester.contacto?.telefono || 'No proporcionado'}
                            </Text>
                          </>
                        ) : (
                          <Text>Cargando información del solicitante...</Text>
                        )}
                        <Group mt="sm">
                          <Button
                            color="green"
                            onClick={() => updateMeetingStatus(request.id, 'accepted')}
                          >
                            Aceptar
                          </Button>
                          <Button
                            color="red"
                            onClick={() => updateMeetingStatus(request.id, 'rejected')}
                          >
                            Rechazar
                          </Button>
                        </Group>
                      </Card>
                    );
                  })
                ) : (
                  <Text>No tienes solicitudes de reunión pendientes.</Text>
                )}
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};

export default Dashboard;
