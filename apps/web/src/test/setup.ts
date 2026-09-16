import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// Each test starts with empty storage — persisted state leaking between tests
// is a classic source of order-dependent failures.
beforeEach(() => {
  localStorage.clear();
});
