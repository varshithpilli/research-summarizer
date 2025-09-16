from fastapi import FastAPI, UploadFile, File
import boto3, tempfile, os
import uuid
from botocore.exceptions import ClientError
import requests
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For testing only; restrict this to your frontend URL in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
s3_client = boto3.client("s3")
BUCKET_NAME = "file-storage-for-cloud"
client = boto3.client("bedrock-runtime", region_name="us-east-1")
model_id = "arn:aws:bedrock:us-east-1:304292228765:inference-profile/us.deepseek.r1-v1:0"

JOB_RESULTS = {}

@app.get("/")
def root():
    return {"message": "landed successfully"}

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
        print(tmp_path)
    s3_key = f"{file.filename}"
    s3_client.upload_file(tmp_path, BUCKET_NAME, s3_key)
    print(f"File {s3_key} uploaded to s3-bucket {BUCKET_NAME}")
    os.remove(tmp_path)
    return {"status": "ok", "message": "File uploaded successfully"}

@app.post("/summarize")
def stream_deepseek():
    conversation = [
        {
            "role": "user",
            "content": [{"text": "Tell me a story about a robot that learned to love."}]
        }
    ]

    def event_stream():
        try:
            response = client.converse_stream(
                modelId=model_id,
                messages=conversation,
                inferenceConfig={
                    "maxTokens": 1024,
                    "temperature": 0.7,
                    "topP": 0.9
                },
                additionalModelRequestFields={},
                performanceConfig={"latency": "standard"}
            )

            for event in response["stream"]:
                if "contentBlockDelta" in event:
                    delta = event["contentBlockDelta"]["delta"]
                    text = delta.get("text", "")
                    yield text

        except ClientError as e:
            yield f"\n❌ AWS Client Error: {e.response['Error']['Message']}"
        except Exception as e:
            yield f"\n❌ Unexpected error: {str(e)}"

    # Return a streaming response, with text/plain content type
    return StreamingResponse(event_stream(), media_type="text/plain")
