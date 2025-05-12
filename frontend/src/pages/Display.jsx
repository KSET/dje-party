import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
// import "Display.css"; // Assuming CSS for styling the grid

const socket = io("http://localhost:3001");

export default function Display() {
  const [popupData, setPopupData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [groupedQuestions, setGroupedQuestions] = useState({});

  // Fetch questions from the backend
  useEffect(() => {
    fetch("http://localhost:3001/api/questions")
      .then((response) => response.json())
      .then((data) => {
        setQuestions(data);

        // Group questions by category
        const grouped = data.reduce((acc, question) => {
          if (!acc[question.category]) acc[question.category] = [];
          acc[question.category].push(question);
          return acc;
        }, {});

        setGroupedQuestions(grouped);
      })
      .catch((error) => console.error("Error fetching questions:", error));
  }, []);

  useEffect(() => {
    const handleDisplayQuestion = (question) => {
      setPopupData(question); // Update the popupData state when the event is received
    };

    socket.on("admin_show_question", handleDisplayQuestion);

    return () => {
      socket.off("admin_show_question", handleDisplayQuestion); // Cleanup listener
    };
  }, []);

  return (
    <div>
      <h2>Display Screen</h2>

      {/* Jeopardy Grid */}
      <div className="jeopardy-grid">
        {Object.entries(groupedQuestions).map(([category, questions]) => (
          <div key={category} className="category-column">
            <div className="category-header">{category}</div>
            {questions.map((question, index) => (
              <div key={index} className="prize-cell">
                ${question.price}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Popup for displaying selected question */}
      {popupData ? (
        <div className="popup">
          <h3>{popupData.category}</h3>
          <p>Prize: ${popupData.price}</p>
          <p>{popupData.question}</p>
        </div>
      ) : (
        <p>No question selected yet.</p>
      )}
    </div>
  );
}