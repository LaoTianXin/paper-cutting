import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import suppressMediaPipeLogs from "./suppressMediaPipeLogs";

// 禁用 MediaPipe 的控制台日志
suppressMediaPipeLogs();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
