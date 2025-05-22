from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from enum import Enum


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'crypto_finance_app')]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Enums
class Currency(str, Enum):
    RUB = "RUB"
    USDT = "USDT"


# Define Models
class Team(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    rub_price_per_lot: float
    usdt_price_per_lot: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


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
    currency: Currency
    exchange_rate: Optional[float] = None  # Only required for RUB
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CryptoHashCreate(BaseModel):
    team_id: str
    hash_value: str
    token_amount: float
    currency: Currency
    exchange_rate: Optional[float] = None


class CryptoHashUpdate(BaseModel):
    hash_value: Optional[str] = None
    token_amount: Optional[float] = None
    currency: Optional[Currency] = None
    exchange_rate: Optional[float] = None


class TeamSummary(BaseModel):
    team_id: str
    team_name: str
    rub_tokens: float
    usdt_tokens: float
    rub_lots: float
    usdt_lots: float
    total_lots: float


# API Endpoints for Teams
@api_router.post("/teams", response_model=Team)
async def create_team(team: TeamCreate):
    team_dict = team.dict()
    team_obj = Team(**team_dict)
    await db.teams.insert_one(team_obj.dict())
    return team_obj


@api_router.get("/teams", response_model=List[Team])
async def get_teams(search: Optional[str] = None):
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    teams = await db.teams.find(query).to_list(1000)
    return [Team(**team) for team in teams]


# Summary and Calculation Endpoints
# Important: Define these routes BEFORE the /teams/{team_id} route
# to avoid FastAPI confusing 'summary' with a team_id
@api_router.get("/teams/summary", response_model=List[TeamSummary])
async def get_team_summaries():
    # Get all teams
    teams = await db.teams.find().to_list(1000)
    
    summaries = []
    for team in teams:
        team_obj = Team(**team)
        
        # Get all hashes for this team
        hashes = await db.crypto_hashes.find({"team_id": team_obj.id}).to_list(1000)
        
        # Initialize counters
        rub_tokens = 0.0
        usdt_tokens = 0.0
        
        # Calculate token totals
        for hash_ in hashes:
            hash_obj = CryptoHash(**hash_)
            if hash_obj.currency == Currency.RUB:
                # For RUB, multiply by exchange rate
                rub_tokens += hash_obj.token_amount * (hash_obj.exchange_rate or 0)
            else:
                # For USDT, just add the token amount
                usdt_tokens += hash_obj.token_amount
        
        # Calculate lots
        rub_lots = rub_tokens / team_obj.rub_price_per_lot if team_obj.rub_price_per_lot > 0 else 0
        usdt_lots = usdt_tokens / team_obj.usdt_price_per_lot if team_obj.usdt_price_per_lot > 0 else 0
        total_lots = rub_lots + usdt_lots
        
        # Create summary object
        summary = TeamSummary(
            team_id=team_obj.id,
            team_name=team_obj.name,
            rub_tokens=rub_tokens,
            usdt_tokens=usdt_tokens,
            rub_lots=rub_lots,
            usdt_lots=usdt_lots,
            total_lots=total_lots
        )
        
        summaries.append(summary)
    
    return summaries


@api_router.get("/teams/{team_id}/summary", response_model=TeamSummary)
async def get_team_summary(team_id: str):
    # Get team
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    team_obj = Team(**team)
    
    # Get all hashes for this team
    hashes = await db.crypto_hashes.find({"team_id": team_id}).to_list(1000)
    
    # Initialize counters
    rub_tokens = 0.0
    usdt_tokens = 0.0
    
    # Calculate token totals
    for hash_ in hashes:
        hash_obj = CryptoHash(**hash_)
        if hash_obj.currency == Currency.RUB:
            # For RUB, multiply by exchange rate
            rub_tokens += hash_obj.token_amount * (hash_obj.exchange_rate or 0)
        else:
            # For USDT, just add the token amount
            usdt_tokens += hash_obj.token_amount
    
    # Calculate lots
    rub_lots = rub_tokens / team_obj.rub_price_per_lot if team_obj.rub_price_per_lot > 0 else 0
    usdt_lots = usdt_tokens / team_obj.usdt_price_per_lot if team_obj.usdt_price_per_lot > 0 else 0
    total_lots = rub_lots + usdt_lots
    
    # Create summary object
    summary = TeamSummary(
        team_id=team_obj.id,
        team_name=team_obj.name,
        rub_tokens=rub_tokens,
        usdt_tokens=usdt_tokens,
        rub_lots=rub_lots,
        usdt_lots=usdt_lots,
        total_lots=total_lots
    )
    
    return summary


@api_router.get("/teams/{team_id}", response_model=Team)
async def get_team(team_id: str):
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return Team(**team)


@api_router.put("/teams/{team_id}", response_model=Team)
async def update_team(team_id: str, team_update: TeamUpdate):
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    update_data = {k: v for k, v in team_update.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.teams.update_one({"id": team_id}, {"$set": update_data})
    
    updated_team = await db.teams.find_one({"id": team_id})
    return Team(**updated_team)


@api_router.delete("/teams/{team_id}")
async def delete_team(team_id: str):
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Delete team and all associated hashes
    await db.teams.delete_one({"id": team_id})
    await db.crypto_hashes.delete_many({"team_id": team_id})
    
    return {"message": "Team and all associated hashes deleted successfully"}


# API Endpoints for Crypto Hashes
@api_router.post("/hashes", response_model=CryptoHash)
async def create_hash(crypto_hash: CryptoHashCreate):
    # Validate team exists
    team = await db.teams.find_one({"id": crypto_hash.team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Validate exchange rate for RUB
    if crypto_hash.currency == Currency.RUB and not crypto_hash.exchange_rate:
        raise HTTPException(status_code=400, detail="Exchange rate is required for RUB currency")
    
    hash_dict = crypto_hash.dict()
    hash_obj = CryptoHash(**hash_dict)
    await db.crypto_hashes.insert_one(hash_obj.dict())
    return hash_obj


@api_router.get("/hashes", response_model=List[CryptoHash])
async def get_hashes(team_id: Optional[str] = None):
    query = {}
    if team_id:
        query["team_id"] = team_id
    
    hashes = await db.crypto_hashes.find(query).to_list(1000)
    return [CryptoHash(**hash_) for hash_ in hashes]


@api_router.get("/hashes/{hash_id}", response_model=CryptoHash)
async def get_hash(hash_id: str):
    hash_ = await db.crypto_hashes.find_one({"id": hash_id})
    if not hash_:
        raise HTTPException(status_code=404, detail="Hash not found")
    return CryptoHash(**hash_)


@api_router.put("/hashes/{hash_id}", response_model=CryptoHash)
async def update_hash(hash_id: str, hash_update: CryptoHashUpdate):
    hash_ = await db.crypto_hashes.find_one({"id": hash_id})
    if not hash_:
        raise HTTPException(status_code=404, detail="Hash not found")
    
    update_data = {k: v for k, v in hash_update.dict().items() if v is not None}
    
    # Validate exchange rate for RUB
    if update_data.get("currency") == Currency.RUB and "exchange_rate" not in update_data:
        raise HTTPException(status_code=400, detail="Exchange rate is required for RUB currency")
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.crypto_hashes.update_one({"id": hash_id}, {"$set": update_data})
    
    updated_hash = await db.crypto_hashes.find_one({"id": hash_id})
    return CryptoHash(**updated_hash)


@api_router.delete("/hashes/{hash_id}")
async def delete_hash(hash_id: str):
    hash_ = await db.crypto_hashes.find_one({"id": hash_id})
    if not hash_:
        raise HTTPException(status_code=404, detail="Hash not found")
    
    await db.crypto_hashes.delete_one({"id": hash_id})
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
