import { useContext } from "react";
import { Routes, Route } from "react-router-dom";
import Landing from './pages/Landing';
import { UserContext } from "./context/UserContext";
import UserProfile from "./components/UserProfile";
import AdminLanding from "./pages/AdminLanding";

const App = () => {
  const {  currentUser } = useContext(UserContext);

  return (
    <div>
      {currentUser?.data && (<UserProfile />)}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/admin" element={<AdminLanding />} />
      </Routes>
    </div>
  );
};

export default App;
