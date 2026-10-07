import os
import uuid

from fastapi import UploadFile, HTTPException



UPLOAD_DIR = "app/uploads/products"



ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
]


MAX_FILE_SIZE = 5 * 1024 * 1024   # 5 MB



def validate_image(
    file: UploadFile
):

    if file.content_type not in ALLOWED_TYPES:

        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG and WEBP images are allowed"
        )



def save_image(
    file: UploadFile
):

    validate_image(
        file
    )


    os.makedirs(
        UPLOAD_DIR,
        exist_ok=True
    )


    extension = file.filename.split(".")[-1]


    filename = (
        f"{uuid.uuid4()}.{extension}"
    )


    file_path = os.path.join(
        UPLOAD_DIR,
        filename
    )


    with open(
        file_path,
        "wb"
    ) as buffer:

        buffer.write(
            file.file.read()
        )


    return file_path