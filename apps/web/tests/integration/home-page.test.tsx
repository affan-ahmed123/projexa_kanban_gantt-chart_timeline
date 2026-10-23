import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import HomePage from "../../app/(public)/page";

test("keeps the workspace foundation and links to the task views", () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.test";
  const markup = renderToStaticMarkup(<HomePage />);
  assert.match(markup, /The application foundation is running/);
  assert.match(markup, /href="https:\/\/api\.example\.test\/health"/);
  assert.match(markup, /href="\/board"/);
  assert.match(markup, /href="\/gantt"/);
});
