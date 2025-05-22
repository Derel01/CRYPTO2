# Учетные данные и сервисы

Данный документ содержит учетные данные и информацию о сервисах, используемых в приложении.

## База данных

### MongoDB (исходная версия)
- **Хост**: localhost
- **Порт**: 27017
- **База данных**: crypto_finance_app
- **Логин**: не требуется (локальная настройка без аутентификации)
- **Пароль**: не требуется (локальная настройка без аутентификации)
- **Строка подключения**: mongodb://localhost:27017

### PostgreSQL (SQL версия)
- **Хост**: localhost
- **Порт**: 5432
- **База данных**: crypto_finance
- **Логин**: postgres
- **Пароль**: postgres
- **Строка подключения**: postgresql://postgres:postgres@localhost/crypto_finance

### SQLite (альтернативная SQL версия)
- **Файл базы данных**: backend/crypto_finance.db
- **Строка подключения**: sqlite:///./crypto_finance.db

## API-сервер (бэкенд)

- **Технология**: FastAPI
- **Хост**: 0.0.0.0
- **Порт**: 8001
- **URL**: http://localhost:8001
- **Документация API**: http://localhost:8001/docs

## Веб-клиент (фронтенд)

- **Технология**: React
- **Хост**: localhost
- **Порт**: 3000
- **URL**: http://localhost:3000

## Supervisor (управление процессами)

- **Конфигурационный файл**: /etc/supervisor/conf.d/crypto-finance-app.conf
- **Команды управления**:
  - Статус: `sudo supervisorctl status all`
  - Перезапуск бэкенда: `sudo supervisorctl restart backend`
  - Перезапуск фронтенда: `sudo supervisorctl restart frontend`
  - Перезапуск всех сервисов: `sudo supervisorctl restart all`

## Окружение (.env файлы)

### backend/.env
```
DATABASE_URL=postgresql://postgres:postgres@localhost/crypto_finance
# Или для SQLite:
# DATABASE_URL=sqlite:///./crypto_finance.db
```

### frontend/.env
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

## Как получить доступ к приложению

1. Убедитесь, что все сервисы запущены (см. раздел Supervisor выше)
2. Откройте в браузере http://localhost:3000
3. Для прямого доступа к API: http://localhost:8001/api
4. Для доступа к документации API: http://localhost:8001/docs
