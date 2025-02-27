import { useState, useEffect } from 'react';
import { Container, Title, Card, Paper, Badge, Stack, NumberInput, TextInput, Button, Group, Text,Flex } from '@mantine/core';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

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

const getRandomStatus = () => {
  const statuses = ['filled', 'pending', 'available'];
  return statuses[Math.floor(Math.random() * statuses.length)];
};

const getRandomParticipants = () => {
  const names = ['Alice', 'Bob', 'Charlie', 'David', 'Eve'];
  const shuffled = names.sort(() => 0.5 - Math.random());
  return [shuffled[0], shuffled[1]];
};

const MatrixPage = () => {
  // Estados para la configuración
  const [maxPersons, setMaxPersons] = useState(100);
  const [numTables, setNumTables] = useState(50);
  const meetingDuration = 10; // Cada cita dura 10 minutos (fijo)
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  // Campo para que el admin ingrese nombres o numeraciones de mesas (separados por comas)
  const [tableNamesInput, setTableNamesInput] = useState("");
  const [message, setMessage] = useState('');
  const [matrix, setMatrix] = useState([]);

  useEffect(() => {
    const timeSlots = generateTimeSlots(startTime, endTime, meetingDuration);
    const newMatrix = Array(numTables).fill().map(() => 
      Array(timeSlots.length).fill().map(() => {
        const status = getRandomStatus();
        return {
          state: status,
          participants: status !== 'available' ? getRandomParticipants() : []
        };
      })
    );

    setMatrix(newMatrix);
  }, [startTime, endTime, meetingDuration, numTables]);

  const getColor = (state) => {
    switch (state) {
      case 'filled':
        return 'green';
      case 'pending':
        return 'orange';
      default:
        return 'gray';
    }
  };

  return (
    <Container>
      <Title order={2} mt="md" mb="md">
        Matriz rueda de negocios
      </Title>
      <Paper shadow="sm" p="xl" style={{ margin: '0 auto' }}>
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
            <div key={`table-${tableIndex}`} style={{ padding: '10px', margin: '5px', border: '1px solid black' }}>
              <Text>{`Table ${tableIndex + 1}`}</Text>
              <table>
                <tbody>
                  {table.map((slot, slotIndex) => (
                    <tr key={`${tableIndex}-${slotIndex}`} style={{ backgroundColor: getColor(slot.state) }}>
                      <td>{generateTimeSlots(startTime, endTime, meetingDuration)[slotIndex]}</td>
                      <td>
                        {slot.state === 'available' 
                          ? 'Available' 
                          : `${slot.participants[0]} & ${slot.participants[1]} (${slot.state})`}
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
