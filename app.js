document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app');
    
    let state = {
        selectedSubject: null,
        selectedVariant: null,
        questions: [],
        currentIndex: 0,
        userAnswers: {}
    };

    function renderHome() {
        appContainer.innerHTML = `
            <div class="max-w-4xl mx-auto p-6">
                <h1 class="text-3xl font-bold text-center mb-8 text-gray-800">ЕНТ Тренажер</h1>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${window.ENT_SUBJECTS.map(subj => `
                        <div data-id="${subj.id}" class="subject-card bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition cursor-pointer border border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 class="font-semibold text-lg text-gray-700">${subj.name}</h3>
                                <span class="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">${subj.type === 'mandatory' ? 'Обязательный' : 'Профильный'}</span>
                            </div>
                            <span class="text-gray-400">→</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.querySelectorAll('.subject-card').forEach(card => {
            card.addEventListener('click', () => {
                const subjectId = card.getAttribute('data-id');
                state.selectedSubject = window.ENT_SUBJECTS.find(s => s.id === subjectId);
                renderVariantsView(subjectId);
            });
        });
    }

    async function renderVariantsView(subjectId) {
        appContainer.innerHTML = `
            <div class="max-w-2xl mx-auto p-6 text-center">
                <button id="back-home" class="mb-6 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 text-sm">← Назад к предметам</button>
                <h2 class="text-2xl font-bold mb-2 text-gray-800">${state.selectedSubject.name}</h2>
                <p class="text-gray-500 mb-6">Выберите вариант для прохождения</p>
                <div id="variants-list" class="flex flex-wrap justify-center gap-3">
                    <p class="text-gray-400">Поиск доступных вариантов...</p>
                </div>
            </div>
        `;

        document.getElementById('back-home').addEventListener('click', renderHome);

        const availableVariants = [];
        for (let i = 1; i <= 20; i++) {
            try {
                const res = await fetch(`${subjectId}/v${i}.json`, { method: 'HEAD' });
                if (res.ok) {
                    availableVariants.push(i);
                } else {
                    break;
                }
            } catch (e) {
                break;
            }
        }

        const variantsListEl = document.getElementById('variants-list');
        if (availableVariants.length === 0) {
            variantsListEl.innerHTML = `<p class="text-red-500 col-span-full">Для этого предмета пока не добавлено ни одного варианта (создайте папку ${subjectId} и файл v1.json).</p>`;
            return;
        }

        variantsListEl.innerHTML = availableVariants.map(v => `
            <button data-variant="${v}" class="variant-btn w-16 h-16 bg-white border-2 border-indigo-500 text-indigo-600 font-bold text-xl rounded-xl shadow hover:bg-indigo-600 hover:text-white transition flex items-center justify-center">
                ${v}
            </button>
        `).join('');

        document.querySelectorAll('.variant-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const variantNum = btn.getAttribute('data-variant');
                state.selectedVariant = variantNum;
                await startTest(subjectId, variantNum);
            });
        });
    }

    async function startTest(subjectId, variantNum) {
        appContainer.innerHTML = `<div class="text-center p-20 text-gray-500">Загрузка варианта №${variantNum}...</div>`;
        try {
            const res = await fetch(`${subjectId}/v${variantNum}.json`);
            const data = await res.json();
            state.questions = data.questions;
            state.currentIndex = 0;
            state.userAnswers = {};
            renderTestScreen();
        } catch (err) {
            alert('Ошибка при загрузке файла варианта.');
            renderVariantsView(subjectId);
        }
    }

    function renderTestScreen() {
        const q = state.questions[state.currentIndex];
        appContainer.innerHTML = `
            <div class="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-md mt-6">
                <div class="flex justify-between items-center mb-4 text-sm text-gray-500">
                    <span>${state.selectedSubject.name} — Вариант ${state.selectedVariant}</span>
                    <span>Вопрос ${state.currentIndex + 1} из ${state.questions.length}</span>
                </div>
                <div class="text-lg font-medium text-gray-800 mb-6">${q.text}</div>
                <div class="space-y-3 mb-6">
                    ${q.options.map((opt, idx) => `
                        <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
                            <input type="radio" name="question" value="${idx}" class="mr-3" ${state.userAnswers[state.currentIndex] === idx ? 'checked' : ''}>
                            <span>${opt}</span>
                        </label>
                    `).join('')}
                </div>
                <div class="flex justify-between">
                    <button id="prev-btn" class="px-4 py-2 bg-gray-100 rounded-lg ${state.currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}">Назад</button>
                    <button id="next-btn" class="px-6 py-2 bg-indigo-600 text-white rounded-lg">${state.currentIndex === state.questions.length - 1 ? 'Завершить' : 'Далее'}</button>
                </div>
            </div>
        `;

        document.getElementById('prev-btn').addEventListener('click', () => {
            if (state.currentIndex > 0) {
                saveCurrentAnswer();
                state.currentIndex--;
                renderTestScreen();
            }
        });

        document.getElementById('next-btn').addEventListener('click', () => {
            saveCurrentAnswer();
            if (state.currentIndex < state.questions.length - 1) {
                state.currentIndex++;
                renderTestScreen();
            } else {
                alert('Тест завершен!');
                renderHome();
            }
        });
    }

    function saveCurrentAnswer() {
        const checked = document.querySelector('input[name="question"]:checked');
        if (checked) {
            state.userAnswers[state.currentIndex] = parseInt(checked.value);
        }
    }

    renderHome();
});