import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

export default function Display() {
  const [popupData, setPopupData] = useState(null);

  useEffect(() => {
    // Listen for the "admin_show_question" event
    const handleDisplayQuestion = (question) => {
      setPopupData(question); // Update the popupData state when the event is received
    };

    socket.on("admin_show_question", handleDisplayQuestion);

    return () => {
      socket.off("admin_show_question", handleDisplayQuestion); // Cleanup listener
    };
  }, []);

  return (
    <div>
      <h2>Display Screen</h2>
      {popupData ? (
        <div className="popup">
          <h3>{popupData.category}</h3>
          <p>Prize: ${popupData.price}</p>
          <p>{popupData.question}</p>
        </div>
      ) : (
        <p>No question selected yet.</p>
      )}
    </div>
  );
}