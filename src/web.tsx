import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { WebApp } from "./webApp";
import "./web.css";

const root = document.querySelector<HTMLDivElement>("#root");

if (!root) {
  throw new Error("Web preview root was not found");
}

createRoot(root).render(
  <StrictMode>
    <WebApp />
  </StrictMode>,
);
