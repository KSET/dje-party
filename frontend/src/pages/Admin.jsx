import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./Display.css";

const socket = io("http://localhost:3001");

export default function Admin() {
  const [questions, setQuestions] = useState([]);
  const [popupData, setPopupData] = useState(null);
  const [userVotes, setUserVotes] = useState([]);
  const [canSend, setCanSend] = useState(false);
  const [hasRegisteredVotes, setHasRegisteredVotes] = useState(false);

  // Register to socket
  useEffect(() => {
    socket.emit("admin_join");

    socket.on("can_send_update", (permission) => {
      setCanSend(permission);
    });

    return () => socket.off("can_send_update");
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
    setHasRegisteredVotes(false); // Reset since a new question is shown
  };

  // Close question for everyone
  const handleClosePopup = () => {
    setPopupData(null);
    setCanSend(false)
    socket.emit("set_global_permission", false)
    socket.emit("close_question");
    socket.emit("mark_as_read", popupData.id)
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
    setHasRegisteredVotes(true); // Mark votes as registered
  };

  const categories = [...new Set(questions.map((q) => q.category))];
  const groupedQuestions = categories.map((category) =>
    questions.filter((q) => q.category === category)
  );

  return (
    <div>
      <h2>Admin Panel</h2>
      <div class="question-panel">
        <div class="jeopardy-grid">
          {groupedQuestions.map((categoryQuestions, categoryIndex) => (
            <div key={categoryIndex} className="category-column">
              <h3>{categoryQuestions[0]?.category}</h3>
              {categoryQuestions.map((q, questionIndex) => (
                <div
                  key={questionIndex}
                  className="question-box"
                  onClick={() => handleShowPopup(q)}
                >
                  <p>{q.price} - {q.question}</p>
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

            {!canSend && (
              <button onClick={
                () => {
                  socket.emit("set_global_permission", true);
                  setCanSend(true)
                }}>
                Open vote
              </button>
            )}
            {canSend && (
              <button onClick={
                () => {
                  socket.emit("set_global_permission", false)
                  setCanSend(false)
                }}>
                Close vote
              </button>
            )}

            <button onClick={() => socket.emit("show_answer", popupData)}>Show Answer</button>

            {/* Disable "Close question" button based on vote registration */}
            <button onClick={handleClosePopup} disabled={!hasRegisteredVotes}>
              Close question
            </button>

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
              <button onClick={handleRegisterPoints} disabled={hasRegisteredVotes}>
                Register Points
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}