from flask_cors import CORS
from flask import Flask, request, jsonify
from LLM.bot import generate_prompt, process_pdf, process_text, retrieve_context, sanitize_filename, extract_text_from_url
from werkzeug.utils import secure_filename
import chromadb
import ollama
import json
import subprocess
import os

app = Flask(__name__)
CORS(app)
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection(name="chat_context")
@app.route("/generate", methods=["POST"])
def generate():
    data = request.json
    topic = data.get("topic")
    message_numbers = data.get("message_numbers", 1)
    reference = data.get("reference")  # bisa pdf atau teks
    language = data.get("language", "English")
    style = data.get("style", "neutral")

    if not topic or not isinstance(message_numbers, int):
        return jsonify({"error": "Parameter 'topic' dan 'message_numbers' wajib diisi"}), 400

    context = None

    # 🔍 Reference Handling (optional)
    if reference:
        if reference.startswith("http://") or reference.startswith("https://"):
            web_content = extract_text_from_url(reference)
            if not web_content:
                return jsonify({"error": "Gagal mengambil konten dari URL"}), 400
            context = web_content
            print(context)

        elif reference.endswith(".pdf"):
            sanitized_ref = sanitize_filename(reference)
            file_path = os.path.join(UPLOAD_FOLDER, sanitized_ref)
            if not os.path.exists(file_path):
                print(f"❌ File not found: {file_path}")
                return jsonify({"error": f"File {reference} tidak ditemukan di {UPLOAD_FOLDER}."}), 400
            process_pdf(file_path)
            source = f"file#{sanitized_ref}"
            context = retrieve_context(topic, source)

        elif os.path.exists(os.path.join(UPLOAD_FOLDER, sanitize_filename(reference))):
            # Jika reference teks tapi merupakan nama file yang ada di upload
            sanitized_ref = sanitize_filename(reference)
            file_path = os.path.join(UPLOAD_FOLDER, sanitized_ref)
            process_pdf(file_path)
            source = f"file#{sanitized_ref}"
            context = retrieve_context(topic, source)

        else:
            # Reference berupa teks biasa
            context = reference.strip()

    # 📝 Generate Responses Loop
    responses = []
    attempts = 0
    max_attempts = max(300, message_numbers * 15)

    while len(responses) < message_numbers and attempts < max_attempts:
        prompt = generate_prompt(topic, language, style, context, previous_responses=responses)
        response = ollama.chat(
            model="llama3",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Generate message number {len(responses)+1} about '{topic}'."}
            ]
        )
        result = response["message"]["content"].strip()

        if result not in responses:
            responses.append(result)
            print(f"✅ Unique message {len(responses)} added")
        else:
            print(f"⚠️ Duplicate detected at attempt {attempts+1}, retrying...")

        attempts += 1

    if len(responses) < message_numbers:
        print(f"⚠️ Only {len(responses)} unique messages after {attempts} attempts")

    return jsonify({
        "topic": topic,
        "message_numbers": message_numbers,
        "reference": reference,
        "language": language,
        "style": style,
        "results": responses
    }), 200


@app.route("/upload", methods=["POST"])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and file.filename.endswith('.pdf'):
        filename = sanitize_filename(secure_filename(file.filename))
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        process_pdf(filepath)

        return jsonify({"message": f"File {filename} uploaded and indexed."}), 200
    else:
        return jsonify({"error": "Only PDF files are allowed."}), 400

@app.route('/send', methods=['POST'])
def send_whatsapp_messages():
    data = request.get_json()
    phone_numbers = data.get("phone_numbers")
    message = data.get("message")

    if not phone_numbers or not message:
        return jsonify({"error": "phone_numbers (array) dan message (string) wajib diisi"}), 400

    try:
        # Panggil script Node.js dengan argumen
        cmd = [
            "node",
            "whatsapp/dist/index.js",  # hasil dari `tsc`, bukan .ts
            json.dumps(phone_numbers),
            message
        ]
        subprocess.run(cmd, check=True)
        return jsonify({"status": "success", "sent_to": phone_numbers}), 200
    except subprocess.CalledProcessError as e:
        return jsonify({"error": str(e)}), 500
    
@app.route("/delete", methods=["DELETE"])
def delete_source():
    data = request.json
    source = data.get("source")  # bisa "file#xxx.pdf" atau "text#xxx"

    if not source:
        return jsonify({"error": "Missing 'source' parameter"}), 400

    # Hapus file jika jenisnya file upload
    if source.startswith("file#"):
        filename = sanitize_filename(source.replace("file#", ""))
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
            print(f"🗑️ File '{filename}' deleted from uploads/")
        else:
            print(f"⚠️ File '{filename}' not found in uploads/")
    
    # Hapus dokumen dari ChromaDB berdasarkan prefix source
    all_ids = collection.get()["ids"]
    ids_to_delete = [i for i in all_ids if i.startswith(f"{source}#")]
    if ids_to_delete:
        collection.delete(ids=ids_to_delete)
        print(f"🧹 {len(ids_to_delete)} chunks deleted from ChromaDB for source '{source}'")
    else:
        print(f"⚠️ No chunks found for source '{source}'")

    return jsonify({"message": f"Deleted context and file (if any) for source '{source}'."}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
