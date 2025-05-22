import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import "./App.css";

// Components
import Teams from "./components/Teams";
import TeamDetail from "./components/TeamDetail";
import Calculations from "./components/Calculations";
import TeamForm from "./components/TeamForm";
import HashForm from "./components/HashForm";

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <BrowserRouter>
        <header className="bg-blue-600 text-white shadow-md">
          <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold">Финансовое Крипто Приложение</Link>
            <div className="space-x-4">
              <Link to="/" className="hover:underline">Команды</Link>
              <Link to="/calculations" className="hover:underline">Расчеты</Link>
            </div>
          </nav>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Teams />} />
            <Route path="/teams/new" element={<TeamForm />} />
            <Route path="/teams/:id" element={<TeamDetail />} />
            <Route path="/teams/:id/edit" element={<TeamForm />} />
            <Route path="/teams/:teamId/hashes/new" element={<HashForm />} />
            <Route path="/hashes/:id/edit" element={<HashForm />} />
            <Route path="/calculations" element={<Calculations />} />
          </Routes>
        </main>

        <footer className="bg-gray-800 text-white py-4">
          <div className="container mx-auto px-4 text-center">
            <p>&copy; 2024 Финансовое Крипто Приложение</p>
          </div>
        </footer>
      </BrowserRouter>
    </div>
  );
}

export default App;