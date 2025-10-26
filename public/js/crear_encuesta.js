// Configuración de la API
const API_BASE_URL = window.location.origin + '/api';

// Variables globales
let currentSurvey = null;
let questions = [];
let questionCounter = 0;

// Utilidades
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Verificar autenticación
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Obtener ID de encuesta de la URL
function getSurveyIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Cargar encuesta existente
async function loadSurvey(surveyId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.ok) {
            currentSurvey = data.encuesta;
            questions = currentSurvey.preguntas || [];
            updateSurveyTitle();
            renderQuestions();
        } else {
            showError('Error al cargar la encuesta');
        }
    } catch (error) {
        console.error('Error cargando encuesta:', error);
        showError('Error de conexión');
    }
}

// Actualizar título de la encuesta
function updateSurveyTitle() {
    const titleElement = document.querySelector('.title-container h1');
    if (titleElement && currentSurvey) {
        titleElement.textContent = currentSurvey.titulo;
        titleElement.contentEditable = true;
        titleElement.addEventListener('blur', saveSurveyTitle);
    }
}

// Guardar título de la encuesta
async function saveSurveyTitle() {
    const newTitle = document.querySelector('.title-container h1').textContent.trim();
    if (!newTitle || newTitle === currentSurvey.titulo) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/surveys/${currentSurvey.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ titulo: newTitle })
        });

        const data = await response.json();
        
        if (data.ok) {
            currentSurvey.titulo = newTitle;
            showSuccess('Título actualizado');
        } else {
            showError('Error al actualizar el título');
        }
    } catch (error) {
        console.error('Error actualizando título:', error);
        showError('Error de conexión');
    }
}

// Renderizar preguntas
function renderQuestions() {
    const questionsContainer = document.querySelector('.survey-column');
    if (!questionsContainer) return;

    questionsContainer.innerHTML = questions.map((question, index) => `
        <div class="survey-section" data-question-id="${question.id}">
            <div class="question-header">
                <h2 contenteditable="true" data-field="enunciado">${question.enunciado}</h2>
                <div class="question-type">
                    <select data-field="tipo">
                        <option value="seleccion_unica" ${question.tipo === 'seleccion_unica' ? 'selected' : ''}>Selección única</option>
                        <option value="seleccion_multiple" ${question.tipo === 'seleccion_multiple' ? 'selected' : ''}>Selección múltiple</option>
                        <option value="texto_abierto" ${question.tipo === 'texto_abierto' ? 'selected' : ''}>Texto abierto</option>
                    </select>
                </div>
            </div>
            
            <div class="icon-container-top">
                <img class="move" src="images/move.png" alt="icono mover" title="Mover pregunta">
            </div>
            
            <div class="question-content">
                ${renderQuestionContent(question)}
            </div>
            
            <div class="icon-container-bottom">
                <img class="duplicate" src="images/duplicar.png" alt="duplicar" title="Duplicar pregunta" onclick="duplicateQuestion(${question.id})">
                <img class="trash" src="images/trash.png" alt="eliminar" title="Eliminar pregunta" onclick="deleteQuestion(${question.id})">
            </div>
        </div>
    `).join('') + `
        <div class="add-question-section">
            <button class="add-question-btn" onclick="addNewQuestion()">Añadir pregunta</button>
        </div>
    `;

    // Agregar event listeners para edición
    addQuestionEventListeners();
}

// Renderizar contenido de pregunta según tipo
function renderQuestionContent(question) {
    if (question.tipo === 'texto_abierto') {
        return `
            <div class="text-input-container">
                <label class="correct-answer-label">
                    <span>Respuesta correcta:</span>
                    <input type="text" placeholder="Ingresa la respuesta correcta..." 
                           value="${question.respuesta_correcta || ''}" 
                           onchange="updateCorrectAnswer(${question.id}, this.value)"
                           class="correct-answer-input">
                </label>
            </div>
        `;
    } else {
        const options = question.opciones || [];
        return `
            <div class="options">
                ${options.map(option => `
                    <div class="option" data-option-id="${option.id}">
                        <input type="text" value="${option.texto}" placeholder="Opción" onchange="updateOption(${option.id}, this.value)">
                        <button onclick="toggleCorrectAnswer(${option.id})" 
                                class="correct-btn ${option.es_correcta ? 'correct' : ''}" 
                                title="${option.es_correcta ? 'Quitar como correcta' : 'Marcar como correcta'}">
                            ${option.es_correcta ? '✅' : '⚪'}
                        </button>
                        <button onclick="removeOption(${option.id})" class="remove-option">×</button>
                    </div>
                `).join('')}
                <div class="option add-option" onclick="addOption(${question.id})">
                    <span>Añadir opción</span>
                </div>
            </div>
        `;
    }
}

// Agregar event listeners para edición
function addQuestionEventListeners() {
    // Event listeners para campos editables
    document.querySelectorAll('[contenteditable="true"]').forEach(element => {
        element.addEventListener('blur', function() {
            const questionId = this.closest('.survey-section').dataset.questionId;
            const field = this.dataset.field;
            const value = this.textContent.trim();
            updateQuestion(questionId, { [field]: value });
        });
    });

    // Event listeners para selects
    document.querySelectorAll('select[data-field="tipo"]').forEach(select => {
        select.addEventListener('change', function() {
            const questionId = this.closest('.survey-section').dataset.questionId;
            const newType = this.value;
            updateQuestionType(questionId, newType);
        });
    });
}

// Crear nueva pregunta
async function addNewQuestion() {
    if (!currentSurvey) return;

    // Crear un campo de texto temporal para el enunciado
    const enunciado = prompt('Ingresa el enunciado de la pregunta:');
    if (!enunciado || enunciado.trim() === '') return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                encuesta_id: currentSurvey.id,
                enunciado: enunciado.trim(),
                tipo: 'seleccion_unica',
                obligatoria: false,
                opciones: [
                    { texto: 'Opción 1', es_correcta: false },
                    { texto: 'Opción 2', es_correcta: false }
                ]
            })
        });

        const data = await response.json();
        
        if (data.ok) {
            questions.push(data.pregunta);
            renderQuestions();
            showSuccess('Pregunta agregada');
        } else {
            showError(data.message || 'Error al crear la pregunta');
        }
    } catch (error) {
        console.error('Error creando pregunta:', error);
        showError('Error de conexión');
    }
}

// Actualizar pregunta
async function updateQuestion(questionId, updates) {
    try {
        console.log('Actualizando pregunta ID:', questionId, 'con datos:', updates);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error del servidor:', response.status, errorText);
            showError(`Error al actualizar la pregunta: ${response.status}`);
            return;
        }

        const data = await response.json();
        
        if (data.ok) {
            const questionIndex = questions.findIndex(q => q.id == questionId);
            if (questionIndex !== -1) {
                questions[questionIndex] = data.pregunta;
            }
        } else {
            showError('Error al actualizar la pregunta');
        }
    } catch (error) {
        console.error('Error actualizando pregunta:', error);
        showError('Error de conexión');
    }
}

// Actualizar tipo de pregunta
async function updateQuestionType(questionId, newType) {
    const question = questions.find(q => q.id == questionId);
    if (!question) return;

    // Solo actualizar el tipo, sin tocar las opciones
    await updateQuestion(questionId, { tipo: newType });
    renderQuestions();
}

// Duplicar pregunta
async function duplicateQuestion(questionId) {
    const question = questions.find(q => q.id == questionId);
    if (!question) return;

    const newEnunciado = `${question.enunciado} (copia)`;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                encuesta_id: currentSurvey.id,
                enunciado: newEnunciado,
                tipo: question.tipo,
                obligatoria: question.obligatoria,
                opciones: question.opciones || []
            })
        });

        const data = await response.json();
        
        if (data.ok) {
            questions.push(data.pregunta);
            renderQuestions();
            showSuccess('Pregunta duplicada');
        } else {
            showError('Error al duplicar la pregunta');
        }
    } catch (error) {
        console.error('Error duplicando pregunta:', error);
        showError('Error de conexión');
    }
}

// Eliminar pregunta
async function deleteQuestion(questionId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta pregunta?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.ok) {
            questions = questions.filter(q => q.id != questionId);
            renderQuestions();
            showSuccess('Pregunta eliminada');
        } else {
            showError('Error al eliminar la pregunta');
        }
    } catch (error) {
        console.error('Error eliminando pregunta:', error);
        showError('Error de conexión');
    }
}

// Agregar opción
function addOption(questionId) {
    const question = questions.find(q => q.id == questionId);
    if (!question) return;

    // Crear un nuevo campo de opción directamente en el DOM
    const questionSection = document.querySelector(`[data-question-id="${questionId}"]`);
    const optionsContainer = questionSection.querySelector('.options');
    
    // Crear el nuevo elemento de opción
    const newOptionDiv = document.createElement('div');
    newOptionDiv.className = 'option';
    newOptionDiv.innerHTML = `
        <input type="text" placeholder="Nueva opción" value="">
        <button onclick="toggleCorrectAnswerFromDOM(this)" class="correct-btn" title="Marcar como correcta">⚪</button>
        <button onclick="removeOptionFromDOM(this)" class="remove-option">×</button>
    `;
    
    // Insertar antes del botón "Añadir opción"
    const addOptionDiv = optionsContainer.querySelector('.add-option');
    optionsContainer.insertBefore(newOptionDiv, addOptionDiv);
    
    // Enfocar el campo de texto
    const input = newOptionDiv.querySelector('input');
    input.focus();
    
    // Agregar event listener para guardar cuando se pierda el foco
    input.addEventListener('blur', function() {
        const texto = this.value.trim();
        if (texto) {
            // Agregar la opción al array de opciones de la pregunta
            if (!question.opciones) question.opciones = [];
            question.opciones.push({ texto: texto, es_correcta: false });
            
            // Actualizar en el servidor
            updateQuestion(questionId, { opciones: question.opciones });
        } else {
            // Si está vacío, remover el elemento
            newOptionDiv.remove();
        }
    });
    
    // También guardar al presionar Enter
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            this.blur();
        }
    });
}

// Actualizar opción
async function updateOption(optionId, newText) {
    // Buscar la pregunta que contiene esta opción
    const question = questions.find(q => q.opciones && q.opciones.some(o => o.id == optionId));
    if (!question) return;

    // Actualizar solo el texto de la opción específica
    const updatedOptions = question.opciones.map(option => 
        option.id == optionId ? { ...option, texto: newText } : option
    );

    // Actualizar en el array local
    question.opciones = updatedOptions;
    
    // No hacer renderQuestions() para evitar perder el foco del input
    // Solo actualizar en el servidor
    await updateQuestion(question.id, { opciones: updatedOptions });
}

// Alternar respuesta correcta para opciones
async function toggleCorrectAnswer(optionId) {
    const question = questions.find(q => q.opciones && q.opciones.some(o => o.id == optionId));
    if (!question) return;

    const option = question.opciones.find(o => o.id == optionId);
    if (!option) return;

    // Si es selección única, validar que solo haya una respuesta correcta
    if (question.tipo === 'seleccion_unica') {
        const correctAnswers = question.opciones.filter(opt => opt.es_correcta);
        
        // Si ya hay una respuesta correcta y estamos intentando marcar otra
        if (correctAnswers.length > 0 && !option.es_correcta) {
            showError('En selección única solo puedes marcar una respuesta correcta');
            return;
        }
        
        // Desmarcar todas las otras opciones
        question.opciones.forEach(opt => {
            opt.es_correcta = opt.id === optionId ? !opt.es_correcta : false;
        });
    } else {
        // Si es selección múltiple, solo alternar esta opción
        option.es_correcta = !option.es_correcta;
    }

    // Actualizar en el servidor
    console.log('Enviando opciones:', question.opciones);
    await updateQuestion(question.id, { opciones: question.opciones });
    
    // Actualizar la UI
    renderQuestions();
}

// Actualizar respuesta correcta para texto abierto
async function updateCorrectAnswer(questionId, respuestaCorrecta) {
    const question = questions.find(q => q.id == questionId);
    if (!question) return;

    // Actualizar en el array local
    question.respuesta_correcta = respuestaCorrecta;
    
    // Actualizar en el servidor
    await updateQuestion(questionId, { respuesta_correcta: respuestaCorrecta });
}

// Alternar respuesta correcta desde el DOM
function toggleCorrectAnswerFromDOM(button) {
    const optionDiv = button.closest('.option');
    const questionSection = optionDiv.closest('.survey-section');
    const questionId = questionSection.dataset.questionId;
    const question = questions.find(q => q.id == questionId);
    
    if (!question) return;
    
    const isCorrect = button.classList.contains('correct');
    
    // Si es selección única, validar que solo haya una respuesta correcta
    if (question.tipo === 'seleccion_unica') {
        const correctButtons = questionSection.querySelectorAll('.correct-btn.correct');
        
        // Si ya hay una respuesta correcta y estamos intentando marcar otra
        if (correctButtons.length > 0 && !isCorrect) {
            showError('En selección única solo puedes marcar una respuesta correcta');
            return;
        }
        
        // Desmarcar todas las otras opciones
        const allButtons = questionSection.querySelectorAll('.correct-btn');
        allButtons.forEach(btn => {
            if (btn !== button) {
                btn.classList.remove('correct');
                btn.textContent = '⚪';
                btn.title = 'Marcar como correcta';
            }
        });
    }
    
    if (isCorrect) {
        button.classList.remove('correct');
        button.textContent = '⚪';
        button.title = 'Marcar como correcta';
    } else {
        button.classList.add('correct');
        button.textContent = '✅';
        button.title = 'Quitar como correcta';
    }
    
    // Actualizar el array local de preguntas
    const optionIndex = Array.from(questionSection.querySelectorAll('.option')).indexOf(optionDiv);
    if (question.opciones && question.opciones[optionIndex]) {
        question.opciones[optionIndex].es_correcta = !isCorrect;
    }
}

// Eliminar opción desde el DOM
function removeOptionFromDOM(button) {
    const optionDiv = button.closest('.option');
    optionDiv.remove();
}

// Eliminar opción
async function removeOption(optionId) {
    const question = questions.find(q => q.opciones && q.opciones.some(o => o.id == optionId));
    if (!question) return;

    const updatedOptions = question.opciones.filter(option => option.id != optionId);
    await updateQuestion(question.id, { opciones: updatedOptions });
    renderQuestions();
}

// Guardar encuesta
async function saveSurvey() {
    if (!currentSurvey) return;

    const saveBtn = document.getElementById('saveSurveyBtn');
    const originalText = saveBtn.textContent;
    
    saveBtn.disabled = true;
    saveBtn.textContent = '💾 Guardando...';

    try {
        const token = localStorage.getItem('token');
        
        // Guardar título de la encuesta
        const title = document.querySelector('.title-container h1').textContent.trim();
        if (title !== currentSurvey.titulo) {
            await fetch(`${API_BASE_URL}/surveys/${currentSurvey.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ titulo: title })
            });
        }

        // Guardar todas las preguntas
        for (const question of questions) {
            const questionElement = document.querySelector(`[data-question-id="${question.id}"]`);
            if (!questionElement) continue;

            const enunciado = questionElement.querySelector('[data-field="enunciado"]').textContent.trim();
            const tipo = questionElement.querySelector('[data-field="tipo"]').value;
            
            let opciones = [];
            let respuesta_correcta = null;
            
            if (tipo === 'texto_abierto') {
                // Para texto abierto, obtener la respuesta correcta
                const correctAnswerInput = questionElement.querySelector('.correct-answer-input');
                if (correctAnswerInput) {
                    respuesta_correcta = correctAnswerInput.value.trim();
                }
            } else {
                // Para preguntas de selección, recopilar opciones con respuestas correctas
                const optionInputs = questionElement.querySelectorAll('.option input[type="text"]');
                const correctButtons = questionElement.querySelectorAll('.correct-btn');
                
                opciones = Array.from(optionInputs).map((input, index) => {
                    const correctBtn = correctButtons[index];
                    const es_correcta = correctBtn ? correctBtn.classList.contains('correct') : false;
                    
                    return {
                        texto: input.value.trim(),
                        es_correcta: es_correcta
                    };
                }).filter(option => option.texto !== '');
            }

            await fetch(`${API_BASE_URL}/questions/${question.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    enunciado: enunciado,
                    tipo: tipo,
                    opciones: opciones,
                    respuesta_correcta: respuesta_correcta
                })
            });
        }

        showSuccess('¡Encuesta guardada exitosamente!');
        
    } catch (error) {
        console.error('Error guardando encuesta:', error);
        showError('Error al guardar la encuesta');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

// Navegación
function goToSurveys() {
    window.location.href = 'encuesta.html';
}

function goToResponses() {
    if (currentSurvey) {
        window.location.href = `respuestas_encuesta.html?id=${currentSurvey.id}`;
    }
}

function goToShare() {
    if (currentSurvey) {
        window.location.href = `compartir_encuesta.html?id=${currentSurvey.id}`;
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;
    
    const surveyId = getSurveyIdFromURL();
    if (surveyId) {
        loadSurvey(surveyId);
    } else {
        showError('ID de encuesta no válido');
        setTimeout(() => {
            window.location.href = 'encuesta.html';
        }, 2000);
    }

    // Configurar navegación
    const navItems = document.querySelectorAll('nav ul li');
    navItems.forEach((item, index) => {
        if (index === 1) { // Respuestas
            item.addEventListener('click', goToResponses);
        } else if (index === 2) { // Compartir
            item.addEventListener('click', goToShare);
        }
    });

    // Configurar botón de guardar
    const saveBtn = document.getElementById('saveSurveyBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSurvey);
    }

    // Configurar botón de regreso
    const backBtn = document.getElementById('backToSurveysBtn');
    if (backBtn) {
        backBtn.addEventListener('click', goToSurveys);
    }
});
