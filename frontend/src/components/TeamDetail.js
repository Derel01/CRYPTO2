import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";

const TeamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [team, setTeam] = useState(null);
  const [hashes, setHashes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchTeamData();
  }, [id]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      
      // Fetch team details
      const teamResponse = await axios.get(`${backendUrl}/api/teams/${id}`);
      setTeam(teamResponse.data);
      
      // Fetch team hashes
      const hashesResponse = await axios.get(`${backendUrl}/api/hashes?team_id=${id}`);
      setHashes(hashesResponse.data);
      
      // Fetch team summary
      const summaryResponse = await axios.get(`${backendUrl}/api/teams/${id}/summary`);
      setSummary(summaryResponse.data);
      
      setError(null);
    } catch (err) {
      console.error("Error fetching team data:", err);
      setError("Не удалось загрузить данные команды. Пожалуйста, попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHash = async (hashId) => {
    if (window.confirm("Вы уверены, что хотите удалить этот хэш?")) {
      try {
        await axios.delete(`${backendUrl}/api/hashes/${hashId}`);
        setHashes(hashes.filter(hash => hash.id !== hashId));
        // Refresh summary
        const summaryResponse = await axios.get(`${backendUrl}/api/teams/${id}/summary`);
        setSummary(summaryResponse.data);
      } catch (err) {
        console.error("Error deleting hash:", err);
        alert("Не удалось удалить хэш.");
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2">Загрузка данных команды...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
        {error}
        <div className="mt-4">
          <Link to="/" className="text-blue-600 hover:underline">Вернуться к списку команд</Link>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="bg-yellow-100 text-yellow-700 p-4 rounded mb-4">
        Команда не найдена.
        <div className="mt-4">
          <Link to="/" className="text-blue-600 hover:underline">Вернуться к списку команд</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div>
          <Link to="/" className="text-blue-600 hover:underline mb-2 inline-block">
            &larr; Назад к списку команд
          </Link>
          <h1 className="text-2xl font-bold">{team.name}</h1>
        </div>
        <div className="space-x-2 mt-2 sm:mt-0">
          <Link 
            to={`/teams/${team.id}/edit`} 
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
          >
            Редактировать команду
          </Link>
          <Link 
            to={`/teams/${team.id}/hashes/new`} 
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Добавить хэш
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Информация о команде</h2>
          <div>
            <p className="mb-2">
              <span className="font-medium">Название:</span> {team.name}
            </p>
            <p className="mb-2">
              <span className="font-medium">Цена за лот (RUB):</span> {team.rub_price_per_lot.toLocaleString('ru-RU')} ₽
            </p>
            <p>
              <span className="font-medium">Цена за лот (USDT):</span> {team.usdt_price_per_lot.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </p>
          </div>
        </div>

        {summary && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Расчеты</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded">
                <h3 className="font-medium text-blue-800 mb-2">RUB</h3>
                <p className="mb-1">Токены: {summary.rub_tokens.toLocaleString('ru-RU')} ₽</p>
                <p className="mb-1">
                  Лоты: {summary.rub_lots.toLocaleString()} 
                  <span className="text-xs text-gray-500 ml-1">
                    ({summary.rub_lots_raw.toLocaleString(undefined, { maximumFractionDigits: 2 })})
                  </span>
                </p>
                <p className="mb-1">Остаток: {summary.rub_remainder.toLocaleString('ru-RU')} ₽</p>
                <p>Нужно для след. лота: {summary.rub_needed_for_next_lot.toLocaleString('ru-RU')} ₽</p>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <h3 className="font-medium text-green-800 mb-2">USDT</h3>
                <p className="mb-1">Токены: {summary.usdt_tokens.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                <p className="mb-1">
                  Лоты: {summary.usdt_lots.toLocaleString()} 
                  <span className="text-xs text-gray-500 ml-1">
                    ({summary.usdt_lots_raw.toLocaleString(undefined, { maximumFractionDigits: 2 })})
                  </span>
                </p>
                <p className="mb-1">Остаток: {summary.usdt_remainder.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                <p>Нужно для след. лота: {summary.usdt_needed_for_next_lot.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
              </div>
            </div>
            <div className="mt-4 bg-gray-100 p-4 rounded">
              <p className="font-bold">Общее количество лотов: {summary.total_lots.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1">Лоты округляются в меньшую сторону до целого числа</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Хэши команды</h2>
        </div>

        {hashes.length === 0 ? (
          <div className="bg-yellow-50 text-yellow-700 p-4 rounded">
            У этой команды еще нет хэшей. 
            <Link to={`/teams/${team.id}/hashes/new`} className="text-blue-600 hover:underline ml-1">
              Добавить новый хэш
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Хэш</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Токены</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Валюта</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Курс (если RUB)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {hashes.map(hash => (
                  <tr key={hash.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-900">
                      {hash.hash_value.length > 20 
                        ? `${hash.hash_value.substring(0, 20)}...` 
                        : hash.hash_value}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {hash.token_amount.toLocaleString(hash.currency === 'RUB' ? 'ru-RU' : 'en-US')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {hash.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {hash.currency === 'RUB' && hash.exchange_rate 
                        ? hash.exchange_rate.toLocaleString('ru-RU')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex space-x-2">
                        <Link 
                          to={`/hashes/${hash.id}/edit`} 
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Редактировать
                        </Link>
                        <button 
                          onClick={() => handleDeleteHash(hash.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamDetail;