import { useState } from "react";
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
import { doc, setDoc, addDoc, collection } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const AdminPanel = () => {
  // Estados para la configuración
  const [maxPersons, setMaxPersons] = useState(100);
  const [numTables, setNumTables] = useState(50);
  const [meetingDuration, setMeetingDuration] = useState(10); // Tiempo de cada cita
  const [breakTime, setBreakTime] = useState(5); // Tiempo de descanso entre citas
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [tableNamesInput, setTableNamesInput] = useState("");
  const [message, setMessage] = useState("");

  // Guardar la configuración en Firestore
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
        tableNames = Array.from(
          { length: numTables },
          (_, i) => (i + 1).toString()
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

  // Generar la agenda con tiempo de descanso entre citas
  const generateAgenda = async () => {
    try {
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
            label="Nombres de mesas (separados por comas, opcional)"
            placeholder="Ej. Mesa 1, Mesa 2, Mesa 3, ..."
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
          <Text size="sm">
            Cada cita durará {meetingDuration} minutos con un descanso de{" "}
            {breakTime} minutos entre citas.
          </Text>
          <Group position="center">
            <Button onClick={saveConfig}>Guardar Configuración</Button>
            <Button onClick={generateAgenda} color="blue">
              Generar Agenda
            </Button>
          </Group>
          {message && <Text color="green">{message}</Text>}
          <Text size="sm">
            Nota: La agenda se generará en la colección agenda con base en esta
            configuración. Cada persona podrá agendar hasta 4 citas máximo.
          </Text>
        </Stack>
      </Paper>
    </Container>
  );
};

export default AdminPanel;
