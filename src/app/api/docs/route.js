import swaggerUi from "swagger-ui-express";
import path from "path";
import fs from "fs";

// Загружаем swagger.json
const swaggerPath = path.join(process.cwd(), "swagger.json");
const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, "utf8"));

export async function GET() {
  return new Response(JSON.stringify(swaggerDocument), {
    headers: { "Content-Type": "application/json" },
  });
}
