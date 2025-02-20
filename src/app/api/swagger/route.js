import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";

const swaggerDocument = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "swagger.json"), "utf8")
);

export async function GET(req) {
  return new Response(JSON.stringify(swaggerDocument), {
    headers: { "Content-Type": "application/json" },
  });
}
