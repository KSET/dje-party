import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
// import "Display.css"; // Assuming CSS for styling the grid

const socket = io("http://localhost:3001");

export default function Display() {
  const [popupData, setPopupData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [groupedQuestions, setGroupedQuestions] = useState({});

  useEffect(() => {
    // Function to handle the incoming question
    const handleDisplayQuestion = (question) => {
      console.log("Received question from admin:", question); // Debugging log
      setPopupData(question); // Update popupData state
    };

    // Listen for the "admin_show_question" event
    socket.on("admin_show_question", handleDisplayQuestion);
    console.log("a kao")

    // Cleanup listener on unmount or re-render
    return () => {
      socket.off("admin_show_question", handleDisplayQuestion);
    };
  }, []); // No dependencies, runs on mount onlys

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