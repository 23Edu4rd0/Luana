const express = require('express');
const cors = require('cors');
const session = require('express-session');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'mude-este-segredo';
const respostasPath = path.join(__dirname, 'data', 'respostas.json');
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:43123',
  'http://127.0.0.1:43123'
];

app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
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
      maxAge: 1000 * 60 * 60 * 6
    }
  })
);

app.use(express.static(path.join(__dirname, 'public')));

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

    const registro = criarRegistro({ nome, email, preferencia });

    const respostas = await lerRespostas();
    respostas.push(registro);
    await salvarRespostas(respostas);

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

    const respostas = await lerRespostas();
    const registro = criarRegistro({ nome, email, preferencia });
    respostas.push(registro);
    await salvarRespostas(respostas);

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

    const respostas = await lerRespostas();
    const index = respostas.findIndex((item) => Number(item.id) === id);

    if (index === -1) {
      return res.status(404).json({ mensagem: 'Resposta nao encontrada.' });
    }

    respostas[index] = criarRegistro({
      id,
      nome,
      email,
      preferencia,
      criadoEm: respostas[index].criadoEm
    });

    await salvarRespostas(respostas);
    return res.json({ mensagem: 'Resposta atualizada com sucesso.', registro: respostas[index] });
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

    const respostas = await lerRespostas();
    const index = respostas.findIndex((item) => Number(item.id) === id);

    if (index === -1) {
      return res.status(404).json({ mensagem: 'Resposta nao encontrada.' });
    }

    respostas.splice(index, 1);
    await salvarRespostas(respostas);

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
    const respostas = await lerRespostas();
    return res.json({ total: respostas.length, respostas });
  } catch (erro) {
    return res.status(500).json({ mensagem: 'Erro interno ao listar respostas.' });
  }
});

garantirArquivoRespostas().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
});
