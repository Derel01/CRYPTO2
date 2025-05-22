import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/teams`);
      setTeams(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching teams:", err);
      setError("Не удалось загрузить команды. Пожалуйста, попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/teams?search=${searchTerm}`);
      setTeams(response.data);
      setError(null);
    } catch (err) {
      console.error("Error searching teams:", err);
      setError("Ошибка при поиске команд.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Вы уверены, что хотите удалить эту команду? Это также удалит все связанные хэши.")) {
      try {
        await axios.delete(`${backendUrl}/api/teams/${id}`);
        setTeams(teams.filter(team => team.id !== id));
      } catch (err) {
        console.error("Error deleting team:", err);
        setError("Не удалось удалить команду.");
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Команды</h1>
        <Link 
          to="/teams/new" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Создать команду
        </Link>
      </div>

      <div className="mb-6">
        <div className="flex">
          <input 
            type="text" 
            placeholder="Поиск по названию команды..." 
            className="border border-gray-300 p-2 rounded-l w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r"
            onClick={handleSearch}
          >
            Поиск
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2">Загрузка команд...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          {error}
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-yellow-100 text-yellow-700 p-4 rounded mb-4">
          Команды не найдены. Создайте новую команду.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <div key={team.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-2">{team.name}</h2>
              <div className="mb-4">
                <p className="text-gray-600">
                  <span className="font-medium">Цена за лот (RUB):</span> {team.rub_price_per_lot.toLocaleString('ru-RU')} ₽
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Цена за лот (USDT):</span> {team.usdt_price_per_lot.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link 
                  to={`/teams/${team.id}`} 
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
                >
                  Детали
                </Link>
                <Link 
                  to={`/teams/${team.id}/edit`} 
                  className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-3 py-1 rounded"
                >
                  Редактировать
                </Link>
                <button 
                  onClick={() => handleDelete(team.id)}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded"
                >
                  Удалить
                </button>
                <Link 
                  to={`/teams/${team.id}/hashes/new`} 
                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded"
                >
                  Добавить хэш
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Teams;