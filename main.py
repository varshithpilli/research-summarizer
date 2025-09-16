from fastapi import FastAPI, UploadFile, File
import boto3, tempfile, os
import uuid
from botocore.exceptions import ClientError
import requests
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF
import camelot
from PIL import Image
import io
import pytesseract

RESULT = []

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

@app.get("/")
def root():
    return {"message": "landed successfully"}

def extract_text(pdf_path):
    doc = fitz.open(pdf_path)
    full_text = "".join([page.get_text() for page in doc])
    doc.close()
    lines = full_text.strip().split("\n")
    title = lines[0] if lines else "No Title"
    abstract = "\n".join(lines[1:5]) if len(lines) > 1 else "No Abstract"
    return {"title": title, "abstract": abstract, "full_text": full_text}

def extract_tables(pdf_path):
    tables_list = []
    try:
        tables = camelot.read_pdf(pdf_path, pages="all")
        for i, table in enumerate(tables):
            tables_list.append({f"table_{i+1}": table.df.values.tolist()})
    except Exception as e:
        tables_list.append({"error": str(e)})
    return tables_list

def extract_figures(pdf_path):
    doc = fitz.open(pdf_path)
    figures_list = []
    for page_number, page in enumerate(doc):
        for img_index, img in enumerate(page.get_images(full=True)):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            image = Image.open(io.BytesIO(image_bytes))
            ocr_text = pytesseract.image_to_string(image).strip()
            figures_list.append({
                f"page_{page_number+1}_figure_{img_index+1}": {
                    "size": image.size,
                    "ocr_text": ocr_text
                }
            })
    doc.close()
    return figures_list

# -------------------------
# Upload endpoint with extraction
# -------------------------
@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    # Save file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
        print(f"Saved upload temporarily at: {tmp_path}")

    # Upload to S3
    s3_key = file.filename
    s3_client.upload_file(tmp_path, BUCKET_NAME, s3_key)
    print(f"Uploaded file {s3_key} to bucket {BUCKET_NAME}")

    # Run extraction on the saved file
    text_json = extract_text(tmp_path)
    print("Text extracted")
    tables = extract_tables(tmp_path)
    print("Tables extracted")
    figures = extract_figures(tmp_path)
    print("Images extracted")

    # Clean up temp file
    os.remove(tmp_path)

    result = {
        "text": text_json,
        "tables": tables,
        "figures": figures,
    }
    RESULT.append(result)
    # print(result)
    return {"status": "ok", "message": "File uploaded and processed successfully", "result": result}

# @app.post("/upload")
# async def upload(file: UploadFile = File(...)):
#     with tempfile.NamedTemporaryFile(delete=False) as tmp:
#         tmp.write(await file.read())
#         tmp_path = tmp.name
#         print(tmp_path)
#     s3_key = f"{file.filename}"
#     s3_client.upload_file(tmp_path, BUCKET_NAME, s3_key)
#     print(f"File {s3_key} uploaded to s3-bucket {BUCKET_NAME}")
#     os.remove(tmp_path)
#     return {"status": "ok", "message": "File uploaded successfully"}

@app.post("/summarize")
def stream_deepseek():
    conversation = [
        {
            "role": "user",
            "content": [{
                "text": 
                    f"""
                    Please summarize the following research document. Provide a concise summary highlighting the main objectives, methods, results, and conclusions:
                    {RESULT[-1]}
                    """
            }]
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
