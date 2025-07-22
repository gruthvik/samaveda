import cv2
import mediapipe as mp
from deepface import DeepFace
import threading
import time

running = False  # Global flag

def start_emotion_detection(callback):
    global running
    running = True

    cap = cv2.VideoCapture(0)
    mp_face = mp.solutions.face_mesh.FaceMesh(static_image_mode=False)

    last_emotion = None
    stable_time = time.time()

    while running:
        ret, frame = cap.read()
        if not ret:
            break

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = mp_face.process(rgb)

        if results.multi_face_landmarks:
            try:
                analysis = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False)
                emotion = analysis[0]['dominant_emotion']

                # Stability check
                if emotion != last_emotion:
                    last_emotion = emotion
                    stable_time = time.time()
                elif time.time() - stable_time > 3:
                    callback(emotion)
                    stable_time = time.time() + 10  # Wait before checking again

            except Exception as e:
                print("Emotion detection error:", str(e))

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()

def stop_emotion_detection():
    global running
    running = False
