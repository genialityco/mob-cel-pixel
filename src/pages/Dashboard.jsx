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

const Dashboard = () => {
  const { currentUser } = useContext(UserContext);
  const uid = currentUser?.uid;
  const navigate = useNavigate();

  // Estados para asistentes, reuniones y detalles de participantes
  const [assistants, setAssistants] = useState([]);
  const [acceptedMeetings, setAcceptedMeetings] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [participantsInfo, setParticipantsInfo] = useState({});

  useEffect(() => {
    if (currentUser === null) {
      navigate("/");
    }
  }, [currentUser, navigate]);

  // Cargar lista de asistentes (excluyendo al usuario actual)
  useEffect(() => {
    const q = query(collection(db, "users"));
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

        // Obtener información del otro participante
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

  // Cargar solicitudes de reunión pendientes
  useEffect(() => {
    const q = query(
      collection(db, "meetings"),
      where("receiverId", "==", uid),
      where("status", "==", "pending")
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

  // Enviar solicitud de reunión
  const sendMeetingRequest = async (assistantId) => {
    try {
      await addDoc(collection(db, "meetings"), {
        requesterId: uid,
        receiverId: assistantId,
        status: "pending",
        createdAt: new Date(),
        participants: [uid, assistantId],
      });
    } catch (error) {
      console.error("Error al enviar la solicitud de reunión:", error);
    }
  };

  const updateMeetingStatus = async (meetingId, newStatus) => {
    try {
      const meetingDocRef = doc(db, "meetings", meetingId);

      // 1. Obtener los datos de la reunión
      const meetingSnap = await getDoc(meetingDocRef);
      if (!meetingSnap.exists()) return;

      const meetingData = meetingSnap.data();

      // Si la reunión ya está aceptada, no volver a procesarla
      if (meetingData.status === "accepted") {
        alert("Esta reunión ya fue aceptada.");
        return;
      }

      if (newStatus === "accepted") {
        // 2. Validar que el usuario no tenga más de 4 reuniones aceptadas
        const acceptedQuery = query(
          collection(db, "meetings"),
          where("participants", "array-contains", uid),
          where("status", "==", "accepted")
        );
        const acceptedSnapshot = await getDocs(acceptedQuery);

        if (acceptedSnapshot.size >= 4) {
          alert("El usuario ya tiene 4 citas agendadas.");
          return;
        }

        // 3. Obtener los horarios ocupados del usuario
        const occupiedTimeSlots = new Set();
        acceptedSnapshot.forEach((meeting) => {
          occupiedTimeSlots.add(meeting.data().timeSlot);
        });

        // 4. Buscar un slot disponible que no tenga conflictos
        const agendaQuery = query(
          collection(db, "agenda"),
          where("available", "==", true),
          orderBy("startTime")
        );
        const agendaSnapshot = await getDocs(agendaQuery);

        let selectedSlot = null;
        let selectedSlotDoc = null;

        for (const agendaDoc of agendaSnapshot.docs) {
          const agendaData = agendaDoc.data();
          const timeSlot = `${agendaData.startTime} - ${agendaData.endTime}`;

          if (!occupiedTimeSlots.has(timeSlot)) {
            selectedSlot = agendaData;
            selectedSlotDoc = agendaDoc;
            break;
          }
        }

        // 5. Si no hay horarios disponibles, mostrar mensaje de error
        if (!selectedSlot) {
          alert("No hay horarios disponibles para agendar esta reunión.");
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

        alert("Reunión aceptada y asignada correctamente.");
      } else {
        // Si se rechaza, simplemente actualizar el estado
        await updateDoc(meetingDocRef, { status: newStatus });
      }
    } catch (error) {
      console.error("Error al actualizar la reunión:", error);
    }
  };

  return (
    <Container>
      <Title order={2} mb="md">
        Dashboard
      </Title>
      <Tabs defaultValue="asistentes">
        <Tabs.List>
          <Tabs.Tab value="asistentes">Asistentes</Tabs.Tab>
          <Tabs.Tab value="reuniones">Reuniones</Tabs.Tab>
        </Tabs.List>

        {/* Pestaña de Asistentes */}
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

        {/* Pestaña de Reuniones */}
        <Tabs.Panel value="reuniones" pt="md">
          <Tabs defaultValue="agenda">
            <Tabs.List>
              <Tabs.Tab value="agenda">Agenda</Tabs.Tab>
              <Tabs.Tab value="solicitudes">Solicitudes</Tabs.Tab>
            </Tabs.List>

            {/* Reuniones aceptadas */}
            <Tabs.Panel value="agenda" pt="md">
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
                          <strong>Empresa:</strong>{" "}
                          {participant?.empresa || "No disponible"}
                        </Text>
                        <Text>
                          <strong>Cargo:</strong>{" "}
                          {participant?.cargo || "No disponible"}
                        </Text>
                        <Text>
                          <strong>Contacto:</strong>{" "}
                          {participant?.contacto?.correo || "No proporcionado"}{" "}
                          -{" "}
                          {participant?.contacto?.telefono ||
                            "No proporcionado"}
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

            {/* Solicitudes de reunión pendientes */}
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
          </Tabs>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};

export default Dashboard;
