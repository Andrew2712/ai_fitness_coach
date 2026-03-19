from sqlalchemy import create_engine, Column, String, Integer, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os, datetime

DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgres://", "postgresql://")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String, unique=True, index=True)
    username      = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    fitbit_user_id  = Column(String, nullable=True)
    fitbit_access_token  = Column(String, nullable=True)
    fitbit_refresh_token = Column(String, nullable=True)
    strava_access_token  = Column(String, nullable=True)
    strava_refresh_token = Column(String, nullable=True)
    strava_athlete_id    = Column(String, nullable=True)
    created_at    = Column(DateTime, default=datetime.datetime.utcnow)
    is_active     = Column(Boolean, default=True)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
