// Основной скрипт для ЕНТ тренажера

document.addEventListener("DOMContentLoaded", () => {
    initRegistry();
});

let currentVariantData = null;
let userAnswers = {};

async function initRegistry() {
    const appContainer = document.getElementById("app") || document.body;
    
    // Проверяем наличие файла registry.js (предполагается, что он подключается в index.html)
    if (typeof SUBJECTS_REGISTRY === 'undefined') {
        console.error("Реестр предметов не найден!");
        return;
    }

    renderSubjectSelection();
}

function renderSubjectSelection() {
    const container = document.getElementById("test-container") || createMainContainer();
    container.innerHTML = `
        <h1 style="text-align: center; margin-bottom: 20px;">ЕНТ Тренажер</h1>
        <p style="text-align: center; color: #666; margin-bottom: 30px;">Выберите предмет для прохождения тестирования</p>
        <div id="subjects-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;"></div>
    `;

    const grid = document.getElementById("subjects-grid");
    
    SUBJECTS_REGISTRY.forEach(subject => {
        const card = document.createElement("div");
        card.className = "subject-card";
        card.style.cssText = "background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 8px; cursor: pointer; transition: 0.2s;";
        card.innerHTML = `
            <h3>${subject.name}</h3>
            <p style="color: #888; font-size: 14px; margin-top: 5px;">Папка: ${subject.folder}</p>
        `;
        card.onclick = () => loadVariantsList(subject);
        grid.appendChild(card);
    });
}

async function loadVariantsList(subject) {
    const container = document.getElementById("test-container");
    container.innerHTML = `<h2>${subject.name}</h2><p>Поиск доступных вариантов...</p>`;

    let availableVariants = [];
    
    // Автоматическая проверка вариантов от v1 до v10 через HEAD запросы
    for (let i = 1; i <= 10; i++) {
        const path = `${subject.folder}/v${i}.json`;
        try {
            const response = await fetch(path, { method: 'HEAD' });
            if (response.ok) {
                availableVariants.push(i);
            }
        } catch (e) {
            // Файл не найден или ошибка сети
        }
    }

    if (availableVariants.length === 0) {
        container.innerHTML = `
            <h2>${subject.name}</h2>
            <p style="color: #d93025; margin-top: 20px;">Для этого предмета пока не добавлено ни одного варианта (создайте папку ${subject.folder} и файл v1.json).</p>
            <button onclick="renderSubjectSelection()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">Назад к списку</button>
        `;
        return;
    }

    let variantsHtml = availableVariants.map(v => `
        <button onclick="startTest('${subject.folder}', ${v})" style="padding: 15px 25px; font-size: 16px; cursor: pointer; background: #1a73e8; color: white; border: none; border-radius: 6px;">
            Вариант ${v}
        >ого</button>
    `).join('');

    container.innerHTML = `
        <h2>${subject.name}</h2>
        <p style="margin-bottom: 20px;">Выберите вариант для прохождения:</p>
        <div style="display: flex; gap: 15px; flex-wrap: wrap;">${variantsHtml}</div>
        <br><br>
        <button onclick="renderSubjectSelection()" style="padding: 10px 15px; cursor: pointer;">← Назад к предметам</button>
    `;
}

async function startTest(folder, variantNum) {
    const container = document.getElementById("test-container");
    container.innerHTML = `<p>Загрузка вариантов вопросов...</p>`;

    try {
        const response = await fetch(`${folder}/v${variantNum}.json`);
        if (!response.ok) throw new Error("Не удалось загрузить файл варианта");
        
        currentVariantData = await response.json();
        userAnswers = {};
        renderTestInterface();
    } catch (error) {
        container.innerHTML = `<p style="color: red;">Ошибка загрузки: ${error.message}</p><button onclick="renderSubjectSelection()">Назад</button>`;
    }
}

function renderTestInterface() {
    const container = document.getElementById("test-container");
    let html = `<h2>Вариант №${currentVariantData.variant}</h2><form id="test-form">`;

    currentVariantData.questions.forEach((q, index) => {
        let optionsHtml = q.options.map((opt, oIndex) => `
            <label style="display: block; margin: 8px 0; cursor: pointer;">
                <input type="radio" name="q_${q.id}" value="${oIndex}" onchange="saveAnswer(${q.id}, ${oIndex})">
                ${opt}
            </label>
        `).join('');

        html += `
            <div class="question-block" style="background: #fff; border: 1px solid #e0e0e0; padding: 20px; margin-bottom: 20px; border-radius: 8px;">
                <p><strong>Вопрос ${index + 1}</strong> <span style="font-size: 12px; color: #666;">(${q.maxPoints || 1} балл)</span>: ${q.text}</p>
                <div style="margin-top: 10px;">${optionsHtml}</div>
            </div>
        `;
    });

    html += `
        <button type="button" onclick="finishTest()" style="padding: 12px 25px; background: #34a853; color: white; border: none; font-size: 16px; border-radius: 6px; cursor: pointer;">
            Завершить тест и проверить
        </button>
    </form>`;

    container.innerHTML = html;
}

function saveAnswer(questionId, optionIndex) {
    userAnswers[questionId] = optionIndex;
}

function finishTest() {
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

        const userChoiceText = userAnswer !== undefined ? q.options[userAnswer] : 'Нет ответа';
        const correctChoiceText = q.options[q.correct];

        resultsHtml += `
            <div style="margin-bottom: 20px; padding: 15px; border-radius: 8px; background: ${isCorrect ? '#e6f4ea' : '#fce8e6'}; border: 1px solid ${isCorrect ? '#ceead6' : '#fadcbc'};">
                <p><strong>Вопрос ${index + 1}:</strong> ${q.text}</p>
                <p style="margin-top: 5px;">Ваш ответ: <span style="font-weight: 500;">${userChoiceText}</span></p>
                <p>Правильный ответ: <strong style="color: #137333;">${correctChoiceText}</strong></p>
                <div style="margin-top: 10px; padding: 10px; background: #fff; border-left: 4px solid ${isCorrect ? '#34a853' : '#ea4335'}; border-radius: 4px;">
                    <strong>Разбор / Объяснение:</strong> ${q.explanation || 'Объяснение к этому вопросу отсутствует.'}
                </div>
            </div>
        `;
    });

    const container = document.getElementById("test-container");
    container.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; background: #f8f9fa; padding: 25px; border-radius: 8px;">
            <h2>Итоги тестирования</h2>
            <p style="font-size: 28px; font-weight: bold; color: #1a73e8; margin-top: 10px;">Набрано баллов: ${score} из ${totalMaxPoints}</p>
        </div>
        <h3>Разбор вопросов:</h3>
        ${resultsHtml}
        <br>
        <button onclick="renderSubjectSelection()" style="padding: 12px 25px; background: #1a73e8; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
            Вернуться к выбору предметов
        </button>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function createMainContainer() {
    const div = document.createElement("div");
    div.id = "test-container";
    div.style.cssText = "max-width: 800px; margin: 30px auto; padding: 20px; font-family: sans-serif;";
    document.body.appendChild(div);
    return div;
}