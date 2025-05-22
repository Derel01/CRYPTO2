from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import math
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from enum import Enum

# SQLAlchemy imports
from sqlalchemy import create_engine, Column, String, Float, ForeignKey, Integer, Enum as SQLAlchemyEnum, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database setup
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./crypto_finance.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Enums
class CurrencyEnum(str, Enum):
    RUB = "RUB"
    USDT = "USDT"

# Define SQL Models
class TeamModel(Base):
    __tablename__ = "teams"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True)
    rub_price_per_lot = Column(Float)
    usdt_price_per_lot = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    hashes = relationship("CryptoHashModel", back_populates="team", cascade="all, delete-orphan")

class CryptoHashModel(Base):
    __tablename__ = "crypto_hashes"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(String, ForeignKey("teams.id"))
    hash_value = Column(String)
    token_amount = Column(Float)
    currency = Column(SQLAlchemyEnum(CurrencyEnum))
    exchange_rate = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    team = relationship("TeamModel", back_populates="hashes")

# Create tables
Base.metadata.create_all(bind=engine)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Define Pydantic Models for API
class Team(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    rub_price_per_lot: float
    usdt_price_per_lot: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        orm_mode = True

class TeamCreate(BaseModel):
    name: str
    rub_price_per_lot: float
    usdt_price_per_lot: float

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    rub_price_per_lot: Optional[float] = None
    usdt_price_per_lot: Optional[float] = None

class CryptoHash(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    team_id: str
    hash_value: str
    token_amount: float
    currency: CurrencyEnum
    exchange_rate: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        orm_mode = True

class CryptoHashCreate(BaseModel):
    team_id: str
    hash_value: str
    token_amount: float
    currency: CurrencyEnum
    exchange_rate: Optional[float] = None

class CryptoHashUpdate(BaseModel):
    hash_value: Optional[str] = None
    token_amount: Optional[float] = None
    currency: Optional[CurrencyEnum] = None
    exchange_rate: Optional[float] = None

class TeamSummary(BaseModel):
    team_id: str
    team_name: str
    rub_tokens: float
    usdt_tokens: float
    rub_lots_raw: float
    usdt_lots_raw: float
    rub_lots: int
    usdt_lots: int
    total_lots: int
    rub_remainder: float
    usdt_remainder: float
    rub_needed_for_next_lot: float
    usdt_needed_for_next_lot: float

    class Config:
        orm_mode = True

# API Endpoints for Teams
@api_router.post("/teams", response_model=Team)
async def create_team(team: TeamCreate, db: Session = Depends(get_db)):
    db_team = TeamModel(
        id=str(uuid.uuid4()),
        name=team.name,
        rub_price_per_lot=team.rub_price_per_lot,
        usdt_price_per_lot=team.usdt_price_per_lot
    )
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    return db_team

@api_router.get("/teams", response_model=List[Team])
async def get_teams(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(TeamModel)
    if search:
        query = query.filter(TeamModel.name.ilike(f"%{search}%"))
    return query.all()

# Summary and Calculation Endpoints
@api_router.get("/teams/summary", response_model=List[TeamSummary])
async def get_team_summaries(db: Session = Depends(get_db)):
    teams = db.query(TeamModel).all()
    summaries = []

    for team in teams:
        # Get all hashes for this team
        hashes = db.query(CryptoHashModel).filter(CryptoHashModel.team_id == team.id).all()
        
        # Initialize counters
        rub_tokens = 0.0
        usdt_tokens = 0.0
        
        # Calculate token totals
        for hash_ in hashes:
            if hash_.currency == CurrencyEnum.RUB:
                # For RUB, multiply by exchange rate
                rub_tokens += hash_.token_amount * (hash_.exchange_rate or 0)
            else:
                # For USDT, just add the token amount
                usdt_tokens += hash_.token_amount
        
        # Calculate raw lots (exact amount)
        rub_lots_raw = rub_tokens / team.rub_price_per_lot if team.rub_price_per_lot > 0 else 0
        usdt_lots_raw = usdt_tokens / team.usdt_price_per_lot if team.usdt_price_per_lot > 0 else 0
        
        # Floor the lots to get whole lots
        rub_lots = math.floor(rub_lots_raw)
        usdt_lots = math.floor(usdt_lots_raw)
        total_lots = rub_lots + usdt_lots
        
        # Calculate remainders
        rub_remainder = rub_tokens - (rub_lots * team.rub_price_per_lot)
        usdt_remainder = usdt_tokens - (usdt_lots * team.usdt_price_per_lot)
        
        # Calculate needed for next lot
        rub_needed_for_next_lot = team.rub_price_per_lot - rub_remainder if rub_remainder > 0 else team.rub_price_per_lot
        usdt_needed_for_next_lot = team.usdt_price_per_lot - usdt_remainder if usdt_remainder > 0 else team.usdt_price_per_lot
        
        # Create summary object
        summary = TeamSummary(
            team_id=team.id,
            team_name=team.name,
            rub_tokens=rub_tokens,
            usdt_tokens=usdt_tokens,
            rub_lots_raw=rub_lots_raw,
            usdt_lots_raw=usdt_lots_raw,
            rub_lots=rub_lots,
            usdt_lots=usdt_lots,
            total_lots=total_lots,
            rub_remainder=rub_remainder,
            usdt_remainder=usdt_remainder,
            rub_needed_for_next_lot=rub_needed_for_next_lot,
            usdt_needed_for_next_lot=usdt_needed_for_next_lot
        )
        
        summaries.append(summary)
    
    return summaries

@api_router.get("/teams/{team_id}/summary", response_model=TeamSummary)
async def get_team_summary(team_id: str, db: Session = Depends(get_db)):
    # Get team
    team = db.query(TeamModel).filter(TeamModel.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Get all hashes for this team
    hashes = db.query(CryptoHashModel).filter(CryptoHashModel.team_id == team_id).all()
    
    # Initialize counters
    rub_tokens = 0.0
    usdt_tokens = 0.0
    
    # Calculate token totals
    for hash_ in hashes:
        if hash_.currency == CurrencyEnum.RUB:
            # For RUB, multiply by exchange rate
            rub_tokens += hash_.token_amount * (hash_.exchange_rate or 0)
        else:
            # For USDT, just add the token amount
            usdt_tokens += hash_.token_amount
    
    # Calculate raw lots (exact amount)
    rub_lots_raw = rub_tokens / team.rub_price_per_lot if team.rub_price_per_lot > 0 else 0
    usdt_lots_raw = usdt_tokens / team.usdt_price_per_lot if team.usdt_price_per_lot > 0 else 0
    
    # Floor the lots to get whole lots
    rub_lots = math.floor(rub_lots_raw)
    usdt_lots = math.floor(usdt_lots_raw)
    total_lots = rub_lots + usdt_lots
    
    # Calculate remainders
    rub_remainder = rub_tokens - (rub_lots * team.rub_price_per_lot)
    usdt_remainder = usdt_tokens - (usdt_lots * team.usdt_price_per_lot)
    
    # Calculate needed for next lot
    rub_needed_for_next_lot = team.rub_price_per_lot - rub_remainder if rub_remainder > 0 else team.rub_price_per_lot
    usdt_needed_for_next_lot = team.usdt_price_per_lot - usdt_remainder if usdt_remainder > 0 else team.usdt_price_per_lot
    
    # Create summary object
    summary = TeamSummary(
        team_id=team.id,
        team_name=team.name,
        rub_tokens=rub_tokens,
        usdt_tokens=usdt_tokens,
        rub_lots_raw=rub_lots_raw,
        usdt_lots_raw=usdt_lots_raw,
        rub_lots=rub_lots,
        usdt_lots=usdt_lots,
        total_lots=total_lots,
        rub_remainder=rub_remainder,
        usdt_remainder=usdt_remainder,
        rub_needed_for_next_lot=rub_needed_for_next_lot,
        usdt_needed_for_next_lot=usdt_needed_for_next_lot
    )
    
    return summary

@api_router.get("/teams/{team_id}", response_model=Team)
async def get_team(team_id: str, db: Session = Depends(get_db)):
    team = db.query(TeamModel).filter(TeamModel.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@api_router.put("/teams/{team_id}", response_model=Team)
async def update_team(team_id: str, team_update: TeamUpdate, db: Session = Depends(get_db)):
    team = db.query(TeamModel).filter(TeamModel.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    update_data = {k: v for k, v in team_update.dict().items() if v is not None}
    if update_data:
        for key, value in update_data.items():
            setattr(team, key, value)
        team.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(team)
    
    return team

@api_router.delete("/teams/{team_id}")
async def delete_team(team_id: str, db: Session = Depends(get_db)):
    team = db.query(TeamModel).filter(TeamModel.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    db.delete(team)
    db.commit()
    
    return {"message": "Team and all associated hashes deleted successfully"}

# API Endpoints for Crypto Hashes
@api_router.post("/hashes", response_model=CryptoHash)
async def create_hash(crypto_hash: CryptoHashCreate, db: Session = Depends(get_db)):
    # Validate team exists
    team = db.query(TeamModel).filter(TeamModel.id == crypto_hash.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Validate exchange rate for RUB
    if crypto_hash.currency == CurrencyEnum.RUB and not crypto_hash.exchange_rate:
        raise HTTPException(status_code=400, detail="Exchange rate is required for RUB currency")
    
    db_hash = CryptoHashModel(
        id=str(uuid.uuid4()),
        team_id=crypto_hash.team_id,
        hash_value=crypto_hash.hash_value,
        token_amount=crypto_hash.token_amount,
        currency=crypto_hash.currency,
        exchange_rate=crypto_hash.exchange_rate
    )
    db.add(db_hash)
    db.commit()
    db.refresh(db_hash)
    return db_hash

@api_router.get("/hashes", response_model=List[CryptoHash])
async def get_hashes(team_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(CryptoHashModel)
    if team_id:
        query = query.filter(CryptoHashModel.team_id == team_id)
    
    return query.all()

@api_router.get("/hashes/{hash_id}", response_model=CryptoHash)
async def get_hash(hash_id: str, db: Session = Depends(get_db)):
    hash_ = db.query(CryptoHashModel).filter(CryptoHashModel.id == hash_id).first()
    if not hash_:
        raise HTTPException(status_code=404, detail="Hash not found")
    return hash_

@api_router.put("/hashes/{hash_id}", response_model=CryptoHash)
async def update_hash(hash_id: str, hash_update: CryptoHashUpdate, db: Session = Depends(get_db)):
    hash_ = db.query(CryptoHashModel).filter(CryptoHashModel.id == hash_id).first()
    if not hash_:
        raise HTTPException(status_code=404, detail="Hash not found")
    
    update_data = {k: v for k, v in hash_update.dict().items() if v is not None}
    
    # Validate exchange rate for RUB
    if update_data.get("currency") == CurrencyEnum.RUB and "exchange_rate" not in update_data:
        raise HTTPException(status_code=400, detail="Exchange rate is required for RUB currency")
    
    if update_data:
        for key, value in update_data.items():
            setattr(hash_, key, value)
        hash_.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(hash_)
    
    return hash_

@api_router.delete("/hashes/{hash_id}")
async def delete_hash(hash_id: str, db: Session = Depends(get_db)):
    hash_ = db.query(CryptoHashModel).filter(CryptoHashModel.id == hash_id).first()
    if not hash_:
        raise HTTPException(status_code=404, detail="Hash not found")
    
    db.delete(hash_)
    db.commit()
    
    return {"message": "Hash deleted successfully"}

# Root API endpoint
@api_router.get("/")
async def root():
    return {"message": "Crypto Financial App API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
