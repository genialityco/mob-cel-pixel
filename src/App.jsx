import { useContext } from "react";
import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import { UserContext } from "./context/UserContext";
import UserProfile from "./components/UserProfile";

const App = () => {
  const { userLoading } = useContext(UserContext);

  if (userLoading) return <h1>Cargando Usuario...</h1>;

  return (
    <div>
      <UserProfile />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </div>
  );
};

export default App;
