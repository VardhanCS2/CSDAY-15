from typing import Any



def success_response(
    data: Any = None,
    message: str = "Success"
):

    return {
        "success": True,
        "message": message,
        "data": data
    }



def error_response(
    message: str,
    status_code: int
):

    return {
        "success": False,
        "message": message,
        "status_code": status_code
    }