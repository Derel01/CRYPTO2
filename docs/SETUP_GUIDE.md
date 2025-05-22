# Руководство по настройке и развертыванию финансового крипто-приложения

Это руководство поможет вам настроить и запустить финансовое приложение для отслеживания криптовалютных хэшей и расчета лотов для команд с нуля.

## Архитектура приложения

Приложение построено на основе современного стека технологий:

### Бэкенд
- **FastAPI** - современный быстрый Python веб-фреймворк
- **SQLAlchemy** - библиотека для работы с SQL базами данных (PostgreSQL или SQLite)
- **Pydantic** - валидация данных и сериализация

### Фронтенд
- **React** - библиотека для создания пользовательского интерфейса
- **React Router** - маршрутизация в React-приложении
- **Axios** - HTTP-клиент для выполнения запросов к API
- **Tailwind CSS** - утилитарный CSS-фреймворк

### Инфраструктура
- **Supervisor** - для управления процессами
- **PostgreSQL** или **SQLite** - база данных

## Предварительные требования

Для запуска приложения вам потребуется:

- Python 3.8 или выше
- Node.js 14 или выше
- npm или yarn
- PostgreSQL (опционально, можно использовать SQLite)
- Supervisor для управления процессами

## Шаги по настройке

### 1. Клонирование репозитория

```bash
git clone <url-репозитория>
cd финансовое-крипто-приложение
```

### 2. Настройка бэкенда

#### Установка зависимостей Python

```bash
cd backend
pip install -r requirements_sql.txt
```

#### Настройка базы данных

Для SQLite (проще всего для начала):
```bash
# .env файл создастся автоматически с настройками для SQLite
```

Для PostgreSQL:
1. Создайте базу данных в PostgreSQL
2. Создайте файл .env в директории backend:
```
DATABASE_URL=postgresql://username:password@localhost/database_name
```

### 3. Настройка фронтенда

```bash
cd ../frontend
yarn install
```

Создайте файл .env в директории frontend:
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 4. Настройка Supervisor

Создайте конфигурационный файл supervisor:

```ini
[program:backend]
command=/path/to/python /path/to/app/backend/server_sql.py
directory=/path/to/app/backend
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/backend.err.log
stdout_logfile=/var/log/supervisor/backend.out.log

[program:frontend]
command=yarn --cwd /path/to/app/frontend start
directory=/path/to/app/frontend
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/frontend.err.log
stdout_logfile=/var/log/supervisor/frontend.out.log
```

Сохраните этот файл в /etc/supervisor/conf.d/crypto-finance-app.conf и обновите supervisor:

```bash
sudo supervisorctl reread
sudo supervisorctl update
```

## Запуск приложения

### Запуск бэкенда

```bash
cd backend
uvicorn server_sql:app --host 0.0.0.0 --port 8001 --reload
```

### Запуск фронтенда

```bash
cd ../frontend
yarn start
```

### Управление через supervisor

```bash
sudo supervisorctl status all
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
sudo supervisorctl restart all
```

## Учетные данные и сервисы

### База данных
- **SQLite**: файл crypto_finance.db создается автоматически в директории backend
- **PostgreSQL**:
  - Host: localhost
  - Port: 5432
  - Database: crypto_finance
  - Username: postgres
  - Password: postgres

### Бэкенд API
- Доступен по адресу http://localhost:8001/api
- Документация API: http://localhost:8001/docs

### Фронтенд
- Доступен по адресу http://localhost:3000

## Основные функции приложения

1. **Управление командами**
   - Создание, редактирование и удаление команд
   - Указание цен за лот в RUB и USDT для каждой команды
   - Поиск команд по названию

2. **Управление хэшами**
   - Добавление хэшей к командам
   - Указание валюты (RUB или USDT)
   - Для RUB необходимо указывать курс обмена

3. **Расчеты**
   - Автоматический расчет количества лотов (округление в меньшую сторону)
   - Отображение остатка средств
   - Расчет суммы, необходимой для получения следующего лота

## Формулы расчетов

- **Токены RUB** = Сумма (количество токенов × курс) для всех хэшей RUB
- **Токены USDT** = Сумма количества токенов для всех хэшей USDT
- **Лоты RUB** = Целая часть (Токены RUB ÷ Цена за лот RUB)
- **Лоты USDT** = Целая часть (Токены USDT ÷ Цена за лот USDT)
- **Всего лотов** = Лоты RUB + Лоты USDT
- **Остаток** = Токены - (Лоты × Цена за лот)
- **Нужно для лота** = Цена за лот - Остаток (если остаток > 0)
