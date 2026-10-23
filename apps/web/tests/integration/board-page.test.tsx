import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import BoardPage from "../../app/(public)/board/page";

test("renders BoardPage without throwing", () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.test";
  const markup = renderToStaticMarkup(<BoardPage />);
  assert.ok(markup.length > 0);
});
