import { useState, useEffect, useContext } from "react";
import { TextInput, Textarea, Select, Button, Paper, Title, Stack, Loader } from "@mantine/core";
import { getDoc, doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";

// Utility function to set the value of a nested property
const setNestedValue = (obj, path, value) => {
  const keys = path.split(".");
  const lastKey = keys.pop();
  const lastObj = keys.reduce((obj, key) => (obj[key] = obj[key] || {}), obj);
  lastObj[lastKey] = value;
};

const Landing = () => {
  const navigate = useNavigate();
  const { currentUser, userLoading, updateUser } = useContext(UserContext);
  const [formValues, setFormValues] = useState({
    nombre: "",
    empresa: "",
    cargo: "",
    descripcion: "",
    interesPrincipal: "",
    necesidad: "",
    contacto: { correo: "", telefono: "" },
  });
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    if (currentUser?.data)
          setFormValues(currentUser?.data);
  }, [currentUser]);

  const handleChange = (field, value) => {
    setFormValues((prev) => {
      const updatedValues = { ...prev };
      setNestedValue(updatedValues, field, value);
      return updatedValues;
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const uid = currentUser.uid;
      await updateUser(uid, formValues);
      navigate("/dashboard");
    } catch (error) {
      console.error("Error en el registro:", error);
    }
    setLoading(false);
  };

  if (loading || userLoading) {
    return <Loader />;
  }

  return (
    <Paper shadow="md" p="xl" style={{ maxWidth: 500, margin: "40px auto" }}>
      <p>uid: {currentUser?.uid}</p>
      <Title order={2} align="center" mb="md">
        Registro de Asistencia
      </Title>
      <Stack>
        <TextInput
          label="Nombre"
          placeholder="Tu nombre completo"
          value={formValues.nombre}
          onChange={(e) => handleChange("nombre", e.target.value)}
          required
        />
        <TextInput
          label="Empresa"
          placeholder="Nombre de la empresa"
          value={formValues.empresa}
          onChange={(e) => handleChange("empresa", e.target.value)}
          required
        />
        <TextInput
          label="Cargo"
          placeholder="Tu cargo"
          value={formValues.cargo}
          onChange={(e) => handleChange("cargo", e.target.value)}
          required
        />
        <Textarea
          label="Descripción breve del negocio"
          placeholder="Describe brevemente tu negocio"
          value={formValues.descripcion}
          onChange={(e) => handleChange("descripcion", e.target.value)}
          required
        />
        <Select
          label="Interés principal"
          placeholder="Selecciona una opción"
          data={[
            { value: "proveedores", label: "Conocer proveedores" },
            { value: "clientes", label: "Conocer clientes" },
            { value: "abierto", label: "Abierto" },
          ]}
          value={formValues.interesPrincipal}
          onChange={(value) => handleChange("interesPrincipal", value)}
          required
        />
        <Textarea
          label="Necesidad específica para la rueda de negocios"
          placeholder="¿Qué necesitas?"
          value={formValues.necesidad}
          onChange={(e) => handleChange("necesidad", e.target.value)}
          required
        />
        <TextInput
          label="Correo (opcional)"
          placeholder="Tu correo electrónico"
          value={formValues?.contacto?.correo}
          onChange={(e) => handleChange("contacto.correo", e.target.value)}
        />
        <TextInput
          label="Teléfono (opcional)"
          placeholder="Tu número de teléfono"
          value={formValues?.contacto?.telefono}
          onChange={(e) => handleChange("contacto.telefono", e.target.value)}
        />
        <Button onClick={handleSubmit} loading={loading}>
          Registrarse
        </Button>
      </Stack>
    </Paper>
  );
};

export default Landing;
