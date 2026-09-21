from app.config import Settings
from sqlalchemy import event
from sqlmodel import create_engine, SQLModel, Session
from app.models.command import Command
from app.models.alert import Alert
from app.models.reading import Reading

settings = Settings()

database_url = f"sqlite:///{settings.db_path}"
connect_args = {"check_same_thread":False}

engine = create_engine(database_url, connect_args=connect_args)


@event.listens_for(engine, "connect")
def _configure_sqlite_connection(dbapi_connection, _connection_record):
    """Allow the poller and packet-capture callback to coexist safely."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.close()

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
