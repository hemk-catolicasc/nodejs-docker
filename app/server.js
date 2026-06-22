const express = require("express");
const os = require("os");
const mysql = require("mysql2/promise");

const app = express();
const PORTA = process.env.PORT || 3000;

// Pool de conexões com o MySQL. O host "db" é resolvido pela rede Docker
// dedicada (rede_app) — não usamos IP fixo, o próprio Docker faz o DNS interno.
const pool = mysql.createPool({
  host: process.env.DB_HOST || "db",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "appdb",
  waitForConnections: true,
  connectionLimit: 5,
});

// Rota principal: dados do sistema operacional dentro do container.
app.get("/", (req, res) => {
  res.json({
    disciplina: "Sistemas Operacionais",
    aluno: process.env.ALUNO || "Não informado",
    hostname: os.hostname(),
    plataforma: os.platform(),
    arquitetura: os.arch(),
  });
});

// Desafio obrigatório: informações de processo e recursos vistos pelo Node.
app.get("/info", (req, res) => {
  res.json({
    pid: process.pid,
    uptime: Math.round(process.uptime()),
    cpus: os.cpus().length,
  });
});

// Prova prática da rede Docker: o app alcança o MySQL pelo nome do serviço.
app.get("/db", async (req, res) => {
  try {
    const [linhas] = await pool.query("SELECT 1 AS ok");
    res.json({ banco: "conectado", resultado: linhas[0] });
  } catch (erro) {
    res.status(503).json({ banco: "indisponível", erro: erro.message });
  }
});

app.listen(PORTA, () => {
  console.log(`Servidor ouvindo na porta ${PORTA} (pid ${process.pid})`);
});
