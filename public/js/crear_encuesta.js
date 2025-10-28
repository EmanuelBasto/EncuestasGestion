// Configuración de la API
const API_BASE_URL = window.location.origin + '/api';

// Variables globales
let currentSurvey = null;
let questions = [];
let questionCounter = 0;
let hasUnsavedChanges = false;
let originalQuestionsData = null;
let lastSavedData = null; // Guarda el estado después de guardar
let changeNotificationShown = false; // Evita mostrar notificación repetida

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
    }, 2500);
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
        z-index: 10001;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
    `;
    
    // Añadir animación si no existe
    if (!document.getElementById('success-animation')) {
        const style = document.createElement('style');
        style.id = 'success-animation';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 2500);
}

function showInfo(message) {
    const infoDiv = document.createElement('div');
    infoDiv.className = 'info-message';
    infoDiv.textContent = message;
    infoDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #3498db;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        animation: slideIn 0.3s ease-out;
    `;
    
    // Añadir animación si no existe
    if (!document.getElementById('info-animation')) {
        const style = document.createElement('style');
        style.id = 'info-animation';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(infoDiv);
    
    setTimeout(() => {
        infoDiv.remove();
    }, 2500);
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
            
            console.log('Preguntas recibidas del servidor:', questions.map(q => ({ id: q.id, posicion: q.posicion, enunciado: q.enunciado })));
            
            // Ordenar preguntas por posición
            questions.sort((a, b) => (a.posicion || 0) - (b.posicion || 0));
            
            console.log('Preguntas después de ordenar:', questions.map(q => ({ id: q.id, posicion: q.posicion, enunciado: q.enunciado })));
            
            updateSurveyTitle();
            renderQuestions();
            
            // Guardar el estado inicial como referencia
            saveCurrentState();
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
            markAsChanged();
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

    // Limpiar el contenedor primero
    questionsContainer.innerHTML = '';
    
    // Renderizar todas las preguntas
    questions.forEach((question, index) => {
        const questionElement = document.createElement('div');
        questionElement.className = 'survey-section';
        questionElement.setAttribute('data-question-id', question.id);
        questionElement.innerHTML = `
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
            
            <div class="question-content">
                ${renderQuestionContent(question)}
            </div>
            
            <div class="icon-container-bottom">
                <img class="duplicate" src="images/duplicar.png" alt="duplicar" title="Duplicar pregunta" onclick="duplicateQuestion(${question.id})">
                <img class="trash" src="images/trash.png" alt="eliminar" title="Eliminar pregunta" onclick="deleteQuestion(${question.id})">
            </div>
        `;
        questionsContainer.appendChild(questionElement);
    });
    
    // Crear el botón "Añadir pregunta" como último elemento
    const addQuestionSection = document.createElement('div');
    addQuestionSection.className = 'add-question-section';
    addQuestionSection.innerHTML = `<button class="add-question-btn" onclick="addNewQuestion()">Añadir pregunta</button>`;
    questionsContainer.appendChild(addQuestionSection);

    // Agregar event listeners para edición
    addQuestionEventListeners();
    
    // Agregar funcionalidad de drag and drop
    initializeDragAndDrop();
}

// Renderizar contenido de pregunta según tipo
function renderQuestionContent(question) {
    if (question.tipo === 'texto_abierto') {
        return `
            <div class="text-input-container">
                <label class="correct-answer-label">
                    <span>Ejemplo de respuesta correcta:</span>
                    <input type="text" placeholder="Ingresa un ejemplo de respuesta correcta..." 
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
                    <div class="option" data-option-id="${option.id || ''}">
                        <input type="text" value="${option.texto}" placeholder="Opción" onchange="updateOption(${option.id || 'null'}, this.value)">
                        <button onclick="toggleCorrectAnswer(${option.id || 'null'})" 
                                class="correct-btn ${option.es_correcta ? 'correct' : ''}" 
                                title="${option.es_correcta ? 'Quitar como correcta' : 'Marcar como correcta'}">
                            ${option.es_correcta ? '✅' : '⚪'}
                        </button>
                        <button onclick="removeOptionFromDOM(this)" class="remove-option">×</button>
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
    
    // Event listener para detectar cambios en el título
    const titleElement = document.querySelector('.title-container h1');
    if (titleElement) {
        titleElement.addEventListener('input', markAsChanged);
    }
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
            markAsChanged();
        } else {
            showError(data.message || 'Error al crear la pregunta');
        }
    } catch (error) {
        console.error('Error creando pregunta:', error);
        showError('Error de conexión');
    }
}

// Función para guardar el estado actual
function saveCurrentState() {
    const currentTitle = document.querySelector('.title-container h1')?.textContent.trim() || '';
    lastSavedData = {
        questions: JSON.parse(JSON.stringify(questions)),
        title: currentTitle
    };
    hasUnsavedChanges = false;
    changeNotificationShown = false;
}

// Función para verificar si hay cambios comparando con el último estado guardado
function checkForChanges() {
    if (!lastSavedData) return false;
    
    // Comparar preguntas
    const currentQuestionsStr = JSON.stringify(questions);
    const savedQuestionsStr = JSON.stringify(lastSavedData.questions);
    const questionsChanged = currentQuestionsStr !== savedQuestionsStr;
    
    // Comparar título
    const currentTitle = document.querySelector('.title-container h1')?.textContent.trim() || '';
    const titleChanged = currentTitle !== lastSavedData.title;
    
    return questionsChanged || titleChanged;
}

// Función para marcar cambios pendientes
function markAsChanged() {
    hasUnsavedChanges = true;
    
    // Verificar cambios solo después de que se haya guardado al menos una vez
    if (lastSavedData) {
        if (checkForChanges()) {
            // Solo mostrar la notificación si no se ha mostrado ya
            if (!changeNotificationShown) {
                showInfo('Tienes cambios sin guardar. Guarda la encuesta para actualizar el link de la encuesta.');
                changeNotificationShown = true;
            }
        }
    }
}

// Función para verificar si hay cambios sin guardar antes de cerrar o cambiar de página
function hasUnsavedChangesCheck() {
    if (lastSavedData && checkForChanges()) {
        return true;
    }
    return false;
}

// Función para verificar si hay cambios pendientes
function hasChanges() {
    return hasUnsavedChanges;
}

// Función para marcar como guardado
function markAsSaved() {
    hasUnsavedChanges = false;
}

// Actualizar pregunta
async function updateQuestion(questionId, updates) {
    // Actualizar el array local primero
    const questionIndex = questions.findIndex(q => q.id == questionId);
    if (questionIndex !== -1) {
        questions[questionIndex] = { ...questions[questionIndex], ...updates };
    }
    
    // Marcar como cambiado después de actualizar el array
    markAsChanged();
    
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
            
            // Si es un error 400, intentar parsear el JSON para obtener el mensaje
            if (response.status === 400) {
                console.log('Error 400 detectado, errorText:', errorText);
                const errorData = JSON.parse(errorText);
                console.log('ErrorData parseado:', errorData);
                // Lanzar el error directamente con el mensaje del backend
                const error = new Error(errorData.message || 'Error al actualizar la pregunta');
                error.status = response.status;
                throw error;
            } else {
                const error = new Error(`Error al actualizar la pregunta: ${response.status}`);
                error.status = response.status;
                throw error;
            }
        }

        const data = await response.json();
        
        if (data.ok) {
            // Actualizar con los datos del servidor, preservando el estado actual de es_correcta
            if (questionIndex !== -1) {
                // Si estamos actualizando opciones, preservar el estado de es_correcta
                if (updates.opciones && data.pregunta && data.pregunta.opciones) {
                    // Mapear el estado de es_correcta que acabamos de actualizar
                    const currentOpciones = questionIndex !== -1 ? questions[questionIndex].opciones : [];
                    data.pregunta.opciones.forEach((serverOption, index) => {
                        const currentOption = currentOpciones[index];
                        if (currentOption && serverOption.texto === currentOption.texto) {
                            // Preservar el estado de es_correcta si ya lo actualizamos
                            serverOption.es_correcta = currentOption.es_correcta;
                        }
                    });
                }
                questions[questionIndex] = data.pregunta;
            }
        } else {
            showError('Error al actualizar la pregunta');
        }
    } catch (error) {
        console.error('Error actualizando pregunta:', error);
        // Re-lanzar la excepción para que pueda ser manejada por funciones que llaman a updateQuestion
        throw error;
    }
}

// Actualizar tipo de pregunta
async function updateQuestionType(questionId, newType) {
    const question = questions.find(q => q.id == questionId);
    if (!question) return;

    // Si se cambia a selección única desde selección múltiple
    if (newType === 'seleccion_unica' && question.tipo === 'seleccion_multiple') {
        // Verificar cuántas respuestas correctas hay
        const correctAnswers = question.opciones ? question.opciones.filter(opt => opt.es_correcta) : [];
        
        if (correctAnswers.length > 1) {
            // Desmarcar todas las opciones
            question.opciones.forEach(option => {
                option.es_correcta = false;
            });
            
            // Mostrar notificación
            showInfo('Selección única solo admite una respuesta correcta. Las opciones han sido desmarcadas. Por favor, selecciona la opción correcta.');
        } else if (correctAnswers.length === 1) {
            showSuccess('Selección única configurada correctamente');
        }
    }

    // Actualizar el tipo junto con las opciones para preservar el estado
    await updateQuestion(questionId, { tipo: newType, opciones: question.opciones });
    renderQuestions();
}

// Duplicar pregunta
async function duplicateQuestion(questionId) {
    const question = questions.find(q => q.id == questionId);
    if (!question) return;

    // Duplicar el enunciado sin agregar "(copia)"
    const newEnunciado = question.enunciado;

    try {
        const token = localStorage.getItem('token');
        
        // Preparar datos de la pregunta duplicada
        const duplicatedData = {
            encuesta_id: currentSurvey.id,
            enunciado: newEnunciado,
            tipo: question.tipo,
            obligatoria: question.obligatoria,
            opciones: question.opciones || []
        };
        
        // Si es texto abierto, duplicar también respuesta_correcta
        if (question.tipo === 'texto_abierto' && question.respuesta_correcta) {
            duplicatedData.respuesta_correcta = question.respuesta_correcta;
        }
        
        const response = await fetch(`${API_BASE_URL}/questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(duplicatedData)
        });

        const data = await response.json();
        
        if (data.ok) {
            questions.push(data.pregunta);
            renderQuestions();
            showSuccess('Pregunta duplicada');
            markAsChanged();
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
            markAsChanged();
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
    input.addEventListener('blur', async function() {
        const texto = this.value.trim();
        if (texto) {
            // Agregar la opción al array de opciones de la pregunta
            if (!question.opciones) question.opciones = [];
            question.opciones.push({ texto: texto, es_correcta: false });
            
            // Actualizar en el servidor y re-renderizar para obtener el ID
            await updateQuestion(questionId, { opciones: question.opciones });
            renderQuestions();
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

    const previousState = option.es_correcta;

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
        // Si es selección múltiple, validar máximo 4 respuestas correctas
        const correctAnswers = question.opciones.filter(opt => opt.es_correcta);
        
        // Si estamos intentando marcar una nueva respuesta correcta
        if (!option.es_correcta && correctAnswers.length >= 4) {
            showError('Solo se permiten máximo 4 respuestas correctas en selección múltiple');
            return;
        }
        
        // Si es selección múltiple, solo alternar esta opción
        option.es_correcta = !option.es_correcta;
    }

    // Marcar como cambiado
    markAsChanged();

    // Actualizar en el servidor SIN re-renderizar (para mantener el estado UI)
    try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE_URL}/questions/${question.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ opciones: question.opciones })
        });
        
        // Actualizar UI directamente sin re-renderizar toda la pregunta
        const questionElement = document.querySelector(`[data-question-id="${question.id}"]`);
        if (questionElement) {
            const optionElement = questionElement.querySelector(`[data-option-id="${optionId}"]`);
            if (optionElement) {
                const correctBtn = optionElement.querySelector('.correct-btn');
                if (correctBtn) {
                    if (option.es_correcta) {
                        correctBtn.classList.add('correct');
                        correctBtn.textContent = '✅';
                        correctBtn.title = 'Quitar como correcta';
                    } else {
                        correctBtn.classList.remove('correct');
                        correctBtn.textContent = '⚪';
                        correctBtn.title = 'Marcar como correcta';
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error actualizando respuesta correcta:', error);
        // Revertir el cambio si falla
        option.es_correcta = previousState;
        showError('Error al actualizar la respuesta correcta');
    }
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
    
    // Si la opción ya existe en el array
    if (question.opciones && question.opciones[optionIndex]) {
        question.opciones[optionIndex].es_correcta = !isCorrect;
    } else {
        // Si la opción es nueva y no está en el array, agregarla
        const input = optionDiv.querySelector('input[type="text"]');
        if (input && input.value.trim()) {
            if (!question.opciones) question.opciones = [];
            question.opciones.push({ 
                texto: input.value.trim(), 
                es_correcta: !isCorrect,
                id: null // Nueva opción sin ID
            });
        }
    }
    
    // Marcar como cambiado (requerirá guardar)
    markAsChanged();
}

// Eliminar opción desde el DOM
async function removeOptionFromDOM(button) {
    if (!confirm('¿Estás seguro que quieres eliminar esta opción?')) {
        return;
    }
    
    const optionDiv = button.closest('.option');
    const questionSection = optionDiv.closest('.survey-section');
    const questionId = questionSection.dataset.questionId;
    const question = questions.find(q => q.id == questionId);
    
    // Obtener información ANTES de remover del DOM
    const input = optionDiv.querySelector('input[type="text"]');
    const optionId = optionDiv.dataset.optionId;
    
    // Remover del DOM primero para que se vea inmediatamente
    optionDiv.remove();
    
    // Solo actualizar el array local (NO actualizar servidor aún)
    if (optionId && question && question.opciones) {
        // Si la opción tiene ID, remover del array local
        question.opciones = question.opciones.filter(opt => opt.id != optionId);
    } else if (input && input.value.trim() && question && question.opciones) {
        // Si la opción no tiene ID, remover del array local buscando por texto
        const texto = input.value.trim();
        question.opciones = question.opciones.filter(opt => opt.texto !== texto);
    }
    
    // Marcar como cambiado (requerirá guardar)
    markAsChanged();
    showSuccess('Opción eliminada. Recuerda guardar la encuesta.');
}

// Eliminar opción
async function removeOption(optionId, skipConfirm = false) {
    if (!skipConfirm) {
        if (!confirm('¿Estás seguro que quieres eliminar esta opción?')) {
            return;
        }
    }
    
    const question = questions.find(q => q.opciones && q.opciones.some(o => o.id == optionId));
    if (!question) return;

    const updatedOptions = question.opciones.filter(option => option.id != optionId);
    
    try {
        await updateQuestion(question.id, { opciones: updatedOptions });
        // Actualizar el array local
        question.opciones = updatedOptions;
        // Marcar como cambiado (requerirá guardar)
        markAsChanged();
        showSuccess('Opción eliminada. Recuerda guardar la encuesta.');
    } catch (error) {
        console.log('Error capturado en removeOption:', error);
        console.log('Mensaje de error:', error.message);
        
        // Si el error es por respuestas asociadas, mostrar confirmación
        if (error.message && error.message.includes('respuestas asociadas')) {
            console.log('Mostrando diálogo de confirmación');
            const confirmDelete = confirm(
                'Esta opción tiene respuestas asociadas. ¿Estás seguro de que quieres eliminarla?\n\n' +
                '⚠️ ADVERTENCIA: Esto eliminará también todas las respuestas asociadas a esta opción.\n' +
                'Esta acción no se puede deshacer.'
            );
            
            if (confirmDelete) {
                try {
                    await updateQuestion(question.id, { opciones: updatedOptions, forceDelete: true });
                    // Actualizar el array local
                    question.opciones = updatedOptions;
                    // Marcar como cambiado
                    markAsChanged();
                    showSuccess('Opción eliminada. Recuerda guardar la encuesta.');
                } catch (forceError) {
                    console.error('Error en eliminación forzada:', forceError);
                    showError('Error al eliminar la opción');
                }
            }
        } else {
            console.log('Error no relacionado con respuestas asociadas');
            showError('Error al eliminar la opción');
        }
    }
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

        // Actualizar posiciones basándose en el orden actual del array questions
        questions.forEach((question, index) => {
            question.posicion = index + 1;
        });
        
        console.log('📋 Orden actual del array questions:', questions.map(q => ({ id: q.id, posicion: q.posicion, enunciado: q.enunciado })));
        
        // Guardar todas las preguntas con sus posiciones
        // Usar el array questions que ya está en el orden correcto después del drag and drop
        for (let index = 0; index < questions.length; index++) {
            const question = questions[index];
            const questionElement = document.querySelector(`[data-question-id="${question.id}"]`);
            if (!questionElement) {
                console.error(`No se encontró elemento DOM para pregunta ${question.id}`);
                continue;
            }

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
                
                opciones = Array.from(optionInputs).map((input, optIndex) => {
                    const correctBtn = correctButtons[optIndex];
                    const es_correcta = correctBtn ? correctBtn.classList.contains('correct') : false;
                    
                    // Buscar la opción original por índice (el orden debe coincidir)
                    let optionData = question.opciones && question.opciones[optIndex];
                    
                    // Si no hay opción en ese índice, buscar por texto
                    if (!optionData && question.opciones) {
                        optionData = question.opciones.find(opt => opt.texto === input.value.trim());
                    }
                    
                    return {
                        texto: input.value.trim(),
                        es_correcta: es_correcta,
                        id: optionData ? optionData.id : null
                    };
                }).filter(option => option.texto !== '');
            }

            console.log(`Guardando pregunta ${question.id} en posición ${question.posicion}:`, { enunciado, tipo });

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
        
        const questionsToReorder = questions.map(q => ({ id: parseInt(q.id), posicion: parseInt(q.posicion) }));
        console.log('Orden final de preguntas después de guardar:', questions.map(q => ({ id: q.id, posicion: q.posicion, enunciado: q.enunciado })));
        console.log('Enviando al servidor:', JSON.stringify({ encuesta_id: parseInt(currentSurvey.id), questions: questionsToReorder }));

        // Guardar el orden de las preguntas (esto es lo que realmente actualiza las posiciones en BD)
        const reorderResponse = await fetch(`${API_BASE_URL}/questions/reorder`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                encuesta_id: parseInt(currentSurvey.id),
                preguntas: questionsToReorder
            })
        });
        
        const reorderData = await reorderResponse.json();
        console.log('Respuesta de reorder:', reorderData);
        
        if (!reorderData.ok) {
            console.error('Error guardando el orden:', reorderData);
            showError('Error al guardar el orden de las preguntas: ' + reorderData.message);
            return;
        }

        showSuccess('¡Encuesta guardada exitosamente!');
        markAsSaved(); // Marcar como guardado
        saveCurrentState(); // Guardar el estado después de guardar
        showSuccess('La encuesta se ha actualizado correctamente.');
        
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
    // Verificar si hay cambios pendientes
    if (lastSavedData && checkForChanges()) {
        showError('⚠️ Tienes cambios sin guardar. Guarda la encuesta antes de cambiar de pestaña. Presiona el botón "💾 Guardar Encuesta" para continuar.');
        return;
    }
    
    if (currentSurvey) {
        window.location.href = `respuestas_encuesta.html?id=${currentSurvey.id}`;
    }
}

function goToShare() {
    // Verificar si hay cambios pendientes
    if (lastSavedData && checkForChanges()) {
        showError('⚠️ Tienes cambios sin guardar. Guarda la encuesta antes de cambiar de pestaña. Presiona el botón "💾 Guardar Encuesta" para continuar.');
        return;
    }
    
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
        backBtn.addEventListener('click', () => {
            if (hasUnsavedChangesCheck()) {
                showError('⚠️ Tienes cambios sin guardar. Guarda la encuesta antes de salir. Presiona el botón "💾 Guardar Encuesta" para continuar.');
                return;
            }
            goToSurveys();
        });
    }
    
    // Configurar alerta antes de cerrar la página si hay cambios sin guardar
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChangesCheck()) {
            e.preventDefault();
            e.returnValue = '¿Seguro que quieres salir? Tienes cambios sin guardar.';
            return e.returnValue;
        }
    });
});

// Inicializar drag and drop para preguntas
function initializeDragAndDrop() {
    const questionSections = document.querySelectorAll('.survey-section');
    const addQuestionSection = document.querySelector('.add-question-section');
    
    questionSections.forEach(section => {
        // NO hacer drag and drop con el add-question-section
        if (section.classList.contains('add-question-section')) {
            section.draggable = false;
            section.addEventListener('dragover', (e) => {
                e.preventDefault();
                // NO permitir drop en el add-question-section
                e.dataTransfer.dropEffect = 'none';
            });
            return;
        }
        
        section.draggable = true;
        
        section.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', section.dataset.questionId);
            section.classList.add('dragging');
        });
        
        section.addEventListener('dragend', (e) => {
            section.classList.remove('dragging');
        });
        
        section.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            // NO permitir insertar después del add-question-section
            const dragging = document.querySelector('.dragging');
            if (!dragging) return;
            
            const surveyColumn = document.querySelector('.survey-column');
            const addQuestionSection = surveyColumn.querySelector('.add-question-section');
            
            // Obtener todos los elementos que NO son add-question-section
            const allSections = Array.from(surveyColumn.children);
            const regularSections = allSections.filter(s => !s.classList.contains('add-question-section'));
            
            // Si estamos sobre el add-question-section, NO permitir drop
            if (e.target === addQuestionSection || addQuestionSection.contains(e.target)) {
                return;
            }
            
            // Encontrar el elemento más cercano donde insertar
            const afterElement = getDragAfterElement(section, e.clientY, regularSections);
            
            if (afterElement == null) {
                // Insertar antes del add-question-section
                surveyColumn.insertBefore(dragging, addQuestionSection);
            } else {
                surveyColumn.insertBefore(dragging, afterElement);
            }
        });
        
        section.addEventListener('drop', async (e) => {
            e.preventDefault();
            
            const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
            const targetId = parseInt(section.dataset.questionId);
            
            console.log('🎯 Drop event - Dragged:', draggedId, 'Target:', targetId);
            
            if (draggedId !== targetId) {
                await reorderQuestions(draggedId, targetId);
            }
        });
    });
}

// Obtener el elemento después del cual insertar
function getDragAfterElement(container, y, elements = null) {
    const draggableElements = elements || [...container.parentNode.querySelectorAll('.survey-section:not(.dragging):not(.add-question-section)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Reordenar preguntas en el array y guardar inmediatamente
async function reorderQuestions(draggedId, targetId) {
    console.log('🎯 Iniciando reordenamiento - Dragged ID:', draggedId, 'Target ID:', targetId);
    console.log('Array actual:', questions.map(q => ({ id: q.id, tipo: typeof q.id })));
    
    // Convertir IDs a strings para comparar correctamente
    const draggedIdStr = String(draggedId);
    const targetIdStr = String(targetId);
    
    const draggedIndex = questions.findIndex(q => String(q.id) === draggedIdStr);
    const targetIndex = questions.findIndex(q => String(q.id) === targetIdStr);
    
    console.log('Índices - Dragged:', draggedIndex, 'Target:', targetIndex);
    console.log('ID buscado (dragged):', draggedIdStr, 'ID buscado (target):', targetIdStr);
    
    if (draggedIndex === -1 || targetIndex === -1) {
        console.log('❌ Índices inválidos');
        console.log('IDs en el array:', questions.map(q => ({ id: q.id, tipo: typeof q.id })));
        return;
    }
    
    // Mover el elemento en el array
    const [movedQuestion] = questions.splice(draggedIndex, 1);
    questions.splice(targetIndex, 0, movedQuestion);
    
    // Actualizar posiciones en el array local
    questions.forEach((question, index) => {
        question.posicion = index + 1;
    });
    
    console.log('✅ Preguntas reordenadas localmente:', questions.map(q => ({ id: q.id, posicion: q.posicion, enunciado: q.enunciado })));
    
    // Marcar como cambiado
    markAsChanged();
    
    // Guardar el nuevo orden inmediatamente en el servidor
    try {
        const questionsToReorder = questions.map(q => ({ id: parseInt(q.id), posicion: parseInt(q.posicion) }));
        
        console.log('💾 Guardando orden inmediatamente:', questionsToReorder);
        console.log('💾 Enviando al servidor:', JSON.stringify({
            encuesta_id: parseInt(currentSurvey.id),
            questions: questionsToReorder
        }));
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/questions/reorder`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                encuesta_id: parseInt(currentSurvey.id),
                preguntas: questionsToReorder
            })
        });
        
        const data = await response.json();
        console.log('📩 Respuesta del servidor:', data);
        
        if (data.ok) {
            console.log('✅ Orden guardado exitosamente en el servidor');
            saveCurrentState(); // Actualizar el estado guardado
            console.log('🔔 Mostrando notificación...');
            showSuccess('Posiciones de las preguntas guardadas');
            console.log('✅ Notificación mostrada');
        } else {
            console.error('❌ Error guardando el orden:', data);
            showError('Error al actualizar el orden de las preguntas');
        }
    } catch (error) {
        console.error('❌ Error guardando el orden de preguntas:', error);
        showError('Error de conexión al guardar el orden');
    }
}
