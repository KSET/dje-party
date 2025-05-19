import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import "./Display.css";

const URL = import.meta.env.VITE_SERVER_URL

const socket = io(`${URL}`);

export default function Admin() {
  const [questions, setQuestions] = useState([]);
  const [popupData, setPopupData] = useState(null);
  const [userVotes, setUserVotes] = useState([]);
  const [canSend, setCanSend] = useState(false);
  const [hasRegisteredVotes, setHasRegisteredVotes] = useState(false);
  const [readQuestions, setReadQuestions] = useState(new Set());

  // New user registration
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [display, setDisplay] = useState('');
  const [menuDisplay, setMenuDisplay] = useState(true);

  // Switch between display modes
  const [active, setActive] = useState(1);

  // 30 second timers
  const [timer, setTimer] = useState(30)
  const intervalRef = useRef(null)

  // Register to socket
  useEffect(() => {
    socket.emit("admin_join");

    socket.on("can_send_update", (permission) => {
      setCanSend(permission);
    });

    return () => socket.off("can_send_update");
  }, []);

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

      // new way
      const response = fetch(`${URL}/api/answer/${popupData.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
    }

    socket.emit("mark_as_read", popupData.id)
  };

  const undoOpenPopup = () => {
    setPopupData(null);
    socket.emit('undo_open')
  }

  const handleAdminSwitch = (id) => {
    setActive(id);
    socket.emit("display_switch", id)
  }

  // Send points to the backend
  const handleRegisterPoints = (double_points) => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    checkboxes.forEach((checkbox) => {
      const username = checkbox.getAttribute("data-username");
      const points = parseInt(checkbox.getAttribute("data-points"));

      if (username && points) {
        fetch(`${URL}/api/points`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            'username': username,
            'points': points * (1 + double_points)
          })
        });
      }
    });
    setUserVotes([]);
    setHasRegisteredVotes(true); // Mark votes as registered
  };

  // Register new users
  const login = async () => {
    const response = await fetch(`${URL}/api/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "username": username,
        "password": password,
        "display": display
      })
    });
    const data = await response.text()
    alert(data);

    setUsername('');
    setPassword('');
    setDisplay('');
  }

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

  const categories = [...new Set(questions.map((q) => q.category))];
  const groupedQuestions = categories.map((category) =>
    questions.filter((q) => q.category === category)
  );

  return (
    <div>
      <div className="top-panel">
        <h2>Đe Party konzola</h2>
        <button className="mgmt-button" onClick={() => setMenuDisplay(!menuDisplay)}>Korisnici</button>
        <div className="switch-container">
          <p className={`${active == 1 ? "active" : ""}`} onClick={() => handleAdminSwitch(1)}>Početni</p>
          <p className={`${active == 2 ? "active" : ""}`} onClick={() => handleAdminSwitch(2)}>1. krug</p>
          <p className={`${active == 3 ? "active" : ""}`} onClick={() => handleAdminSwitch(3)}>2. krug</p>
          <p className={`${active == 4 ? "active" : ""}`} onClick={() => {handleAdminSwitch(4); socket.emit('open_points')}}>Bodovi</p>
        </div>
      </div>
      <div className="user-panel" hidden={menuDisplay}>
        <h3>Dodavanje korisnika</h3>
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input placeholder="Lozinka" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <input placeholder="Display ime" value={display} onChange={e => setDisplay(e.target.value)} />
        <button onClick={login}>Prijava novog korisnika</button>
      </div>
      <div className="question-panel">
        <div className="jeopardy-grid">
          {groupedQuestions.map((categoryQuestions, categoryIndex) => (
            <div key={categoryIndex} className="category-column">
              <h3>{categoryQuestions[0]?.category}</h3>
              {categoryQuestions.map((q, questionIndex) => (
                <div
                  key={questionIndex}
                  className={`
                    question-box
                    ${readQuestions.has(q.id) ? "read-admin" : ""}
                    ${q.double == 1 ? "question-box-double" : ""}
                  `}
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
              <div className="admin-popup-closer">
                <button onClick={undoOpenPopup}><b>X</b></button>
              </div>
              <div className="admin-popup-content">
                <div>
                  <p>{popupData.category}, <b>{popupData.price}</b> bodova</p>
                  {popupData.double == 0 ? <p><i><b>Dvostruki bodovi</b></i></p> : <></>}
                  <p>Pitanje: {popupData.question}</p>
                  <p><i>Odgovor: {popupData.answer}</i></p>
                </div>
                <div>
                  <h3>Odgovori</h3>
                  <div className="scrollable">
                    <div className="points-row" style={{ paddingBottom: '10px', margin: '10px 0', borderBottom: "2px white solid" }}>
                      <span className="points-username">Korisničko ime</span>
                      <span className="points-answer">Odgovor</span>
                      <span className="points-vote">Glas</span>
                    </div>
                    {userVotes.map((vote, index) => (
                      <div key={index} className="points-row">
                        <span className="points-username">{vote.username}</span>
                        <span className="points-answer">{vote.msg}</span>
                        <span className="points-vote">
                          <input
                          type="checkbox"
                          data-username={vote.username}
                          data-points={popupData.price}
                          className="custom-checkbox"
                        />
                        </span>
                      </div>
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
                      startCountdown()
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
                    Isključi odgovore ({timer})
                  </button>
                )}
                <button onClick={() => socket.emit("show_answer", popupData)}>Prikaži odgovor</button>
                <button onClick={() => handleRegisterPoints(popupData.double)} disabled={hasRegisteredVotes}>
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