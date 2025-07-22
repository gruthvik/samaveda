import { useState } from 'react';

const ChatForm = ({ chatHistory, setChatHistory, generateBotResponse }) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  if (recognition) {
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
  }

  const handleSpeechInput = () => {
    if (!recognition) {
      alert('Speech recognition not supported.');
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.start();
      setIsRecording(true);

      recognition.onresult = (event) => {
        const speechToText = event.results[0][0].transcript;
        setInput(speechToText);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setChatHistory((prev) => [...prev, { role: 'user', text: input }]);
    setChatHistory((prev) => [...prev, { role: 'model', text: 'Thinking...' }]);
    generateBotResponse(chatHistory, input);
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="chat-form">
      <div className="input-container" style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px'
      }}>
        {/* Textarea for message input */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="chat-input"
          style={{
            paddingLeft: '15px',
            paddingRight: '70px',
            textAlign: 'left',
            width: '100%',
            height: '40px',
            borderRadius: '20px',
            border: '1px solid #ccc',
            outline: 'none',
            resize: 'none',
            paddingTop: '10px',
            margin: '0',
            boxSizing: 'border-box'
          }}
        />

        {/* Button group inside the textarea container */}
        <div className="button-group" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '2px',
          position: 'absolute',
          right: '20px',
          bottom: '5px',
          zIndex: 1
        }}>
          <button type="button" onClick={handleSpeechInput} className="mic-button" style={{
            width: '35px',
            height: '35px',
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#2196F3',
            color: 'white',
            padding: '0',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
          }}>
            {isRecording ? '🎙️' : '🎤'}
          </button>

          <button type="submit" className="send-button" style={{
            width: '35px',
            height: '35px',
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#2196F3',
            color: 'white',
            padding: '0',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
          }}>➤</button>
        </div>
      </div>
    </form>
  );
};

export default ChatForm;
