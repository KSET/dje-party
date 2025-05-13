import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

export default function Admin() {
  const [questions, setQuestions] = useState([]);
  const [popupData, setPopupData] = useState(null);
  const [userVotes, setUserVotes] = useState([]);

  // Register to socket
  useEffect(() => {
    socket.emit("admin_join");
  }, []);

  // Fetch questions from the backend
  useEffect(() => {
    fetch("http://localhost:3001/api/questions")
      .then((response) => response.json())
      .then((data) => setQuestions(data))
      .catch((error) => console.error("Error fetching questions:", error));
  }, []);

  // Receive answer from player
  useEffect(() => {
    socket.on("new_message", (message) => {
      setUserVotes((prevVotes) => [...prevVotes, message]);
    });
    return () => socket.off("new_message");
  }, []);

  // Open question for everyone
  const handleShowPopup = (question) => {
    setPopupData(question);
    socket.emit("admin_show_question", question);
  };

  // Close question for everyone
  const handleClosePopup = () => {
    setPopupData(null);
    socket.emit("close_question");
  };

  // Send points to the backend
  const handleRegisterPoints = () => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    checkboxes.forEach((checkbox) => {
      const username = checkbox.getAttribute("data-username");
      const points = parseInt(checkbox.getAttribute("data-points"));

      if (username && points) {
        socket.emit("update_points", { username, points });
      }
    });
    setUserVotes([]);
  };

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

          <button onClick={() => socket.emit("set_global_permission", true)}>Open vote</button>
          <button onClick={() => socket.emit("set_global_permission", false)}>Close vote</button>

          <button onClick={() => socket.emit("show_answer", popupData)}>Show Answer</button>
          <button onClick={handleClosePopup}>Close question</button>

          <div>
            <h3>User Votes:</h3>
            <ul>
              {userVotes.map((vote, index) => (
                <li key={index}>
                  {vote.username}: {vote.msg}
                  <input
                    type="checkbox"
                    data-username={vote.username}
                    data-points={popupData.price}
                  />
                </li>
              ))}
            </ul>
            <button onClick={handleRegisterPoints}>Register Points</button>
          </div>
        </div>
      )}
    </div>
  );
}