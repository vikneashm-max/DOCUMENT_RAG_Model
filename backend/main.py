import os
import shutil
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS

try:
    import document_processor
    from document_processor import DocumentProcessor
except ImportError:
    from .document_processor import DocumentProcessor

# Load environment variables from backend or root directory
load_dotenv()
if not os.getenv("GROQ_API_KEY"):
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

app = FastAPI(title="DocuRAG Backend")

# Initialize processor
processor = DocumentProcessor()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    print("Warning: GROQ_API_KEY not found in environment variables.")

client = Groq(api_key=api_key)

class ChatRequest(BaseModel):
    message: str
    model: str = "llama-3.3-70b-versatile"

class ChatResponse(BaseModel):
    response: str

@app.get("/")
async def root():
    return {"message": "DocuRAG API is running"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        file_path = os.path.join(processor.upload_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        # Automatically trigger ingestion after upload
        processor.create_vector_store()
        return {"message": f"Successfully uploaded and processed {file.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ingest")
async def ingest_documents():
    try:
        vector_db = processor.create_vector_store()
        if vector_db:
            return {"message": "Successfully processed documents and updated vector store"}
        else:
            return {"message": "No documents found to process"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # 1. Search vector store for context
        context = ""
        try:
            # Check if index exists before trying to load
            index_path = os.path.join(processor.vector_store_path, "index.faiss")
            if os.path.exists(index_path):
                vector_db = FAISS.load_local(
                    processor.vector_store_path, 
                    processor.embeddings, 
                    allow_dangerous_deserialization=True
                )
                docs = vector_db.similarity_search(request.message, k=3)
                context = "\n".join([doc.page_content for doc in docs])
            else:
                print("Vector store index not found. Proceeding without context.")
        except Exception as e:
            print(f"Error loading vector store: {e}. Proceeding without context.")

        # 2. Build prompt with context
        system_prompt = "You are a helpful assistant. Use the provided context to answer the question if available."
        user_message = f"Context:\n{context}\n\nQuestion: {request.message}" if context else request.message

        # 3. Call Groq
        print(f"Calling Groq with model: {request.model}")
        try:
            completion = client.chat.completions.create(
                model=request.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=1024,
            )
            return ChatResponse(response=completion.choices[0].message.content)
        except Exception as groq_error:
            print(f"Groq API Error: {groq_error}")
            raise HTTPException(status_code=500, detail=f"AI Provider Error: {str(groq_error)}")
    except Exception as e:
        print(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
