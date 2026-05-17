import os
from typing import List

class DocumentProcessor:
    def __init__(self, upload_dir: str = "uploads", vector_store_path: str = "vectorstore", chunk_size: int = 1000, chunk_overlap: int = 200):
        self.upload_dir = upload_dir
        self.vector_store_path = vector_store_path
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self._embeddings = None
        
        # Ensure directories exist
        if not os.path.exists(self.upload_dir):
            os.makedirs(self.upload_dir)
        if not os.path.exists(self.vector_store_path):
            os.makedirs(self.vector_store_path)

    @property
    def embeddings(self):
        if self._embeddings is None:
            # Set torch environment variables to minimize memory on 512MB CPU servers
            os.environ["OMP_NUM_THREADS"] = "1"
            os.environ["MKL_NUM_THREADS"] = "1"
            os.environ["OPENBLAS_NUM_THREADS"] = "1"
            os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
            os.environ["NUMEXPR_NUM_THREADS"] = "1"
            
            try:
                import torch
                torch.set_num_threads(1)
                torch.set_num_interop_threads(1)
            except ImportError:
                pass

            from langchain_community.embeddings import FastEmbedEmbeddings
            print("Loading FastEmbed embedding model (BAAI/bge-small-en-v1.5)...")
            self._embeddings = FastEmbedEmbeddings(
                model_name="BAAI/bge-small-en-v1.5"
            )
        return self._embeddings

    def create_vector_store(self):
        """
        Processes documents, creates a FAISS vector store, saves it locally, and uploads it to Supabase Storage.
        """
        from langchain_community.vectorstores import FAISS
        chunks = self.process_directory()
        if not chunks:
            return None
            
        print(f"Creating vector store for {len(chunks)} chunks...")
        vector_db = FAISS.from_documents(chunks, self.embeddings)
        vector_db.save_local(self.vector_store_path)
        print(f"Vector store saved to {self.vector_store_path}")
        
        # Upload the created vector store to Supabase Storage
        self.upload_to_supabase()
        
        return vector_db

    def upload_to_supabase(self):
        """
        Uploads index.faiss and index.pkl from local vector_store_path to Supabase storage.
        """
        supabase_url = os.getenv("SUPABASE_URL", "https://dgoatariwyvdirywmgnj.supabase.co")
        supabase_key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not supabase_key:
            print("Warning: SUPABASE_KEY/SUPABASE_SERVICE_ROLE_KEY not found. Skipping Supabase Storage upload.")
            return

        try:
            from supabase import create_client
            supabase = create_client(supabase_url, supabase_key)
            
            for filename in ["index.faiss", "index.pkl"]:
                local_file_path = os.path.join(self.vector_store_path, filename)
                if os.path.exists(local_file_path):
                    print(f"Uploading {filename} to Supabase Storage...")
                    with open(local_file_path, "rb") as f:
                        supabase.storage.from_("vectorstore").upload(
                            path=filename,
                            file=f,
                            file_options={"upsert": "true"}
                        )
                    print(f"Successfully uploaded {filename} to Supabase Storage.")
        except Exception as e:
            print(f"Error uploading vector store to Supabase: {e}")

    def download_from_supabase(self):
        """
        Downloads index.faiss and index.pkl from Supabase storage to local vector_store_path.
        """
        supabase_url = os.getenv("SUPABASE_URL", "https://dgoatariwyvdirywmgnj.supabase.co")
        supabase_key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not supabase_key:
            print("Warning: SUPABASE_KEY/SUPABASE_SERVICE_ROLE_KEY not found. Skipping Supabase Storage download.")
            return False

        try:
            from supabase import create_client
            supabase = create_client(supabase_url, supabase_key)
            
            # Ensure local directory exists
            if not os.path.exists(self.vector_store_path):
                os.makedirs(self.vector_store_path)

            downloaded_any = False
            for filename in ["index.faiss", "index.pkl"]:
                local_file_path = os.path.join(self.vector_store_path, filename)
                print(f"Downloading {filename} from Supabase Storage...")
                try:
                    response = supabase.storage.from_("vectorstore").download(filename)
                    with open(local_file_path, "wb") as f:
                        f.write(response)
                    print(f"Successfully downloaded {filename} from Supabase Storage.")
                    downloaded_any = True
                except Exception as file_error:
                    print(f"Could not download {filename} from Supabase: {file_error}")
            
            return downloaded_any
        except Exception as e:
            print(f"Error downloading vector store from Supabase: {e}")
            return False

    def process_directory(self) -> List["Document"]:
        """
        Loads all PDF and TXT files from the upload directory and splits them into chunks.
        """
        from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader, TextLoader
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        
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
