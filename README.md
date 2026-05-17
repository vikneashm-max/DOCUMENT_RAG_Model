RAG Project

A modern Retrieval-Augmented Generation (RAG) application built with React + TypeScript + Vite. This project enables intelligent document querying by combining semantic search, vector embeddings, and Large Language Models (LLMs) to generate context-aware responses.

Features
⚡ Fast frontend powered by Vite
⚛️ React + TypeScript architecture
🔍 Semantic document retrieval
🧠 LLM-powered answer generation
📄 Upload and process documents
📚 Vector database integration
💬 Interactive chat interface
🎨 Responsive and modern UI
🔥 Hot Module Replacement (HMR)

Tech Stack
Frontend: React, TypeScript, Vite
Backend: FastAPI
LLM Integration: Groq API Key (Free Tier)
Vector Database: FAISS

Installation

Clone the repository:
git clone <your-repository-url>
cd rag-project

Install dependencies:
npm install

Start the development server:
npm run dev

The React Frontpage will run like this:
http://localhost:8000

Environment Variables
Create a .env file in the root directory:
GROQ_API_KEY="Paste Your Groq API Key Here"(Get your Free API Key from https://groq.com)
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/rag_db
SECRET_KEY=Paste Your Secret Key Here 
(For Database and Secret Key, No double quotes should be given)

Install Python(not latest version)

run this command:
python -m venv venv inside the project folder

run this command:
pip install -r requirements.txt

After installing dependencies,
Enjoy!
