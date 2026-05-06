import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ViewerPage from "./components/ViewerPage";
import "./index.css";

function normalizePathname(pathname: string) {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

function isViewerEntry() {
  const { hash, pathname } = window.location;

  if (hash === "#viewer" || hash === "#/viewer") {
    window.history.replaceState(null, "", "/viewer");
    return true;
  }

  return normalizePathname(pathname) === "/viewer";
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{isViewerEntry() ? <ViewerPage /> : <App />}</React.StrictMode>
);
