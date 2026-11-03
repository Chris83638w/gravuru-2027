import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./preview.css";
import "./modern.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
