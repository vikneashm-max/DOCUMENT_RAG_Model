import os
from sqlmodel import create_engine, Session, SQLModel
from dotenv import load_dotenv

load_dotenv()

# Database URL should be in .env: postgresql://user:password@localhost/dbname
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Default to a local sqlite for development if Postgres URL is missing
    # This allows the app to run immediately while the user sets up Postgres
    DATABASE_URL = "sqlite:///./docurag.db"
    print("Warning: DATABASE_URL not found. Using local SQLite (docurag.db)")

engine = create_engine(DATABASE_URL, echo=False)

def init_db():
    import models  # Fixed: removed the dot
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session