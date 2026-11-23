import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { isValidInput, triage } from "./triage.mjs";

const htmlPath = new URL("./index.html", import.meta.url);

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function handleTriage(request, response) {
  let body;
  try {
    body = await readJsonBody(request);
  } catch {
    return json(response, 400, { status: "invalid_input" });
  }

  if (!isValidInput(body?.text)) {
    return json(response, 400, { status: "invalid_input" });
  }

  const result = await triage(body.text);
  return json(response, 200, result);
}

createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/") {
    const html = await readFile(htmlPath);
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(html);
    return;
  }
  if (request.method !== "POST" || request.url !== "/api/triage") {
    return json(response, 404, { status: "not_found" });
  }
  try {
    await handleTriage(request, response);
  } catch {
    json(response, 500, { status: "server_error" });
  }
}).listen(Number(process.env.PORT || 3000), "127.0.0.1");
