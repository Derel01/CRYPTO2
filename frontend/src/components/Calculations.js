import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const Calculations = () => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalLots, setTotalLots] = useState(0);

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/teams/summary`);
      setSummaries(response.data);
      
      // Calculate total lots across all teams
      const total = response.data.reduce((sum, team) => sum + team.total_lots, 0);
      setTotalLots(total);
      
      setError(null);
    } catch (err) {
      console.error("Error fetching summaries:", err);
      setError("Не удалось загрузить расчеты. Пожалуйста, попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2">Загрузка расчетов...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Расчеты по всем командам</h1>
        <p className="text-gray-600">Обзор токенов и лотов по каждой команде</p>
      </div>

      {summaries.length === 0 ? (
        <div className="bg-yellow-100 text-yellow-700 p-4 rounded mb-4">
          Нет данных для отображения. Сначала создайте команды и добавьте хэши.
          <div className="mt-2">
            <Link to="/" className="text-blue-600 hover:underline">Перейти к командам</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <h2 className="text-xl font-bold mb-4">Общее количество лотов: {totalLots.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h2>
          </div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Команда</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Токены RUB</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Токены USDT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Лоты RUB</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Лоты USDT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Всего лотов</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summaries.map((summary) => (
                  <tr key={summary.team_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{summary.team_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {summary.rub_tokens.toLocaleString('ru-RU')} ₽
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {summary.usdt_tokens.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {summary.rub_lots.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {summary.usdt_lots.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {summary.total_lots.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link to={`/teams/${summary.team_id}`} className="text-blue-600 hover:text-blue-900">
                        Детали
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold mb-2">Формула расчета:</h3>
            <ul className="list-disc ml-6 text-sm text-gray-700">
              <li className="mb-1">Токены RUB = Сумма (количество токенов × курс) для всех хэшей RUB</li>
              <li className="mb-1">Токены USDT = Сумма количества токенов для всех хэшей USDT</li>
              <li className="mb-1">Лоты RUB = Токены RUB ÷ Цена за лот RUB</li>
              <li className="mb-1">Лоты USDT = Токены USDT ÷ Цена за лот USDT</li>
              <li>Всего лотов = Лоты RUB + Лоты USDT</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default Calculations;