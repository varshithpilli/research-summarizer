from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncio
import io
import tempfile
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/summarize")
async def summarize(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    
    client = genai.Client()
    uploaded_file = client.files.upload(file=tmp_path)
    
    def sync_generator():
        for chunk in client.models.generate_content_stream(
            model="gemini-2.0-flash",
            contents=[
                uploaded_file,
                "\n\n",
                "Carefully analyze the content of the attached research paper, identifying its key hypotheses, methodologies, results, and conclusions. Provide a detailed and coherent summary that captures the essence of the study, highlights its significance in the field, and explains any novel contributions or findings in a clear and accessible manner.",
            ],
        ):
            yield chunk.text

    async def async_generator():
        for chunk in sync_generator():
            yield chunk
            await asyncio.sleep(0)

    return StreamingResponse(async_generator(), media_type="text/plain")
