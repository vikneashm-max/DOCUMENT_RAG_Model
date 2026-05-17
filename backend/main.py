import os
import shutil
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
from typing import Optional
from jose import JWTError, jwt
from datetime import datetime, timedelta

# Fix for torch DLL load issues on Windows
import sys
if sys.platform == "win32":
    import os
    torch_lib = os.path.join(sys.prefix, 'Lib', 'site-packages', 'torch', 'lib')
    if os.path.exists(torch_lib):
        try:
            os.add_dll_directory(torch_lib)
        except Exception:
            pass

try:
    from backend.document_processor import DocumentProcessor
except ImportError:
    try:
        from .document_processor import DocumentProcessor
    except ImportError:
        import document_processor
        from document_processor import DocumentProcessor

# Database imports
from sqlmodel import Session, select
from database import engine, init_db, get_session
from models import User, Conversation, Message, Document as DBDocument
from auth import get_password_hash, verify_password, create_access_token

# Load environment variables
load_dotenv()
if not os.getenv("GROQ_API_KEY"):
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

app = FastAPI(title="DocuRAG Backend")

# Initialize database on startup
@app.on_event("startup")
def on_startup():
    init_db()

# Initialize processor
processor = DocumentProcessor()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    print("Warning: GROQ_API_KEY not found in environment variables.")

client = Groq(api_key=api_key)

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"

# ─────────────────────────────────────────────
# Helper: get current user from JWT token
# ─────────────────────────────────────────────
def get_current_user(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")  # returns email
    except JWTError:
        return None

# ─────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    model: str = "llama-3.3-70b-versatile"
    conversation_id: Optional[int] = None  # pass existing conversation id to continue chat
    token: Optional[str] = None            # JWT token to identify user

class ChatResponse(BaseModel):
    response: str
    conversation_id: int  # return conversation id so frontend can continue same chat

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class UserSignup(BaseModel):
    email: str
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: str
    password: str

# ─────────────────────────────────────────────
# Auth Routes
# ─────────────────────────────────────────────
@app.post("/signup")
async def signup(user_data: UserSignup):
    with Session(engine) as session:
        existing_user = session.exec(select(User).where(User.email == user_data.email)).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        new_user = User(
            email=user_data.email,
            password_hash=get_password_hash(user_data.password),
            full_name=user_data.full_name
        )
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        
        token = create_access_token({"sub": new_user.email})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {"email": new_user.email, "full_name": new_user.full_name}
        }

@app.post("/signin")
async def signin(user_data: UserLogin):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == user_data.email)).first()
        if not user or not verify_password(user_data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        token = create_access_token({"sub": user.email})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {"email": user.email, "full_name": user.full_name}
        }

# ─────────────────────────────────────────────
# Chat History Routes
# ─────────────────────────────────────────────
@app.get("/conversations")
async def get_conversations(token: str):
    """Get all conversations for logged in user"""
    email = get_current_user(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        conversations = session.exec(
            select(Conversation)
            .where(Conversation.user_id == user.id)
            .order_by(Conversation.created_at.desc())
        ).all()
        
        return [{"id": c.id, "title": c.title, "created_at": c.created_at} for c in conversations]

@app.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: int, token: str):
    """Get all messages for a specific conversation"""
    email = get_current_user(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    with Session(engine) as session:
        conversation = session.get(Conversation, conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        messages = session.exec(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        ).all()
        
        return [{"role": m.role, "content": m.content, "created_at": m.created_at} for m in messages]

@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: int, token: str):
    """Delete a conversation and all its messages"""
    email = get_current_user(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    with Session(engine) as session:
        # Delete messages first
        messages = session.exec(select(Message).where(Message.conversation_id == conversation_id)).all()
        for message in messages:
            session.delete(message)
        
        # Delete conversation
        conversation = session.get(Conversation, conversation_id)
        if conversation:
            session.delete(conversation)
        
        session.commit()
        return {"message": "Conversation deleted successfully"}

@app.get("/profile")
async def get_profile(token: str):
    """Get user profile data and statistics"""
    email = get_current_user(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Calculate stats
        total_convs = session.exec(select(Conversation).where(Conversation.user_id == user.id)).all()
        total_messages = 0
        for conv in total_convs:
            msgs = session.exec(select(Message).where(Message.conversation_id == conv.id)).all()
            total_messages += len(msgs)
            
        return {
            "full_name": user.full_name,
            "email": user.email,
            "created_at": user.created_at,
            "total_conversations": len(total_convs),
            "total_messages": total_messages
        }

class PasswordChange(BaseModel):
    token: str
    current_password: str
    new_password: str

@app.post("/change-password")
async def change_password(data: PasswordChange):
    """Change user password after verifying current one"""
    email = get_current_user(data.token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user or not verify_password(data.current_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Incorrect current password")
        
        user.password_hash = get_password_hash(data.new_password)
        session.add(user)
        session.commit()
        return {"message": "Password updated successfully"}

@app.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """Generate reset token and mock sending email link"""
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == data.email)).first()
        
        # Security best practice: return success even if user not found, 
        # but output token for testing / development in JSON response so frontend can proceed!
        if not user:
            return {
                "message": "If this email is registered, a password reset link has been generated.",
                "status": "not_found"
            }
        
        # Generate token
        expire = datetime.utcnow() + timedelta(minutes=15)
        payload = {"sub": user.email, "exp": expire}
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        
        print("\n" + "="*50)
        print(f"PASSWORD RESET LINK FOR {user.email}:")
        print(f"http://localhost:5173/reset-password?token={token}")
        print("="*50 + "\n")
        
        return {
            "message": "If this email is registered, a password reset link has been generated.",
            "token": token,
            "link": f"http://localhost:5173/reset-password?token={token}"
        }

@app.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """Reset user password using token from URL"""
    try:
        payload = jwt.decode(data.token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=400, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        user.password_hash = get_password_hash(data.new_password)
        session.add(user)
        session.commit()
        
        return {"message": "Password reset successfully"}

# ─────────────────────────────────────────────
# Document Management Routes
# ─────────────────────────────────────────────
@app.get("/documents")
async def get_documents(token: str):
    """Get all documents uploaded by the logged-in user"""
    email = get_current_user(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        documents = session.exec(
            select(DBDocument)
            .where(DBDocument.user_id == user.id)
            .order_by(DBDocument.created_at.desc())
        ).all()
        
        return [
            {
                "id": doc.id,
                "file_name": doc.file_name,
                "file_type": doc.file_type,
                "status": doc.status,
                "created_at": doc.created_at
            }
            for doc in documents
        ]

@app.delete("/documents/{document_id}")
async def delete_document(document_id: int, token: str):
    """Delete a document record from database"""
    email = get_current_user(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        doc = session.get(DBDocument, document_id)
        if not doc or doc.user_id != user.id:
            raise HTTPException(status_code=404, detail="Document not found")
        
        session.delete(doc)
        session.commit()
        return {"message": "Document deleted successfully"}

@app.get("/documents/stats")
async def get_documents_stats(token: str):
    """Get stats of user's uploaded documents"""
    email = get_current_user(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        docs = session.exec(select(DBDocument).where(DBDocument.user_id == user.id)).all()
        
        total_docs = len(docs)
        total_processed = sum(1 for d in docs if d.status == "processed")
        
        # Calculate real FAISS vector store size
        try:
            total_size_bytes = 0
            if os.path.exists(processor.vector_store_path):
                for entry in os.scandir(processor.vector_store_path):
                    if entry.is_file():
                        total_size_bytes += entry.stat().st_size
            
            # Format to human readable string
            if total_size_bytes == 0:
                storage_used = "0 KB"
            elif total_size_bytes < 1024:
                storage_used = f"{total_size_bytes} B"
            elif total_size_bytes < 1024 * 1024:
                storage_used = f"{total_size_bytes / 1024:.1f} KB"
            else:
                storage_used = f"{total_size_bytes / (1024 * 1024):.1f} MB"
        except Exception:
            storage_used = "45 KB" # fallback
            
        return {
            "total_documents": total_docs,
            "total_processed": total_processed,
            "storage_used": storage_used
        }

# ─────────────────────────────────────────────
# Existing Routes
# ─────────────────────────────────────────────
@app.get("/")
async def root():
    return {"message": "DocuRAG API is running"}

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    token: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    try:
        # Check authorization if available
        email = None
        jwt_token = token
        if not jwt_token and authorization and authorization.startswith("Bearer "):
            jwt_token = authorization.split(" ")[1]
        if jwt_token:
            email = get_current_user(jwt_token)

        # Clear existing uploads
        if os.path.exists(processor.upload_dir):
            for filename in os.listdir(processor.upload_dir):
                file_path = os.path.join(processor.upload_dir, filename)
                try:
                    if os.path.isfile(file_path) or os.path.islink(file_path):
                        os.unlink(file_path)
                    elif os.path.isdir(file_path):
                        shutil.rmtree(file_path)
                except Exception as e:
                    print(f'Failed to delete {file_path}. Reason: {e}')

        file_path = os.path.join(processor.upload_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        processor.create_vector_store()
        
        # Save record to database if user is logged in
        if email:
            with Session(engine) as session:
                user = session.exec(select(User).where(User.email == email)).first()
                if user:
                    db_doc = DBDocument(
                        user_id=user.id,
                        file_name=file.filename,
                        file_path=file_path,
                        file_type=file.filename.split('.')[-1].upper(),
                        status="processed"
                    )
                    session.add(db_doc)
                    session.commit()

        if os.path.exists(file_path):
            os.remove(file_path)
            
        return {"message": f"Successfully processed {file.filename}"}
    except Exception as e:
        # Save error record if user logged in
        if email:
            try:
                with Session(engine) as session:
                    user = session.exec(select(User).where(User.email == email)).first()
                    if user:
                        db_doc = DBDocument(
                            user_id=user.id,
                            file_name=file.filename,
                            file_path=os.path.join(processor.upload_dir, file.filename),
                            file_type=file.filename.split('.')[-1].upper(),
                            status="error"
                        )
                        session.add(db_doc)
                        session.commit()
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/clear")
async def clear_context():
    try:
        if os.path.exists(processor.upload_dir):
            for filename in os.listdir(processor.upload_dir):
                file_path = os.path.join(processor.upload_dir, filename)
                if os.path.isfile(file_path):
                    os.unlink(file_path)
        
        if os.path.exists(processor.vector_store_path):
            shutil.rmtree(processor.vector_store_path)
            os.makedirs(processor.vector_store_path)
            
        return {"message": "Context cleared successfully"}
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

# ─────────────────────────────────────────────
# Chat Route — Now Saves History
# ─────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # 1. Search vector store for context
        context = ""
        try:
            index_path = os.path.join(processor.vector_store_path, "index.faiss")
            if os.path.exists(index_path):
                from langchain_community.vectorstores import FAISS
                vector_db = FAISS.load_local(
                    processor.vector_store_path,
                    processor.embeddings,
                    allow_dangerous_deserialization=True
                )
                docs = vector_db.max_marginal_relevance_search(request.message, k=5, fetch_k=10)
                context = "\n".join([doc.page_content for doc in docs])
            else:
                print("Vector store index not found. Proceeding without context.")
        except Exception as e:
            print(f"Error loading vector store: {e}. Proceeding without context.")

        # 2. Build prompt
        system_prompt = """You are a highly intelligent and professional Document Assistant. 
Analyze the provided context (which could be study materials, resumes, reports, or any other document) and answer the user's question accurately based on that context.

- Base your answers strictly on the provided context.
- If the context contains specific details or technical concepts, prioritize accuracy.
- If the information is not in the context, say you don't know rather than guessing.
- Be concise, professional, and helpful."""
        user_message = f"Context from Document:\n{context}\n\nQuestion: {request.message}" if context else request.message

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
            ai_response = completion.choices[0].message.content
        except Exception as groq_error:
            print(f"Groq API Error: {groq_error}")
            raise HTTPException(status_code=500, detail=f"AI Provider Error: {str(groq_error)}")

        # 4. Save chat history to PostgreSQL (only if token provided)
        conversation_id = request.conversation_id

        if request.token:
            email = get_current_user(request.token)
            if email:
                with Session(engine) as session:
                    user = session.exec(select(User).where(User.email == email)).first()
                    if user:
                        # Create new conversation if none exists
                        if not conversation_id:
                            # Use first 50 chars of message as title
                            title = request.message[:50] + "..." if len(request.message) > 50 else request.message
                            conversation = Conversation(user_id=user.id, title=title)
                            session.add(conversation)
                            session.commit()
                            session.refresh(conversation)
                            conversation_id = conversation.id

                        # Save user message
                        user_msg = Message(
                            conversation_id=conversation_id,
                            role="user",
                            content=request.message
                        )
                        session.add(user_msg)

                        # Save assistant response
                        assistant_msg = Message(
                            conversation_id=conversation_id,
                            role="assistant",
                            content=ai_response
                        )
                        session.add(assistant_msg)
                        session.commit()

        return ChatResponse(
            response=ai_response,
            conversation_id=conversation_id or 0
        )

    except Exception as e:
        print(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)