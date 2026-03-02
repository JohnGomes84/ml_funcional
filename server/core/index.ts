import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeDatabase } from "../database/schema";
import { createApiRouter } from "../routers";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use("/api", createApiRouter());

initializeDatabase();

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
