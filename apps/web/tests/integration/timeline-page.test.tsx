import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import TimelinePage from "../../app/(public)/timeline/page";

test("renders TimelinePage without throwing", () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.test";
  const markup = renderToStaticMarkup(<TimelinePage />);
  assert.ok(markup.length > 0);
});
