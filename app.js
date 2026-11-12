document.addEventListener("DOMContentLoaded", () => {
    if (typeof SUBJECTS_REGISTRY === 'undefined') {
        document.getElementById("test-container").innerHTML = `<p style="color: red;">Ошибка: не найден файл реестра (registry.js)!</p>`;
        return;
    }
    renderSubjectSelection();
});

let currentVariantData = null;
let userAnswers = {};

function renderSubjectSelection() {
    const container = document.getElementById("test-container");
    
    let gridHtml = SUBJECTS_REGISTRY.map(subject => `
        <div class="subject-card" onclick="loadVariantsList('${subject.folder}', '${subject.name}')">
            <h3 style="margin: 0 0 8px 0; color: #1a73e8;">${subject.name}</h3>
            <p style="margin: 0; color: #5f6368; font-size: 13px;">Папка: <code>${subject.folder}</code></p>
        </div>
    `).join('');

    container.innerHTML = `
        <h1 style="text-align: center; margin-bottom: 5px;">ЕНТ Тренажер</h1>
        <p style="text-align: center; color: #5f6368; margin-bottom: 30px;">Выберите учебный предмет для прохождения тестирования</p>
        <div class="subject-grid">${gridHtml}</div>
    `;
}

async function loadVariantsList(folder, subjectName) {
    const container = document.getElementById("test-container");
    container.innerHTML = `<h2>${subjectName}</h2><p>Поиск доступных вариантов в папке <code>${folder}</code>...</p>`;

    let availableVariants = [];

    // Проверяем наличие вариантов от 1 до 10 через HEAD запросы
    for (let i = 1; i <= 10; i++) {
        try {
            const response = await fetch(`${folder}/v${i}.json`, { method: 'HEAD' });
            if (response.ok) {
                availableVariants.push(i);
            }
        } catch (e) {
            // Игнорируем ошибки сети/отсутствия файла
        }
    }

    if (availableVariants.length === 0) {
        container.innerHTML = `
            <h2>${subjectName}</h2>
            <p style="color: #ea4335; margin: 20px 0;">Для этого предмета пока не найдено ни одного файла вариантов (ожидается <code>v1.json</code> в папке <code>${folder}</code>).</p>
            <button class="btn-secondary" onclick="renderSubjectSelection()">← Назад к выбору предметов</button>
        `;
        return;
    }

    let buttonsHtml = availableVariants.map(v => `
        <button class="btn-primary" onclick="startTest('${folder}', ${v}, '${subjectName}')" style="margin: 5px;">
            Вариант ${v}
        </button>
    `).join('');

    container.innerHTML = `
        <h2>${subjectName}</h2>
        <p style="margin-bottom: 20px; color: #5f6368;">Выберите нужный вариант теста:</p>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">${buttonsHtml}</div>
        <br><br>
        <button class="btn-secondary" onclick="renderSubjectSelection()">← Назад к выбору предметов</button>
    `;
}

async function startTest(folder, variantNum, subjectName) {
    const container = document.getElementById("test-container");
    container.innerHTML = `<p>Загрузка вопросов варианта ${variantNum}...</p>`;

    try {
        const response = await fetch(`${folder}/v${variantNum}.json`);
        if (!response.ok) throw new Error("Не удалось загрузить файл варианта.");
        
        currentVariantData = await response.json();
        userAnswers = {};
        renderTestInterface(subjectName);
    } catch (error) {
        container.innerHTML = `
            <p style="color: #ea4335;">Ошибка загрузки: ${error.message}</p>
            <button class="btn-secondary" onclick="renderSubjectSelection()">Назад</button>
        `;
    }
}

function renderTestInterface(subjectName) {
    const container = document.getElementById("test-container");
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #dadce0; padding-bottom: 15px; margin-bottom: 20px;">
            <h2 style="margin: 0;">${subjectName} (Вариант №${currentVariantData.variant})</h2>
            <button class="btn-secondary" onclick="renderSubjectSelection()">Выйти из теста</button>
        </div>
        <form id="test-form">
    `;

    currentVariantData.questions.forEach((q, index) => {
        let optionsHtml = q.options.map((opt, oIndex) => `
            <label class="option-label">
                <input type="radio" name="q_${q.id}" value="${oIndex}" onchange="saveAnswer(${q.id}, ${oIndex})">
                <span>${opt}</span>
            </label>
        `).join('');

        html += `
            <div class="question-block">
                <p style="margin-top: 0; font-size: 16px;"><strong>Вопрос ${index + 1}</strong> <span style="font-size: 12px; color: #5f6368; float: right;">[ Вес: ${q.maxPoints || 1} балл(а) ]</span></p>
                <p style="font-weight: 500; margin-bottom: 15px;">${q.text}</p>
                <div>${optionsHtml}</div>
            </div>
        `;
    });

    html += `
        <div style="text-align: center; margin-top: 30px;">
            <button type="button" class="btn-success" onclick="finishTest('${subjectName}')">Завершить тест и проверить</button>
        </div>
        </form>
    `;

    container.innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function saveAnswer(questionId, optionIndex) {
    userAnswers[questionId] = optionIndex;
}

function finishTest(subjectName) {
    let score = 0;
    let totalMaxPoints = 0;
    let resultsHtml = '';

    currentVariantData.questions.forEach((q, index) => {
        const userAnswer = userAnswers[q.id];
        const isCorrect = userAnswer === q.correct;
        const maxPts = q.maxPoints || 1;
        
        totalMaxPoints += maxPts;
        if (isCorrect) {
            score += maxPts;
        }

        const userChoiceText = userAnswer !== undefined ? q.options[userAnswer] : 'Ответ не дан';
        const correctChoiceText = q.options[q.correct];

        resultsHtml += `
            <div class="result-card ${isCorrect ? 'correct' : 'incorrect'}">
                <p style="margin-top: 0;"><strong>Вопрос ${index + 1}:</strong> ${q.text}</p>
                <p style="margin: 5px 0;">Ваш ответ: <strong>${userChoiceText}</strong></p>
                <p style="margin: 5px 0;">Правильный ответ: <strong style="color: #137333;">${correctChoiceText}</strong></p>
                <div class="explanation-box">
                    <strong>Разбор и объяснение:</strong> ${q.explanation || 'Объяснение к этому вопросу отсутствует.'}
                </div>
            </div>
        `;
    });

    const container = document.getElementById("test-container");
    container.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; background: #f1f3f4; padding: 25px; border-radius: 8px;">
            <h2 style="margin: 0 0 10px 0;">Результаты тестирования</h2>
            <p style="font-size: 24px; font-weight: bold; color: var(--primary-color); margin: 0;">${subjectName} — Вариант ${currentVariantData.variant}</p>
            <p style="font-size: 28px; font-weight: bold; margin: 15px 0 0 0;">Набрано баллов: ${score} из ${totalMaxPoints}</p>
        </div>
        
        <h3>Подробный разбор заданий:</h3>
        ${resultsHtml}
        
        <div style="text-align: center; margin-top: 30px;">
            <button class="btn-primary" onclick="renderSubjectSelection()">Вернуться к выбору предметов</button>
        </div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}