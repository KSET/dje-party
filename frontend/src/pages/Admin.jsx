import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

export default function Admin() {
  const [questions, setQuestions] = useState([]);
  const [popupData, setPopupData] = useState(null);
  const [userVotes, setUserVotes] = useState([]);

  useEffect(() => {
    socket.emit('admin_join');
  }, []);

  useEffect(() => {
    // Fetch questions from the backend API
    fetch("http://localhost:3001/api/questions")
      .then((response) => response.json())
      .then((data) => setQuestions(data))
      .catch((error) => console.error("Error fetching questions:", error));
  }, []);

  useEffect(() => {
    socket.on('new_message', (message) => {
      console.log("tu smo?")
      setUserVotes((prevVotes) => [...prevVotes, message]);
    });

    return () => socket.off('new_message');
  }, []);

  const handleShowPopup = (question) => {
    setPopupData(question);
    socket.emit("admin_show_question", question);
  };

  const handleClosePopup = () => {
    setPopupData(null);
    socket.emit('close_question');
  };

  // Group questions by category
  const categories = [...new Set(questions.map((q) => q.category))];
  const groupedQuestions = categories.map((category) =>
    questions.filter((q) => q.category === category)
  );

  return (
    <div>
      <h2>Admin Panel</h2>
      <div className="grid">
        {groupedQuestions.map((categoryQuestions, categoryIndex) => (
          <div key={categoryIndex} className="category-column">
            <h3>{categoryQuestions[0]?.category}</h3>
            {categoryQuestions.map((q, questionIndex) => (
              <div
                key={questionIndex}
                className="question-box"
                onClick={() => handleShowPopup(q)}
              >
                <p>${q.price}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      {popupData && (
        <div className="popup">
          <h3>{popupData.category}</h3>
          <p>Prize: ${popupData.price}</p>
          <p>{popupData.question}</p>

          <button onClick={() => socket.emit('set_global_permission', true)}>Open vote</button>
          <button onClick={() => socket.emit('set_global_permission', false)}>Close vote</button>

          <button onClick={() => socket.emit('show_answer', popupData)}>Show Answer</button>
          <button onClick={handleClosePopup}>Close question</button>

          <div>
            <h3>User Votes:</h3>
            <ul>
              {userVotes.map((vote, index) => (
                <li key={index}>
                  {vote.username}: {vote.msg}
                </li>
              ))}
            </ul>
          </div>

        </div>
      )}
    </div>
  );
}