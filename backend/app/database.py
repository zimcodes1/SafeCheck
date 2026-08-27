from app.config import Settings
from sqlmodel import create_engine, SQLModel, Session

settings = Settings()

database_url = f"sqlite:///{settings.db_path}"
connect_args = {"check_same_thread":False}

engine = create_engine(database_url, connect_args=connect_args)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session