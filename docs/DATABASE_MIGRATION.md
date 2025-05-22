# Руководство по миграции с MongoDB на SQL

В этом руководстве описан процесс миграции приложения с MongoDB на SQL базу данных (PostgreSQL или SQLite).

## Общая информация

Приложение изначально было разработано с использованием MongoDB в качестве базы данных. Для перехода на SQL базу данных были внесены следующие изменения:

1. Создан новый файл сервера `server_sql.py`
2. Определены SQLAlchemy модели для таблиц базы данных
3. Изменены API-эндпоинты для работы с SQL вместо MongoDB
4. Обновлены зависимости в `requirements_sql.txt`

## Сравнение версий

### MongoDB (исходная версия)

- Документоориентированная NoSQL база данных
- Использует PyMongo/Motor для асинхронного доступа
- Хранит документы в коллекциях без строгой схемы
- Документы могут иметь вложенные структуры

### SQL (новая версия)

- Реляционная база данных (PostgreSQL/SQLite)
- Использует SQLAlchemy для ORM
- Хранит данные в таблицах со строгой схемой
- Поддерживает отношения между таблицами (foreign keys)

## Шаги по миграции

### 1. Установка зависимостей

```bash
pip install -r requirements_sql.txt
```

### 2. Настройка строки подключения к базе данных

В файле `.env` в директории `backend` укажите строку подключения к базе данных:

Для PostgreSQL:
```
DATABASE_URL=postgresql://username:password@localhost/dbname
```

Для SQLite:
```
DATABASE_URL=sqlite:///./crypto_finance.db
```

### 3. Запуск новой версии сервера

```bash
cd backend
uvicorn server_sql:app --host 0.0.0.0 --port 8001 --reload
```

### 4. Миграция данных из MongoDB

Если у вас уже есть данные в MongoDB, вы можете мигрировать их в SQL базу данных с помощью следующего скрипта:

```python
# migrate_mongo_to_sql.py
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from server_sql import Base, TeamModel, CryptoHashModel, CurrencyEnum
import os
from dotenv import load_dotenv

# Загрузить .env файл
load_dotenv()

# MongoDB connection
mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
mongo_client = AsyncIOMotorClient(mongo_url)
mongo_db = mongo_client[os.getenv('DB_NAME', 'crypto_finance_app')]

# SQL connection
database_url = os.getenv('DATABASE_URL', 'sqlite:///./crypto_finance.db')
engine = create_engine(database_url)
Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

async def migrate_teams():
    # Get all teams from MongoDB
    teams = await mongo_db.teams.find().to_list(1000)
    
    # Insert teams into SQL database
    for team in teams:
        sql_team = TeamModel(
            id=team['id'],
            name=team['name'],
            rub_price_per_lot=team['rub_price_per_lot'],
            usdt_price_per_lot=team['usdt_price_per_lot'],
            created_at=team['created_at'],
            updated_at=team['updated_at']
        )
        db.add(sql_team)
    
    db.commit()
    print(f"Migrated {len(teams)} teams")

async def migrate_hashes():
    # Get all hashes from MongoDB
    hashes = await mongo_db.crypto_hashes.find().to_list(1000)
    
    # Insert hashes into SQL database
    for hash_ in hashes:
        sql_hash = CryptoHashModel(
            id=hash_['id'],
            team_id=hash_['team_id'],
            hash_value=hash_['hash_value'],
            token_amount=hash_['token_amount'],
            currency=hash_['currency'],
            exchange_rate=hash_.get('exchange_rate'),
            created_at=hash_['created_at'],
            updated_at=hash_['updated_at']
        )
        db.add(sql_hash)
    
    db.commit()
    print(f"Migrated {len(hashes)} hashes")

async def run_migration():
    print("Starting migration from MongoDB to SQL...")
    await migrate_teams()
    await migrate_hashes()
    print("Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
```

Запустите скрипт миграции:
```bash
python migrate_mongo_to_sql.py
```

### 5. Обновление конфигурации Supervisor

Если вы используете Supervisor для управления процессами, обновите конфигурацию для использования новой версии сервера:

```ini
[program:backend]
command=/path/to/python /path/to/app/backend/server_sql.py
directory=/path/to/app/backend
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/backend.err.log
stdout_logfile=/var/log/supervisor/backend.out.log
```

Перезагрузите конфигурацию Supervisor:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl restart backend
```

## Важные отличия в коде

### 1. Определение моделей

MongoDB (исходная версия):
```python
class Team(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    rub_price_per_lot: float
    usdt_price_per_lot: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

SQL (новая версия):
```python
# SQLAlchemy модель
class TeamModel(Base):
    __tablename__ = "teams"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True)
    rub_price_per_lot = Column(Float)
    usdt_price_per_lot = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    hashes = relationship("CryptoHashModel", back_populates="team", cascade="all, delete-orphan")

# Pydantic модель для API
class Team(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    rub_price_per_lot: float
    usdt_price_per_lot: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        orm_mode = True
```

### 2. Работа с базой данных

MongoDB (исходная версия):
```python
@api_router.get("/teams", response_model=List[Team])
async def get_teams(search: Optional[str] = None):
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    teams = await db.teams.find(query).to_list(1000)
    return [Team(**team) for team in teams]
```

SQL (новая версия):
```python
@api_router.get("/teams", response_model=List[Team])
async def get_teams(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(TeamModel)
    if search:
        query = query.filter(TeamModel.name.ilike(f"%{search}%"))
    return query.all()
```

## Заключение

Миграция с MongoDB на SQL позволяет использовать преимущества реляционных баз данных, такие как строгая схема данных, поддержка отношений и транзакции. При этом функциональность приложения остается прежней, меняется только способ хранения данных.
