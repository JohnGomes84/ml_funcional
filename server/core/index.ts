import dotenv from "dotenv";
import { createApp } from "./app";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const app = createApp();
const port = process.env.PORT || 3001;

const server = app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
