// Senha do painel de modificação
const SENHA = "saitamareidoscalvo";

// Chave usada para salvar os dados no navegador
const CHAVE = "torneio-dados";

// Turmas de cada tabela
const GRUPOS = {
  fund2: {
    turmas: [
      "6º Ano – Turma 1",
      "6º Ano – Turma 2",
      "7º Ano – Turma 1",
      "7º Ano – Turma 2",
      "8º Ano – Turma 1",
      "8º Ano – Turma 2",
    ],
  },
  medio: {
    turmas: [
      "9º Ano – Turma 1",
      "9º Ano – Turma 2",
      "1º Ano – Turma 1",
      "1º Ano – Turma 2",
      "2º Ano – Turma 1",
      "2º Ano – Turma 2",
      "3º Ano – Turma 1",
      "3º Ano – Turma 2",
    ],
  },
};

// Modalidades. Cada uma tem sua própria lista de jogadores.
const MODALIDADES = {
  futebol: {
    pontos: "Gols",
    unidade: "gols",
    destaque: "Artilheiro",
    jogadores: [],
  },
  volei: {
    pontos: "Pontos",
    unidade: "pontos",
    destaque: "Maior pontuador",
    jogadores: [],
  },
};

let modalidadeAtiva = "futebol";
let proximoId = 1;
let modoEdicao = false;

const abas = document.querySelector(".abas");
const areaTabelas = document.getElementById("area-tabelas");
const tbodies = {
  fund2: document.querySelector('tbody[data-grupo="fund2"]'),
  medio: document.querySelector('tbody[data-grupo="medio"]'),
};
const dica = document.getElementById("dica");

const btnPainel = document.getElementById("btn-painel");
const bloqueio = document.getElementById("bloqueio");
const formSenha = document.getElementById("form-senha");
const campoSenha = document.getElementById("campo-senha");
const erroSenha = document.getElementById("erro-senha");
const btnCancelar = document.getElementById("btn-cancelar");

// ---------- Armazenamento ----------

function todosJogadores() {
  return Object.values(MODALIDADES).flatMap((m) => m.jogadores);
}

function salvarDados() {
  try {
    localStorage.setItem(
      CHAVE,
      JSON.stringify({
        modalidades: {
          futebol: MODALIDADES.futebol.jogadores,
          volei: MODALIDADES.volei.jogadores,
        },
      })
    );
  } catch (e) {
    console.error("Não foi possível salvar os dados:", e);
  }
}

function carregarDados() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE));
    if (!salvo || !salvo.modalidades) return false;

    Object.keys(MODALIDADES).forEach((m) => {
      MODALIDADES[m].jogadores = Array.isArray(salvo.modalidades[m])
        ? salvo.modalidades[m]
        : [];
    });

    proximoId = Math.max(0, ...todosJogadores().map((j) => j.id)) + 1;
    return true;
  } catch (e) {
    return false;
  }
}

// ---------- Jogadores ----------

function jogadoresAtivos() {
  return MODALIDADES[modalidadeAtiva].jogadores;
}

function novoJogador(grupo) {
  return {
    id: proximoId++,
    nome: "",
    turma: GRUPOS[grupo].turmas[0],
    grupo,
    pontos: 0,
    assist: 0,
  };
}

function encontrarJogador(tr) {
  return jogadoresAtivos().find((j) => j.id === Number(tr.dataset.id));
}

// ---------- Criação dos elementos ----------

function celula(conteudo) {
  const td = document.createElement("td");
  if (conteudo instanceof Node) {
    td.appendChild(conteudo);
  } else {
    td.textContent = conteudo;
  }
  return td;
}

function criarBotaoContador(texto, campo, delta, rotulo) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.textContent = texto;
  botao.dataset.campo = campo;
  botao.dataset.delta = delta;
  botao.setAttribute("aria-label", rotulo);
  return botao;
}

function criarContador(campo, valor, rotulo) {
  const div = document.createElement("div");
  div.className = "contador";

  const numero = document.createElement("span");
  numero.className = "num";
  numero.dataset.campo = campo;
  numero.textContent = valor;

  div.append(
    criarBotaoContador("−", campo, -1, `Diminuir ${rotulo}`),
    numero,
    criarBotaoContador("+", campo, 1, `Aumentar ${rotulo}`)
  );
  return div;
}

function criarLinha(j) {
  const unidade = MODALIDADES[modalidadeAtiva].unidade;
  const tr = document.createElement("tr");
  tr.dataset.id = j.id;

  // Modo público: somente texto
  if (!modoEdicao) {
    tr.append(
      celula(j.nome.trim() || "Sem nome"),
      celula(j.turma),
      celula(String(j.pontos)),
      celula(String(j.assist))
    );
    return tr;
  }

  // Modo painel: campos editáveis
  const inputNome = document.createElement("input");
  inputNome.type = "text";
  inputNome.className = "campo-nome";
  inputNome.placeholder = "Nome do jogador";
  inputNome.setAttribute("aria-label", "Nome do jogador");
  inputNome.value = j.nome;

  const select = document.createElement("select");
  select.className = "campo-turma";
  select.setAttribute("aria-label", "Turma");
  GRUPOS[j.grupo].turmas.forEach((t) => {
    const opcao = document.createElement("option");
    opcao.textContent = t;
    opcao.selected = t === j.turma;
    select.appendChild(opcao);
  });

  const remover = document.createElement("button");
  remover.type = "button";
  remover.className = "remover";
  remover.textContent = "✕";
  remover.setAttribute("aria-label", "Remover jogador");

  tr.append(
    celula(inputNome),
    celula(select),
    celula(criarContador("pontos", j.pontos, unidade)),
    celula(criarContador("assist", j.assist, "assistências")),
    celula(remover)
  );
  return tr;
}

// ---------- Renderização ----------

// Redesenha tabelas, cabeçalhos e textos conforme a modalidade e o modo
function renderizar() {
  const mod = MODALIDADES[modalidadeAtiva];
  const colunas = modoEdicao ? 5 : 4;

  Object.keys(tbodies).forEach((grupo) => {
    const tbody = tbodies[grupo];
    tbody.innerHTML = "";

    const doGrupo = jogadoresAtivos().filter((j) => j.grupo === grupo);
    if (doGrupo.length === 0) {
      const tr = document.createElement("tr");
      const td = celula("Nenhum jogador cadastrado.");
      td.colSpan = colunas;
      td.className = "vazio";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    doGrupo.forEach((j) => tbody.appendChild(criarLinha(j)));
  });

  document.querySelectorAll(".cabecalho-pontos").forEach((th) => (th.textContent = mod.pontos));
  document.getElementById("rotulo-destaque-pontos").textContent = mod.destaque;
  document.getElementById("unidade-pontos").textContent = mod.unidade;

  document.querySelectorAll(".aba").forEach((aba) => {
    aba.setAttribute("aria-selected", aba.dataset.modalidade === modalidadeAtiva);
  });

  document.body.classList.toggle("modo-edicao", modoEdicao);
  btnPainel.textContent = modoEdicao ? "Sair do painel" : "Painel de modificação";
  dica.textContent = modoEdicao
    ? "Digite o nome, escolha a turma e use + e − para ajustar os números. As alterações são salvas automaticamente."
    : "Esta página é somente leitura. Use o painel de modificação para editar os dados.";

  atualizarDestaques();
}

// ---------- Destaques ----------

// Retorna o(s) jogador(es) com o maior valor no campo informado
function lider(campo) {
  const maximo = Math.max(0, ...jogadoresAtivos().map((j) => j[campo]));
  if (maximo === 0) return { nomes: "—", valor: 0 };

  const nomes = jogadoresAtivos()
    .filter((j) => j[campo] === maximo)
    .map((j) => j.nome.trim() || "Sem nome")
    .join(" / ");

  return { nomes, valor: maximo };
}

function atualizarDestaques() {
  const pontos = lider("pontos");
  document.getElementById("destaque-pontos-nome").textContent = pontos.nomes;
  document.getElementById("destaque-pontos-valor").textContent = pontos.valor;

  const assistencias = lider("assist");
  document.getElementById("destaque-assist-nome").textContent = assistencias.nomes;
  document.getElementById("destaque-assist-valor").textContent = assistencias.valor;
}

// Chamada a cada alteração feita no painel: atualiza a tela e salva
function alterou() {
  salvarDados();
  atualizarDestaques();
}

// ---------- Senha e modo de edição ----------

function abrirBloqueio() {
  bloqueio.hidden = false;
  campoSenha.value = "";
  erroSenha.textContent = "";
  campoSenha.focus();
}

function fecharBloqueio() {
  bloqueio.hidden = true;
}

btnPainel.addEventListener("click", () => {
  if (modoEdicao) {
    modoEdicao = false;
    renderizar();
  } else {
    abrirBloqueio();
  }
});

btnCancelar.addEventListener("click", fecharBloqueio);

bloqueio.addEventListener("click", (e) => {
  if (e.target === bloqueio) fecharBloqueio();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !bloqueio.hidden) fecharBloqueio();
});

formSenha.addEventListener("submit", (e) => {
  e.preventDefault();

  if (campoSenha.value === SENHA) {
    modoEdicao = true;
    fecharBloqueio();
    renderizar();
  } else {
    erroSenha.textContent = "Senha incorreta. Tente novamente.";
    campoSenha.select();
  }
});

// ---------- Eventos das tabelas (somente no painel) ----------

// Troca de modalidade (visualização para todos)
abas.addEventListener("click", (e) => {
  const aba = e.target.closest(".aba");
  if (!aba) return;
  modalidadeAtiva = aba.dataset.modalidade;
  renderizar();
});

areaTabelas.addEventListener("click", (e) => {
  if (!modoEdicao) return;

  const adicionar = e.target.closest(".adicionar");
  if (adicionar) {
    const grupo = adicionar.dataset.grupo;
    const novo = novoJogador(grupo);
    jogadoresAtivos().push(novo);

    const tr = criarLinha(novo);
    tbodies[grupo].appendChild(tr);
    tr.querySelector(".campo-nome").focus();
    alterou();
    return;
  }

  const botao = e.target.closest("button");
  if (!botao) return;

  const tr = botao.closest("tr");
  if (!tr) return;
  const jogador = encontrarJogador(tr);

  if (botao.classList.contains("remover")) {
    jogadoresAtivos().splice(jogadoresAtivos().indexOf(jogador), 1);
    tr.remove();
    alterou();
    return;
  }

  const campo = botao.dataset.campo;
  if (!campo) return;

  jogador[campo] = Math.max(0, jogador[campo] + Number(botao.dataset.delta));
  tr.querySelector(`.num[data-campo="${campo}"]`).textContent = jogador[campo];
  alterou();
});

areaTabelas.addEventListener("input", (e) => {
  if (!modoEdicao || !e.target.matches(".campo-nome")) return;
  encontrarJogador(e.target.closest("tr")).nome = e.target.value;
  alterou();
});

areaTabelas.addEventListener("change", (e) => {
  if (!modoEdicao || !e.target.matches(".campo-turma")) return;
  encontrarJogador(e.target.closest("tr")).turma = e.target.value;
  alterou();
});

// Atualiza a visualização quando os dados mudam em outra aba do mesmo navegador
window.addEventListener("storage", (e) => {
  if (e.key !== CHAVE || modoEdicao) return;
  carregarDados();
  renderizar();
});

// ---------- Início ----------

if (!carregarDados()) {
  ["futebol", "volei"].forEach((m) => {
    MODALIDADES[m].jogadores.push(novoJogador("fund2"), novoJogador("medio"));
  });
  salvarDados();
}

renderizar();


// Link vindo de outra página (index.html#painel) abre direto a janela de senha
if (window.location.hash === "#painel") {
  abrirBloqueio();
}