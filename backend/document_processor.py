import os
from typing import List
from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document

class DocumentProcessor:
    def __init__(self, upload_dir: str = "uploads", vector_store_path: str = "vectorstore", chunk_size: int = 1000, chunk_overlap: int = 200):
        self.upload_dir = upload_dir
        self.vector_store_path = vector_store_path
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        
        # Initialize embeddings
        print("Loading embedding model...")
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        # Ensure directories exist
        if not os.path.exists(self.upload_dir):
            os.makedirs(self.upload_dir)
        if not os.path.exists(self.vector_store_path):
            os.makedirs(self.vector_store_path)

    def create_vector_store(self):
        """
        Processes documents, creates a FAISS vector store, and saves it locally.
        """
        chunks = self.process_directory()
        if not chunks:
            return None
            
        print(f"Creating vector store for {len(chunks)} chunks...")
        vector_db = FAISS.from_documents(chunks, self.embeddings)
        vector_db.save_local(self.vector_store_path)
        print(f"Vector store saved to {self.vector_store_path}")
        return vector_db

    def process_directory(self) -> List[Document]:
        """
        Loads all PDF and TXT files from the upload directory and splits them into chunks.
        """
        print(f"Processing documents in {self.upload_dir}...")
        
        # Load PDFs
        pdf_loader = DirectoryLoader(
            self.upload_dir, 
            glob="./*.pdf", 
            loader_cls=PyPDFLoader
        )
        
        # Load Text files
        txt_loader = DirectoryLoader(
            self.upload_dir, 
            glob="./*.txt", 
            loader_cls=TextLoader
        )
        
        documents = []
        try:
            documents.extend(pdf_loader.load())
        except Exception as e:
            print(f"Error loading PDFs: {e}")
            
        try:
            documents.extend(txt_loader.load())
        except Exception as e:
            print(f"Error loading TXT files: {e}")

        if not documents:
            print("No documents found to process.")
            return []

        # Split documents into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=len,
            is_separator_regex=False,
        )
        
        chunks = text_splitter.split_documents(documents)
        print(f"Created {len(chunks)} chunks from {len(documents)} documents.")
        
        return chunks

if __name__ == "__main__":
    # Quick test
    processor = DocumentProcessor()
    chunks = processor.process_directory()
    for i, chunk in enumerate(chunks[:3]):
        print(f"Chunk {i}: {chunk.page_content[:100]}...")
