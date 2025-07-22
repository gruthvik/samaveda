import React, { useState, useEffect, useRef } from "react";
import ChatbotIcon from "./components/ChatbotIcon";
import ChatForm from "./components/ChatForm";
import ChatMessage from "./components/ChatMessage"; // Make sure this component exists and is updated
import { info } from "./components/python"; // Assuming this file provides initial chat info
import { useLocation } from "react-router-dom";
import WebcamEmotion from './components/WebcamEmotion';


// Styles for the video modal
const modalStyles = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
    width: '80%',
    maxWidth: '800px',
    overflowY: 'auto',
    maxHeight: '90vh',
};

// Styles for the close button within the modal
const closeButtonStyle = {
    cursor: 'pointer',
    fontSize: '1.2em',
    background: 'none',
    border: 'none',
    color: '#555', // Darker color for visibility
    fontWeight: 'bold',
};

const Archimedes = () => {
    // State to manage chat history
    const [chatHistory, setChatHistory] = useState([
        {
            hideInChat: true, // This message is hidden in the chat UI
            role: "model",
            text: info, // Initial info from components/python.js
        },
    ]);
    // State for video search and display
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [videoResult, setVideoResult] = useState(null);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

    // State for image search and display
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [imageResults, setImageResults] = useState([]);

    // State for system instruction (persona)
    const [systemInstruction, setSystemInstruction] = useState("default"); // Default system instruction
    const [isPersonaTabOpen, setIsPersonaTabOpen] = useState(false); // State to control persona tab visibility

    // Ref for YouTube Player instance
    const playerRef = useRef(null);
    // State for doubt feature
    const [pausedAtTime, setPausedAtTime] = useState(null); // Stores time in seconds when video is paused
    const [doubtText, setDoubtText] = useState(""); // Stores the user's doubt text
    const [isDoubtBoxOpen, setIsDoubtBoxOpen] = useState(false); // Controls visibility of the doubt input box

    // Location and user ID for backend communication
    const location = useLocation();
    const { sessionName, user_id } = location.state;
     console.log("Session Name:", sessionName);
    console.log("User ID:", user_id);
    const backendUrl = "http://127.0.0.1:5000"; // Your Flask backend URL

    const [alternativeVideos, setAlternativeVideos] = useState([]);
    const [showAlternatives, setShowAlternatives] = useState(false);

    const [videoDoubtResponse, setVideoDoubtResponse] = useState("");
    
    const [isMinimized, setIsMinimized] = useState(false);
    const videoModalRef = useRef(null);
    const offset = useRef({ x: 0, y: 0 });
    const isDragging = useRef(false);

    // Ref for clicking outside the persona tab
    const personaTabRef = useRef(null);

    const handleMouseDown = (e) => {
        isDragging.current = true;
        const modal = videoModalRef.current;
        if (modal) {
            offset.current = {
                x: e.clientX - modal.getBoundingClientRect().left,
                y: e.clientY - modal.getBoundingClientRect().top
            };
        }
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        if (!isDragging.current) return;
        const modal = videoModalRef.current;
        if (modal) {
            modal.style.left = `${e.clientX - offset.current.x}px`;
            modal.style.top = `${e.clientY - offset.current.y}px`;
            modal.style.transform = `none`;
        }
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    const loadYouTubeAPI = () => {
        return new Promise((resolve) => {
            if (window.YT && window.YT.Player) {
                resolve();
            } else {
                const tag = document.createElement("script");
                tag.src = "https://www.youtube.com/iframe_api";
                const firstScriptTag = document.getElementsByTagName("script")[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                window.onYouTubeIframeAPIReady = () => resolve();
            }
        });
    };

    // Effect to initialize YouTube Player API listener
    useEffect(() => {
        let interval;

        const setupPlayer = async () => {
            await loadYouTubeAPI(); // Wait for the YT API to be loaded

            interval = setInterval(() => {
                const iframe = document.getElementById("youtube-player");
                if (iframe && window.YT && window.YT.Player) {
                    playerRef.current = new window.YT.Player("youtube-player", {
                        events: {
                            onStateChange: (event) => {
                                if (event.data === window.YT.PlayerState.PAUSED) {
                                    const currentTime = event.target.getCurrentTime();
                                    setPausedAtTime(Math.floor(currentTime));
                                    setIsDoubtBoxOpen(true);
                                }
                            },
                        },
                    });
                    clearInterval(interval);
                }
            }, 500);
        };

        if (videoResult) {
            setupPlayer();
        }

        return () => clearInterval(interval);
    }, [videoResult]);

    // Effect to fetch chat history from backend on component mount
    useEffect(() => {
        const fetchChatHistory = async () => {
            try {
                    const response = await fetch(`${backendUrl}/history/${user_id}?sessionName=${encodeURIComponent(sessionName)}`);                if (!response.ok) {
                    console.error(`Failed to fetch chat history: ${response.status}`);
                    setChatHistory([
                        {
                            hideInChat: true,
                            role: "model",
                            text: "Failed to load previous chat history.",
                        },
                    ]);
                    return;
                }
                const data = await response.json();
                // Ensure the initial bot message is always present if history is empty
                if (data.length === 0) {
                     setChatHistory([
                        {
                            hideInChat: true,
                            role: "model",
                            text: info, // Re-add initial info if history is completely empty
                        },
                     ]);
                } else {
                    const formattedHistory = data.map((item) => ({
                        role: item.role,
                        text: item.text,
                        images: item.images || [] // Preserve images if they were part of history
                    }));
                    setChatHistory(formattedHistory);
                }

            } catch (error) {
                console.error("Error fetching chat history:", error);
                setChatHistory([
                    {
                        hideInChat: true,
                        role: "model",
                        text: "Error loading previous chat history.",
                    },
                ]);
            }
        };

        if (user_id) { // Only fetch history if user_id is available
            fetchChatHistory();
        }
    }, [backendUrl, user_id, sessionName]); // Dependencies: re-run if backendUrl or user_id changes

    // Effect to handle clicks outside the persona tab to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (personaTabRef.current && !personaTabRef.current.contains(event.target)) {
                setIsPersonaTabOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Helper function to format time in seconds to MM:SS
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Function to handle video search based on the last bot message
    const handleVideoSearch = async () => {
        setIsVideoLoading(true);
        setVideoError(false);
        setVideoResult(null);
        setAlternativeVideos([]);
        setShowAlternatives(false);
        setIsVideoModalOpen(false);

        // Get the text of the last bot message for concept extraction
        const lastBotMessage = chatHistory
            .filter((msg) => !msg.hideInChat && msg.role === "model")
            .pop()?.text;

        if (!lastBotMessage) {
            setVideoError(true);
            setIsVideoLoading(false);
            return;
        }

        try {
            // Send the last bot message to the backend for concept extraction
            const conceptResponse = await fetch(`${backendUrl}/extract-concept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: lastBotMessage }),
            });

            if (!conceptResponse.ok) {
                throw new Error('Failed to extract concept');
            }

            const conceptData = await conceptResponse.json();
            const coreConcept = conceptData.concept;

            if (!coreConcept) {
                setVideoError(true);
                setIsVideoLoading(false);
                return;
            }
            console.log("Extracted concept:", coreConcept);

            // Use the extracted core concept to search for YouTube videos
            const response = await fetch(`${backendUrl}/search-video`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: coreConcept }),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch video data');
            }

            const data = await response.json();
            if (data.error) {
                setVideoError(true);
            } else if (data.mainVideo) {
                setVideoResult(data.mainVideo);
                setAlternativeVideos(data.alternatives || []);
                setIsVideoModalOpen(true);
            } else {
                setVideoError(true);
            }
        } catch (error) {
            console.error('Error searching for video:', error);
            setVideoError(true);
        } finally {
            setIsVideoLoading(false);
        }
    };

    // Function to send user messages to the backend and get bot responses
    const generateBotResponse = async (history, message) => {
    console.log("User message sent:", message);
    
    // Add "Thinking..." message to chat history
    setChatHistory((prev) => [
        ...prev,
        { role: "model", text: "Thinking..." } // Add "Thinking..." message immediately
    ]);

    try {
        const response = await fetch(`${backendUrl}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: message, // User's message
                user_id: user_id, // Current user ID
                sessionName: sessionName, // Session name
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Backend response:", data);

        if (!data || !data.response) {
            throw new Error("Invalid response from server");
        }

        const apiResponseText = data.response;
        const fetchedImages = data.images || []; // Get images from the backend response

        // Update chat history with the bot's response and images, removing any bold markdown
        setChatHistory((prev) => [
            ...prev.filter((msg) => msg.text !== "Thinking..."), // Remove "Thinking..." message
            { role: "model", text: apiResponseText.replace(/\*\*(.*?)\*\*/g, "$1").trim(), images: fetchedImages }, // Add the new bot message and images
        ]);
        setImageResults(fetchedImages); // Update image results state

    } catch (error) {
        console.error("Error communicating with backend:", error);
        // Update chat history with an error message
        setChatHistory((prev) => [
            ...prev.filter((msg) => msg.text !== "Thinking..."), // Remove "Thinking..." message
            { role: "model", text: "I'm having trouble connecting to the server. Please try again in a moment." },
        ]);
        setImageResults([]); // Clear images on error
    }
};


    // Function to close the video modal
    const closeVideoModal = () => {
        setIsVideoModalOpen(false);
        setIsDoubtBoxOpen(false); // Also close the doubt box when modal is closed
        setDoubtText(""); // Clear any lingering doubt text
        setPausedAtTime(null); // Reset paused time
    };

    // Function to handle changes in system instruction (persona)
    const handleSystemInstructionChange = (value) => {
        setSystemInstruction(value);
        console.log("System instruction set to:", value);
        setIsPersonaTabOpen(false); // Close persona tab after selection
    };

    // Function to handle asking a doubt about the video
    const handleAskDoubt = async () => {
        if (!doubtText || pausedAtTime === null || !videoResult?.title) return;

        const payload = {
            user_id,
            message: `In the YouTube video titled '${videoResult.title}', at ${formatTime(pausedAtTime)} (around ${pausedAtTime} seconds), the user asked: ${doubtText}`,
            system_instruction: systemInstruction,
            history: chatHistory.filter(msg => !msg.hideInChat)
        };

        try {
            const response = await fetch(`${backendUrl}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to send doubt to backend.");

            setVideoDoubtResponse(data.response); // 💡 Save the bot's answer locally
        } catch (error) {
            console.error("Failed to send doubt:", error);
            setVideoDoubtResponse("❌ Sorry, couldn't answer your doubt right now.");
        }

        setDoubtText("");
    };

    const handleDontLikeVideo = () => {
        if (alternativeVideos.length > 0) {
            setShowAlternatives(true);
        } else {
            // Using a custom message box instead of alert()
            const messageBox = document.createElement('div');
            messageBox.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                z-index: 1001;
                text-align: center;
                font-family: sans-serif;
            `;
            messageBox.innerHTML = `
                <p>No alternative videos available for this topic.</p>
                <button style="
                    background-color: #0978f7;
                    color: white;
                    padding: 8px 15px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-top: 15px;
                ">OK</button>
            `;
            document.body.appendChild(messageBox);

            messageBox.querySelector('button').onclick = () => {
                document.body.removeChild(messageBox);
            };
        }
    };

    // Function to handle selecting an alternative video
    const handleSelectAlternativeVideo = (video) => {
        setVideoResult(video);
        setShowAlternatives(false);
        setIsDoubtBoxOpen(false);
        setDoubtText("");
        setPausedAtTime(null);
        setVideoDoubtResponse("");
    };

    return (
        <div className="Container">
            <div className="chatbot-popup">
                <div className="chat-header">
                    <div className="header-info">
                        <ChatbotIcon/>
                        <h2 className="logo-Text"><i>SamaVeda</i></h2>
                    </div>
                </div>

                <div className="chat-body">
                    {/* Initial welcome message for the user */}
                    <div className="message bot-message">
                        <ChatbotIcon/>
                        <p className="message-text">Hello {user_id}, how can I help you?</p>
                    </div>

                    {/* Map through chat history and render ChatMessage components */}
                    {chatHistory.map((chat, index) => (
                        <div key={index}>
                            <ChatMessage chat={chat} />
                            {/* Render images if available for this chat message */}
                            {chat.images && chat.images.length > 0 && chat.role === "model" && (
                                <div style={{ 
                                    display: 'flex', 
                                    flexWrap: 'wrap', 
                                    gap: '10px', 
                                    marginTop: '10px',
                                    justifyContent: 'center', // Center the images
                                    padding: '10px', // Add some padding
                                    backgroundColor: '#f0f0f0', // Light background for the image section
                                    borderRadius: '10px', // Rounded corners
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)' // subtle shadow
                                }}>
                                    {chat.images.map((image, imgIndex) => (
                                        <div key={imgIndex} style={{ 
                                            flex: '1 1 calc(33% - 20px)', // Three images per row, adjust as needed
                                            maxWidth: 'calc(33% - 20px)',
                                            boxSizing: 'border-box',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                            backgroundColor: '#fff'
                                        }}>
                                            <a href={image.url} target="_blank" rel="noopener noreferrer">
                                                <img 
                                                    src={image.thumbnail} 
                                                    alt={image.title} 
                                                    style={{ 
                                                        width: '100%', 
                                                        height: '120px', 
                                                        objectFit: 'cover', 
                                                        borderBottom: '1px solid #eee' 
                                                    }} 
                                                    onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/120x90/aabbcc/ffffff?text=Image`; }} // Fallback image
                                                />
                                            </a>
                                            <p style={{ 
                                                margin: '5px', 
                                                fontSize: '12px', 
                                                color: '#333', 
                                                whiteSpace: 'nowrap', 
                                                overflow: 'hidden', 
                                                textOverflow: 'ellipsis' 
                                            }} title={image.title}>{image.title}</p>
                                        </div>
                                    ))}
                                    {isImageLoading && <p style={{ color: '#555' }}>Searching for images...</p>}
                                    {imageError && <p style={{ color: 'red' }}>Failed to load images.</p>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="chat-footer">
                    {/* Chat input form */}
                    <ChatForm chatHistory={chatHistory} setChatHistory={setChatHistory} generateBotResponse={generateBotResponse} />
                    <div style={{
                        display: 'flex',
                        gap: '10px',
                        marginTop: '15px'  // Added margin to move buttons down
                    }}>
                        {/* Button to find video related to last bot reply */}
                        <button
                            onClick={handleVideoSearch}
                            disabled={isVideoLoading}
                            style={{
                                backgroundColor: '#0978f7',
                                color: 'white',
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: isVideoLoading ? 'not-allowed' : 'pointer',
                                marginBottom: '10px'
                            }}
                        >
                            {isVideoLoading ? 'Searching...' : 'Find Video for Last Bot Reply'}
                        </button>

                        {/* Button to toggle persona selection tab */}
                        <button
                            variant="outline"
                            style={{
                                marginBottom: '10px',
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                            onClick={() => setIsPersonaTabOpen(!isPersonaTabOpen)}
                        >
                            Set Persona
                        </button>
                    </div>
                    {/* Display error message if no video is found */}
                    {videoError && <p style={{ color: 'red', marginTop: '10px' }}>❌ No video found.</p>}
                </div>

                {/* Persona Tab - Conditional Rendering */}
                {isPersonaTabOpen && (
                    <div
                        ref={personaTabRef} // Ref to detect clicks outside
                        className="absolute bottom-20 right-0 bg-white border rounded-md shadow-lg p-4 space-y-2 min-w-[200px] z-50"
                        style={{
                            backgroundColor: '#f9f9f9',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                            padding: '16px',
                            marginTop: '10px',
                            zIndex: 1000,
                            minWidth: '200px',
                            position: 'absolute',
                            bottom: '80px',
                            right: '0',
                        }}
                    >
                        <h4
                            className="font-semibold mb-2"
                            style={{
                                color: '#333',
                                fontSize: '1.1em',
                                marginBottom: '12px',
                            }}
                        >
                            Select Persona
                        </h4>
                        <div className="flex flex-col gap-2">
                            {/* Persona selection buttons */}
                            <button
                                onClick={() => handleSystemInstructionChange("default")}
                                className="w-full"
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    textAlign: 'left',
                                    backgroundColor: systemInstruction === 'default' ? '#e0e0e0' : 'transparent',
                                    color: '#444',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s ease',
                                    boxShadow: systemInstruction === 'default' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                }}
                            >
                                Default
                            </button>
                            <button
                                onClick={() => handleSystemInstructionChange("friendly")}
                                className="w-full"
                                 style={{
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    textAlign: 'left',
                                    backgroundColor: systemInstruction === 'friendly' ? '#e0e0e0' : 'transparent',
                                    color: '#444',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s ease',
                                     boxShadow: systemInstruction === 'friendly' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                }}
                            >
                                Friendly Tutor
                            </button>
                            <button
                                onClick={() => handleSystemInstructionChange("pirate")}
                                className="w-full"
                                 style={{
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    textAlign: 'left',
                                    backgroundColor: systemInstruction === 'pirate' ? '#e0e0e0' : 'transparent',
                                    color: '#444',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s ease',
                                     boxShadow: systemInstruction === 'pirate' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                }}
                            >
                                Pirate
                            </button>
                            <button
                                onClick={() => handleSystemInstructionChange("sarcastic")}
                                className="w-full"
                                 style={{
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    textAlign: 'left',
                                    backgroundColor: systemInstruction === 'sarcastic' ? '#e0e0e0' : 'transparent',
                                    color: '#444',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s ease',
                                    boxShadow: systemInstruction === 'sarcastic' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                }}
                            >
                                Sarcastic
                            </button>
                        </div>
                    </div>
                )}
            </div>
            

                <WebcamEmotion />
            {/* Video Modal - Conditional Rendering */}
            {isVideoModalOpen && videoResult && (
                <div
                    ref={videoModalRef}
                    style={{
                        ...modalStyles,
                        height: isMinimized ? '60px' : 'auto',
                        overflow: isMinimized ? 'hidden' : 'auto',
                        resize: 'none'
                    }}
                    onMouseDown={handleMouseDown}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ marginBottom: '8px' }}>{videoResult.title}</h4>
                        <div>
                            <button onClick={() => setIsMinimized(!isMinimized)} style={{ marginRight: '8px' }}>
                                {isMinimized ? '🔼' : '🔽'}
                            </button>
                            <button onClick={closeVideoModal} style={closeButtonStyle}>✖</button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {!showAlternatives ? (
                                // Main video display
                                <>
                                    <div className="video-container">
                                        <iframe
                                            width="100%"
                                            height="315"
                                            id="youtube-player"
                                            src={`https://www.youtube.com/embed/${videoResult.videoId}?enablejsapi=1`}
                                            title="Relevant Video"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                            style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                                        ></iframe>
                                    </div>
                                    {/* Video action buttons */}
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'center' }}>
                                        {alternativeVideos.length > 0 && (
                                            <button
                                                onClick={handleDontLikeVideo}
                                                style={{
                                                    padding: '8px 16px',
                                                    backgroundColor: '#ff6b6b',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                Don't like this video? See more options
                                            </button>
                                        )}
                                    </div>

                                    {isDoubtBoxOpen && pausedAtTime !== null && (
                                        <div style={{ marginTop: '15px' }}>
                                            <textarea
                                                rows="3"
                                                placeholder={`Ask your doubt about the video at ${formatTime(pausedAtTime)}...`}
                                                value={doubtText}
                                                onChange={(e) => setDoubtText(e.target.value)}
                                                style={{ width: '100%', padding: '8px', borderRadius: '8px' }}
                                            ></textarea>
                                            <button
                                                onClick={handleAskDoubt}
                                                style={{
                                                    marginTop: '8px',
                                                    padding: '10px',
                                                    backgroundColor: '#0978f7',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Ask Doubt
                                            </button>

                                            {videoDoubtResponse && (
                                                <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#f0f8ff', borderRadius: '8px' }}>
                                                    <strong>Response:</strong>
                                                    <p>{videoDoubtResponse}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <p style={{ marginTop: '5px', fontSize: '0.9em', color: '#555' }}>
                                        ⏱ Suggested Time: {formatTime(videoResult.startTime)} - {formatTime(videoResult.endTime)}
                                    </p>
                                </>
                            ) : (
                                // Alternative videos selection
                                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <h4 style={{ margin: 0 }}>Choose an alternative video:</h4>
                                        <button
                                            onClick={() => setShowAlternatives(false)}
                                            style={{
                                                padding: '6px 12px',
                                                backgroundColor: '#6c757d',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        >
                                            Back to current video
                                        </button>
                                    </div>
                                    
                                    <div style={{ display: 'grid', gap: '12px' }}>
                                        {alternativeVideos.map((video, index) => (
                                            <div
                                                key={video.videoId}
                                                style={{
                                                    display: 'flex',
                                                    gap: '12px',
                                                    padding: '12px',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    backgroundColor: '#f8f9fa'
                                                }}
                                                onClick={() => handleSelectAlternativeVideo(video)}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#e9ecef';
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                }}
                                            >
                                                <img
                                                    src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                                                    alt={video.title}
                                                    style={{
                                                        width: '120px',
                                                        height: '90px',
                                                        objectFit: 'cover',
                                                        borderRadius: '6px',
                                                        flexShrink: 0
                                                    }}
                                                />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <h5 style={{
                                                        margin: '0 0 8px 0',
                                                        fontSize: '14px',
                                                        fontWeight: '600',
                                                        color: '#333',
                                                        lineHeight: '1.3',
                                                        overflow: 'hidden',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        textOverflow: 'ellipsis'
                                                    }}>
                                                        {video.title}
                                                    </h5>
                                                    <p style={{
                                                        margin: 0,
                                                        fontSize: '12px',
                                                        color: '#666',
                                                        fontWeight: '500'
                                                    }}>
                                                        Option {index + 1} • Click to select
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default Archimedes;
