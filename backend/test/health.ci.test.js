const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";

const { createApp } = require("../src/app");

test("GET /api/health responds with success payload", async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.message, "Fino API is healthy");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
