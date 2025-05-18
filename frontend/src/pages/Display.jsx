import React, { act, useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./Display.css";

const URL = import.meta.env.VITE_SERVER_URL;

const socket = io(URL);

export default function Display() {
  const [popupData, setPopupData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [_, setCanSend] = useState(false);
  const [readQuestions, setReadQuestions] = useState(new Set());
  const [userPoints, setUserPoints] = useState([]);
  const [active, setActive] = useState(1);

  // Register to socket
  useEffect(() => {
    socket.emit("display_join");
  }, []);

  // Fetch questions from the backend
  useEffect(() => {
      fetch(`${URL}/api/questions/1`)
        .then((response) => response.json())
        .then((data) => {
          setQuestions(data);
          const answeredIndices = data.filter((q) => q.answered == 1).map((q) => q.id);
          setReadQuestions(new Set(answeredIndices));
        })
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

  // Mark question as read & update user points
  useEffect(() => {
    const handleMarkAsRead = (questionId) => {
      setReadQuestions((prev) => new Set([...prev, questionId]));
    };

    const updatePoints = async () => {
      const response = await fetch(`${URL}/api/points`);
      let data = await response.json();
      data = data.filter(item => item.display !== "Administrator" && item.display !== "Display");
      setUserPoints(data);
    }

    socket.on("mark_as_read", handleMarkAsRead);
    socket.on("display_switch", (id) => {
      setActive(id);
    })
    updatePoints();
    return () => socket.off("mark_as_read", handleMarkAsRead);
  }, []);

  const categories = [...new Set(questions.map((q) => q.category))];
  const groupedQuestions1 = categories.map((category) =>
    questions.filter((q) => q.round == 1 && q.category === category)
  );
  const groupedQuestions2 = categories.map((category) =>
    questions.filter((q) => q.round == 2 && q.category === category)
  );

  return (
    <div>
      {active === 1 && (
        <div className="logo-container">
          ovdje će doć slika
        </div>
      )}
      {(active === 2 || active == 3) && (
        <div className="display-container">
          {active === 2 && (
            <div className="display-grid">
              {groupedQuestions1.map((questions, categoryIndex) => (
                <div key={categoryIndex} className="category-column">
                  <div className="category-header shadow">{categories[categoryIndex]}</div>
                  {questions.map((q, questionIndex) => (
                    <div key={questionIndex}
                      className={`prize-cell ${readQuestions.has(q.id) ? "read-display" : "shadow"}`}
                    >
                      {q.price}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {active === 3 && (
            <div className="display-grid">
              {groupedQuestions2.map((questions, categoryIndex) => (
                <div key={categoryIndex} className="category-column">
                  <div className="category-header shadow">{categories[categoryIndex]}</div>
                  {questions.map((q, questionIndex) => (
                    <div key={questionIndex}
                      className={`prize-cell ${readQuestions.has(q.id) ? "read-display" : "shadow"}`}
                    >
                      {q.price}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {popupData && (
            <div className="popup-overlay">
              <div className="popup">
                <p className="popup-question shadow">{popupData.question}</p>
              </div>
            </div>
          )}
        </div>
      )}
      {active === 4 && (
        <div className="points-container">
          {userPoints.map((user, userIndex) => (
            <div key={userIndex}> {user.display} - {user.points} </div>
          ))}
        </div>
      )}
    </div>
  );
}