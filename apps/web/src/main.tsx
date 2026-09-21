import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Rehydration from localStorage is handled by the persist middleware.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
