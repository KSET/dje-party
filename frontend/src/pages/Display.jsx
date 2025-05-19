import React, { useEffect, useState, useRef, act } from "react";
import { io } from "socket.io-client";
import "./Display.css";

const URL = import.meta.env.VITE_SERVER_URL;

const socket = io(URL);

export default function Display() {
  const [popupData, setPopupData] = useState(null);
  const [_, setCanSend] = useState(false);
  const [readQuestions, setReadQuestions] = useState(new Set());
  const [userPoints, setUserPoints] = useState([]);
  const [active, setActive] = useState(1);

  const [timer, setTimer] = useState(30);
  const [activeCountdown, setActiveCountdown] = useState(false);
  const intervalRef = useRef(null)

  const [questions1, setQuestions1] = useState([]);
  const [questions2, setQuestions2] = useState([]);
  const [categories1, setCategories1] = useState([]);
  const [categories2, setCategories2] = useState([]);
  const [groupedQuestions1, setGQ1] = useState([]);
  const [groupedQuestions2, setGQ2] = useState([]);

  // Register to socket
  useEffect(() => {
    socket.emit("display_join");
  }, []);

  // Fetch questions from the backend
  useEffect(() => {
      fetch(`${URL}/api/questions`)
        .then((response) => response.json())
        .then((data) => {
          const answeredIndices = data.filter((q) => q.answered == 1).map((q) => q.id);
          setReadQuestions(new Set(answeredIndices));

          const questions1 = data.filter((q) => q.round === 1);
          const questions2 = data.filter((q) => q.round === 2);
          const categories1 = [...new Set(questions1.map((q) => q.category))];
          const categories2 = [...new Set(questions2.map((q) => q.category))];

          const groupedQuestions1 = categories1.map((category) =>
            questions1.filter((q) => q.category === category)
          );
          const groupedQuestions2 = categories2.map((category) =>
            questions2.filter((q) => q.category === category)
          );

          setQuestions1(questions1)
          setQuestions2(questions2)
          setCategories1(categories1)
          setCategories2(categories2)
          setGQ1(groupedQuestions1)
          setGQ2(groupedQuestions2)
        })
        .catch((error) => console.error("Error fetching questions:", error));
    }, []);

  // Not sure tbh
  useEffect(() => {
    socket.on('permission_status', (allowed) => {
      setCanSend(allowed)
      setActiveCountdown(allowed);
      if (allowed) startCountdown();
    });
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

  useEffect(() => {
    const handleUndoOpen = () => {setPopupData(null);}
    socket.on('undo_open', handleUndoOpen);
    return () => socket.off('undo_open', handleUndoOpen)
  }, []);

  // Mark question as read & update user points
  useEffect(() => {
    const handleMarkAsRead = (questionId) => {
      setReadQuestions((prev) => new Set([...prev, questionId]));
    };

    const updatePoints = async () => {
      const response = await fetch(`${URL}/api/points`);
      let data = await response.json();
      data = data
        .filter(item => item.display !== "Administrator" && item.display !== "Display")
        .filter(item => item.points > 0)
        .sort((a, b) => b.points - a.points)
      setUserPoints(data);
    }

    socket.on("open_points", updatePoints);
    socket.on("mark_as_read", handleMarkAsRead);
    socket.on("display_switch", (id) => {
      setActive(id);
    })
    return () => socket.off("mark_as_read", handleMarkAsRead);
  }, []);

  const startCountdown = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setTimer(30);
    
    intervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div>
      {active === 1 && (
        <div className="logo-container">
          <img src='../../assets/splash.png'></img>
        </div>
      )}
      {(active === 2 || active == 3) && (
        <div className="display-container">
          {active === 2 && (
            <div className="display-grid">
              {groupedQuestions1.map((questions1, categoryIndex) => (
                <div key={categoryIndex} className="category-column">
                  <div className="category-header shadow">{categories1[categoryIndex]}</div>
                  {questions1.map((q, questionIndex) => (
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
              {groupedQuestions2.map((questions2, categoryIndex) => (
                <div key={categoryIndex} className="category-column">
                  <div className="category-header shadow">{categories2[categoryIndex]}</div>
                  {questions2.map((q, questionIndex) => (
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
                {popupData.double == 1 ?
                  <div className="popup-question-double shadow">Bodovi x2</div>
                  : <></>
                }
                <p className="popup-question shadow">{popupData.question}</p>
                <div className="popup-question-timer shadow">
                  {activeCountdown ? timer : " "}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {active === 4 && (
        <div className="points-container">
          <div>
            <p className="shadow">Bodovno stanje</p>
            {userPoints.map((user, userIndex) => 
              <div key={userIndex} className="points-row shadow">
                <span> {user.display} </span>
                <span> {user.points} </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}