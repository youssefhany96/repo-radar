import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store, loadPersisted } from "./store";
import { hydrate } from "./store/trackedSlice";
import App from "./App";

// Hydrate from localStorage before first render, so tracked repos are present
// immediately rather than appearing a frame later.
const persisted = loadPersisted();
if (persisted.length > 0) store.dispatch(hydrate(persisted));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
