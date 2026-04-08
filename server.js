const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { Pool } = require('pg');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'mude-este-segredo';
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const DATABASE_URL = process.env.DATABASE_URL;
const useDatabase = Boolean(DATABASE_URL);
const dbSsl = process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false };
const db = useDatabase
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: dbSsl
    })
  : null;
const respostasPath = path.join(__dirname, 'data', 'respostas.json');
const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:43123',
  'http://127.0.0.1:43123'
];
const renderExternalUrl = process.env.RENDER_EXTERNAL_URL || '';

function normalizarOrigem(origin) {
  return String(origin || '').trim().replace(/\/$/, '');
}

const allowedOriginsFromEnv = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(normalizarOrigem)
  .filter(Boolean);
const allowedOrigins = Array.from(
  new Set([...defaultAllowedOrigins.map(normalizarOrigem), normalizarOrigem(renderExternalUrl), ...allowedOriginsFromEnv])
).filter(Boolean);

if (isProduction) {
  app.set('trust proxy', 1);
}

app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      const origemNormalizada = normalizarOrigem(origin);
      if (!origin || allowedOrigins.includes(origemNormalizada)) {
        return callback(null, true);
      }
      return callback(new Error('Origem nao permitida pelo CORS.'));
    },
    credentials: true
  })
);
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 6
    }
  })
);

app.use(express.static(path.join(__dirname, 'public')));

function normalizarRespostaEntrada({ nome, email, preferencia }) {
  return {
    nome: String(nome).trim(),
    email: String(email).trim().toLowerCase(),
    preferencia: String(preferencia).trim()
  };
}

async function garantirArquivoRespostas() {
  try {
    await fs.access(respostasPath);
  } catch {
    await fs.mkdir(path.dirname(respostasPath), { recursive: true });
    await fs.writeFile(respostasPath, '[]', 'utf8');
  }
}

async function lerRespostas() {
  await garantirArquivoRespostas();
  const conteudo = await fs.readFile(respostasPath, 'utf8');
  return JSON.parse(conteudo || '[]');
}

async function salvarRespostas(respostas) {
  await fs.writeFile(respostasPath, JSON.stringify(respostas, null, 2), 'utf8');
}

function mapearRegistroDb(row) {
  return {
    id: Number(row.id),
    nome: row.nome,
    email: row.email,
    preferencia: row.preferencia,
    criadoEm: new Date(row.criado_em).toISOString()
  };
}

async function inicializarArmazenamento() {
  if (!useDatabase) {
    await garantirArquivoRespostas();
    return;
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS respostas (
      id BIGSERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      preferencia TEXT NOT NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query('CREATE INDEX IF NOT EXISTS idx_respostas_criado_em ON respostas (criado_em DESC)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_respostas_email ON respostas (email)');
}

async function listarRespostas() {
  if (!useDatabase) {
    return lerRespostas();
  }

  const resultado = await db.query(
    'SELECT id, nome, email, preferencia, criado_em FROM respostas ORDER BY criado_em DESC'
  );
  return resultado.rows.map(mapearRegistroDb);
}

async function inserirResposta({ nome, email, preferencia }) {
  const entrada = normalizarRespostaEntrada({ nome, email, preferencia });

  if (!useDatabase) {
    const respostas = await lerRespostas();
    const registro = criarRegistro(entrada);
    respostas.push(registro);
    await salvarRespostas(respostas);
    return registro;
  }

  const resultado = await db.query(
    `INSERT INTO respostas (nome, email, preferencia)
     VALUES ($1, $2, $3)
     RETURNING id, nome, email, preferencia, criado_em`,
    [entrada.nome, entrada.email, entrada.preferencia]
  );

  return mapearRegistroDb(resultado.rows[0]);
}

async function atualizarResposta(id, { nome, email, preferencia }) {
  const entrada = normalizarRespostaEntrada({ nome, email, preferencia });

  if (!useDatabase) {
    const respostas = await lerRespostas();
    const index = respostas.findIndex((item) => Number(item.id) === id);

    if (index === -1) {
      return null;
    }

    respostas[index] = criarRegistro({
      id,
      nome: entrada.nome,
      email: entrada.email,
      preferencia: entrada.preferencia,
      criadoEm: respostas[index].criadoEm
    });

    await salvarRespostas(respostas);
    return respostas[index];
  }

  const resultado = await db.query(
    `UPDATE respostas
     SET nome = $1, email = $2, preferencia = $3
     WHERE id = $4
     RETURNING id, nome, email, preferencia, criado_em`,
    [entrada.nome, entrada.email, entrada.preferencia, id]
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

  const resultado = await db.query('DELETE FROM respostas WHERE id = $1', [id]);
  return resultado.rowCount > 0;
}

function validarRespostaEntrada(nome, email, preferencia) {
  if (!nome || !email || !preferencia) {
    return 'Preencha nome, email e preferencia.';
  }

  return null;
}

function criarRegistro({ id, nome, email, preferencia, criadoEm }) {
  return {
    id: id || Date.now(),
    nome: String(nome).trim(),
    email: String(email).trim().toLowerCase(),
    preferencia: String(preferencia).trim(),
    criadoEm: criadoEm || new Date().toISOString()
  };
}

function exigeAdmin(req, res, next) {
  if (!req.session || !req.session.isAdmin) {
    return res.status(401).json({ mensagem: 'Nao autorizado' });
  }
  next();
}

app.post('/api/respostas', async (req, res) => {
  try {
    const { nome, email, preferencia } = req.body;

    const erroValidacao = validarRespostaEntrada(nome, email, preferencia);
    if (erroValidacao) {
      return res.status(400).json({ mensagem: erroValidacao });
    }

    await inserirResposta({ nome, email, preferencia });

    return res.status(201).json({ mensagem: 'Resposta salva com sucesso.' });
  } catch (erro) {
    return res.status(500).json({ mensagem: 'Erro interno ao salvar resposta.' });
  }
});

app.post('/api/admin/respostas', exigeAdmin, async (req, res) => {
  try {
    const { nome, email, preferencia } = req.body;

    const erroValidacao = validarRespostaEntrada(nome, email, preferencia);
    if (erroValidacao) {
      return res.status(400).json({ mensagem: erroValidacao });
    }

    const registro = await inserirResposta({ nome, email, preferencia });

    return res.status(201).json({ mensagem: 'Resposta criada com sucesso.', registro });
  } catch (erro) {
    return res.status(500).json({ mensagem: 'Erro interno ao criar resposta.' });
  }
});

app.put('/api/admin/respostas/:id', exigeAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nome, email, preferencia } = req.body;

    if (!Number.isFinite(id)) {
      return res.status(400).json({ mensagem: 'ID invalido.' });
    }

    const erroValidacao = validarRespostaEntrada(nome, email, preferencia);
    if (erroValidacao) {
      return res.status(400).json({ mensagem: erroValidacao });
    }

    const registro = await atualizarResposta(id, { nome, email, preferencia });

    if (!registro) {
      return res.status(404).json({ mensagem: 'Resposta nao encontrada.' });
    }

    return res.json({ mensagem: 'Resposta atualizada com sucesso.', registro });
  } catch (erro) {
    return res.status(500).json({ mensagem: 'Erro interno ao atualizar resposta.' });
  }
});

app.delete('/api/admin/respostas/:id', exigeAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isFinite(id)) {
      return res.status(400).json({ mensagem: 'ID invalido.' });
    }

    const excluiu = await excluirResposta(id);

    if (!excluiu) {
      return res.status(404).json({ mensagem: 'Resposta nao encontrada.' });
    }

    return res.json({ mensagem: 'Resposta excluida com sucesso.' });
  } catch (erro) {
    return res.status(500).json({ mensagem: 'Erro interno ao excluir resposta.' });
  }
});

app.post('/api/login', (req, res) => {
  const { senha } = req.body;

  if (!senha) {
    return res.status(400).json({ mensagem: 'Informe a senha.' });
  }

  if (senha !== ADMIN_PASSWORD) {
    return res.status(401).json({ mensagem: 'Senha invalida.' });
  }

  req.session.isAdmin = true;
  return res.json({ mensagem: 'Login realizado.' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ mensagem: 'Logout realizado.' });
  });
});

app.get('/api/me', (req, res) => {
  return res.json({ autenticado: Boolean(req.session && req.session.isAdmin) });
});

app.get('/api/respostas', exigeAdmin, async (req, res) => {
  try {
    const respostas = await listarRespostas();
    return res.json({ total: respostas.length, respostas });
  } catch (erro) {
    return res.status(500).json({ mensagem: 'Erro interno ao listar respostas.' });
  }
});

inicializarArmazenamento().then(() => {
  app.listen(PORT, () => {
    const modoPersistencia = useDatabase ? 'postgres' : 'json-local';
    console.log(`Servidor rodando na porta ${PORT} (${NODE_ENV}) - persistencia: ${modoPersistencia}`);
  });
});
