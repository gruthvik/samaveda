import { useState } from "react";
import ChatbotIcon from "./ChatbotIcon";
import "../index.css";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const ChatMessage = ({ chat }) => {
  const [isPaused, setIsPaused] = useState(false);  // Track if speech is paused
  const [utterance, setUtterance] = useState(null);  // Store the utterance object

  const speakText = (text) => {
    if ("speechSynthesis" in window) {
      const newUtterance = new SpeechSynthesisUtterance(text);
      newUtterance.lang = "en-US";
      window.speechSynthesis.speak(newUtterance);

      // Store the utterance so we can control it later
      setUtterance(newUtterance);

      // Trigger callback when speaking is finished
      newUtterance.onend = () => {
        setIsPaused(false);  // Reset pause state after speech ends
      };
    } else {
      alert("Speech synthesis not supported in this browser.");
    }
  };

  const togglePause = () => {
    if (utterance) {
      if (isPaused) {
        window.speechSynthesis.resume();  // Resume speech
      } else {
        window.speechSynthesis.pause();  // Pause speech
      }
      setIsPaused(!isPaused);  // Toggle pause state
    }
  };

  if (chat.hideInChat) return null;

  const isBot = chat.role === "model";

  return (
    <div className={`message ${isBot ? "bot" : "user"}-message`}>
      {isBot && <ChatbotIcon/>}
      <div className="message-text">
        {isBot ? (
          <ReactMarkdown
            children={chat.text}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                return !inline ? (
                  <div>
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match?.[1] || "python"}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                    <button
                      className="copy-button"
                      onClick={() => navigator.clipboard.writeText(String(children))}
                    >
                      Copy Code
                    </button>
                  </div>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          />
        ) : (
          <p>{chat.text}</p>
        )}

        {isBot && (
          <>
            <button onClick={() => speakText(chat.text)} className="speak-button">
              🔊
            </button>
            <button
              onClick={togglePause}
              className="pause-button"
              disabled={!utterance}
            >
              {isPaused ? "⏸️ Resume" : "⏸️ Pause"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
