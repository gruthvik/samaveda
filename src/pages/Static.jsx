// src/pages/Home.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Static.css";

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";

    const sections = document.querySelectorAll(".feature-section");
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    sections.forEach(section => {
      observer.observe(section);
    });

    return () => {
      sections.forEach(section => observer.unobserve(section));
    };
  }, []);

  return (
    <div className="lightblue-home-wrapper">
      <a href="#top" className="scroll-to-top">↑</a>

      <div className="cosmic-content" id="top">
        <h1 className="samaveda-title">SamaVeda</h1>
        <p className="subtitle">Redefining AI Tutors</p>
        <div className="button-group-centered">
          <button onClick={() => navigate("/login")} className="action-button login">Login</button>
          <button onClick={() => navigate("/register")} className="action-button register">Register</button>
        </div>
      </div>

      <section className="feature-section">
        <h2>Conversational Tutor</h2>
        <p>Gemini-powered AI that adapts to your learning pace, IQ level, and preferred explanation style. It supports Python syntax, provides interactive quizzes, and remembers your progress across sessions.</p>
        <p>Whether you're a beginner or experienced programmer, SamaVeda dynamically tailors content, tracks your weaknesses, and offers personalized code snippets with explanations. The chatbot adapts in real-time and maintains conversational flow, helping learners stay motivated and engaged with bite-sized interactive lessons.</p>
      </section>

      <section className="feature-section">
        <h2>Video Suggestions</h2>
        <p>AI-curated YouTube content tailored to your conversation context. Ask any Python-related query and get suggested videos with time-stamped explanations and summaries.</p>
        <p>Our algorithm fetches top-rated videos, breaks down concepts and allows you to save, bookmark, and share learning playlists directly from the SamaVeda interface. It ensures that your learning experience is enhanced by visual and auditory examples, catering to diverse learning preferences.</p>
      </section>

      <section className="feature-section">
        <h2>Emotion Detection</h2>
        <p>Our ML-powered interface detects confusion, stress, or distraction using your webcam. The system reacts by offering encouragement or tutorial links based on your emotional state.</p>
        <p>It uses computer vision and deep learning to evaluate facial expressions in real time, helping SamaVeda respond more empathetically and supportively to user needs. This feature fosters emotional awareness and adapts lesson delivery based on your state of mind, creating a more caring AI tutor.</p>
      </section>

      <section className="feature-section">
        <h2>PDF Upload</h2>
        <p>Upload handwritten notes or lecture PDFs. SamaVeda parses the content into meaningful learning blocks, explains complex equations, and integrates examples where needed.</p>
        <p>It also supports multilingual content, extracts diagrams, and auto-links relevant online resources for deeper comprehension. The PDF reader transforms static content into dynamic learning modules tailored for every learner.</p>
      </section>

      <section className="feature-section">
        <h2>Voice Interaction</h2>
        <p>Use voice commands to talk with SamaVeda. It listens, interprets, and speaks back with contextual responses using natural language synthesis and recognition.</p>
        <p>The voice system enables hands-free learning, accessibility support, and quick code walkthroughs by simply asking questions out loud. With speech-enabled tutoring, users can code while discussing problems aloud just like in a live classroom.</p>
      </section>
    </div>
  );
}
