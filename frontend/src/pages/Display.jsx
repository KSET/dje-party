import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import "./Display.css";

const socket = io();

export default function Display() {
  const [popupData, setPopupData] = useState(null);
  const [_, setCanSend] = useState(false);
  const [readQuestions, setReadQuestions] = useState(new Set());
  const [userPoints, setUserPoints] = useState([]);
  const [active, setActive] = useState(1);
  const [timer, setTimer] = useState(30);
  const [activeCountdown, setActiveCountdown] = useState(false);
  const intervalRef = useRef(null);
  const isCountingRef = useRef(false);

  const [questions1, setQuestions1] = useState([]);
  const [questions2, setQuestions2] = useState([]);
  const [questions3, setQuestions3] = useState([]);
  const [categories1, setCategories1] = useState([]);
  const [categories2, setCategories2] = useState([]);
  const [categories3, setCategories3] = useState([]);
  const [groupedQuestions1, setGQ1] = useState([]);
  const [groupedQuestions2, setGQ2] = useState([]);
  const [groupedQuestions3, setGQ3] = useState([]);

  // Register to socket
  useEffect(() => {
    socket.emit("display_join");
  }, []);

  // Fetch questions from the backend
  useEffect(() => {
    fetch(`/api/questions`)
      .then((response) => response.json())
      .then((data) => {
        const answeredIndices = data.filter((q) => q.answered == 1).map((q) => q.id);
        setReadQuestions(new Set(answeredIndices));

        const questions1 = data.filter((q) => q.round === 1);
        const questions2 = data.filter((q) => q.round === 2);
        const questions3 = data.filter((q) => q.round === 3);
        const categories1 = [...new Set(questions1.map((q) => q.category))];
        const categories2 = [...new Set(questions2.map((q) => q.category))];
        const categories3 = [...new Set(questions3.map((q) => q.category))];

        const groupedQuestions1 = categories1.map((category) =>
          questions1.filter((q) => q.category === category)
        );
        const groupedQuestions2 = categories2.map((category) =>
          questions2.filter((q) => q.category === category)
        );
        const groupedQuestions3 = categories3.map((category) =>
          questions3.filter((q) => q.category === category)
        );

        setQuestions1(questions1);
        setQuestions2(questions2);
        setQuestions3(questions3);
        setCategories1(categories1);
        setCategories2(categories2);
        setCategories3(categories3);
        setGQ1(groupedQuestions1);
        setGQ2(groupedQuestions2);
        setGQ3(groupedQuestions3);
      })
      .catch((error) => console.error("Error fetching questions:", error));
  }, []);

  // Handle permission_status and display_switch
  useEffect(() => {
    const handlePermission = (allowed) => {
      setCanSend(allowed);
      setActiveCountdown(allowed);
    };

    const handleDisplaySwitch = (id) => {
      setActive(id);
    };

    socket.on("permission_status", handlePermission);
    socket.on("display_switch", handleDisplaySwitch);

    return () => {
      socket.off("permission_status", handlePermission);
      socket.off("display_switch", handleDisplaySwitch);
    };
  }, []);

  // Manage countdown based on active and activeCountdown
  useEffect(() => {
    if (activeCountdown && !isCountingRef.current) {
      startCountdown(active === 5 ? 60 : 30);
      isCountingRef.current = true;
    } else if (!activeCountdown && isCountingRef.current) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setTimer(active === 5 ? 60 : 30);
      isCountingRef.current = false;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, activeCountdown]);

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
    socket.on("show_answer", handleShowAnswer);
    return () => socket.off("show_answer", handleShowAnswer);
  }, []);

  // Close popup box
  useEffect(() => {
    const handleCloseQuestion = () => {
      setPopupData(null);
    };
    socket.on("close_question", handleCloseQuestion);
    return () => socket.off("close_question", handleCloseQuestion);
  }, []);

  useEffect(() => {
    const handleUndoOpen = () => {
      setPopupData(null);
    };
    socket.on("undo_open", handleUndoOpen);
    return () => socket.off("undo_open", handleUndoOpen);
  }, []);

  // Mark question as read & update user points
  useEffect(() => {
    const handleMarkAsRead = (questionId) => {
      setReadQuestions((prev) => new Set([...prev, questionId]));
    };

    const updatePoints = async () => {
      const response = await fetch(`/api/points`);
      let data = await response.json();
      data = data
        .filter((item) => item.display !== "Administrator" && item.display !== "Display")
        .filter((item) => item.points > 0)
        .sort((a, b) => b.points - a.points);
      setUserPoints(data);
    };

    socket.on("open_points", updatePoints);
    socket.on("mark_as_read", handleMarkAsRead);

    return () => {
      socket.off("open_points", updatePoints);
      socket.off("mark_as_read", handleMarkAsRead);
    };
  }, []);

  const startCountdown = (initialTimer) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setTimer(initialTimer);

    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          isCountingRef.current = false;
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
          <img src="../../splash.png" alt="Splash" />
        </div>
      )}
      {(active === 2 || active === 3 || active === 5) && (
        <div className="display-container">
          {active === 2 && (
            <div className="display-grid">
              {groupedQuestions1.map((questions1, categoryIndex) => (
                <div key={categoryIndex} className="category-column">
                  <div className="category-header shadow">{categories1[categoryIndex]}</div>
                  {questions1.map((q, questionIndex) => (
                    <div
                      key={questionIndex}
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
                    <div
                      key={questionIndex}
                      className={`prize-cell ${readQuestions.has(q.id) ? "read-display" : "shadow"}`}
                    >
                      {q.price}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {active === 5 && (
            <div className="display-grid">
              {groupedQuestions3.map((questions3, categoryIndex) => (
                <div key={categoryIndex} className="category-column">
                  <div className="category-header shadow">{categories3[categoryIndex]}</div>
                </div>
              ))}
            </div>
          )}

          {popupData && (
            <div className="popup-overlay">
              <div className={`popup ${popupData.double === 1 ? 'popup-double' : ''}`}>
                {popupData.double === 1 ? (
                  <div className=
                    {`popup-question-double ${popupData.double === 1 ? 'shadow-double' : 'shadow'}`}
                  >Bodovi x2</div>
                ) : (
                  <></>
                )}
                <p className=
                  {`popup-question ${popupData.double === 1 ? 'shadow-double' : 'shadow'}`}
                >{popupData.question}</p>
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
            {userPoints.map((user, userIndex) => (
              <div key={userIndex} className="points-row shadow">
                <span>{user.display}</span>
                <span>{user.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}