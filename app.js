const state = {
  subject: null,
  variant: null,
  questions: [],
  userAnswers: {},
  submitted: false
};

function getSubjectById(id) {
  return SUBJECTS_REGISTRY.find((s) => s.id === id) || null;
}

function renderMath() {
  if (typeof renderMathInElement === "function") {
    renderMathInElement(document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false }
      ],
      throwOnError: false
    });
  }
}

function shuffleQuestionOptions(rawQuestions) {
  return rawQuestions.map((q) => {
    const indexed = q.options.map((text, idx) => ({
      text,
      isCorrect: idx === Number(q.correct)
    }));
    for (let i = indexed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = indexed[i];
      indexed[i] = indexed[j];
      indexed[j] = tmp;
    }
    const newCorrect = indexed.findIndex((item) => item.isCorrect);
    return {
      ...q,
      options: indexed.map((item) => item.text),
      correct: newCorrect >= 0 ? newCorrect : 0
    };
  });
}

function renderSubjects() {
  const app = document.getElementById("app");
  if (!app) return;
  state.subject = null;
  state.variant = null;
  state.questions = [];
  state.userAnswers = {};
  state.submitted = false;

  const cardsHtml = SUBJECTS_REGISTRY.map(
    (subj) => `
      <button type="button" class="subject-card" onclick="selectSubject('${subj.id}')">
        <div class="subject-title">${escapeHtml(subj.name)}</div>
        <div class="subject-meta">Вариантов: ${subj.variants.length} • Вопросов: ${subj.questionCount}</div>
      </button>
    `
  ).join("");

  app.innerHTML = `
    <section class="panel">
      <div class="version-badge">Версия 2.0 • Формат ЕНТ РК</div>
      <h2>Выберите предмет</h2>
      <p class="subtitle">Количество вопросов и система оценивания соответствуют спецификации НЦТ РК. Варианты ответов перемешиваются при каждом запуске.</p>
      <div class="subjects-grid">${cardsHtml}</div>
    </section>
  `;
}

function selectSubject(subjectId) {
  const subj = getSubjectById(subjectId);
  if (!subj) return;
  state.subject = subj;

  const app = document.getElementById("app");
  const buttonsHtml = subj.variants
    .map(
      (v) => `
      <button type="button" class="btn btn-primary" onclick="loadVariant('${subj.id}', ${v})">
        Вариант ${v}
      </button>
    `
    )
    .join("");

  app.innerHTML = `
    <section class="panel">
      <h2>${escapeHtml(subj.name)}</h2>
      <p class="subtitle">Выберите вариант теста (вопросов в варианте: ${subj.questionCount}):</p>
      <div class="variants-row">${buttonsHtml}</div>
      <div class="actions-row">
        <button type="button" class="btn btn-secondary" onclick="renderSubjects()">← Назад к выбору предметов</button>
      </div>
    </section>
  `;
}

async function loadVariant(subjectId, variantNum) {
  const subj = getSubjectById(subjectId);
  if (!subj) return;
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="panel">
      <p>Загрузка варианта ${variantNum} по предмету «${escapeHtml(subj.name)}»...</p>
    </section>
  `;

  try {
    const url = `./${subj.folder}/v${variantNum}.json?v=2.0&t=${Date.now()}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Файл не найден (HTTP ${response.status}). Убедитесь, что папка "${subj.folder}" загружена в корень репозитория.`);
    }
    const data = await response.json();
    if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
      throw new Error("Некорректная структура файла варианта.");
    }

    state.subject = subj;
    state.variant = variantNum;
    state.questions = shuffleQuestionOptions(data.questions);
    state.userAnswers = {};
    state.submitted = false;
    renderQuiz();
  } catch (err) {
    app.innerHTML = `
      <section class="panel">
        <p class="error-text">Ошибка загрузки: ${escapeHtml(err.message)}</p>
        <button type="button" class="btn btn-secondary" onclick="selectSubject('${subj.id}')">Назад</button>
      </section>
    `;
  }
}

function selectAnswer(questionIndex, optionIndex) {
  if (state.submitted) return;
  state.userAnswers[questionIndex] = optionIndex;
  const qCard = document.querySelector(`[data-q-index="${questionIndex}"]`);
  if (!qCard) return;
  const labels = qCard.querySelectorAll(".option-item");
  labels.forEach((lbl, idx) => {
    lbl.classList.toggle("selected", idx === optionIndex);
    const input = lbl.querySelector("input[type='radio']");
    if (input) input.checked = idx === optionIndex;
  });
  updateAnsweredCounter();
}

function updateAnsweredCounter() {
  const counterEl = document.getElementById("answered-counter");
  if (!counterEl) return;
  const answeredCount = Object.keys(state.userAnswers).length;
  counterEl.textContent = `Отвечено: ${answeredCount} из ${state.questions.length}`;
}

function renderQuiz() {
  const app = document.getElementById("app");
  const letters = ["A", "B", "C", "D", "E"];

  const questionsHtml = state.questions
    .map((q, qIdx) => {
      const selectedIdx = state.userAnswers[qIdx];
      const optionsHtml = q.options
        .map((optText, oIdx) => {
          const isChecked = selectedIdx === oIdx;
          const letter = letters[oIdx] || String(oIdx + 1);
          return `
            <label class="option-item ${isChecked ? "selected" : ""}">
              <input
                type="radio"
                name="q_${qIdx}"
                value="${oIdx}"
                ${isChecked ? "checked" : ""}
                onchange="selectAnswer(${qIdx}, ${oIdx})"
              />
              <span class="option-letter">${letter}.</span>
              <span class="option-text">${escapeHtml(optText)}</span>
            </label>
          `;
        })
        .join("");

      return `
        <article class="question-card" data-q-index="${qIdx}">
          <div class="question-header">
            <span class="question-num">Вопрос ${qIdx + 1} из ${state.questions.length}</span>
            <span class="question-topic">${escapeHtml(q.topic || "")}</span>
            <span class="question-pts">Баллов: ${q.maxPoints || 1}</span>
          </div>
          <div class="question-text">${escapeHtml(q.text)}</div>
          <div class="options-list">${optionsHtml}</div>
          <div class="explanation-box" id="exp_${qIdx}" style="display:none;"></div>
        </article>
      `;
    })
    .join("");

  app.innerHTML = `
    <section class="panel">
      <div class="quiz-topbar">
        <div>
          <h2>${escapeHtml(state.subject.name)} — Вариант ${state.variant}</h2>
          <p class="subtitle" id="answered-counter">Отвечено: 0 из ${state.questions.length}</p>
        </div>
        <button type="button" class="btn btn-secondary" onclick="selectSubject('${state.subject.id}')">К выбору варианта</button>
      </div>
      <div id="result-summary" class="result-summary" style="display:none;"></div>
      <div class="questions-container">${questionsHtml}</div>
      <div class="actions-row bottom-actions">
        <button type="button" id="submit-btn" class="btn btn-primary" onclick="checkQuiz()">Завершить и проверить тест</button>
        <button type="button" class="btn btn-secondary" onclick="renderSubjects()">К списку предметов</button>
      </div>
    </section>
  `;
  updateAnsweredCounter();
  renderMath();
}

function checkQuiz() {
  if (state.submitted) return;
  state.submitted = true;

  let earnedPoints = 0;
  let maxTotalPoints = 0;
  let correctCount = 0;
  const letters = ["A", "B", "C", "D", "E"];

  state.questions.forEach((q, qIdx) => {
    const qMax = Number(q.maxPoints) || 1;
    maxTotalPoints += qMax;
    const expectedIdx = Number(q.correct);
    const chosenIdx = Object.prototype.hasOwnProperty.call(state.userAnswers, qIdx)
      ? Number(state.userAnswers[qIdx])
      : -1;
    const isCorrect = chosenIdx === expectedIdx;

    if (isCorrect) {
      earnedPoints += qMax;
      correctCount += 1;
    }

    const qCard = document.querySelector(`[data-q-index="${qIdx}"]`);
    const optionItems = qCard ? qCard.querySelectorAll(".option-item") : [];
    optionItems.forEach((item, oIdx) => {
      const radio = item.querySelector("input[type='radio']");
      if (radio) radio.disabled = true;
      item.classList.remove("selected", "correct-option", "wrong-option");
      if (oIdx === expectedIdx) {
        item.classList.add("correct-option");
      }
      if (chosenIdx === oIdx && oIdx !== expectedIdx) {
        item.classList.add("wrong-option");
      }
    });

    const expBox = document.getElementById(`exp_${qIdx}`);
    if (expBox) {
      const expectedLetter = letters[expectedIdx] || String(expectedIdx + 1);
      const expectedText = q.options[expectedIdx] || "";
      const userStatus =
        chosenIdx === -1
          ? "Ответ не выбран."
          : isCorrect
          ? "Ваш ответ верный."
          : `Ваш ответ: ${letters[chosenIdx] || chosenIdx + 1}. ${q.options[chosenIdx] || ""}`;

      expBox.style.display = "block";
      expBox.className = `explanation-box ${isCorrect ? "exp-ok" : "exp-err"}`;
      expBox.innerHTML = `
        <div><strong>${escapeHtml(userStatus)}</strong></div>
        <div><strong>Правильный ответ:</strong> ${expectedLetter}. ${escapeHtml(expectedText)}</div>
        ${q.explanation ? `<div class="exp-text">${escapeHtml(q.explanation)}</div>` : ""}
      `;
    }
  });

  const summaryEl = document.getElementById("result-summary");
  if (summaryEl) {
    const pct = maxTotalPoints > 0 ? Math.round((earnedPoints / maxTotalPoints) * 100) : 0;
    summaryEl.style.display = "block";
    summaryEl.innerHTML = `
      <h3>Результат проверки</h3>
      <p>Правильных ответов: <strong>${correctCount} из ${state.questions.length}</strong></p>
      <p>Набрано баллов: <strong>${earnedPoints} из ${maxTotalPoints}</strong> (${pct}%)</p>
      <button type="button" class="btn btn-primary" onclick="loadVariant('${state.subject.id}', ${state.variant})">Пройти вариант заново</button>
    `;
    summaryEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Тест проверен";
  }
  renderMath();
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

window.addEventListener("DOMContentLoaded", renderSubjects);
