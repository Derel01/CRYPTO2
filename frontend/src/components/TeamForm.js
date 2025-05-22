import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const TeamForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: "",
    rub_price_per_lot: "",
    usdt_price_per_lot: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    if (isEditMode) {
      fetchTeamData();
    }
  }, [id]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/teams/${id}`);
      const team = response.data;
      setFormData({
        name: team.name,
        rub_price_per_lot: team.rub_price_per_lot,
        usdt_price_per_lot: team.usdt_price_per_lot
      });
    } catch (err) {
      console.error("Error fetching team:", err);
      setError("Не удалось загрузить данные команды.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
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
      
      // Validate form data
      if (!formData.name) {
        setError("Название команды обязательно.");
        setLoading(false);
        return;
      }
      
      if (!formData.rub_price_per_lot || isNaN(parseFloat(formData.rub_price_per_lot)) || parseFloat(formData.rub_price_per_lot) <= 0) {
        setError("Цена за лот (RUB) должна быть положительным числом.");
        setLoading(false);
        return;
      }
      
      if (!formData.usdt_price_per_lot || isNaN(parseFloat(formData.usdt_price_per_lot)) || parseFloat(formData.usdt_price_per_lot) <= 0) {
        setError("Цена за лот (USDT) должна быть положительным числом.");
        setLoading(false);
        return;
      }
      
      // Prepare data
      const teamData = {
        name: formData.name,
        rub_price_per_lot: parseFloat(formData.rub_price_per_lot),
        usdt_price_per_lot: parseFloat(formData.usdt_price_per_lot)
      };
      
      if (isEditMode) {
        // Update existing team
        await axios.put(`${backendUrl}/api/teams/${id}`, teamData);
      } else {
        // Create new team
        await axios.post(`${backendUrl}/api/teams`, teamData);
      }
      
      // Redirect to teams list
      navigate("/");
    } catch (err) {
      console.error("Error saving team:", err);
      setError(isEditMode ? 
        "Не удалось обновить команду. Пожалуйста, попробуйте позже." : 
        "Не удалось создать команду. Пожалуйста, попробуйте позже."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        {isEditMode ? "Редактировать команду" : "Создать новую команду"}
      </h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
            Название команды
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Введите название команды"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="rub_price_per_lot" className="block text-gray-700 font-medium mb-2">
            Цена за лот (RUB)
          </label>
          <input
            type="number"
            id="rub_price_per_lot"
            name="rub_price_per_lot"
            value={formData.rub_price_per_lot}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Введите цену за лот в рублях"
            step="0.01"
            min="0"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="usdt_price_per_lot" className="block text-gray-700 font-medium mb-2">
            Цена за лот (USDT)
          </label>
          <input
            type="number"
            id="usdt_price_per_lot"
            name="usdt_price_per_lot"
            value={formData.usdt_price_per_lot}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Введите цену за лот в USDT"
            step="0.01"
            min="0"
          />
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => navigate("/")}
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

export default TeamForm;