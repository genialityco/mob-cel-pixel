import { useState, useEffect, useRef } from "react";
import { Container, Title, Paper, Text, Flex } from "@mantine/core";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import anime from "animejs";

// Función para generar los intervalos de horarios
const generateTimeSlots = (start, end, duration) => {
  const slots = [];
  let currentTime = new Date(`1970-01-01T${start}:00`);
  const endTime = new Date(`1970-01-01T${end}:00`);

  while (currentTime < endTime) {
    slots.push(currentTime.toTimeString().substring(0, 5));
    currentTime.setMinutes(currentTime.getMinutes() + duration);
  }

  return slots;
};

const MatrixPage = () => {
  const [config, setConfig] = useState(null);
  const [agenda, setAgenda] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [participantsInfo, setParticipantsInfo] = useState({});
  const [matrix, setMatrix] = useState([]);
  const tableRefs = useRef([]);

  // Cargar Configuración desde Firestore
  useEffect(() => {
    const fetchConfig = async () => {
      const configRef = doc(db, "config", "meetingConfig");
      const configSnap = await getDoc(configRef);
      if (configSnap.exists()) {
        setConfig(configSnap.data());
      }
    };

    fetchConfig();
  }, []);

  // Cargar la Agenda en Tiempo Real
  useEffect(() => {
    if (!config) return;

    const q = query(collection(db, "agenda"), orderBy("startTime"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const agendaData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAgenda(agendaData);
    });

    return () => unsubscribe();
  }, [config]);

  // Cargar las Reuniones en Tiempo Real
  useEffect(() => {
    if (!config) return;

    const q = query(
      collection(db, "meetings"),
      where("status", "!=", "rejected")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meetingsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timeSlot: doc.data().timeSlot.match(/\d{2}:\d{2}/)[0],
      }));
      setMeetings(meetingsData);
    });

    return () => unsubscribe();
  }, [config]);

  // Cargar Información de Participantes en Tiempo Real
  useEffect(() => {
    if (meetings.length === 0) return;

    const fetchParticipants = async () => {
      const usersData = {};
      for (const meeting of meetings) {
        for (const participantId of meeting.participants) {
          if (!usersData[participantId]) {
            const userDoc = await getDoc(doc(db, "users", participantId));
            if (userDoc.exists()) {
              usersData[participantId] = userDoc.data();
            }
          }
        }
      }
      setParticipantsInfo(usersData);
    };

    fetchParticipants();
  }, [meetings]);

  // Construcción de la Matriz con Datos Reales
  useEffect(() => {
    if (!config || agenda.length === 0) return;

    const { numTables, meetingDuration, startTime, endTime } = config;
    const timeSlots = generateTimeSlots(startTime, endTime, meetingDuration);

    // Crear matriz vacía
    const newMatrix = Array.from({ length: numTables }, () =>
      Array(timeSlots.length)
        .fill()
        .map(() => ({
          status: "available",
          participants: [],
        }))
    );

    // Mapear la agenda en la matriz
    agenda.forEach((slot) => {
      const tableIndex = slot.tableNumber - 1;
      const timeSlotIndex = timeSlots.indexOf(slot.startTime);

      if (tableIndex >= 0 && timeSlotIndex >= 0) {
        newMatrix[tableIndex][timeSlotIndex] = {
          status: slot.available ? "available" : "occupied",
          participants: [],
        };
      }
    });

    // Mapear las reuniones en la matriz
    meetings.forEach((meeting) => {
      const tableIndex = Number(meeting.tableAssigned) - 1;
      const timeSlotIndex = timeSlots.indexOf(meeting.timeSlot);

      if (tableIndex >= 0 && timeSlotIndex >= 0) {
        newMatrix[tableIndex][timeSlotIndex] = {
          status: meeting.status,
          participants: meeting.participants.map(
            (id) =>
              participantsInfo[id] || { nombre: "Cargando...", empresa: "..." }
          ),
        };
      }
    });

    setMatrix(newMatrix);
  }, [config, agenda, meetings, participantsInfo]);

  // Animación de colores con Anime.js
  useEffect(() => {
    tableRefs.current.forEach((ref, index) => {
      if (ref) {
        anime({
          targets: ref,
          backgroundColor: getColor(
            matrix[Math.floor(index / matrix[0].length)][
              index % matrix[0].length
            ].status
          ),
          duration: 500,
          easing: "easeInOutQuad",
        });
      }
    });
  }, [matrix]);

  // Función para asignar colores según el estado
  const getColor = (status) => {
    switch (status) {
      case "available":
        return "gray";
      case "occupied":
        return "blue";
      case "pending":
        return "orange";
      case "accepted":
        return "green";
      default:
        return "gray";
    }
  };

  return (
    <Container>
      <Title order={2} mt="md" mb="md">
        Matriz rueda de negocios
      </Title>
      <Paper shadow="sm" p="xl" style={{ margin: "0 auto" }}>
        <Flex
          mih={50}
          bg="rgba(0, 0, 0, .3)"
          gap="md"
          justify="center"
          align="center"
          direction="row"
          wrap="wrap"
        >
          {matrix.map((table, tableIndex) => (
            <div
              key={`table-${tableIndex}`}
              style={{
                padding: "10px",
                margin: "5px",
                border: "1px solid black",
              }}
            >
              <Text>{`Mesa ${tableIndex + 1}`}</Text>
              <table>
                <tbody>
                  {table.map((slot, slotIndex) => (
                    <tr
                      key={`${tableIndex}-${slotIndex}`}
                      ref={(el) =>
                        (tableRefs.current[
                          tableIndex * matrix[0].length + slotIndex
                        ] = el)
                      }
                    >
                      <td>
                        {
                          generateTimeSlots(
                            config.startTime,
                            config.endTime,
                            config.meetingDuration
                          )[slotIndex]
                        }
                      </td>
                      <td style={{ backgroundColor: getColor(slot.status) }}>
                        {slot.status === "available" ? (
                          "Disponible"
                        ) : (
                          <>
                            <Text>
                              <strong>Estado:</strong> {slot.status}
                            </Text>
                            {slot.participants.map((p, index) => (
                              <Text key={index}>
                                <strong>{p.nombre}</strong> ({p.empresa})
                              </Text>
                            ))}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </Flex>
      </Paper>
    </Container>
  );
};

export default MatrixPage;
