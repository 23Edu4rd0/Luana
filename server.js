const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { Pool } = require("pg");
const fs = require("fs/promises");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const SESSION_SECRET = process.env.SESSION_SECRET || "mude-este-segredo";
const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";
const DATABASE_URL = process.env.DATABASE_URL;
const useDatabase = Boolean(DATABASE_URL);
const dbSsl =
  process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false };
const db = useDatabase
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: dbSsl,
    })
  : null;
const respostasPath = path.join(__dirname, "data", "respostas.json");
const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:43123",
  "http://127.0.0.1:43123",
];
const renderExternalUrl = process.env.RENDER_EXTERNAL_URL || "";

function normalizarOrigem(origin) {
  return String(origin || "")
    .trim()
    .replace(/\/$/, "");
}

const allowedOriginsFromEnv = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(normalizarOrigem)
  .filter(Boolean);
const allowedOrigins = Array.from(
  new Set([
    ...defaultAllowedOrigins.map(normalizarOrigem),
    normalizarOrigem(renderExternalUrl),
    ...allowedOriginsFromEnv,
  ]),
).filter(Boolean);

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      const origemNormalizada = normalizarOrigem(origin);
      if (!origin || allowedOrigins.includes(origemNormalizada)) {
        return callback(null, true);
      }
      return callback(new Error("Origem nao permitida pelo CORS."));
    },
    credentials: true,
  }),
);
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 6,
    },
  }),
);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "static")));

function normalizarRespostaEntrada({
  nome,
  curso,
  email,
  preferencia,
  risco,
  atitudes,
  abrilVerde,
  responsabilidade,
}) {
  const cursoNormalizado = String(curso || email || "").trim();
  return {
    nome: String(nome).trim(),
    curso: cursoNormalizado,
    preferencia: String(preferencia || "N/A").trim(),
    risco: String(risco).trim(),
    atitudes: String(atitudes).trim(),
    abrilVerde: String(abrilVerde).trim(),
    responsabilidade: String(responsabilidade).trim(),
  };
}

async function garantirArquivoRespostas() {
  try {
    await fs.access(respostasPath);
  } catch {
    await fs.mkdir(path.dirname(respostasPath), { recursive: true });
    await fs.writeFile(respostasPath, "[]", "utf8");
  }
}

async function lerRespostas() {
  await garantirArquivoRespostas();
  const conteudo = await fs.readFile(respostasPath, "utf8");
  return JSON.parse(conteudo || "[]");
}

async function salvarRespostas(respostas) {
  await fs.writeFile(respostasPath, JSON.stringify(respostas, null, 2), "utf8");
}

function mapearRegistroDb(row) {
  return {
    id: Number(row.id),
    nome: row.nome,
    curso: row.curso || row.email || "",
    preferencia: row.preferencia || "N/A",
    risco: row.risco || "",
    atitudes: row.atitudes || "",
    abrilVerde: row.abrilVerde || row.abrilverde || "",
    responsabilidade: row.responsabilidade || "",
    criadoEm: new Date(row.criado_em).toISOString(),
  };
}

async function inicializarArmazenamento() {
  if (!useDatabase) {
    await garantirArquivoRespostas();
    return;
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS respostas (
        id BIGSERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT,
        preferencia TEXT NOT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.query("ALTER TABLE respostas ADD COLUMN IF NOT EXISTS curso TEXT");
    await db.query("ALTER TABLE respostas ADD COLUMN IF NOT EXISTS risco TEXT");
    await db.query(
      "ALTER TABLE respostas ADD COLUMN IF NOT EXISTS atitudes TEXT",
    );
    await db.query(
      "ALTER TABLE respostas ADD COLUMN IF NOT EXISTS abrilVerde TEXT",
    );
    await db.query(
      "ALTER TABLE respostas ADD COLUMN IF NOT EXISTS responsabilidade TEXT",
    );

    await db.query(
      "UPDATE respostas SET curso = email WHERE (curso IS NULL OR curso = '') AND email IS NOT NULL",
    );

    await db.query(
      "CREATE INDEX IF NOT EXISTS idx_respostas_criado_em ON respostas (criado_em DESC)",
    );
    await db.query(
      "CREATE INDEX IF NOT EXISTS idx_respostas_curso ON respostas (curso)",
    );

    console.log("[DB] Inicializacao concluida com sucesso.");
  } catch (erro) {
    console.error("[DB] Erro na inicializacao:", erro.message);
    throw erro;
  }
}

async function listarRespostas() {
  if (!useDatabase) {
    return lerRespostas();
  }

  const resultado = await db.query(
    `SELECT id, nome, curso, email, preferencia, risco, atitudes,
            abrilverde AS "abrilVerde", responsabilidade, criado_em
     FROM respostas ORDER BY criado_em DESC`,
  );
  return resultado.rows.map(mapearRegistroDb);
}

async function inserirResposta({
  nome,
  curso,
  email,
  preferencia,
  risco,
  atitudes,
  abrilVerde,
  responsabilidade,
}) {
  const entrada = normalizarRespostaEntrada({
    nome,
    curso,
    email,
    preferencia,
    risco,
    atitudes,
    abrilVerde,
    responsabilidade,
  });

  if (!useDatabase) {
    const respostas = await lerRespostas();
    const registro = criarRegistro(entrada);
    respostas.push(registro);
    await salvarRespostas(respostas);
    return registro;
  }

  const resultado = await db.query(
    `INSERT INTO respostas (nome, curso, preferencia, risco, atitudes, abrilVerde, responsabilidade)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, nome, curso, email, preferencia, risco, atitudes, abrilVerde, responsabilidade, criado_em`,
    [
      entrada.nome,
      entrada.curso,
      entrada.preferencia,
      entrada.risco,
      entrada.atitudes,
      entrada.abrilVerde,
      entrada.responsabilidade,
    ],
  );

  return mapearRegistroDb(resultado.rows[0]);
}

async function atualizarResposta(
  id,
  {
    nome,
    curso,
    email,
    preferencia,
    risco,
    atitudes,
    abrilVerde,
    responsabilidade,
  },
) {
  const entrada = normalizarRespostaEntrada({
    nome,
    curso,
    email,
    preferencia,
    risco,
    atitudes,
    abrilVerde,
    responsabilidade,
  });

  if (!useDatabase) {
    const respostas = await lerRespostas();
    const index = respostas.findIndex((item) => Number(item.id) === id);

    if (index === -1) {
      return null;
    }

    respostas[index] = criarRegistro({
      id,
      nome: entrada.nome,
      curso: entrada.curso,
      preferencia: entrada.preferencia,
      risco: entrada.risco,
      atitudes: entrada.atitudes,
      abrilVerde: entrada.abrilVerde,
      responsabilidade: entrada.responsabilidade,
      criadoEm: respostas[index].criadoEm,
    });

    await salvarRespostas(respostas);
    return respostas[index];
  }

  const resultado = await db.query(
    `UPDATE respostas
     SET nome = $1, curso = $2, preferencia = $3, risco = $4, atitudes = $5, abrilVerde = $6, responsabilidade = $7
     WHERE id = $8
     RETURNING id, nome, curso, email, preferencia, risco, atitudes, abrilVerde, responsabilidade, criado_em`,
    [
      entrada.nome,
      entrada.curso,
      entrada.preferencia,
      entrada.risco,
      entrada.atitudes,
      entrada.abrilVerde,
      entrada.responsabilidade,
      id,
    ],
  );

  if (resultado.rowCount === 0) {
    return null;
  }

  return mapearRegistroDb(resultado.rows[0]);
}

async function excluirResposta(id) {
  if (!useDatabase) {
    const respostas = await lerRespostas();
    const index = respostas.findIndex((item) => Number(item.id) === id);

    if (index === -1) {
      return false;
    }

    respostas.splice(index, 1);
    await salvarRespostas(respostas);
    return true;
  }

  const resultado = await db.query("DELETE FROM respostas WHERE id = $1", [id]);
  return resultado.rowCount > 0;
}

function validarRespostaEntrada(
  nome,
  curso,
  risco,
  atitudes,
  abrilVerde,
  responsabilidade,
) {
  if (
    !nome ||
    !curso ||
    !risco ||
    !atitudes ||
    !abrilVerde ||
    !responsabilidade
  ) {
    return "Preencha nome, curso, risco, atitudes, abril verde e responsabilidade.";
  }

  return null;
}

function criarRegistro({
  id,
  nome,
  curso,
  email,
  preferencia,
  risco,
  atitudes,
  abrilVerde,
  responsabilidade,
  criadoEm,
}) {
  return {
    id: id || Date.now(),
    nome: String(nome).trim(),
    curso: String(curso || email || "").trim(),
    preferencia: String(preferencia).trim(),
    risco: String(risco).trim(),
    atitudes: String(atitudes).trim(),
    abrilVerde: String(abrilVerde).trim(),
    responsabilidade: String(responsabilidade).trim(),
    criadoEm: criadoEm || new Date().toISOString(),
  };
}

function exigeAdmin(req, res, next) {
  if (!req.session || !req.session.isAdmin) {
    return res.status(401).json({ mensagem: "Nao autorizado" });
  }
  next();
}

app.post("/api/respostas", async (req, res) => {
  try {
    console.log("[DEBUG] body recebido:", req.body);
    const {
      nome,
      curso,
      email,
      preferencia,
      risco,
      atitudes,
      abrilVerde,
      responsabilidade,
    } = req.body;
    const cursoFinal = curso || email;

    const erroValidacao = validarRespostaEntrada(
      nome,
      cursoFinal,
      risco,
      atitudes,
      abrilVerde,
      responsabilidade,
    );
    if (erroValidacao) {
      return res.status(400).json({ mensagem: erroValidacao });
    }

    await inserirResposta({
      nome,
      curso: cursoFinal,
      email,
      preferencia,
      risco,
      atitudes,
      abrilVerde,
      responsabilidade,
    });

    return res.status(201).json({ mensagem: "Resposta salva com sucesso." });
  } catch (erro) {
    console.error("[POST /api/respostas] Erro:", erro.message);
    return res
      .status(500)
      .json({ mensagem: "Erro interno ao salvar resposta." });
  }
});

app.post("/api/admin/respostas", exigeAdmin, async (req, res) => {
  return res
    .status(403)
    .json({ mensagem: "Criacao manual de respostas desabilitada." });
});

app.put("/api/admin/respostas/:id", exigeAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      nome,
      curso,
      email,
      preferencia,
      risco,
      atitudes,
      abrilVerde,
      responsabilidade,
    } = req.body;
    const cursoFinal = curso || email;

    if (!Number.isFinite(id)) {
      return res.status(400).json({ mensagem: "ID invalido." });
    }

    const erroValidacao = validarRespostaEntrada(
      nome,
      cursoFinal,
      risco,
      atitudes,
      abrilVerde,
      responsabilidade,
    );
    if (erroValidacao) {
      return res.status(400).json({ mensagem: erroValidacao });
    }

    const registro = await atualizarResposta(id, {
      nome,
      curso: cursoFinal,
      email,
      preferencia,
      risco,
      atitudes,
      abrilVerde,
      responsabilidade,
    });

    if (!registro) {
      return res.status(404).json({ mensagem: "Resposta nao encontrada." });
    }

    return res.json({ mensagem: "Resposta atualizada com sucesso.", registro });
  } catch (erro) {
    console.error("[PUT /api/admin/respostas/:id] Erro:", erro.message);
    return res
      .status(500)
      .json({ mensagem: "Erro interno ao atualizar resposta." });
  }
});

app.delete("/api/admin/respostas/:id", exigeAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isFinite(id)) {
      return res.status(400).json({ mensagem: "ID invalido." });
    }

    const excluiu = await excluirResposta(id);

    if (!excluiu) {
      return res.status(404).json({ mensagem: "Resposta nao encontrada." });
    }

    return res.json({ mensagem: "Resposta excluida com sucesso." });
  } catch (erro) {
    console.error("[DELETE /api/admin/respostas/:id] Erro:", erro.message);
    return res
      .status(500)
      .json({ mensagem: "Erro interno ao excluir resposta." });
  }
});

app.post("/api/login", (req, res) => {
  const { senha } = req.body;

  if (!senha) {
    return res.status(400).json({ mensagem: "Informe a senha." });
  }

  if (senha !== ADMIN_PASSWORD) {
    return res.status(401).json({ mensagem: "Senha invalida." });
  }

  req.session.isAdmin = true;
  return res.json({ mensagem: "Login realizado." });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ mensagem: "Logout realizado." });
  });
});

app.get("/api/me", (req, res) => {
  return res.json({ autenticado: Boolean(req.session && req.session.isAdmin) });
});

app.get("/api/respostas", exigeAdmin, async (req, res) => {
  try {
    const respostas = await listarRespostas();
    return res.json({ total: respostas.length, respostas });
  } catch (erro) {
    console.error("[GET /api/respostas] Erro:", erro.message);
    return res
      .status(500)
      .json({ mensagem: "Erro interno ao listar respostas." });
  }
});

inicializarArmazenamento().then(() => {
  app.listen(PORT, () => {
    const modoPersistencia = useDatabase ? "postgres" : "json-local";
    console.log(
      `Servidor rodando na porta ${PORT} (${NODE_ENV}) - persistencia: ${modoPersistencia}`,
    );
  });
});
