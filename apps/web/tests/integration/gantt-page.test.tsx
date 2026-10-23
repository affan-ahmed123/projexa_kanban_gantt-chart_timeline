import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import GanttPage from "../../app/(public)/gantt/page";

test("renders GanttPage without throwing", () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.test";
  const markup = renderToStaticMarkup(<GanttPage />);
  assert.ok(markup.length > 0);
});
