import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import "./Chatbot.css";

const Chatbot = ({ recipeTitle, recipeInstructions }) => {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [context, setContext] = useState(null);
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages([{ sender: "bot", text: t("Welcome Assistant") }]);
    setContext({
      recipe_title: recipeTitle,
      instructions: recipeInstructions,
      current_step: 0,
    });
  }, [t, recipeTitle, recipeInstructions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (transcript) setUserInput(transcript);
  }, [transcript]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || !context) return;

    const newMessages = [...messages, { sender: "user", text: userInput }];
    setMessages(newMessages);
    const messageToSend = userInput;
    setUserInput("");
    resetTranscript();

    try {
      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          response_language: i18n.language,
          conversation_context: context,
        }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { sender: "bot", text: data.reply }]);
      if (data.conversation_context) {
        setContext(data.conversation_context);
      }
    } catch (error) {
      console.error("Error fetching chat response:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, I have trouble connecting to the server.",
        },
      ]);
    }
  };

  const handleMicClick = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      SpeechRecognition.startListening({
        continuous: true,
        language: i18n.language,
      });
    }
  };

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>;
  }

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            <p>{msg.text}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={t("Type your message")}
        />
        <button
          type="button"
          onClick={handleMicClick}
          className={`mic-button ${listening ? "listening" : ""}`}
        >
          🎤
        </button>
        <button type="submit">▶</button>
      </form>
    </div>
  );
};

export default Chatbot;
