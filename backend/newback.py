from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os
import google.generativeai as genai
from datetime import datetime, timezone
from flask_cors import CORS
import requests
import re # Keep re for potential future use or if other parts rely on it
from deepface import DeepFace
import tempfile
import fitz  # PyMuPDF
from werkzeug.utils import secure_filename
import os

# NEW imports for speech
import speech_recognition as sr
import pyttsx3

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GOOGLE_CSE_API_KEY = os.getenv("GOOGLE_CSE_API_KEY")  # New API key for Custom Search
GOOGLE_CSE_CX = os.getenv("GOOGLE_CSE_CX")  # Custom Search Engine ID
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY") # Load YouTube API key from .env

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env file")
if not GOOGLE_CSE_API_KEY:
    raise ValueError("GOOGLE_CSE_API_KEY not found in .env file")
if not GOOGLE_CSE_CX:
    raise ValueError("GOOGLE_CSE_CX not found in .env file")
if not YOUTUBE_API_KEY: # Check for YouTube API key as well
    raise ValueError("YOUTUBE_API_KEY not found in .env file")

genai.configure(api_key=GEMINI_API_KEY)

app = Flask(__name__)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in .env file")
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
db = SQLAlchemy(app)
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_recycle': 300,
    'pool_pre_ping': True
}
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# --- Speech Engine setup ---
engine = pyttsx3.init()
engine.setProperty('rate', 150)  # Speed of speech
engine.setProperty('volume', 1)  # Volume (0.0 to 1.0)

# --- Models ---

# --- User Table ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(80), unique=True, nullable=False)  
    username = db.Column(db.String(100), nullable=True)  # display name
    password = db.Column(db.String(120), nullable=False)
    gmail = db.Column(db.String(150),unique=True, nullable=True)
    age = db.Column(db.Integer, nullable=True)
    role = db.Column(db.String(50), nullable=True)
    iq_score = db.Column(db.String(120), nullable=True)

    # relationships
    sessions = db.relationship('Session', backref='user', lazy=True)
    chats = db.relationship('Chat', backref='user', lazy=True)

# --- Session Table ---
class Session(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(80), db.ForeignKey('user.user_id'), nullable=False)
    session_name = db.Column(db.String(100), nullable=False)
    study_mode = db.Column(db.String(50), nullable=True)
    user_portion = db.Column(db.Text, nullable=True)
    ai_portion = db.Column(db.Text, nullable=True)
    percentage_of_completion = db.Column(db.Float, nullable=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

# --- Chat Table ---
class Chat(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(80), db.ForeignKey('user.user_id'), nullable=False)
    session_name = db.Column(db.String(100), nullable=True)
    user_message = db.Column(db.Text, nullable=True)
    bot_response = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.String(300), nullable=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

with app.app_context():
    db.create_all()

# --- Helper Functions ---
def search_images_google_cse(query, num_results=3):
    """Search for images using Google Custom Search Engine API based on a generated query"""
    try:
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            'key': GOOGLE_CSE_API_KEY,
            'cx': GOOGLE_CSE_CX,
            'q': query, # Use the direct query from the LLM
            'searchType': 'image',
            'num': num_results,
            'safe': 'active',
            'imgType': 'photo',
            'imgSize': 'medium',
            'fileType': 'jpg,png,gif',
            'rights': 'cc_publicdomain,cc_attribute,cc_sharealike,cc_noncommercial,cc_nonderived'
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        images = []
        if 'items' in data:
            for item in data['items']:
                image_info = {
                    'url': item['link'],
                    'title': item.get('title', ''),
                    'thumbnail': item.get('image', {}).get('thumbnailLink', ''),
                    'context': item.get('snippet', ''),
                    'source': item.get('displayLink', ''),
                    'width': item.get('image', {}).get('width', 0),
                    'height': item.get('image', {}).get('height', 0)
                }
                images.append(image_info)
        
        return images
        
    except requests.exceptions.RequestException as e:
        print(f"Error searching images: {e}")
        return []
    except Exception as e:
        print(f"Unexpected error in image search: {e}")
        return []

def get_relevant_images_for_response(bot_response):
    """Extracts the core concept using Gemini, then builds a precise search query."""
    try:
        # Step 1: Use Gemini to extract core concept only
        concept_extractor = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            generation_config={
                "temperature": 0.2,
                "max_output_tokens": 15,
                "response_mime_type": "text/plain",
            },
            system_instruction="""
You are a concept extractor. Your job is to read a programming explanation and respond with the **core concept only**, in 1–3 words.
Examples:
- 'This code defines and uses a Python class to represent a Dog.' -> 'class'
- 'Python lists are dynamic arrays.' -> 'list'
- 'Explain recursion with base and recursive case.' -> 'recursion'
- 'In Python, dictionaries store key-value pairs.' -> 'dictionary'
"""
        )

        concept_chat = concept_extractor.start_chat(history=[])
        concept_response = concept_chat.send_message(bot_response)
        concept = concept_response.text.strip().lower()
        print(f"[ImageSearch] Core Concept: '{concept}'")

        # Step 2: Build query string using template
        query = f"{concept} in Python diagram"
        print(f"[ImageSearch] Final Image Query: '{query}'")

        return search_images_google_cse(query, num_results=3)

    except Exception as e:
        print(f"Error generating image search query: {e}")
        return []


        
        # Search for images using the LLM-generated query
        images = search_images_google_cse(generated_query, num_results=3)
        
        return images
        
    except Exception as e:
        print(f"Error getting relevant images: {e}")
        return []

# --- User Authentication Routes ---
def check_user_login(user_id, password):
    user = User.query.filter_by(user_id=user_id, password=password).first()
    return user is not None

@app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return '', 200
    data = request.get_json()
    user_id = data.get('user_id')
    password = data.get('password')
    if check_user_login(user_id, password):
        user = User.query.filter_by(user_id=user_id).first()
        return jsonify({"message": "Login successful", "iq_score": user.iq_score}), 200
    else:
        return jsonify({"message": "Invalid credentials"}), 401

@app.route('/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        return '', 200
    data = request.get_json()
    user_id = data.get('user_id')
    password = data.get('password')
    username = data.get('username')
    gmail = data.get('gmail')
    age = data.get('age')
    role = data.get('role')
    
    if not user_id or not password:
        return jsonify({"message": "Missing user_id or password"}), 400
    if User.query.filter_by(user_id=user_id).first():
        return jsonify({"message": "User already exists"}), 409
    
    new_user = User(
        user_id=user_id, 
        username=username,
        password=password,
        gmail=gmail,
        age=age,
        role=role
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User registered successfully"}), 201

@app.route('/save-score', methods=['POST'])
def save_score():
    data = request.get_json()
    user_id = data.get('user_id')
    iqscore = data.get('iqscore')
    if not user_id or iqscore is None:
        return jsonify({"error": "Missing user_id or iqscore"}), 400
    user = User.query.filter_by(user_id=user_id).first()
    if not user:
        return jsonify({"error": "User not found"}, 404)
    user.iq_score = iqscore
    db.session.commit()
    return jsonify({"message": "IQ score saved successfully!"}), 200


@app.route('/create-session', methods=['POST'])
def start_session():
    user_id = request.form.get('user_id')
    session_name = request.form.get('session_name')
    study_mode = request.form.get('study_mode')
    file = request.files.get('file')

  

    # Only user_id and session_name are required, file is optional
    if not all([user_id, session_name]):
        missing_fields = []
        if not user_id: missing_fields.append('user_id')
        if not session_name: missing_fields.append('session_name')
        return jsonify({'error': f'Missing required fields: {missing_fields}'}), 400

    # Check if the session name already exists for the user
    existing_session = Session.query.filter_by(user_id=user_id, session_name=session_name).first()
    if existing_session:
        return jsonify({'error': 'Session name already exists for this user'}), 409

    # Extract text from PDF if file is provided
    pdf_text = ""
    if file:
        pdf_text = extract_text_from_pdf(file)

    # Save to DB
    new_session = Session(
        user_id=user_id,
        session_name=session_name,
        study_mode=study_mode,
        user_portion=pdf_text if pdf_text else None,
        timestamp=datetime.now(timezone.utc)
    )

    db.session.add(new_session)
    db.session.commit()

    return jsonify({'message': 'Session created successfully'}), 200



def extract_text_from_pdf(file_storage):
    """Extracts text from uploaded PDF (FileStorage object)."""
    text = ""
    with fitz.open(stream=file_storage.read(), filetype="pdf") as doc:
        for page in doc:
            text += page.get_text()
    return text.strip()

@app.route('/get-sessions', methods=['GET'])
def get_sessions():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'Missing user_id'}), 400

    sessions = Session.query.filter_by(user_id=user_id).order_by(Session.timestamp.desc()).all()
    session_list = [{
        'id': session.id,
        'name': session.session_name,
        'created_at': session.timestamp
    } for session in sessions]

    return jsonify({'sessions': session_list}), 200
@app.route('/extract-concept', methods=['POST'])
def extract_concept_route():
    data = request.get_json()
    text = data.get('text')
    system_instruction = (
        "You are a youtube query producer,when some one sends you a query you have to read it ,understand it and just MENTION the core concept of entire query and nothing else.Only answer in not more than 5 words."
    )    
    if not text:
        return jsonify({'error': 'Missing text'}), 400
    
    try:
        dynamic_model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            generation_config={
                "temperature": 1,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 8192,
                "response_mime_type": "text/plain",
            },
            system_instruction=system_instruction
        )
        chat_session = dynamic_model.start_chat(history=[])
        response = chat_session.send_message(text)
        model_response = response.text
        print(model_response)
        return jsonify({'concept': model_response}), 200
    
    except Exception as e:
        print(f"Error extracting concept: {e}")
        return jsonify({'error': f'Error extracting concept: {e}'}), 500

# --- NEW: Image Search Route (This route is now less critical as image search is integrated into /chat) ---
# @app.route('/search-images', methods=['POST'])
# def search_images():
#     """Search for relevant images based on bot response"""
#     try:
#         data = request.get_json()
#         bot_response = data.get('bot_response', '')
        
#         if not bot_response:
#             return jsonify({'error': 'Missing bot_response'}), 400
        
#         # Get relevant images for the bot response
#         images = get_relevant_images_for_response(bot_response)
        
#         return jsonify({
#             'images': images,
#             'total_results': len(images)
#         }), 200
    
#     except Exception as e:
#         print(f"Error in image search route: {e}")
#         return jsonify({'error': f'Error searching images: {str(e)}'}), 500

# --- YouTube Search Route ---
YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search'

@app.route('/search-video', methods=['POST'])
def search_video():
    data = request.json
    query = data.get('query', '')
    print(f"your last bot message {query}")

    params = {
        'part': 'snippet',
        'q': query,
        'key': YOUTUBE_API_KEY,
        'type': 'video',
        'maxResults': 5  # Changed from 1 to 5 to get more options
    }

    response = requests.get(YOUTUBE_SEARCH_URL, params=params)
    items = response.json().get('items')

    if items:
        # Return the first video as the main suggestion and the rest as alternatives
        main_video = items[0]
        alternative_videos = items[1:5] if len(items) > 1 else []
        
        main_result = {
            'videoId': main_video['id']['videoId'],
            'watchUrl': f"https://www.youtube.com/watch?v={main_video['id']['videoId']}",
            'title': main_video['snippet']['title'],
            'startTime': 0,  # You can modify this based on your logic
            'endTime': 300   # You can modify this based on your logic
        }
        
        alternatives = []
        for video in alternative_videos:
            alternatives.append({
                'videoId': video['id']['videoId'],
                'watchUrl': f"https://www.youtube.com/watch?v={video['id']['videoId']}",
                'title': video['snippet']['title'],
                'startTime': 0,
                'endTime': 300
            })
        
        return jsonify({
            'mainVideo': main_result,
            'alternatives': alternatives
        })
    else:
        return jsonify({'error': 'No videos found'}), 404

# --- Chat Route (Enhanced with Image Search) ---
generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_message = data.get('message')
    user_id = data.get('user_id')
    session_name=data.get('sessionName')
    print(user_id)
    print(session_name)
    print(user_message)
    if not user_message or not user_id:
        return jsonify({'error': 'Message or user_id missing'}), 400
    if not session_name:
        return jsonify({'error': 'Session Name Missing'}), 400
    user = User.query.filter_by(user_id=user_id).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404

    iq_score = user.iq_score
    # Determine system instruction based on IQ score (or default if not set)
    if iq_score is None:
        system_instruction_value = (
            "You are a Python instructor. The user hasn't provided their IQ yet. "
            "Iq is 80,now you can start teaching and remember to be polite."
        )
    else:
        iq_score = int(iq_score)
        system_instruction_value = (f"""
### Persona ###
You are Lokesh, a friendly, patient, knowledgeable, and encouraging teacher. Ask the student what they want to learn and the purpose of the knowledge first. Then frame the portion of the lessons based on the purpose of the knowledge. Confirm the portion with the user before starting to teach. 
Your primary goal is to help the user, {user_id}, learn the concepts effectively and build their confidence.
Maintain a supportive and approachable tone throughout the interaction.
Use clear language. Avoid overly complex jargon initially, but introduce and explain technical terms when appropriate for the topic.
Refer to the user as {user_id} occasionally to personalize the conversation.
Your aim is to guide the user to understand concepts and solve problems themselves, not just provide answers.

### Knowledge Sources ###
Base your explanations, definitions, and examples on information that is consistent with reputable and widely accepted learning resources, such as well-established research articles, academic texts, and official documentation.
Ensure that all information and examples are accurate, and aligned with current best practices wherever applicable.

### Initial Teaching Style Based on IQ (Starting Point Only) ###
The user's provided IQ score is {iq_score}. Use this score ONLY to set the initial teaching style at the beginning of the interaction. This initial style MUST be overridden by subsequent user feedback.

*   *If {iq_score} is less than 80:* Start with very simple explanations, use multiple, very basic examples for each concept, minimize technical terms initially (introducing them slowly with clear definitions), provide frequent summaries, and ask easier understanding-check questions.
*   *If {iq_score} is between 80 and 105 (inclusive):* Start with clear, straightforward explanations, use several simple code snippets as examples, incorporate relevant technical terms with definitions, and ask understanding-check questions of normal difficulty.
*   *If {iq_score} is greater than 105:* Start with more concise explanations (assuming quicker uptake), use relevant code snippets as examples, comfortably use technical terms (defining as needed), and ask understanding-check questions of hard difficulty (though begin with normal difficulty for the very first few topics to gauge comfort).

*REMEMBER:* This IQ-based setting is just the starting point. The user's direct feedback is the primary guide for adaptation.


### Curriculum and Pace ###
1. *Initial Overview:* At the very beginning of the first learning session with {user_id}, present a high-level overview (e.g., a list of main topic headings) of the subjects you plan to cover sequentially.
2. *Sequential Learning:* Teach the topics step-by-step. Cover one core concept or a small group of closely related concepts in each lesson segment before moving to the next. Structure lessons logically, building upon previous concepts.
3. *Default Pace:* Proceed methodically and patiently. Do not rush through explanations. Ensure concepts are explained clearly, including definitions and relevant context. Use simple, illustrative code examples where appropriate.
4. *User Pace Control:* The default pace is methodical. However, if {user_id} explicitly states that the pace is too slow or too fast, you MUST adjust your speed of explanation for subsequent topics accordingly. Confirm the adjustment by saying something like "Okay, I'll speed up a bit" or "Understood, I'll slow down and provide more detail."

### Interaction: Understanding Checks ###
1. *Frequency:* After explaining approximately 2-3 distinct topics or related concepts, pause to check {user_id}'s understanding.
2. *Question Style:* Ask 1 or 2 brief, open-ended questions focused specifically on the most recently covered material. Frame questions to encourage {user_id} to explain the concept in their own words or apply it simply. Avoid simple yes/no questions and appreciate user if answer is close to perfect or perfect. NEVER forget to ask questions when ever a core topic or multiple closely related topics are completed. 
3. *Example Questions:* "Based on what we just discussed, {user_id}, could you explain the above concept briefly"
4. *Response Handling:* If {user_id} answers correctly, provide affirmation. If the answer is incorrect or unclear, gently correct the misunderstanding and offer a brief re-explanation or clarification before proceeding. If they express uncertainty, offer to explain again in a different way.

### Interaction: Feedback Solicitation and Adaptation ###
1. *Frequency:* Approximately once every 2-3 topics (this can often follow the understanding check), ask {user_id} for feedback on your teaching style.
2. *Rotation:* Do NOT ask all feedback questions at the same time. Rotate through the parameters, asking about 1 or 2 different aspects each time.
3. *Feedback Parameters:* Politely inquire about:
   * a) *Pace:* "How is the pace of explanation for you right now, {user_id}? Too fast, too slow, or about right?"
   * b) *Vocabulary/Complexity:* "Is the level of technical detail I'm using clear, or would you prefer simpler language / more technical depth?"
   * c) *Explanation Length/Depth:* "Are the explanations detailed enough, or are they too long/too short for you?"
4. *CRUCIAL - Adaptation:* You MUST actively adjust your subsequent teaching style based directly on {user_id}'s feedback.
   * If pace feedback = "too fast", then slow down, break down steps further, add more examples in the next explanations.
   * If pace feedback = "too slow", then become slightly more concise, combine minor steps where logical in the next explanations.
   * If vocabulary feedback = "too complex", then use simpler terms, define technical words clearly upon introduction in the next explanations.
   * If vocabulary feedback = "too simple", then introduce more precise technical terms (if appropriate for the topic and defined) in the next explanations.
   * If length feedback = "too long", then be more concise, focus on key points in the next explanations.
   * If length feedback = "too short", then provide more detail, context, or examples in the next explanations.
   Acknowledge the feedback received (e.g., "Thanks for the feedback, {user_id}. I'll adjust the level of detail going forward.").

### Constraints ###
* *ABSOLUTELY DO NOT* ask for, refer to, or use any pre-existing user metrics, such as IQ scores or prior assessment results, to determine your teaching style, pace, or complexity. All adaptation MUST be based solely on the explicit feedback and requests provided by {user_id} during the current conversation.
* Strictly adhere to explaining concepts based on the specified Knowledge Sources.
* Follow the defined frequency and rotation for Understanding Checks and Feedback Solicitation.
* Do not provide direct answers to complex coding problems or assignments. Instead, guide {user_id} through the problem-solving process step-by-step, asking guiding questions, and helping them arrive at the solution themselves. Explain concepts needed to solve the problem.
"""
)
    
    # Retrieve chat history from the database for the specific user
    with app.app_context():
        chat_history_db = Chat.query.filter_by(user_id=user_id,session_name=session_name).order_by(Chat.timestamp).all()
        history = []
        for chat in chat_history_db:
            history.append({"role": "user", "parts": [chat.user_message]})
            history.append({"role": "model", "parts": [chat.bot_response]})
        
        main_model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            generation_config=generation_config,
            system_instruction=system_instruction_value # Use the dynamically determined system instruction
        )
        print(f"User {user_id} IQ: {iq_score} | Using system instruction: {system_instruction_value}")
        chat_session = main_model.start_chat(history=history)
        response = chat_session.send_message(user_message)
        model_response = response.text

        # Store the new interaction in the database
        new_chat = Chat(user_id=user_id,session_name=session_name, user_message=user_message, bot_response=model_response)
        db.session.add(new_chat)
        db.session.commit()

        # Get relevant images for the bot response using the improved method
        try:
            relevant_images = get_relevant_images_for_response(model_response)
        except Exception as e:
            print(f"Error getting images for response: {e}")
            relevant_images = []

        return jsonify({
            'response': model_response,
            'images': relevant_images
        })

# --- Chat History ---
@app.route('/history/<user_id>', methods=['GET'])
def get_chat_history(user_id):
    print("hi")
    with app.app_context():
        session_name = request.args.get('sessionName')
        if not session_name:
            return jsonify({'error': 'Missing sessionName'}), 400
        try:
            chat_history_db = Chat.query.filter_by(user_id=user_id,session_name=session_name).order_by(Chat.timestamp).all()
            history = []
            for chat in chat_history_db:
                # Assuming images are not stored in the DB for simplicity here,
                # if you want them to persist, you'd need to add an 'images' field to Chat model.
                # For now, frontend will fetch new images for past messages if needed,
                # or you can extend the Chat model to store image URLs with each bot_response.
                history.append({"role": "user", "text": chat.user_message})
                history.append({"role": "model", "text": chat.bot_response, "images": []}) # Add empty images for history
        except Exception as e: # Catch all exceptions during history fetch
            print(f"Error fetching chat history for {user_id} and session {session_name}: {e}")
            initial_bot_response = "Hello! I'm your Python instructor. What's your IQ level so I can tailor our learning?"
            new_chat = Chat(user_id=user_id,session_name=session_name, user_message="", bot_response=initial_bot_response)
            db.session.add(new_chat)
            db.session.commit()
            history = [{"role": "model", "text": initial_bot_response, "images": []}] # Ensure history is a list
        return jsonify(history)


# --- Speech to Text ---
@app.route('/speech-to-text', methods=['GET'])
def speech_to_text():
    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        print("Listening for speech...")
        audio = recognizer.listen(source)
        try:
            text = recognizer.recognize_google(audio)
            print(f"Recognized: {text}")
            return jsonify({"text": text}), 200
        except sr.UnknownValueError:
            return jsonify({"error": "Could not understand audio"}), 400
        except sr.RequestError as e:
            return jsonify({"error": f"Speech Recognition error: {e}"}), 500

# --- Text to Speech ---
@app.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    data = request.get_json()
    text = data.get('text')
    if not text:
        return jsonify({"error": "No text provided"}), 400
    engine.say(text)
    engine.runAndWait()
    return jsonify({"message": "Speech played successfully!"}), 200

# --- Test Image Search Route (for debugging) ---
@app.route('/test-image-search', methods=['GET'])
def test_image_search():
    """Test route to verify image search functionality"""
    try:
        test_query_text = "Explain what a Python dictionary is and how to use it."
        images = get_relevant_images_for_response(test_query_text) # Use the new combined function
        return jsonify({
            'test_query_text': test_query_text,
            'images': images,
            'total_results': len(images)
        })
    except Exception as e:
        return jsonify({'error': f'Test failed: {str(e)}'}), 500
    
@app.route("/emotion", methods=["POST"])
def emotion():
    file = request.files['image']
    temp_path = tempfile.mktemp(suffix=".jpg")
    file.save(temp_path)

    try:
        result = DeepFace.analyze(temp_path, actions=["emotion"], enforce_detection=False)
        emotion = result[0]["dominant_emotion"]
    except Exception as e:
        print("DeepFace error:", str(e))
        emotion = "unknown"

    os.remove(temp_path)
    return jsonify({"emotion":emotion})

# --- Run App ---
if __name__ == '__main__':
    app.run(debug=True)