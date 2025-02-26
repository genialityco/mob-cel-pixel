import { useState } from 'react';
import { TextInput, Textarea, Select, Button, Paper, Title, Stack } from '@mantine/core';
import { signInAnonymously } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState({
    nombre: '',
    empresa: '',
    cargo: '',
    descripcion: '',
    interesPrincipal: '',
    necesidad: '',
    contactoCorreo: '',
    telefono: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Extraer datos del formulario
      const { nombre, empresa, cargo, descripcion, interesPrincipal, necesidad, contactoCorreo, telefono } = formValues;

      // 1. Iniciar sesión de forma anónima en Firebase Auth
      const userCredential = await signInAnonymously(auth);
      const uid = userCredential.user.uid;

      // 2. Guardar los datos adicionales en Firestore
      await setDoc(doc(db, "users", uid), {
        nombre,
        empresa,
        cargo,
        descripcion,
        interesPrincipal,
        necesidad,
        contacto: {
          correo: contactoCorreo || null,
          telefono: telefono || null
        }
      });

      // Redireccionar al dashboard o a la siguiente sección
      navigate('/dashboard');
    } catch (error) {
      console.error("Error en el registro:", error);
      // Aquí podrías mostrar una notificación de error usando un componente de Mantine
    }
    setLoading(false);
  };

  return (
    <Paper shadow="md" p="xl" style={{ maxWidth: 500, margin: '40px auto' }}>
      <Title order={2} align="center" mb="md">Registro de Asistencia</Title>
      <Stack>
        <TextInput 
          label="Nombre" 
          placeholder="Tu nombre completo"
          value={formValues.nombre}
          onChange={(e) => handleChange('nombre', e.target.value)}
          required
        />
        <TextInput 
          label="Empresa" 
          placeholder="Nombre de la empresa"
          value={formValues.empresa}
          onChange={(e) => handleChange('empresa', e.target.value)}
          required
        />
        <TextInput 
          label="Cargo" 
          placeholder="Tu cargo"
          value={formValues.cargo}
          onChange={(e) => handleChange('cargo', e.target.value)}
          required
        />
        <Textarea 
          label="Descripción breve del negocio" 
          placeholder="Describe brevemente tu negocio"
          value={formValues.descripcion}
          onChange={(e) => handleChange('descripcion', e.target.value)}
          required
        />
        <Select 
          label="Interés principal" 
          placeholder="Selecciona una opción"
          data={[
            { value: 'proveedores', label: 'Conocer proveedores' },
            { value: 'clientes', label: 'Conocer clientes' },
            { value: 'abierto', label: 'Abierto' },
          ]}
          value={formValues.interesPrincipal}
          onChange={(value) => handleChange('interesPrincipal', value)}
          required
        />
        <Textarea 
          label="Necesidad específica para la rueda de negocios" 
          placeholder="¿Qué necesitas?"
          value={formValues.necesidad}
          onChange={(e) => handleChange('necesidad', e.target.value)}
          required
        />
        {/* Datos de contacto opcionales */}
        <TextInput 
          label="Correo (opcional)" 
          placeholder="Tu correo electrónico"
          value={formValues.contactoCorreo}
          onChange={(e) => handleChange('contactoCorreo', e.target.value)}
        />
        <TextInput 
          label="Teléfono (opcional)" 
          placeholder="Tu número de teléfono"
          value={formValues.telefono}
          onChange={(e) => handleChange('telefono', e.target.value)}
        />
        <Button onClick={handleSubmit} loading={loading}>Registrarse</Button>
      </Stack>
    </Paper>
  );
};

export default Landing;
