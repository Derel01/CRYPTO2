import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from pathlib import Path
import sys

# Добавляем текущий каталог в путь для импортов
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Импортируем модели из server_sql.py
from server_sql import Base, TeamModel, CryptoHashModel, CurrencyEnum

# Загрузить .env файл
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
mongo_client = AsyncIOMotorClient(mongo_url)
mongo_db = mongo_client[os.environ.get('DB_NAME', 'crypto_finance_app')]

# SQL connection
database_url = os.environ.get('DATABASE_URL', 'sqlite:///./crypto_finance.db')
engine = create_engine(database_url)
Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

async def migrate_teams():
    # Get all teams from MongoDB
    teams = await mongo_db.teams.find().to_list(1000)
    
    # Insert teams into SQL database
    for team in teams:
        # Проверяем, существует ли уже такая команда
        existing = db.query(TeamModel).filter(TeamModel.id == team['id']).first()
        if existing:
            print(f"Team {team['id']} already exists, skipping...")
            continue
            
        sql_team = TeamModel(
            id=team['id'],
            name=team['name'],
            rub_price_per_lot=team['rub_price_per_lot'],
            usdt_price_per_lot=team['usdt_price_per_lot'],
            created_at=team.get('created_at'),
            updated_at=team.get('updated_at')
        )
        db.add(sql_team)
    
    db.commit()
    print(f"Migrated {len(teams)} teams")

async def migrate_hashes():
    # Get all hashes from MongoDB
    hashes = await mongo_db.crypto_hashes.find().to_list(1000)
    
    # Insert hashes into SQL database
    for hash_ in hashes:
        # Проверяем, существует ли уже такой хэш
        existing = db.query(CryptoHashModel).filter(CryptoHashModel.id == hash_['id']).first()
        if existing:
            print(f"Hash {hash_['id']} already exists, skipping...")
            continue
            
        sql_hash = CryptoHashModel(
            id=hash_['id'],
            team_id=hash_['team_id'],
            hash_value=hash_['hash_value'],
            token_amount=hash_['token_amount'],
            currency=hash_['currency'],
            exchange_rate=hash_.get('exchange_rate'),
            created_at=hash_.get('created_at'),
            updated_at=hash_.get('updated_at')
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
