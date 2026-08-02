import "@testing-library/jest-dom";

// Polyfill for TextEncoder/TextDecoder (used by Remix internals)
import { TextEncoder, TextDecoder } from "node:util";

if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === "undefined") {
  global.TextDecoder = TextDecoder;
}

// Set test database URL — overridden by CI environment variables in Docker
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/countdown_timer_test";
}
