import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import "./Display.css";

const socket = io();

export default function Admin() {
  const [questions1, setQuestions1] = useState([]);
  const [questions2, setQuestions2] = useState([]);
  const [questions3, setQuestions3] = useState([]);
  const [categories1, setCategories1] = useState([]);
  const [categories2, setCategories2] = useState([]);
  const [categories3, setCategories3] = useState([]);
  const [groupedQuestions1, setGQ1] = useState([]);
  const [groupedQuestions2, setGQ2] = useState([]);
  const [groupedQuestions3, setGQ3] = useState([]);

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
  const [lastBoard, setLastBoard] = useState(0)

  // 30 second timers
  const [timer, setTimer] = useState(30)
  const intervalRef = useRef(null)

  // Manual point entry
  const [manualEntry, setManualEntry] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [points, setPoints] = useState('');

  // Register to socket
  useEffect(() => {
    socket.emit("admin_join");

    socket.on("can_send_update", (permission) => {
      setCanSend(permission);
    });

    return () => socket.off("can_send_update");
  }, []);

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

        setQuestions1(questions1)
        setQuestions2(questions2)
        setQuestions3(questions3)
        setCategories1(categories1)
        setCategories2(categories2)
        setCategories3(categories3)
        setGQ1(groupedQuestions1)
        setGQ2(groupedQuestions2)
        setGQ3(groupedQuestions3)
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

  // fetch user list from backend
  useEffect(() => {
    const getUsers = async () => {
      const response = await fetch(`/api/users`)
      const data = await response.json()
      setUsers(data)
    }
    getUsers();
  }, [])

  // Open question for everyone
  const handleShowPopup = (question) => {
    setPopupData(question);
    socket.emit("admin_show_question", question);
    setHasRegisteredVotes(false);
  };

  // Close question for everyone
  const handleClosePopup = () => {
    setCanSend(false)
    socket.emit("set_global_permission", false)
    socket.emit("close_question");

    if (popupData) {
      setReadQuestions((prev) => new Set([...prev, popupData.id]));
      
      fetch(`/api/answer/${popupData.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      setPopupData(null);
    }

    socket.emit("mark_as_read", popupData.id)
  };

  const undoOpenPopup = () => {
    setPopupData(null);
    socket.emit("set_global_permission", false)
    socket.emit('undo_open')
  }

  const handleAdminSwitch = (id) => {
    setActive(id);
    socket.emit("display_switch", id)
  }

  // Send points to the backend
  const handleRegisterPoints = (double_points) => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    const uncheckedCheckboxes = document.querySelectorAll('input[type="checkbox"]:not(:checked)');
    checkboxes.forEach((checkbox) => {
      const username = checkbox.getAttribute("data-username");
      const points = parseInt(checkbox.getAttribute("data-points"));

      if (username && points) {
        fetch(`/api/points`, {
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

    if (lastBoard === 5) {
      uncheckedCheckboxes.forEach((checkbox) => {
        const username = checkbox.getAttribute("data-username");
        const points = parseInt(checkbox.getAttribute("data-points"));

        if (username && points) {
          fetch(`/api/points`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              'username': username,
              'points': -1 * points * (1 + double_points)
            })
          });
        }
      });
    }

    setUserVotes([]);
    setHasRegisteredVotes(true);
  };

  // Register new users
  const login = async () => {
    const response = await fetch(`/api/user`, {
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

    setUsers((prevUsers) => [...prevUsers, {"username": username}])
    setUsername('');
    setPassword('');
    setDisplay('');
  }

  const startCountdown = (customSeconds = 30) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setTimer(customSeconds);
    
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

  const manualPointEntry = async () => {
    setSelectedUser('');
    setPoints('')
    const response = await fetch(`/api/points`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "username": selectedUser,
        "points": parseInt(points),
      })
    });
    const message = await response.text();
    alert(message);
  }

  return (
    <div>
      <div className="top-panel">
        <h2>Đe Party konzola</h2>
        <button className="mgmt-button" onClick={() => setMenuDisplay(!menuDisplay)}>Korisnici</button>
        <div className="switch-container">
          <p className={`${active == 1 ? "active" : ""}`} onClick={() => handleAdminSwitch(1)}>Početni</p>
          <p className={`${active == 2 ? "active" : ""}`} onClick={() => {handleAdminSwitch(2); setLastBoard(2)}}>1. krug</p>
          <p className={`${active == 3 ? "active" : ""}`} onClick={() => {handleAdminSwitch(3); setLastBoard(3)}}>2. krug</p>
          <p className={`${active == 5 ? "active" : ""}`} onClick={() => {handleAdminSwitch(5); setLastBoard(5)}}>3. krug</p>
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
        {lastBoard === 2 && (
          <div className="jeopardy-grid">
          {groupedQuestions1.map((categoryQuestions, categoryIndex) => (
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
        )}

        {lastBoard === 3 && (
          <div className="jeopardy-grid">
          {groupedQuestions2.map((categoryQuestions, categoryIndex) => (
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
        )}

        {lastBoard === 5 && (
          <div className="jeopardy-grid">
          {groupedQuestions3.map((categoryQuestions, categoryIndex) => (
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
        )}

        {popupData && (
          <div className="popup-overlay">
            <div className="popup">
              <div className="admin-popup-closer">
                <button onClick={undoOpenPopup}><b>X</b></button>
              </div>
              <div className="admin-popup-content">
                <div>
                  <p>{popupData.category}, <b>{popupData.price}</b> bodova</p>
                  {popupData.double == 1 ? <p><i><b>Dvostruki bodovi</b></i></p> : <></>}
                  <p>Pitanje: {popupData.question}</p>
                  <p><i>Odgovor: {popupData.answer}</i></p>
                </div>
                <div>
                  <div className="odgovori-header">
                    <h3>Odgovori</h3>
                    <button onClick={() => setManualEntry(!manualEntry)}>Ručni unos bodova</button>
                  </div>
                  <div className="manual-entry" hidden={!manualEntry}>
                    <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                      {users.map((u, u_index) => (
                        <option key={u_index} value={u.username}>{u.username}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={points}
                      onChange={(e) => setPoints(e.target.value)}
                      placeholder="Bodovi za igrača"
                    />
                    <button onClick={manualPointEntry}>Unesi bodove</button>
                  </div>
                  <div className="scrollable">
                    <div className="points-row" style={{ paddingBottom: '10px', margin: '10px 0', borderBottom: "2px white solid" }}>
                      <span className="points-username">Korisničko ime</span>
                      <span className="points-answer">Odgovor</span>
                      <span className="points-vote">Glas</span>
                    </div>
                    {userVotes.map((vote, index) => (
                      <div key={index} className="points-row">
                        <span className="points-username">{vote.username}</span>
                        <span className="points-answer">
                          {vote.msg}
                          {lastBoard === 5 ? ` (${vote.bet})` : ""}  
                        </span>
                        <span className="points-vote">
                          <input
                            type="checkbox"
                            data-username={vote.username}
                            data-points={lastBoard === 5 ? vote.bet : popupData.price}
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
                      setCanSend(true);
                      lastBoard === 5 ? startCountdown(60) : startCountdown()
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