import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const HashForm = () => {
  const { teamId, id: hashId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isEditMode = !!hashId;
  
  const [formData, setFormData] = useState({
    team_id: teamId || "",
    hash_value: "",
    token_amount: "",
    currency: "USDT",
    exchange_rate: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchTeams();
    
    if (isEditMode) {
      fetchHashData();
    }
  }, [hashId]);

  const fetchTeams = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/teams`);
      setTeams(response.data);
      
      if (teamId) {
        const team = response.data.find(t => t.id === teamId);
        if (team) {
          setSelectedTeam(team);
        }
      }
    } catch (err) {
      console.error("Error fetching teams:", err);
    }
  };

  const fetchHashData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/hashes/${hashId}`);
      const hash = response.data;
      
      setFormData({
        team_id: hash.team_id,
        hash_value: hash.hash_value,
        token_amount: hash.token_amount,
        currency: hash.currency,
        exchange_rate: hash.exchange_rate || ""
      });
      
      // Find and set the selected team
      const team = teams.find(t => t.id === hash.team_id);
      if (team) {
        setSelectedTeam(team);
      }
    } catch (err) {
      console.error("Error fetching hash:", err);
      setError("Не удалось загрузить данные хэша.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "team_id") {
      const team = teams.find(t => t.id === value);
      setSelectedTeam(team || null);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Validation
      if (!formData.team_id) {
        setError("Выберите команду.");
        setLoading(false);
        return;
      }
      
      if (!formData.hash_value) {
        setError("Хэш обязателен.");
        setLoading(false);
        return;
      }
      
      if (!formData.token_amount || isNaN(parseFloat(formData.token_amount)) || parseFloat(formData.token_amount) <= 0) {
        setError("Количество токенов должно быть положительным числом.");
        setLoading(false);
        return;
      }
      
      if (formData.currency === "RUB" && (!formData.exchange_rate || isNaN(parseFloat(formData.exchange_rate)) || parseFloat(formData.exchange_rate) <= 0)) {
        setError("Для валюты RUB необходимо указать положительный курс.");
        setLoading(false);
        return;
      }
      
      // Prepare data
      const hashData = {
        team_id: formData.team_id,
        hash_value: formData.hash_value,
        token_amount: parseFloat(formData.token_amount),
        currency: formData.currency,
        exchange_rate: formData.currency === "RUB" ? parseFloat(formData.exchange_rate) : null
      };
      
      if (isEditMode) {
        // Update existing hash
        await axios.put(`${backendUrl}/api/hashes/${hashId}`, hashData);
      } else {
        // Create new hash
        await axios.post(`${backendUrl}/api/hashes`, hashData);
      }
      
      // Redirect to team details
      navigate(`/teams/${formData.team_id}`);
    } catch (err) {
      console.error("Error saving hash:", err);
      setError(isEditMode ? 
        "Не удалось обновить хэш. Пожалуйста, попробуйте позже." : 
        "Не удалось создать хэш. Пожалуйста, попробуйте позже."
      );
    } finally {
      setLoading(false);
    }
  };

  const getFormTitle = () => {
    if (isEditMode) {
      return "Редактировать хэш";
    }
    
    if (selectedTeam) {
      return `Добавить новый хэш для команды: ${selectedTeam.name}`;
    }
    
    return "Добавить новый хэш";
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{getFormTitle()}</h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-4">
          <label htmlFor="team_id" className="block text-gray-700 font-medium mb-2">
            Команда
          </label>
          <select
            id="team_id"
            name="team_id"
            value={formData.team_id}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!!teamId}
          >
            <option value="">Выберите команду</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="hash_value" className="block text-gray-700 font-medium mb-2">
            Хэш
          </label>
          <input
            type="text"
            id="hash_value"
            name="hash_value"
            value={formData.hash_value}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Введите значение хэша"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="token_amount" className="block text-gray-700 font-medium mb-2">
            Количество токенов
          </label>
          <input
            type="number"
            id="token_amount"
            name="token_amount"
            value={formData.token_amount}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Введите количество токенов"
            step="0.01"
            min="0"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="currency" className="block text-gray-700 font-medium mb-2">
            Валюта
          </label>
          <select
            id="currency"
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="USDT">USDT</option>
            <option value="RUB">RUB</option>
          </select>
        </div>

        {formData.currency === "RUB" && (
          <div className="mb-6">
            <label htmlFor="exchange_rate" className="block text-gray-700 font-medium mb-2">
              Курс обмена
            </label>
            <input
              type="number"
              id="exchange_rate"
              name="exchange_rate"
              value={formData.exchange_rate}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Введите курс обмена для RUB"
              step="0.01"
              min="0"
            />
          </div>
        )}

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => formData.team_id ? navigate(`/teams/${formData.team_id}`) : navigate("/")}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded"
          >
            Отмена
          </button>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Обработка...
              </span>
            ) : isEditMode ? "Обновить" : "Создать"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HashForm;