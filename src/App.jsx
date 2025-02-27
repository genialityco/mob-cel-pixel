import { useState, useEffect, useContext } from "react";

import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import { UserContext } from "./context/UserContext";

const App = () => {
  const {currentUser,userLoading} = useContext(UserContext);
  console.log("UserContext:", currentUser);

  if (userLoading)
    return (<h1>Cargando Usuario...</h1>)

  return (
    <div>
      
      <p>titulo</p>
      <p>UID :{currentUser?.uid}</p>
      <p>nombre :{currentUser?.data?.nombre}</p>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </div>
  );
};

export default App;
