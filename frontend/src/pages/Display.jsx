import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
// import "Display.css"; // Assuming CSS for styling the grid

const socket = io("http://localhost:3001");

export default function Display() {
  const [popupData, setPopupData] = useState(null);
  const [questions, setQuestions] = useState([]);
  // const [groupedQuestions, setGroupedQuestions] = useState({});

    useEffect(() => {
      // Fetch questions from the backend API
      fetch("http://localhost:3001/api/questions")
        .then((response) => response.json())
        .then((data) => setQuestions(data))
        .catch((error) => console.error("Error fetching questions:", error));
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