import os
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from backend.app.core.database import Base, get_db
from backend.app.main import app

TEST_DB_FILE = "./test_campusos.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# Enable foreign keys for test database
@event.listens_for(test_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except OSError:
            pass
    Base.metadata.create_all(bind=test_engine)
    yield
    test_engine.dispose()
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except OSError:
            pass

@pytest.fixture()
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture()
def client():
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
