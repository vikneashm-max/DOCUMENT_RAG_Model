from datetime import datetime
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    full_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    conversations: List["Conversation"] = Relationship(back_populates="user")
    documents: List["Document"] = Relationship(back_populates="user")

class Conversation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(default="New Chat")
    user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    user: User = Relationship(back_populates="conversations")
    messages: List["Message"] = Relationship(back_populates="conversation")
    documents: List["Document"] = Relationship(back_populates="conversation")

class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="conversation.id")
    role: str # 'user' or 'assistant'
    content: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    conversation: Conversation = Relationship(back_populates="messages")

class Document(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    conversation_id: Optional[int] = Field(default=None, foreign_key="conversation.id")
    file_name: str
    file_path: str
    file_type: str
    status: str = Field(default="processed") # 'pending', 'processed', 'error'
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    user: User = Relationship(back_populates="documents")
    conversation: Optional[Conversation] = Relationship(back_populates="documents")
