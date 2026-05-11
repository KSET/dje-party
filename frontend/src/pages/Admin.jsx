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

  // Question management
  const [selectedRound, setSelectedRound] = useState(1);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [questionForm, setQuestionForm] = useState({
    price: '',
    question: '',
    answer: '',
    double: false
  });
  const [editingQuestion, setEditingQuestion] = useState(null);

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

  // Load categories when questions tab is active
  useEffect(() => {
    if (active === 6) {
      loadCategories(selectedRound);
    }
  }, [active, selectedRound]);

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
    if (id === 6) {
      setLastBoard(0);
    } else {
      socket.emit("display_switch", id)
    }
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

  const deleteUser = async (username) => {
    if (!confirm(`Jeste li sigurni da želite obrisati korisnika "${username}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/user/${username}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setUsers((prevUsers) => prevUsers.filter(user => user.username !== username));
        alert('Korisnik obrisan uspješno');
      } else {
        alert('Greška pri brisanju korisnika');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Greška pri brisanju korisnika');
    }
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

  // Question management functions
  const loadCategories = async (round) => {
    try {
      const response = await fetch(`/api/categories/${round}`);
      const data = await response.json();
      setCategories(data);
      if (data.length > 0 && !selectedCategory) {
        setSelectedCategory(data[0]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleRoundChange = (round) => {
    setSelectedRound(round);
    setSelectedCategory('');
    setNewCategory('');
    loadCategories(round);
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    
    // Check if category already exists
    if (categories.includes(newCategory.trim())) {
      alert('Kategorija već postoji!');
      return;
    }
    
    setCategories([...categories, newCategory.trim()]);
    setSelectedCategory(newCategory.trim());
    setNewCategory('');
  };

  const deleteCategory = async (categoryName) => {
    if (!confirm(`Jeste li sigurni da želite obrisati kategoriju "${categoryName}" i sva pitanja u njoj?`)) {
      return;
    }

    try {
      // Get all questions in this category and round
      const questionsToDelete = questions1.concat(questions2).concat(questions3)
        .filter(q => q.category === categoryName && q.round === selectedRound);
      
      // Delete all questions in this category
      for (const question of questionsToDelete) {
        await fetch(`/api/questions/${question.id}`, {
          method: 'DELETE'
        });
      }
      
      // Remove from categories list
      setCategories(categories.filter(cat => cat !== categoryName));
      if (selectedCategory === categoryName) {
        setSelectedCategory(categories.length > 1 ? categories[0] : '');
      }
      
      // Refresh questions
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Greška pri brisanju kategorije');
    }
  };

  const addQuestion = async () => {
    if (!selectedCategory || !questionForm.question.trim() || !questionForm.answer.trim() || !questionForm.price) {
      alert('Molimo popunite sva polja!');
      return;
    }

    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round: selectedRound,
          category: selectedCategory,
          price: parseInt(questionForm.price),
          question: questionForm.question.trim(),
          answer: questionForm.answer.trim(),
          double: questionForm.double
        })
      });

      if (response.ok) {
        alert('Pitanje dodano uspješno!');
        setQuestionForm({ price: '', question: '', answer: '', double: false });
        fetchQuestions();
      } else {
        alert('Greška pri dodavanju pitanja');
      }
    } catch (error) {
      console.error('Error adding question:', error);
      alert('Greška pri dodavanju pitanja');
    }
  };

  const updateQuestion = async () => {
    if (!editingQuestion || !questionForm.question.trim() || !questionForm.answer.trim() || !questionForm.price) {
      alert('Molimo popunite sva polja!');
      return;
    }

    try {
      const response = await fetch(`/api/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round: selectedRound,
          category: selectedCategory,
          price: parseInt(questionForm.price),
          question: questionForm.question.trim(),
          answer: questionForm.answer.trim(),
          double: questionForm.double
        })
      });

      if (response.ok) {
        alert('Pitanje ažurirano uspješno!');
        setQuestionForm({ price: '', question: '', answer: '', double: false });
        setEditingQuestion(null);
        fetchQuestions();
      } else {
        alert('Greška pri ažuriranju pitanja');
      }
    } catch (error) {
      console.error('Error updating question:', error);
      alert('Greška pri ažuriranju pitanja');
    }
  };

  const deleteQuestion = async (questionId) => {
    if (!confirm('Jeste li sigurni da želite obrisati ovo pitanje?')) {
      return;
    }

    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchQuestions();
      } else {
        alert('Greška pri brisanju pitanja');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Greška pri brisanju pitanja');
    }
  };

  const editQuestion = (question) => {
    setEditingQuestion(question);
    setSelectedCategory(question.category);
    setQuestionForm({
      price: question.price.toString(),
      question: question.question,
      answer: question.answer,
      double: question.double === 1
    });
  };

  const markAsUnread = async (questionId) => {
    try {
      const response = await fetch(`/api/questions/${questionId}/mark-unread`, {
        method: 'POST'
      });

      if (response.ok) {
        setReadQuestions((prev) => {
          const newSet = new Set(prev);
          newSet.delete(questionId);
          return newSet;
        });
      } else {
        alert('Greška pri označavanju pitanja kao neproitano');
      }
    } catch (error) {
      console.error('Error marking question as unread:', error);
      alert('Greška pri označavanju pitanja kao neproitano');
    }
  };

  const cancelEdit = () => {
    setEditingQuestion(null);
    setQuestionForm({ price: '', question: '', answer: '', double: false });
  };

  const fetchQuestions = () => {
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
  };

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
          <p className={`${active == 6 ? "active" : ""}`} onClick={() => handleAdminSwitch(6)}>Pitanja</p>
        </div>
      </div>
      <div className="user-panel" hidden={menuDisplay}>
        <h3>Dodavanje korisnika</h3>
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input placeholder="Lozinka" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <input placeholder="Display ime" value={display} onChange={e => setDisplay(e.target.value)} />
        <button onClick={login}>Prijava novog korisnika</button>
        
        <h3 style={{marginTop: '20px'}}>Postojeći korisnici</h3>
        <div className="users-list">
          {users.map((user, index) => (
            <div key={index} className="user-item">
              <span>{user.username}</span>
              {user.username !== 'admin' && user.username !== 'display' && (
                <button 
                  className="delete-user-btn" 
                  onClick={() => deleteUser(user.username)}
                  title="Obriši korisnika"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      {active !== 6 && (
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
      )}

      {/* Questions Management Panel */}
      {active === 6 && (
        <div className="questions-management-panel">
          <h2>Upravljanje pitanjima</h2>
          
          {/* Round Selection */}
          <div className="round-selection">
            <h3>Odaberite krug:</h3>
            <div className="round-buttons">
              <button 
                className={selectedRound === 1 ? 'active' : ''} 
                onClick={() => handleRoundChange(1)}
              >
                1. krug
              </button>
              <button 
                className={selectedRound === 2 ? 'active' : ''} 
                onClick={() => handleRoundChange(2)}
              >
                2. krug
              </button>
              <button 
                className={selectedRound === 3 ? 'active' : ''} 
                onClick={() => handleRoundChange(3)}
              >
                3. krug
              </button>
            </div>
          </div>

          <div className="questions-content">
            {/* Categories Management */}
            <div className="categories-section">
              <h3>Kategorije za {selectedRound}. krug</h3>
              <div className="category-list">
                {categories.map((category, index) => (
                  <div key={index} className="category-item">
                    <span 
                      className={selectedCategory === category ? 'selected' : ''} 
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </span>
                    <button 
                      className="delete-btn" 
                      onClick={() => deleteCategory(category)}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
              <div className="add-category">
                <input
                  type="text"
                  placeholder="Nova kategorija"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
                <button onClick={addCategory}>Dodaj kategoriju</button>
              </div>
            </div>

            {/* Questions Management */}
            {selectedCategory && (
              <div className="questions-section">
                <h3>Pitanja za kategoriju: {selectedCategory}</h3>
                
                {/* Question Form */}
                <div className="question-form">
                  <h4>{editingQuestion ? 'Uredi pitanje' : 'Dodaj novo pitanje'}</h4>
                  <div className="form-row">
                    <label>Cijena:</label>
                    <input
                      type="number"
                      value={questionForm.price}
                      onChange={(e) => setQuestionForm({...questionForm, price: e.target.value})}
                      placeholder="100"
                    />
                  </div>
                  <div className="form-row">
                    <label>Pitanje:</label>
                    <textarea
                      value={questionForm.question}
                      onChange={(e) => setQuestionForm({...questionForm, question: e.target.value})}
                      placeholder="Unesite pitanje..."
                      rows="3"
                    />
                  </div>
                  <div className="form-row">
                    <label>Odgovor:</label>
                    <textarea
                      value={questionForm.answer}
                      onChange={(e) => setQuestionForm({...questionForm, answer: e.target.value})}
                      placeholder="Unesite odgovor..."
                      rows="2"
                    />
                  </div>
                  <div className="form-row">
                    <label>
                      <input
                        type="checkbox"
                        checked={questionForm.double}
                        onChange={(e) => setQuestionForm({...questionForm, double: e.target.checked})}
                      />
                      Dvostruki bodovi
                    </label>
                  </div>
                  <div className="form-buttons">
                    <button onClick={editingQuestion ? updateQuestion : addQuestion}>
                      {editingQuestion ? 'Ažuriraj' : 'Dodaj'} pitanje
                    </button>
                    {editingQuestion && (
                      <button onClick={cancelEdit}>Odustani</button>
                    )}
                  </div>
                </div>

                {/* Questions List */}
                <div className="questions-list">
                  <h4>Postojeća pitanja:</h4>
                  {(() => {
                    const roundQuestions = selectedRound === 1 ? questions1 : 
                                         selectedRound === 2 ? questions2 : questions3;
                    const categoryQuestions = roundQuestions.filter(q => q.category === selectedCategory);
                    
                    return categoryQuestions.map((question) => (
                      <div key={question.id} className="question-item">
                        <div className="question-header">
                          <span className="question-price">{question.price} bodova {question.double === 1 && '(2x)'}</span>
                          <div className="question-actions">
                            {question.answered === 1 && (
                              <button onClick={() => markAsUnread(question.id)} title="Označi kao neproitano">👁️</button>
                            )}
                            <button onClick={() => editQuestion(question)}>✏️</button>
                            <button onClick={() => deleteQuestion(question.id)}>🗑️</button>
                          </div>
                        </div>
                        <div className="question-content">
                          <p><strong>P:</strong> {question.question}</p>
                          <p><strong>O:</strong> {question.answer}</p>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}