import { useState, useEffect, useRef } from 'react';
import { Container, Title, Paper, Text, Flex } from '@mantine/core';
import { db } from '../firebase/firebaseConfig';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import anime from 'animejs';

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
  const [slots, setSlots] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const tableRefs = useRef([]);

  useEffect(() => {

    //['09:00','09:10']
    let slots = generateTimeSlots(startTime, endTime, meetingDuration);
    setSlots(slots);
    console.log('slots',slots)

    const q = query(
      collection(db, "meetings"),
      where("status", "!=", "rejected") // Filtra donde status no sea "rejected"
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tmp_meetings = [];

      snapshot.forEach((docItem) => {
        let data  =  docItem.data();
        data.timeSlotname = data?.timeSlot;
        data.timeSlot = data?.timeSlot.match(/\d{2}:\d{2}/)[0];
        tmp_meetings.push({ id: docItem.id, ...data });
      });
      console.log('tmp_meetings',tmp_meetings)
      console.log('asignando el estado de meeetins de la base de datos')
      setMeetings([...tmp_meetings]);
    });
    return () => unsubscribe();
  }, []);


  useEffect(() => {
    console.log('asignado datos reales',meetings)

    //Agregar datos ficticios
    const timeSlots = generateTimeSlots(startTime, endTime, meetingDuration);
    const newMatrix = Array(numTables).fill().map(() => 
      Array(timeSlots.length).fill().map(() => {
        const status = getRandomStatus();
        return {
          status: status,
          participants: status !== 'available' ? getRandomParticipants() : []
        };
      })
    );

  
    //Asignar reuniones  reales 
    meetings.map((meeting)=>{
      const timeSlotIndex =  slots.indexOf(meeting.timeSlot); 
      const tableIndex = Number(meeting.tableAssigned)-1;
      console.log('matrix  valor previo',tableIndex,timeSlotIndex, newMatrix[tableIndex][timeSlotIndex])
      newMatrix[tableIndex][timeSlotIndex] = meeting
      console.log('matrix  valor nuevo',tableIndex,timeSlotIndex, newMatrix[tableIndex][timeSlotIndex])
    })

    setMatrix(newMatrix);
  }, [startTime, endTime, meetingDuration, numTables,meetings]);

  useEffect(() => {
    tableRefs.current.forEach((ref, index) => {
      if (ref) {
        anime({
          targets: ref,
          backgroundColor: getColor(matrix[Math.floor(index / slots.length)][index % slots.length].status),
          duration: 500,
          easing: 'easeInOutQuad'
        });
      }
    });
  }, [matrix]);

  const getColor = (status) => {
    switch (status) {
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
                    <tr
                      key={`${tableIndex}-${slotIndex}`}
                      ref={(el) => (tableRefs.current[tableIndex * slots.length + slotIndex] = el)}
                    >
                      <td>{slots[slotIndex]}</td>
                      <td style={{backgroundColor:getColor(slot.status)}}> 
                        {slot.status === 'available' 
                          ? 'Available' 
                          : `${slot.participants[0]} & ${slot.participants[1]} (${slot.status})`}
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
