import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./Display.css";

const socket = io("http://localhost:3001");

export default function Display() {
  const [popupData, setPopupData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [_, setCanSend] = useState(false);

  // Register to socket
  useEffect(() => {
    socket.emit("display_join");
  }, []);

  // Fetch questions from the backend
  useEffect(() => {
    fetch("http://localhost:3001/api/questions")
      .then((response) => response.json())
      .then((data) => setQuestions(data))
      .catch((error) => console.error("Error fetching questions:", error));
  }, []);

  // Not sure tbh
  useEffect(() => {
    socket.on('permission_status', (allowed) => setCanSend(allowed));
    return () => socket.off('permission_status');
  }, []);

  // Display question in popup box
  useEffect(() => {
    const handleDisplayQuestion = (question) => {
      setPopupData(question);
    };
    socket.on("display_question", handleDisplayQuestion);
    return () => {
      socket.off("display_question", handleDisplayQuestion);
    };
  }, []);

  // Show answer in popup box
  useEffect(() => {
    const handleShowAnswer = (data) => {
      setPopupData((prev) => ({ ...prev, question: data.answer }));
    };
    socket.on('show_answer', handleShowAnswer);
    return () => socket.off('show_answer', handleShowAnswer);
  }, []);

  // Close popup box
  useEffect(() => {
    const handleCloseQuestion = () => {setPopupData(null);}
    socket.on('close_question', handleCloseQuestion);
    return () => socket.off('close_question', handleCloseQuestion);
  }, []);

  const categories = [...new Set(questions.map((q) => q.category))];
  const groupedQuestions = categories.map((category) =>
    questions.filter((q) => q.category === category)
  );

  return (
    <div className="display-container">
      <div className="jeopardy-grid">
        {groupedQuestions.map((questions, categoryIndex) => (
          <div key={categoryIndex} className="category-column">
            <div className="category-header">{categories[categoryIndex]}</div>
            {questions.map((q, questionIndex) => (
              <div key={questionIndex} className="prize-cell">
                ${q.price}
              </div>
            ))}
          </div>
        ))}
      </div>

      {popupData && (
        <div className="popup-overlay">
          <div className="popup">
            <h3 className="popup-category">{popupData.category}</h3>
            <p className="popup-prize">Prize: ${popupData.price}</p>
            <p className="popup-question">{popupData.question}</p>
          </div>
        </div>
      )}
    </div>
  );
}