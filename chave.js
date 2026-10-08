// Chaveamento compartilhado entre o painel (index.html) e a página do chaveamento.
// Fica dentro de uma função para não misturar nomes com o script.js.
(() => {
  const CHAVE_KEY = "torneio-chave";

  // Estado inicial: três jogos da primeira fase, sem resultado
  const PADRAO = {
    jogos: [
      { a: "2º ANO", b: "9º ANO 1", v: null },
      { a: "3º ANO", b: "1º ANO 1", v: null },
      { a: "9º ANO 2", b: "1º ANO 2", v: null },
    ],
    semi1: null,
    final: null,
  };

  // Texto exibido enquanto a vaga ainda não tem time
  const PLACEHOLDER = {
    s1a: "Vencedor do jogo 1",
    s1b: "Vencedor do jogo 2",
    s2a: "Vencedor do jogo 3",
    fa: "Vencedor da semifinal 1",
    fb: "Vencedor da semifinal 2",
  };

  const copia = (obj) => JSON.parse(JSON.stringify(obj));

  let estado = carregar();
  let editorEl = document.getElementById("secao-chave");

  function carregar() {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_KEY));

      // Formato antigo: lista só com os nomes dos times
      if (Array.isArray(salvo) && salvo.length === 3) {
        const base = copia(PADRAO);
        base.jogos = salvo.map((j) => ({ a: j.a, b: j.b, v: null }));
        return base;
      }

      if (salvo && Array.isArray(salvo.jogos) && salvo.jogos.length === 3) return salvo;
    } catch (e) {
      // Sem dados válidos: usa o padrão
    }
    return copia(PADRAO);
  }

  function salvar() {
    try {
      localStorage.setItem(CHAVE_KEY, JSON.stringify(estado));
    } catch (e) {
      console.error("Não foi possível salvar o chaveamento:", e);
    }
  }

  const emEdicao = () => document.body.classList.contains("modo-edicao");

  // Calcula quem venceu, quem perdeu e quem chegou a cada fase
  function resolver() {
    const j = estado.jogos;
    const venc = j.map((x) => (x.v === "a" ? x.a : x.v === "b" ? x.b : null));
    const perd = j.map((x) => (x.v === "a" ? x.b : x.v === "b" ? x.a : null));

    // Semifinal 1: vencedor do jogo 1 x vencedor do jogo 2
    const sf1Pronta = Boolean(venc[0] && venc[1]);
    const sf1Venc = sf1Pronta && estado.semi1 ? (estado.semi1 === "a" ? venc[0] : venc[1]) : null;
    const sf1Perd = sf1Venc ? (estado.semi1 === "a" ? venc[1] : venc[0]) : null;

    // Semifinal 2: só o vencedor do jogo 3, que passa direto (venc[2])
    // Final: vencedor da semifinal 1 x vencedor da semifinal 2
    const finalPronta = Boolean(sf1Venc && venc[2]);
    const campeao = finalPronta && estado.final ? (estado.final === "a" ? sf1Venc : venc[2]) : null;
    const finalPerd = campeao ? (estado.final === "a" ? venc[2] : sf1Venc) : null;

    const eliminados = [...perd, sf1Perd, finalPerd].filter(Boolean);

    return { venc, sf1Pronta, sf1Venc, finalPronta, campeao, eliminados };
  }

  // Classe de cada vaga: passou, eliminado ou vazia
  function statusVaga(decisao, lado, pronta) {
    if (!pronta || !decisao) return "";
    return decisao === lado ? "passou" : "eliminado";
  }

  // Nome e situação de cada vaga do chaveamento
  function montarVagas() {
    const r = resolver();
    const jogos = estado.jogos;
    const vagas = {};

    jogos.forEach((jogo, i) => {
      const n = i + 1;
      vagas[`j${n}a`] = { nome: jogo.a || "—", st: statusVaga(jogo.v, "a", true) };
      vagas[`j${n}b`] = { nome: jogo.b || "—", st: statusVaga(jogo.v, "b", true) };
    });

    vagas.s1a = { nome: r.venc[0] || PLACEHOLDER.s1a, st: statusVaga(estado.semi1, "a", r.sf1Pronta) };
    vagas.s1b = { nome: r.venc[1] || PLACEHOLDER.s1b, st: statusVaga(estado.semi1, "b", r.sf1Pronta) };
    vagas.s2a = { nome: r.venc[2] || PLACEHOLDER.s2a, st: r.venc[2] ? "passou" : "" };
    vagas.fa = { nome: r.sf1Venc || PLACEHOLDER.fa, st: statusVaga(estado.final, "a", r.finalPronta) };
    vagas.fb = { nome: r.venc[2] || PLACEHOLDER.fb, st: statusVaga(estado.final, "b", r.finalPronta) };

    return vagas;
  }

  // Marca os botões de escolha de acordo com o estado salvo
  function marcarEscolhas() {
    const escolhas = {
      "v-j1": estado.jogos[0].v,
      "v-j2": estado.jogos[1].v,
      "v-j3": estado.jogos[2].v,
      "v-s1": estado.semi1,
      "v-final": estado.final,
    };

    Object.entries(escolhas).forEach(([grupo, valor]) => {
      document.querySelectorAll(`input[name="${grupo}"]`).forEach((input) => {
        input.checked = input.value === (valor || "");
      });
    });
  }

  // Atualiza toda a tela: páginas públicas, rótulos do painel e eliminados
  function atualizar() {
    const vagas = montarVagas();
    const r = resolver();

    document.querySelectorAll("[data-slot]").forEach((el) => {
      const vaga = vagas[el.dataset.slot];
      el.textContent = vaga.nome;
      el.classList.remove("passou", "eliminado");
      if (vaga.st) el.classList.add(vaga.st);
    });

    document.querySelectorAll("[data-rotulo]").forEach((el) => {
      el.textContent = vagas[el.dataset.rotulo].nome;
    });

    document.querySelectorAll("[data-campeao]").forEach((el) => {
      el.textContent = r.campeao || "Vencedor da final";
    });

    document.querySelectorAll("[data-lista-eliminados]").forEach((ul) => {
      ul.replaceChildren();
      if (r.eliminados.length === 0) {
        const li = document.createElement("li");
        li.textContent = "Nenhum eliminado ainda.";
        ul.appendChild(li);
        return;
      }
      r.eliminados.forEach((nome) => {
        const li = document.createElement("li");
        li.textContent = nome;
        ul.appendChild(li);
      });
    });

    marcarEscolhas();
  }

  function alterou() {
    salvar();
    atualizar();
  }

  // ---------- Painel de edição ----------

  function radios(grupo, slotA, slotB) {
    return `
      <label class="escolha"><input type="radio" name="${grupo}" value="a"> <span data-rotulo="${slotA}"></span></label>
      <label class="escolha"><input type="radio" name="${grupo}" value="b"> <span data-rotulo="${slotB}"></span></label>
      <label class="escolha"><input type="radio" name="${grupo}" value=""> <span>Ainda não definido</span></label>`;
  }

  function nomesSugeridos() {
    return [...new Set(PADRAO.jogos.flatMap((j) => [j.a, j.b]))]
      .map((n) => `<option value="${n}"></option>`)
      .join("");
  }

  function montarEditor(container) {
    const jogosHTML = estado.jogos
      .map((_, i) => {
        const n = i + 1;
        return `
          <div class="bloco-jogo">
            <div class="jogo-edicao">
              <span class="partida-rotulo">Jogo ${n}</span>
              <input type="text" data-jogo="${i}" data-lado="a" list="lista-times" aria-label="Time A do jogo ${n}">
              <span class="x">x</span>
              <input type="text" data-jogo="${i}" data-lado="b" list="lista-times" aria-label="Time B do jogo ${n}">
            </div>
            <fieldset class="decisao">
              <legend>Quem passa do jogo ${n}?</legend>
              ${radios(`v-j${n}`, `j${n}a`, `j${n}b`)}
            </fieldset>
          </div>`;
      })
      .join("");

    container.innerHTML = `
      <h2>Chaveamento</h2>
      <p class="nota">Digite os times, marque quem passa em cada jogo, em cada semifinal e na final. Quem perde é marcado como eliminado, e as próximas fases se preenchem sozinhas.</p>

      <h3 class="subtitulo-fase">Primeira fase</h3>
      <div class="chave-edicao">${jogosHTML}</div>

      <h3 class="subtitulo-fase">Semifinal</h3>
      <div class="chave-edicao">
        <fieldset class="decisao">
          <legend>Quem passa da semifinal 1?</legend>
          ${radios("v-s1", "s1a", "s1b")}
        </fieldset>
        <p class="nota">A semifinal 2 tem só o vencedor do jogo 3, que passa direto.</p>
      </div>

      <h3 class="subtitulo-fase">Final</h3>
      <div class="chave-edicao">
        <fieldset class="decisao">
          <legend>Quem é o campeão?</legend>
          ${radios("v-final", "fa", "fb")}
        </fieldset>
      </div>

      <div class="eliminados-caixa">
        <h3>Eliminados</h3>
        <ul data-lista-eliminados></ul>
      </div>

      <datalist id="lista-times">${nomesSugeridos()}</datalist>`;

    container.addEventListener("input", (e) => {
      if (!emEdicao() || e.target.dataset.jogo === undefined) return;
      estado.jogos[Number(e.target.dataset.jogo)][e.target.dataset.lado] = e.target.value;
      alterou();
    });

    container.addEventListener("change", (e) => {
      if (!emEdicao() || e.target.type !== "radio") return;
      const valor = e.target.value || null;

      switch (e.target.name) {
        case "v-j1": estado.jogos[0].v = valor; break;
        case "v-j2": estado.jogos[1].v = valor; break;
        case "v-j3": estado.jogos[2].v = valor; break;
        case "v-s1": estado.semi1 = valor; break;
        case "v-final": estado.final = valor; break;
        default: return;
      }
      alterou();
    });
  }

  function preencherInputs() {
    if (!editorEl) return;
    editorEl.querySelectorAll("input[data-jogo]").forEach((input) => {
      const jogo = estado.jogos[Number(input.dataset.jogo)];
      input.value = jogo[input.dataset.lado] || "";
    });
  }

  // ---------- Início ----------

  if (editorEl) {
    montarEditor(editorEl);
    preencherInputs();
  }

  atualizar();

  // Atualiza ao vivo quando o chaveamento muda em outra aba do mesmo navegador
  window.addEventListener("storage", (e) => {
    if (e.key !== CHAVE_KEY) return;
    estado = carregar();
    if (!emEdicao()) preencherInputs();
    atualizar();
  });
})();