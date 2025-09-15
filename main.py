from fastapi import FastAPI, UploadFile, File
import boto3, tempfile, os
import uuid
import requests
from fastapi.responses import StreamingResponse

app = FastAPI()
s3_client = boto3.client("s3")
BUCKET_NAME = "file-storage-for-cloud"

JOB_RESULTS = {}

@app.post("/summarize")
async def summarize(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())

    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    s3_key = f"{job_id}/{file.filename}"
    s3_client.upload_file(tmp_path, BUCKET_NAME, s3_key)
    os.remove(tmp_path)

    return {"message": "File uploaded. Processing started.", "job_id": job_id}

@app.post("/callback/{job_id}")
async def lambda_callback(job_id: str, payload: dict):
    JOB_RESULTS[job_id] = payload
    return {"status": "received"}

@app.get("/status/{job_id}")
async def check_status(job_id: str):
    if job_id not in JOB_RESULTS:
        return {"status": "processing"}

    result = JOB_RESULTS[job_id]
    
    # Placeholder Bedrock call (replace with your actual streaming logic)
    def stream_summary():
        yield f"Summary for {result['file_name']}:\n"
        yield result['text']['abstract'] + "\n"

    return StreamingResponse(stream_summary(), media_type="text/plain")