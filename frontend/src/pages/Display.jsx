import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./Display.css"; // Import the CSS file for styles

const socket = io("http://localhost:3001");

export default function Display() {
  const [popupData, setPopupData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [canSend, setCanSend] = useState(false);

  useEffect(() => {
    // Fetch questions from the backend API
    fetch("http://localhost:3001/api/questions")
      .then((response) => response.json())
      .then((data) => setQuestions(data))
      .catch((error) => console.error("Error fetching questions:", error));
  }, []);

  useEffect(() => {
    socket.on('permission_status', (allowed) => setCanSend(allowed));
    return () => socket.off('permission_status');
  }, []);

  useEffect(() => {
    const handleShowAnswer = (data) => {
      setPopupData((prev) => ({ ...prev, question: data.answer })); // Replace question with answer
    };

    socket.on('show_answer', handleShowAnswer);

    return () => socket.off('show_answer', handleShowAnswer);
  }, []);

  useEffect(() => {
    const handleCloseQuestion = () => {
      setPopupData(null); // Clear the popup data on the display side
    };

    socket.on('close_question', handleCloseQuestion);

    return () => socket.off('close_question', handleCloseQuestion);
  }, []);

  const categories = [...new Set(questions.map((q) => q.category))];
  const groupedQuestions = categories.map((category) =>
    questions.filter((q) => q.category === category)
  );

  useEffect(() => {
    socket.emit("display_join"); // Tell the server this is a "display" client
  }, []);

  useEffect(() => {
    const handleDisplayQuestion = (question) => {
      console.log("Received question from backend:", question); // Debugging log
      setPopupData(question); // Update popupData state
    };

    socket.on("display_question", handleDisplayQuestion);

    return () => {
      socket.off("display_question", handleDisplayQuestion); // Cleanup listener
    };
  }, []);

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