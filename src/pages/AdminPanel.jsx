import { useEffect, useState } from "react";
import {
  Container,
  Title,
  Paper,
  Stack,
  NumberInput,
  TextInput,
  Button,
  Group,
  Text,
} from "@mantine/core";
import {
  doc,
  setDoc,
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const AdminPanel = () => {
  // Estados para la configuración
  const [maxPersons, setMaxPersons] = useState(100);
  const [numTables, setNumTables] = useState(50);
  const [meetingDuration, setMeetingDuration] = useState(10);
  const [breakTime, setBreakTime] = useState(5);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [tableNamesInput, setTableNamesInput] = useState("");
  const [message, setMessage] = useState("");

  // Estados para asignación manual
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [participant1, setParticipant1] = useState("");
  const [participant2, setParticipant2] = useState("");

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, "config", "meetingConfig"));
        if (configDoc.exists()) {
          const data = configDoc.data();
          setMaxPersons(data.maxPersons);
          setNumTables(data.numTables);
          setMeetingDuration(data.meetingDuration);
          setBreakTime(data.breakTime);
          setStartTime(data.startTime);
          setEndTime(data.endTime);
          setTableNamesInput(data.tableNames.join(", ")); // Convertimos el array en string
        }
      } catch (error) {
        console.error("Error al cargar configuración:", error);
      }
    };

    fetchConfig();
  }, []);

  // Guardar configuración en Firestore
  const saveConfig = async () => {
    try {
      let tableNames = [];
      if (tableNamesInput.trim() !== "") {
        tableNames = tableNamesInput
          .split(",")
          .map((name) => name.trim())
          .filter((name) => name !== "");
        if (tableNames.length !== numTables) {
          setMessage(
            `Se han ingresado ${tableNames.length} nombres de mesas; se usará este número como cantidad de mesas.`
          );
          setNumTables(tableNames.length);
        }
      } else {
        tableNames = Array.from({ length: numTables }, (_, i) =>
          (i + 1).toString()
        );
      }

      const configData = {
        maxPersons,
        numTables,
        meetingDuration,
        breakTime,
        startTime,
        endTime,
        tableNames,
      };

      await setDoc(doc(db, "config", "meetingConfig"), configData);
      setMessage("Configuración guardada correctamente.");
    } catch (error) {
      console.error("Error al guardar configuración:", error);
      setMessage("Error al guardar configuración.");
    }
  };

  // Funciones auxiliares para convertir horas a minutos y viceversa
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}`;
  };

  // Generar la agenda con descanso entre citas
  const generateAgenda = async () => {
    try {
      await resetAgenda(); // Borrar agenda antes de generar nueva

      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);
      const totalSlots = Math.floor(
        (endMinutes - startMinutes) / (meetingDuration + breakTime)
      );
      let createdCount = 0;

      for (let slot = 0; slot < totalSlots; slot++) {
        const slotStart = startMinutes + slot * (meetingDuration + breakTime);
        const slotEnd = slotStart + meetingDuration;
        const slotStartTime = minutesToTime(slotStart);
        const slotEndTime = minutesToTime(slotEnd);

        for (let tableNumber = 1; tableNumber <= numTables; tableNumber++) {
          const slotData = {
            tableNumber,
            startTime: slotStartTime,
            endTime: slotEndTime,
            available: true,
          };

          await addDoc(collection(db, "agenda"), slotData);
          createdCount++;
        }
      }
      setMessage(`Agenda generada con éxito: ${createdCount} slots creados.`);
    } catch (error) {
      console.error("Error al generar la agenda:", error);
      setMessage("Error al generar la agenda.");
    }
  };

  // Restablecer la agenda (Eliminar todas las citas)
  const resetAgenda = async () => {
    try {
      // Eliminar todas las reuniones en la colección "meetings"
      const meetingsSnapshot = await getDocs(collection(db, "meetings"));
      meetingsSnapshot.forEach(async (docItem) => {
        await deleteDoc(doc(db, "meetings", docItem.id));
      });

      // Marcar todos los slots en "agenda" como disponibles nuevamente
      const agendaSnapshot = await getDocs(collection(db, "agenda"));
      agendaSnapshot.forEach(async (docItem) => {
        await updateDoc(doc(db, "agenda", docItem.id), {
          available: true,
          meetingId: null, // Removemos la reunión asignada
        });
      });

      setMessage(
        "Agenda restablecida: Todas las reuniones eliminadas y los horarios habilitados."
      );
    } catch (error) {
      console.error("Error al restablecer la agenda:", error);
      setMessage("Error al restablecer la agenda.");
    }
  };

  // Asignar reunión manualmente
  const assignMeetingManually = async () => {
    try {
      if (
        !selectedTable ||
        !selectedTimeSlot ||
        !participant1 ||
        !participant2
      ) {
        setMessage(
          "Todos los campos son obligatorios para asignar una reunión."
        );
        return;
      }

      const meetingData = {
        tableAssigned: selectedTable,
        timeSlot: selectedTimeSlot,
        status: "accepted",
        participants: [participant1, participant2],
      };

      await addDoc(collection(db, "meetings"), meetingData);
      setMessage("Reunión asignada manualmente con éxito.");
    } catch (error) {
      console.error("Error al asignar reunión:", error);
      setMessage("Error al asignar reunión.");
    }
  };

  return (
    <Container>
      <Title order={2} mt="md" mb="md">
        Panel de Administración
      </Title>
      <Paper shadow="sm" p="xl" style={{ maxWidth: 600, margin: "0 auto" }}>
        <Stack spacing="md">
          <NumberInput
            label="Cantidad máxima de personas"
            value={maxPersons}
            onChange={setMaxPersons}
            min={1}
          />
          <NumberInput
            label="Cantidad de mesas"
            value={numTables}
            onChange={setNumTables}
            min={1}
          />
          <TextInput
            label="Nombres de mesas (opcional)"
            placeholder="Ej. Mesa 1, Mesa 2, ..."
            value={tableNamesInput}
            onChange={(e) => setTableNamesInput(e.target.value)}
          />
          <NumberInput
            label="Duración de cada cita (minutos)"
            value={meetingDuration}
            onChange={setMeetingDuration}
            min={5}
          />
          <NumberInput
            label="Tiempo entre citas (minutos)"
            value={breakTime}
            onChange={setBreakTime}
            min={0}
          />
          <TextInput
            label="Hora de inicio de citas (HH:mm)"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <TextInput
            label="Hora de fin de citas (HH:mm)"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
          <Group position="center">
            <Button onClick={saveConfig}>Guardar Configuración</Button>
            <Button onClick={generateAgenda} color="blue">
              Generar Agenda
            </Button>
            <Button onClick={resetAgenda} color="red">
              Restablecer Agenda
            </Button>
          </Group>
          {message && <Text color="green">{message}</Text>}
        </Stack>

        {/* Asignación Manual */}
        <Title order={3} mt="xl">
          Asignar Reunión Manualmente
        </Title>
        <Stack>
          <TextInput
            label="Número de Mesa"
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
          />
          <TextInput
            label="Horario"
            value={selectedTimeSlot}
            onChange={(e) => setSelectedTimeSlot(e.target.value)}
          />
          <TextInput
            label="Participante 1"
            value={participant1}
            onChange={(e) => setParticipant1(e.target.value)}
          />
          <TextInput
            label="Participante 2"
            value={participant2}
            onChange={(e) => setParticipant2(e.target.value)}
          />
          <Button onClick={assignMeetingManually} color="green">
            Asignar Reunión
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};

export default AdminPanel;
