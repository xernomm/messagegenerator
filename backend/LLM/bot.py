import ollama
import chromadb
import os
from PyPDF2 import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import requests
from bs4 import BeautifulSoup
# import pywhatkit as kit
from datetime import datetime, timedelta
import time

client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection(name="chat_context")
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def sanitize_filename(filename: str) -> str:
    return filename.replace(" ", "_")

def generate_prompt(topic, language, style, context=None, previous_responses=None):
    base_prompt = f"You are a {style} person, and you speak strictly in '{language}' language."
    base_prompt += f" Your task is to write short messages or comments about this topic: {topic}."
    
    if context:
        base_prompt += f"\n\nHere is some reference context to consider:\n{context}"
    
    if previous_responses:
        base_prompt += f"\n\nAvoid repeating these previous messages:\n" + "\n".join(previous_responses)

    base_prompt += "\n\nRespond with only short messages or comments, no explanations or meta-commentary. do not use quotation mark."
    return base_prompt


def split_text(text, chunk_size=1500, chunk_overlap=200):
    splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    chunks = [c.strip() for c in splitter.split_text(text) if c.strip()]
    return chunks


def process_pdf(file_path):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File {file_path} not found.")

    doc_id = f"file#{os.path.basename(file_path)}"
    existing_ids = collection.get()['ids']
    if any(i.startswith(f"{doc_id}#") for i in existing_ids):
        print(f"✅ {file_path} already indexed, skipping.")
        return

    reader = PdfReader(file_path)
    text = "\n".join([p.extract_text() for p in reader.pages if p.extract_text()])
    chunks = split_text(text)

    print(f"🔎 Indexing {len(chunks)} chunks from {file_path}...")

    for i, chunk in enumerate(chunks):
        embed = ollama.embed(model="mxbai-embed-large", input=chunk)["embeddings"]
        collection.add(
            ids=[f"{doc_id}#{i}"],
            embeddings=embed,
            documents=[chunk],
            metadatas=[{"source": doc_id}]   # ✅ penting!
        )


    print(f"✅ Finished indexing {file_path}.")


def process_text(text: str, text_id: str = "manual"):
    chunks = split_text(text)
    print(f"🔎 Indexing {len(chunks)} chunks from plain text '{text_id}'...")

    for i, chunk in enumerate(chunks):
        embed = ollama.embed(model="mxbai-embed-large", input=chunk)["embeddings"]
        collection.add(
            ids=[f"{text_id}#{i}"],
            embeddings=embed,
            documents=[chunk]
        )

    print(f"✅ Text '{text_id}' indexed.")

def extract_text_from_url(url):
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; Chatbot/1.0; +http://example.com/bot)"
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Hilangkan script, style, dan tag non-teks lain
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
            tag.decompose()

        # Ambil teks bersih
        text = soup.get_text(separator='\n', strip=True)
        # Filter baris kosong
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        return '\n'.join(lines)

    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        return None
    except Exception as e:
        print(f"Parsing error: {e}")
        return None
    
def retrieve_context(user_input: str, source: str, n_results=5) -> str:
    # Embed user input
    input_embed = ollama.embed(model="mxbai-embed-large", input=user_input)["embeddings"]

    # Retrieve paling mirip berdasarkan embedding input
    results = collection.query(
        query_embeddings=input_embed,
        where={"source": source},
        n_results=n_results
    )

    docs = results.get("documents", [])
    if not docs or not docs[0]:
        return "⚠️ No relevant context found."

    return "\n---\n".join(docs[0])



def get_context_from_file(user_input: str, file_path: str, n_results: int = 5) -> str:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"❌ File {file_path} tidak ditemukan.")
    
    doc_id = f"file#{os.path.basename(file_path)}"

    # Indexing jika belum ada
    existing_ids = collection.get()['ids']
    if not any(i.startswith(f"{doc_id}#") for i in existing_ids):
        print(f"🔎 Mengindeks konteks dari {file_path}...")
        reader = PdfReader(file_path)
        text = "\n".join([p.extract_text() for p in reader.pages if p.extract_text()])

        splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=200)
        chunks = [c.strip() for c in splitter.split_text(text) if c.strip()]
        embeddings = ollama.embed(model="mxbai-embed-large", input=chunks)["embeddings"]

        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            collection.add(
                ids=[f"{doc_id}#{i}"],
                embeddings=[embedding],
                documents=[chunk],
                metadatas=[{"source": doc_id}]
            )
        print(f"✅ {len(chunks)} chunks dari {file_path} berhasil diindeks.")
    else:
        print(f"✅ Context untuk {file_path} sudah ada, skip indexing.")

    # Query
    embed = ollama.embed(model="mxbai-embed-large", input=user_input)
    user_embedding = embed["embeddings"][0]

    results = collection.query(
        query_embeddings=[user_embedding],
        where={"source": doc_id},
        n_results=n_results
    )
    docs = results.get("documents", [])
    print(docs)
    if not docs or not docs[0]:
        return f"⚠️ Tidak ditemukan konteks relevan dari {file_path}"

    return "\n---\n".join(docs[0])

# def send_whatsapp_messages(numbers, message):
#     """
#     Kirim pesan WhatsApp ke banyak nomor.
#     :param numbers: List nomor WA dengan awalan kode negara (contoh: +6281234567890)
#     :param message: Isi pesan yang akan dikirim
#     """
#     now = datetime.now()

#     for i, number in enumerate(numbers):
#         try:
#             # Tambah offset 1 menit per nomor
#             send_time = now + timedelta(minutes=i + 1)
#             hour = send_time.hour
#             minute = send_time.minute

#             print(f"📤 Scheduling message to {number} at {hour}:{minute:02d}")
#             kit.sendwhatmsg(
#                 phone_no=number,
#                 message=message,
#                 time_hour=hour,
#                 time_minute=minute,
#                 wait_time=15,
#                 tab_close=True,
#                 close_time=3
#             )
#             time.sleep(5)  # Hindari tab terlalu cepat tertutup
#         except Exception as e:
#             print(f"❌ Failed to send message to {number}: {e}")