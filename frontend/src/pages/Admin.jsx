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
  const [readQuestions, setReadQuestions] = useState(new Set());

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
      .then((data) => {
        setQuestions(data);
        const answeredIndices = data.filter((q) => q.answered == "true").map((q) => q.id);
        setReadQuestions(new Set(answeredIndices));
      })
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

    if (popupData?.id) {
      setReadQuestions((prev) => new Set([...prev, popupData.id]));
      socket.emit("update_csv", { id: popupData.id });
    }

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
      <div className="top-panel">
        <h2>Đe Party konzola</h2>
      </div>
      <div className="question-panel">
        <div className="jeopardy-grid">
          {groupedQuestions.map((categoryQuestions, categoryIndex) => (
            <div key={categoryIndex} className="category-column">
              <h3>{categoryQuestions[0]?.category}</h3>
              {categoryQuestions.map((q, questionIndex) => (
                <div
                  key={questionIndex}
                  className={`question-box ${readQuestions.has(q.id) ? "read-admin" : ""}`}
                  onClick={() => !readQuestions.has(q.id) && handleShowPopup(q)}
                >
                  <p>
                    {q.price} - {q.question}
                    <b>
                      {readQuestions.has(q.id) && " - " + q.answer}
                    </b>
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>

        {popupData && (
          <div className="popup-overlay">
            <div className="popup">
              <div className="admin-popup-content">
                <div>
                  <p>{popupData.category}, <b>{popupData.price}</b> bodova</p>
                  <p>Pitanje: {popupData.question}</p>
                  <p><i>Odgovor: {popupData.answer}</i></p>
                </div>
                <div>
                  <h3>Odgovori</h3>
                  <div className="scrollable">
                    {userVotes.map((vote, index) => (
                      <p key={index}>
                      {vote.username}: {vote.msg}
                      <input
                        type="checkbox"
                        data-username={vote.username}
                        data-points={popupData.price}
                      />
                      </p>
                    ))}
                  </div>
                </div>
              </div>
              <div className="admin-popup-buttons">
                {!canSend && (
                  <button className="btn-grn" onClick={
                    () => {
                      socket.emit("set_global_permission", true);
                      setCanSend(true)
                    }}>
                    Uključi odgovore
                  </button>
                )}
                {canSend && (
                  <button className="btn-red" onClick={
                    () => {
                      socket.emit("set_global_permission", false)
                      setCanSend(false)
                    }}>
                    Isključi odgovore
                  </button>
                )}
                <button onClick={() => socket.emit("show_answer", popupData)}>Prikaži odgovor</button>
                <button onClick={handleRegisterPoints} disabled={hasRegisteredVotes}>
                    Spremi bodove
                  </button>
                <button onClick={handleClosePopup} disabled={!hasRegisteredVotes}>
                  Zatvori pitanje
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}