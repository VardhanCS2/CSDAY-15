from app.database.database import engine



def test_database_connection():

    connection = engine.connect()

    assert connection

    connection.close()