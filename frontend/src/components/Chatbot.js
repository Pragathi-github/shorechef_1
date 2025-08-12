import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';

// Access the browser's Speech Recognition API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
    recognition.continuous = false;
    recognition.lang = 'en-US'; // You can change this for other languages if needed
}

function Chatbot({ recipeTitle, recipeInstructions }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('start');
    const [language, setLanguage] = useState('English');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false); // State to track microphone
    const [conversationContext, setConversationContext] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        setMessages([{ sender: 'bot', text: `Hi! I'm here to help you cook ${recipeTitle}. Type "start" or click the mic and say "next".` }]);
        setConversationContext({
            recipe_title: recipeTitle,
            instructions: recipeInstructions,
            current_step: 0
        });
    }, [recipeTitle, recipeInstructions]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);
    
    const toggleSpeech = (textToSpeak) => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        } else {
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            const langMap = {'English': 'en-US', 'Kannada': 'kn-IN', 'Tulu': 'en-IN'};
            utterance.lang = langMap[language] || 'en-US';
            utterance.onend = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
            setIsSpeaking(true);
        }
    };
    
    useEffect(() => {
        return () => window.speechSynthesis.cancel();
    }, []);

    // NEW: Function to start/stop listening for voice input
    const toggleListen = () => {
        if (!recognition) {
            alert("Sorry, your browser does not support voice recognition.");
            return;
        }
        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    };

    // NEW: useEffect hook to handle events from the SpeechRecognition API
    useEffect(() => {
        if (!recognition) return;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };
        
        // When the browser successfully transcribes speech to text
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript); // Set the input field with the spoken text
        };
    }, []);


    const handleSend = async () => {
        if (!input.trim()) return;
        const userMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');

        try {
            const response = await axios.post(`${API_URL}/chat`, {
                message: currentInput,
                response_language: language,
                conversation_context: conversationContext
            });
            const botResponse = { sender: 'bot', text: response.data.reply, canSpeak: true };
            setMessages(prev => [...prev, botResponse]);
            setConversationContext(response.data.conversation_context);
        } catch (error) {
            console.error("Error sending message:", error);
            const errorResponse = { sender: 'bot', text: 'Sorry, something went wrong.' };
            setMessages(prev => [...prev, errorResponse]);
        }
    };

    return (
        <div className="chatbot-container embedded">
            <div className="language-selector">
                <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="English">English</option>
                    <option value="Kannada">Kannada</option>
                    <option value="Tulu">Tulu</option>
                </select>
            </div>
            <div className="chat-window">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}`}>
                        <p>{msg.text}</p>
                        {msg.sender === 'bot' && msg.canSpeak && (
                            <button onClick={() => toggleSpeech(msg.text)} className="speak-button">
                                {isSpeaking ? '⏹️' : '🔊'}
                            </button>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="chat-input">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type or click the mic..."
                />
                {/* This is the new voice input button */}
                <button onClick={toggleListen} className={isListening ? 'listening' : ''}>
                    🎤
                </button>
                <button onClick={handleSend}>➤</button>
            </div>
        </div>
    );
}

export default Chatbot;