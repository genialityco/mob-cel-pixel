import { useState, useEffect, useContext, useCallback } from "react";
import {
  TextInput,
  Textarea,
  Select,
  Button,
  Paper,
  Title,
  Stack,
  Loader,
  Divider,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";

const Landing = () => {
  const navigate = useNavigate();
  const { currentUser, userLoading, updateUser, loginByCedula } =
    useContext(UserContext);

  const [formValues, setFormValues] = useState({
    nombre: "",
    cedula: "",
    empresa: "",
    cargo: "",
    descripcion: "",
    interesPrincipal: "",
    necesidad: "",
    contacto: { correo: "", telefono: "" },
  });

  const [loading, setLoading] = useState(false);
  const [searchCedula, setSearchCedula] = useState("");
  const [searchError, setSearchError] = useState("");

  // Cargar datos del usuario si existe en `currentUser`
  useEffect(() => {
    if (currentUser?.data) {
      setFormValues((prev) => ({
        ...prev,
        ...currentUser.data,
      }));
    }
  }, [currentUser]);

  // Manejar cambios en el formulario
  const handleChange = (field, value) => {
    if (field.startsWith("contacto.")) {
      const key = field.split(".")[1];
      setFormValues((prev) => ({
        ...prev,
        contacto: {
          ...prev.contacto,
          [key]: value,
        },
      }));
    } else {
      setFormValues((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  // Buscar usuario por cédula
  const handleSearchByCedula = async () => {
    setLoading(true);
    setSearchError("");

    const result = await loginByCedula(searchCedula);

    if (result.error) {
      setSearchError(result.error);
    }
    setLoading(false);
  };

  // Enviar formulario (registrar usuario)
  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      const uid = currentUser.uid;
      await updateUser(uid, formValues);
      navigate("/dashboard");
    } catch (error) {
      console.error("Error en el registro:", error);
    }
    setLoading(false);
  }, [currentUser, formValues, navigate, updateUser]);

  if (userLoading) return <Loader />;

  return (
    <Paper shadow="md" p="xl" style={{ maxWidth: 500, margin: "40px auto" }}>
      <Title order={2} align="center" mb="md">
        Registro de Asistencia
      </Title>

      {/* Buscar usuario por cédula */}
      <Stack>
        <TextInput
          label="Buscar por cédula"
          placeholder="Ingrese su número de cédula"
          value={searchCedula}
          onChange={(e) => setSearchCedula(e.target.value)}
        />
        {searchError && <p style={{ color: "red" }}>{searchError}</p>}
        <Button onClick={handleSearchByCedula} loading={loading}>
          Buscar usuario
        </Button>
      </Stack>

      <Divider my="md" />

      {/* Formulario de registro o edición */}
      <Stack>
        <TextInput
          label="Nombre"
          placeholder="Tu nombre completo"
          value={formValues.nombre}
          onChange={(e) => handleChange("nombre", e.target.value)}
          required
        />
        <TextInput
          label="Cédula"
          placeholder="Tu número de identificación"
          value={formValues.cedula}
          onChange={(e) => handleChange("cedula", e.target.value)}
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
          value={formValues.contacto.correo}
          onChange={(e) => handleChange("contacto.correo", e.target.value)}
        />
        <TextInput
          label="Teléfono (opcional)"
          placeholder="Tu número de teléfono"
          value={formValues.contacto.telefono}
          onChange={(e) => handleChange("contacto.telefono", e.target.value)}
        />
        <Button onClick={handleSubmit} loading={loading}>
          {currentUser?.data ? "Actualizar" : "Registrarse"}
        </Button>
      </Stack>
    </Paper>
  );
};

export default Landing;
