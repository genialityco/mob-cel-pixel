import { useEffect, useState, useContext } from "react";
import {
  Container,
  Title,
  Tabs,
  Card,
  Text,
  Grid,
  Button,
  Stack,
  Group,
  Menu,
  Indicator,
  ActionIcon,
  Flex,
  TextInput,
} from "@mantine/core";
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  orderBy,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { UserContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import { showNotification } from "@mantine/notifications";
import { IoNotificationsOutline } from "react-icons/io5";

const Dashboard = () => {
  const { currentUser } = useContext(UserContext);
  const uid = currentUser?.uid;
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");

  // Estados para asistentes, reuniones y solicitudes
  const [assistants, setAssistants] = useState([]);
  const [filteredAssistants, setFilteredAssistants] = useState([]);
  const [acceptedMeetings, setAcceptedMeetings] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [participantsInfo, setParticipantsInfo] = useState({});
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!uid) return;

    // Escuchar notificaciones en tiempo real para este usuario
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", uid),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filtrar solo las notificaciones NO leídas
      const unreadNotifications = newNotifications.filter(
        (notif) => !notif.read
      );

      // Mostrar solo notificaciones no leídas en el frontend
      unreadNotifications.forEach((notif) => {
        showNotification({
          title: notif.title,
          message: notif.message,
          color: getNotificationColor(notif.type),
          position: "top-right",
        });

        // Marcar la notificación como leída en Firestore
        updateDoc(doc(db, "notifications", notif.id), { read: true });
      });

      // Solo actualizar el estado si hay cambios
      setNotifications((prev) => {
        const prevIds = new Set(prev.map((n) => n.id));
        const newIds = new Set(newNotifications.map((n) => n.id));
        return prevIds.size !== newIds.size ? newNotifications : prev;
      });
    });

    return () => unsubscribe();
  }, [uid]);

  // Función para definir color de la notificación
  const getNotificationColor = (type) => {
    switch (type) {
      case "success":
        return "green";
      case "error":
        return "red";
      case "info":
        return "blue";
      default:
        return "gray";
    }
  };

  useEffect(() => {
    if (!currentUser?.data) navigate("/");
  }, [currentUser, navigate]);

  // Cargar asistentes excluyendo al usuario actual
  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const assistantsData = snapshot.docs
        .filter((docItem) => docItem.id !== uid)
        .map((docItem) => ({ id: docItem.id, ...docItem.data() }));

      setAssistants(assistantsData);
      setFilteredAssistants(assistantsData);
    });

    return () => unsubscribe();
  }, [uid]);

  // Filtrar asistentes cuando cambia el searchTerm
  useEffect(() => {
    const filtered = assistants.filter(
      (assistant) =>
        assistant.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assistant.empresa.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAssistants(filtered);
  }, [searchTerm, assistants]);

  // Cargar reuniones aceptadas
  useEffect(() => {
    const q = query(
      collection(db, "meetings"),
      where("status", "==", "accepted"),
      where("participants", "array-contains", uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const meetings = [];
      const participantsData = {};

      for (const docItem of snapshot.docs) {
        const meeting = { id: docItem.id, ...docItem.data() };
        meetings.push(meeting);

        // Obtener info del otro participante
        const otherUserId =
          meeting.requesterId === uid
            ? meeting.receiverId
            : meeting.requesterId;

        if (!participantsData[otherUserId]) {
          const userDoc = await getDoc(doc(db, "users", otherUserId));
          if (userDoc.exists()) {
            participantsData[otherUserId] = userDoc.data();
          }
        }
      }

      setAcceptedMeetings(meetings);
      setParticipantsInfo(participantsData);
    });

    return () => unsubscribe();
  }, [uid]);

  // Cargar solicitudes
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "meetings"), where("receiverId", "==", uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pending = [];
      const accepted = [];
      const rejected = [];

      snapshot.forEach((docItem) => {
        const data = { id: docItem.id, ...docItem.data() };
        if (data.status === "pending") pending.push(data);
        else if (data.status === "accepted") accepted.push(data);
        else if (data.status === "rejected") rejected.push(data);
      });

      setPendingRequests(pending);
      setAcceptedRequests(accepted);
      setRejectedRequests(rejected);
    });

    return () => unsubscribe();
  }, [uid]);

  // Enviar solicitud de reunión
  const sendMeetingRequest = async (assistantId) => {
    try {
      const existingRequestQuery = query(
        collection(db, "meetings"),
        where("requesterId", "==", uid),
        where("receiverId", "==", assistantId),
        where("status", "==", "pending")
      );

      const existingRequestSnapshot = await getDocs(existingRequestQuery);
      if (!existingRequestSnapshot.empty) {
        showNotification({
          title: "Solicitud pendiente",
          message: "Ya has enviado una solicitud de reunión a esta persona.",
          color: "orange",
          position: "top-right",
        });
        return;
      }

      const meetingRef = await addDoc(collection(db, "meetings"), {
        requesterId: uid,
        receiverId: assistantId,
        status: "pending",
        createdAt: new Date(),
        participants: [uid, assistantId],
      });

      await addDoc(collection(db, "notifications"), {
        userId: assistantId,
        title: "Nueva solicitud de reunión",
        message: `${currentUser.data.nombre} te ha enviado una solicitud de reunión.`,
        type: "info",
        meetingId: meetingRef.id,
        timestamp: new Date(),
        read: false,
      });

      showNotification({
        title: "Solicitud enviada",
        message: "Tu solicitud de reunión ha sido enviada correctamente.",
        color: "blue",
        position: "top-right",
      });
    } catch (error) {
      console.error("Error al enviar la solicitud de reunión:", error);
      showNotification({
        title: "Error",
        message: "Hubo un problema al enviar la solicitud.",
        color: "red",
        position: "top-right",
      });
    }
  };

  const updateMeetingStatus = async (meetingId, newStatus) => {
    try {
      const meetingDocRef = doc(db, "meetings", meetingId);
      const meetingSnap = await getDoc(meetingDocRef);
      if (!meetingSnap.exists()) return;

      const meetingData = meetingSnap.data();
      const requesterId = meetingData.requesterId;
      const receiverId = meetingData.receiverId;

      // Si la reunión ya está aceptada, no volver a procesarla
      if (meetingData.status === "accepted") {
        alert("Esta reunión ya fue aceptada.");
        return;
      }

      if (newStatus === "accepted") {
        // 1. Obtener todas las reuniones aceptadas de ambos participantes
        const acceptedMeetingsQuery = query(
          collection(db, "meetings"),
          where("participants", "array-contains-any", [
            requesterId,
            receiverId,
          ]),
          where("status", "==", "accepted")
        );
        const acceptedMeetingsSnapshot = await getDocs(acceptedMeetingsQuery);

        // 2. Obtener los horarios ocupados por cualquiera de los dos participantes
        const occupiedTimeSlots = new Map(); // Guardar horarios ocupados por usuario

        acceptedMeetingsSnapshot.forEach((meeting) => {
          meeting.data().participants.forEach((participantId) => {
            if (!occupiedTimeSlots.has(participantId)) {
              occupiedTimeSlots.set(participantId, new Set());
            }
            occupiedTimeSlots.get(participantId).add(meeting.data().timeSlot);
          });
        });

        // 3. Buscar un slot disponible en la agenda
        const agendaQuery = query(
          collection(db, "agenda"),
          where("available", "==", true),
          orderBy("startTime")
        );
        const agendaSnapshot = await getDocs(agendaQuery);

        let selectedSlot = null;
        let selectedSlotDoc = null;
        let conflictingParticipant = null; // Para saber quién tiene conflicto de horario

        for (const agendaDoc of agendaSnapshot.docs) {
          const agendaData = agendaDoc.data();
          const timeSlot = `${agendaData.startTime} - ${agendaData.endTime}`;

          // 4. Verificar si el horario ya está ocupado por cualquiera de los dos participantes
          if (
            occupiedTimeSlots.get(requesterId)?.has(timeSlot) ||
            occupiedTimeSlots.get(receiverId)?.has(timeSlot)
          ) {
            conflictingParticipant = occupiedTimeSlots
              .get(requesterId)
              ?.has(timeSlot)
              ? requesterId
              : receiverId;
            continue; // Saltar al siguiente slot
          }

          selectedSlot = agendaData;
          selectedSlotDoc = agendaDoc;
          break;
        }

        // 5. Si no hay horarios disponibles, mostrar mensaje de error
        if (!selectedSlot) {
          const conflictUser =
            conflictingParticipant === requesterId
              ? "El solicitante"
              : "El receptor";
          alert(`${conflictUser} ya tiene una reunión en este horario.`);

          await addDoc(collection(db, "notifications"), {
            userId: meetingData.requesterId,
            title: "No se pudo agendar la reunión",
            message: `${conflictUser} ya tiene una reunión en este horario. Por favor, intenta con otro horario.`,
            type: "error",
            timestamp: new Date(),
            read: false,
          });

          showNotification({
            title: "No se pudo agendar",
            message: `${conflictUser} ya tiene una reunión en este horario.`,
            color: "red",
            position: "top-right",
          });
          return;
        }

        // 6. Asignar el slot encontrado a la reunión
        await updateDoc(meetingDocRef, {
          status: "accepted",
          tableAssigned: selectedSlot.tableNumber.toString(),
          timeSlot: `${selectedSlot.startTime} - ${selectedSlot.endTime}`,
        });

        // 7. Marcar el slot en la agenda como ocupado
        const agendaDocRef = doc(db, "agenda", selectedSlotDoc.id);
        await updateDoc(agendaDocRef, {
          available: false,
          meetingId,
        });

        // 8. Crear una notificación de éxito para el solicitante
        await addDoc(collection(db, "notifications"), {
          userId: requesterId,
          title: "Reunión aceptada",
          message: `Tu solicitud de reunión fue aceptada. Se agendó en la Mesa ${selectedSlot.tableNumber} a las ${selectedSlot.startTime}.`,
          type: "success",
          timestamp: new Date(),
          read: false,
        });

        showNotification({
          title: "Reunión aceptada",
          message: `Se agendó en la Mesa ${selectedSlot.tableNumber} a las ${selectedSlot.startTime}.`,
          color: "green",
          position: "top-right",
        });
      } else {
        // 9. Si se rechaza, actualizar el estado
        await updateDoc(meetingDocRef, { status: newStatus });

        // 10. Enviar notificación al usuario solicitante
        await addDoc(collection(db, "notifications"), {
          userId: requesterId,
          title: "Reunión rechazada",
          message: `Tu solicitud de reunión fue rechazada.`,
          type: "error",
          timestamp: new Date(),
          read: false,
        });

        showNotification({
          title: "Reunión rechazada",
          message: "Has rechazado la reunión.",
          color: "red",
          position: "top-right",
        });
      }
    } catch (error) {
      console.error("Error al actualizar la reunión:", error);
    }
  };

  return (
    <Container>
      <Flex gap="md">
        <Title order={2} mb="md">
          Dashboard
        </Title>
        <Menu position="bottom-start" width={300}>
          <Menu.Target>
            <Indicator label={notifications.length} size={18} color="red">
              <ActionIcon variant="light">
                <IoNotificationsOutline size={24} />
              </ActionIcon>
            </Indicator>
          </Menu.Target>

          <Menu.Dropdown>
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <Menu.Item key={notif.id}>
                  <strong>{notif.title}</strong>
                  <Text size="sm">{notif.message}</Text>
                </Menu.Item>
              ))
            ) : (
              <Text align="center" size="sm" color="dimmed">
                No tienes notificaciones
              </Text>
            )}
          </Menu.Dropdown>
        </Menu>
      </Flex>
      <Tabs defaultValue="asistentes">
        <Tabs.List>
          <Tabs.Tab value="asistentes">
            Asistentes ({assistants.length})
          </Tabs.Tab>
          <Tabs.Tab value="reuniones">
            Reuniones ({acceptedMeetings.length})
          </Tabs.Tab>
          <Tabs.Tab value="solicitudes">
            Solicitudes (
            {pendingRequests.length +
              acceptedRequests.length +
              rejectedRequests.length}
            )
          </Tabs.Tab>
        </Tabs.List>

        {/* TAB ASISTENTES */}
        <Tabs.Panel value="asistentes" pt="md">
          <TextInput
            placeholder="Buscar por nombre o empresa..."
            mb="md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Text>Máximo, puedes agendar 4 reuniones</Text>
          <Grid>
            {filteredAssistants.length > 0 ? (
              filteredAssistants.map((assistant) => (
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

        {/* TAB REUNIONES */}
        <Tabs.Panel value="reuniones" pt="md">
          <Stack>
            {acceptedMeetings.length > 0 ? (
              acceptedMeetings.map((meeting) => {
                const otherUserId =
                  meeting.requesterId === uid
                    ? meeting.receiverId
                    : meeting.requesterId;
                const participant = participantsInfo[otherUserId];

                return (
                  <Card key={meeting.id} shadow="sm" p="lg">
                    <Text>
                      <strong>Reunión con:</strong>{" "}
                      {participant ? participant.nombre : "Cargando..."}
                    </Text>
                    <Text>
                      <strong>Horario:</strong>{" "}
                      {meeting.timeSlot || "Por asignar"}
                    </Text>
                    <Text>
                      <strong>Mesa:</strong>{" "}
                      {meeting.tableAssigned || "Por asignar"}
                    </Text>
                  </Card>
                );
              })
            ) : (
              <Text>No tienes reuniones aceptadas.</Text>
            )}
          </Stack>
        </Tabs.Panel>

        {/* TAB SOLICITUDES */}
        <Tabs.Panel value="solicitudes" pt="md">
          <Tabs defaultValue="pendientes">
            <Tabs.List>
              <Tabs.Tab value="pendientes">
                Pendientes ({pendingRequests.length})
              </Tabs.Tab>
              <Tabs.Tab value="aceptadas">
                Aceptadas ({acceptedRequests.length})
              </Tabs.Tab>
              <Tabs.Tab value="rechazadas">
                Rechazadas ({rejectedRequests.length})
              </Tabs.Tab>
            </Tabs.List>

            {/* TAB DE SOLICITUDES PENDIENTES */}
            <Tabs.Panel value="pendientes" pt="md">
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
                              <strong>Solicitud de reunión de:</strong>{" "}
                              {requester.nombre}
                            </Text>
                            <Text size="sm">Empresa: {requester.empresa}</Text>
                            <Text size="sm">Cargo: {requester.cargo}</Text>
                          </>
                        ) : (
                          <Text>Cargando información del solicitante...</Text>
                        )}
                        <Group mt="sm">
                          <Button
                            color="green"
                            onClick={() =>
                              updateMeetingStatus(request.id, "accepted")
                            }
                          >
                            Aceptar
                          </Button>
                          <Button
                            color="red"
                            onClick={() =>
                              updateMeetingStatus(request.id, "rejected")
                            }
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

            {/* TAB DE SOLICITUDES ACEPTADAS */}
            <Tabs.Panel value="aceptadas" pt="md">
              <Stack>
                {acceptedRequests.length > 0 ? (
                  acceptedRequests.map((request) => {
                    const requester = assistants.find(
                      (user) => user.id === request.requesterId
                    );
                    return (
                      <Card key={request.id} shadow="sm" p="lg">
                        {requester ? (
                          <>
                            <Text>
                              <strong>Solicitud aceptada de:</strong>{" "}
                              {requester.nombre}
                            </Text>
                            <Text size="sm">Empresa: {requester.empresa}</Text>
                            <Text size="sm">Cargo: {requester.cargo}</Text>
                            <Text size="sm">
                              <strong>Horario:</strong>{" "}
                              {request.timeSlot || "Por asignar"}
                            </Text>
                            <Text size="sm">
                              <strong>Mesa:</strong>{" "}
                              {request.tableAssigned || "Por asignar"}
                            </Text>
                          </>
                        ) : (
                          <Text>Cargando información del solicitante...</Text>
                        )}
                      </Card>
                    );
                  })
                ) : (
                  <Text>No tienes solicitudes aceptadas.</Text>
                )}
              </Stack>
            </Tabs.Panel>

            {/* TAB DE SOLICITUDES RECHAZADAS */}
            <Tabs.Panel value="rechazadas" pt="md">
              <Stack>
                {rejectedRequests.length > 0 ? (
                  rejectedRequests.map((request) => {
                    const requester = assistants.find(
                      (user) => user.id === request.requesterId
                    );
                    return (
                      <Card key={request.id} shadow="sm" p="lg">
                        {requester ? (
                          <>
                            <Text>
                              <strong>Solicitud rechazada de:</strong>{" "}
                              {requester.nombre}
                            </Text>
                            <Text size="sm">Empresa: {requester.empresa}</Text>
                            <Text size="sm">Cargo: {requester.cargo}</Text>
                            <Text size="sm" color="red">
                              Esta solicitud fue rechazada.
                            </Text>
                          </>
                        ) : (
                          <Text>Cargando información del solicitante...</Text>
                        )}
                      </Card>
                    );
                  })
                ) : (
                  <Text>No tienes solicitudes rechazadas.</Text>
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
