// Configuración de la API
const API_BASE_URL = window.location.origin + '/api';

// Variables globales
let currentSurvey = null;
let questions = [];
let questionCounter = 0;
let hasUnsavedChanges = false;
let originalQuestionsData = null;

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
            
            <div class="icon-container-top">
                <img class="move-handle" src="images/move.png" alt="icono mover" title="Arrastra para mover pregunta" draggable="false">
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

// Función para marcar cambios pendientes
function markAsChanged() {
    hasUnsavedChanges = true;
    showInfo('Has realizado cambios. No olvides guardar la encuesta.');
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
    // Marcar como cambiado
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
            const questionIndex = questions.findIndex(q => q.id == questionId);
            if (questionIndex !== -1) {
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

    // Mostrar notificación si se cambia a selección única
    if (newType === 'seleccion_unica' && question.tipo !== 'seleccion_unica') {
        showSuccess('Selección única solo admite una respuesta correcta');
    }

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
    
    try {
        await updateQuestion(question.id, { opciones: updatedOptions });
        renderQuestions();
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
                    renderQuestions();
                    showSuccess('Opción eliminada correctamente (incluyendo respuestas asociadas)');
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
        markAsSaved(); // Marcar como guardado
        
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
    if (hasUnsavedChanges) {
        showError('Tienes cambios sin guardar. Guarda la encuesta antes de cambiar de pestaña.');
        return;
    }
    
    if (currentSurvey) {
        window.location.href = `respuestas_encuesta.html?id=${currentSurvey.id}`;
    }
}

function goToShare() {
    if (hasUnsavedChanges) {
        showError('Tienes cambios sin guardar. Guarda la encuesta antes de cambiar de pestaña.');
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
        backBtn.addEventListener('click', goToSurveys);
    }
});

// Inicializar drag and drop para preguntas
function initializeDragAndDrop() {
    const questionSections = document.querySelectorAll('.survey-section');
    
    questionSections.forEach(section => {
        // Verificar que no es el add-question-section
        if (section.classList.contains('add-question-section')) {
            section.draggable = false;
            return;
        }
        
        section.draggable = true;
        
        section.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', section.innerHTML);
            e.dataTransfer.setData('text/plain', section.dataset.questionId);
            section.classList.add('dragging');
        });
        
        section.addEventListener('dragend', (e) => {
            section.classList.remove('dragging');
        });
        
        section.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const dragging = document.querySelector('.dragging');
            const afterElement = getDragAfterElement(section, e.clientY);
            
            // Obtener el add-question-section para verificar que no estamos insertando después de él
            const addQuestionSection = section.parentNode.querySelector('.add-question-section');
            
            if (afterElement == null) {
                // Si afterElement es null y nextSibling es add-question-section, no hacer nada
                if (section.nextSibling && section.nextSibling.classList && section.nextSibling.classList.contains('add-question-section')) {
                    // Insertar antes del add-question-section
                    section.parentNode.insertBefore(dragging, addQuestionSection);
                } else {
                    section.parentNode.appendChild(dragging);
                }
            } else {
                // Si afterElement es add-question-section o está después de él, insertar antes
                if (afterElement.classList && afterElement.classList.contains('add-question-section')) {
                    section.parentNode.insertBefore(dragging, addQuestionSection);
                } else {
                    section.parentNode.insertBefore(dragging, afterElement);
                }
            }
        });
        
        section.addEventListener('drop', (e) => {
            e.preventDefault();
            
            const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
            const targetId = parseInt(section.dataset.questionId);
            
            if (draggedId !== targetId) {
                reorderQuestions(draggedId, targetId);
            }
        });
    });
}

// Obtener el elemento después del cual insertar
function getDragAfterElement(container, y) {
    const draggableElements = [...container.parentNode.querySelectorAll('.survey-section:not(.dragging)')];
    
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

// Reordenar preguntas en el array y actualizar el backend
async function reorderQuestions(draggedId, targetId) {
    const draggedIndex = questions.findIndex(q => q.id === draggedId);
    const targetIndex = questions.findIndex(q => q.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // Mover el elemento en el array
    const [movedQuestion] = questions.splice(draggedIndex, 1);
    questions.splice(targetIndex, 0, movedQuestion);
    
    // Actualizar posiciones en el array
    questions.forEach((question, index) => {
        question.posicion = index + 1;
    });
    
    // Marcar como cambiado
    markAsChanged();
    
    // Actualizar en el backend
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/questions/reorder`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                questions: questions.map(q => ({ id: q.id, posicion: q.posicion }))
            })
        });
        
        const data = await response.json();
        
        if (!data.ok) {
            console.error('Error reordenando preguntas:', data.message);
            renderQuestions(); // Renderizar de nuevo para revertir cambios visuales
        } else {
            showSuccess('Preguntas reordenadas correctamente');
        }
    } catch (error) {
        console.error('Error reordenando preguntas:', error);
        renderQuestions(); // Renderizar de nuevo para revertir cambios visuales
    }
}
