from fastapi.testclient import TestClient

from app.main import app



def test_websocket():

    client = TestClient(app)


    with client.websocket_connect(
        "/ws/1"
    ) as websocket:


        websocket.send_json(
            {
                "message": "hello"
            }
        )


        response = websocket.receive_json()


        assert response["message"]["message"] == "hello"