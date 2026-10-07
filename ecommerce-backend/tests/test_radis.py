from app.redis.connection import redis_client


try:

    response = redis_client.ping()

    print("Redis Connected:", response)


    redis_client.set(
        "test_key",
        "Hello Redis"
    )


    value = redis_client.get(
        "test_key"
    )


    print("Stored Value:", value)


except Exception as e:

    print("Redis Error:", e)