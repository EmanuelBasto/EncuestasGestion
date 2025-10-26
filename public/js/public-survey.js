// Configuración de la API
const API_BASE_URL = window.location.origin + '/api';

// Variables globales
let surveyData = null;
let responses = {};

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
    }, 5000);
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
    }, 5000);
}

// Obtener token de la URL
function getTokenFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token');
}

// Cargar encuesta pública
async function loadPublicSurvey(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/responses/survey/${token}`);

        const data = await response.json();
        
        if (data.ok) {
            surveyData = data.encuesta;
            renderSurvey();
        } else {
            showError(data.message || 'Encuesta no encontrada');
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
        }
    } catch (error) {
        console.error('Error cargando encuesta:', error);
        showError('Error de conexión');
    }
}

// Renderizar encuesta
function renderSurvey() {
    if (!surveyData) return;

    // Actualizar título
    document.getElementById('surveyTitle').textContent = surveyData.titulo;

    // Renderizar preguntas
    const questionsContainer = document.getElementById('questionsContainer');
    questionsContainer.innerHTML = surveyData.preguntas.map((question, index) => 
        renderQuestion(question, index)
    ).join('');

    // Habilitar botón de envío
    document.getElementById('submitBtn').disabled = false;
}

// Renderizar pregunta individual
function renderQuestion(question, index) {
    const questionId = question.id;
    
    let questionHTML = `
        <div class="question-container" data-question-id="${questionId}">
            <div class="question-header">
                <h3 class="question-title">
                    ${index + 1}. ${question.enunciado}
                    ${question.obligatoria ? '<span class="required">*</span>' : ''}
                </h3>
            </div>
            <div class="question-content">
    `;

    switch (question.tipo) {
        case 'seleccion_unica':
            questionHTML += renderSingleChoice(question);
            break;
        case 'seleccion_multiple':
            questionHTML += renderMultipleChoice(question);
            break;
        case 'texto_abierto':
            questionHTML += renderTextInput(question);
            break;
    }

    questionHTML += `
            </div>
        </div>
    `;

    return questionHTML;
}

// Renderizar selección única
function renderSingleChoice(question) {
    return `
        <div class="options-container">
            ${question.opciones.map(option => `
                <label class="option-label">
                    <input type="radio" name="question_${question.id}" value="${option.id}" 
                           onchange="updateResponse(${question.id}, '${option.id}')">
                    <span class="option-text">${option.texto}</span>
                </label>
            `).join('')}
        </div>
    `;
}

// Renderizar selección múltiple
function renderMultipleChoice(question) {
    return `
        <div class="options-container">
            ${question.opciones.map(option => `
                <label class="option-label">
                    <input type="checkbox" name="question_${question.id}" value="${option.id}" 
                           onchange="updateResponse(${question.id}, '${option.id}', true)">
                    <span class="option-text">${option.texto}</span>
                </label>
            `).join('')}
        </div>
    `;
}

// Renderizar texto abierto
function renderTextInput(question) {
    return `
        <div class="text-input-container">
            <textarea name="question_${question.id}" 
                      placeholder="Escribe tu respuesta aquí (máximo 800 caracteres)..."
                      onchange="updateResponse(${question.id}, this.value)"
                      oninput="validateTextLength(this, ${question.id})"
                      rows="4"
                      maxlength="800"></textarea>
            <div class="char-counter" id="char-counter-${question.id}">
                <span class="char-count">0</span> / 800 caracteres
            </div>
        </div>
    `;
}

// Validar longitud del texto
function validateTextLength(textarea, questionId) {
    const charCount = textarea.value.length;
    const charCounter = document.getElementById(`char-counter-${questionId}`);
    const charCountSpan = charCounter.querySelector('.char-count');
    
    charCountSpan.textContent = charCount;
    
    // Cambiar color según la longitud
    if (charCount > 800) {
        charCounter.style.color = '#e74c3c'; // Rojo si excede el máximo
        textarea.style.borderColor = '#e74c3c';
    } else {
        charCounter.style.color = '#27ae60'; // Verde si está en rango
        textarea.style.borderColor = '#27ae60';
    }
    
    // Actualizar respuesta
    updateResponse(questionId, textarea.value);
}

// Actualizar respuesta
function updateResponse(questionId, value, isMultiple = false) {
    console.log('🔄 Actualizando respuesta:', questionId, value, isMultiple);
    console.log('🔍 Tipo de questionId:', typeof questionId);
    
    // Convertir questionId a número si viene como string
    const numericQuestionId = parseInt(questionId);
    console.log('🔢 QuestionId convertido:', numericQuestionId);
    
    if (isMultiple) {
        if (!responses[numericQuestionId]) {
            responses[numericQuestionId] = [];
        }
        
        const checkbox = document.querySelector(`input[name="question_${questionId}"][value="${value}"]`);
        if (checkbox.checked) {
            if (!responses[numericQuestionId].includes(value)) {
                responses[numericQuestionId].push(value);
            }
        } else {
            responses[numericQuestionId] = responses[numericQuestionId].filter(v => v !== value);
        }
    } else {
        responses[numericQuestionId] = value;
    }
    
    console.log('📊 Respuestas actuales:', responses);
    validateForm();
}

// Validar formulario
function validateForm() {
    if (!surveyData) return;

    const requiredQuestions = surveyData.preguntas.filter(q => q.obligatoria);
    const unansweredRequired = [];
    const invalidTextAnswers = [];

    // Validar preguntas obligatorias
    requiredQuestions.forEach(q => {
        const response = responses[q.id];
        console.log('🔍 Validando pregunta obligatoria:', q.id, 'Respuesta:', response);
        
        if (q.tipo === 'texto_abierto') {
            if (!response || response.toString().trim() === '') {
                unansweredRequired.push(q.enunciado);
            } else if (response.length > 800) {
                invalidTextAnswers.push(q.enunciado);
            }
        } else if (q.tipo === 'seleccion_multiple') {
            if (!response || response.length === 0) {
                unansweredRequired.push(q.enunciado);
            }
        } else if (q.tipo === 'seleccion_unica') {
            if (!response || response.toString().trim() === '') {
                unansweredRequired.push(q.enunciado);
            }
        }
    });

    // Validar también las respuestas de texto abierto no obligatorias
    const textQuestions = surveyData.preguntas.filter(q => q.tipo === 'texto_abierto');
    textQuestions.forEach(q => {
        const response = responses[q.id];
        if (response && response.toString().trim() !== '' && response.length > 800) {
            invalidTextAnswers.push(q.enunciado);
        }
    });

    const isValid = unansweredRequired.length === 0 && invalidTextAnswers.length === 0;
    document.getElementById('submitBtn').disabled = !isValid;

    // Mostrar mensajes de error si existen
    if (unansweredRequired.length > 0 || invalidTextAnswers.length > 0) {
        let errorMessage = '';
        
        if (unansweredRequired.length > 0) {
            errorMessage += 'Preguntas obligatorias sin responder:\n• ' + unansweredRequired.join('\n• ');
        }
        
        if (invalidTextAnswers.length > 0) {
            if (errorMessage) errorMessage += '\n\n';
            errorMessage += 'Respuestas muy largas (máximo 800 caracteres):\n• ' + invalidTextAnswers.join('\n• ');
        }
        
        // Mostrar mensaje en consola para debugging
        console.log('❌ Errores de validación:', errorMessage);
    }
}

// Mostrar notificación de error
function showError(message) {
    // Crear o actualizar elemento de notificación
    let notification = document.getElementById('error-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'error-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            max-width: 400px;
            white-space: pre-line;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.style.display = 'block';
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

// Enviar respuestas
async function submitResponses(event) {
    event.preventDefault();
    
    // Validar antes de enviar
    if (!surveyData) return;

    const requiredQuestions = surveyData.preguntas.filter(q => q.obligatoria);
    const unansweredRequired = [];
    const invalidTextAnswers = [];

    // Validar preguntas obligatorias
    requiredQuestions.forEach(q => {
        const response = responses[q.id];
        
        if (q.tipo === 'texto_abierto') {
            if (!response || response.toString().trim() === '') {
                unansweredRequired.push(q.enunciado);
            } else if (response.length > 800) {
                invalidTextAnswers.push(q.enunciado);
            }
        } else if (q.tipo === 'seleccion_multiple') {
            if (!response || response.length === 0) {
                unansweredRequired.push(q.enunciado);
            }
        } else if (q.tipo === 'seleccion_unica') {
            if (!response || response.toString().trim() === '') {
                unansweredRequired.push(q.enunciado);
            }
        }
    });

    // Validar también las respuestas de texto abierto no obligatorias
    const textQuestions = surveyData.preguntas.filter(q => q.tipo === 'texto_abierto');
    textQuestions.forEach(q => {
        const response = responses[q.id];
        if (response && response.toString().trim() !== '' && response.length > 800) {
            invalidTextAnswers.push(q.enunciado);
        }
    });

    // Mostrar errores si existen
    if (unansweredRequired.length > 0 || invalidTextAnswers.length > 0) {
        let errorMessage = '';
        
        if (unansweredRequired.length > 0) {
            errorMessage += 'Preguntas obligatorias sin responder:\n• ' + unansweredRequired.join('\n• ');
        }
        
        if (invalidTextAnswers.length > 0) {
            if (errorMessage) errorMessage += '\n\n';
            errorMessage += 'Respuestas muy largas (máximo 800 caracteres):\n• ' + invalidTextAnswers.join('\n• ');
        }
        
        showError(errorMessage);
        return; // No enviar si hay errores
    }
    
    if (!surveyData) return;

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '📤 Enviando...';

    try {
        // Preparar datos para envío
        const responseData = Object.keys(responses).map(questionId => {
            const response = responses[questionId];
            const question = surveyData.preguntas.find(q => q.id == questionId);
            
            console.log('🔍 Procesando pregunta:', questionId, 'Tipo:', typeof questionId);
            console.log('📊 Pregunta encontrada:', question);
            console.log('💬 Respuesta:', response);
            
            if (question.tipo === 'seleccion_multiple') {
                return {
                    pregunta_id: parseInt(questionId),
                    opciones: response.map(optId => parseInt(optId))
                };
            } else if (question.tipo === 'seleccion_unica') {
                return {
                    pregunta_id: parseInt(questionId),
                    opciones: [parseInt(response)]
                };
            } else {
                return {
                    pregunta_id: parseInt(questionId),
                    texto: response
                };
            }
        });

        console.log('📤 Datos a enviar:', responseData);

        const token = getTokenFromURL();
        const response = await fetch(`${API_BASE_URL}/responses/submit/${token}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ respuestas: responseData })
        });

        const data = await response.json();
        
        if (data.ok) {
            showSuccess('¡Respuestas enviadas correctamente!');
            
            // Mostrar mensaje de agradecimiento
            setTimeout(() => {
                document.querySelector('.container').innerHTML = `
                    <div class="thank-you">
                        <div class="thank-you-content">
                            <h1>¡Gracias por tu participación!</h1>
                            <p>Tu respuesta ha sido registrada exitosamente.</p>
                            <div class="success-icon">✅</div>
                        </div>
                    </div>
                `;
            }, 2000);
        } else {
            showError(data.message || 'Error al enviar las respuestas');
            submitBtn.disabled = false;
            submitBtn.textContent = '📤 Enviar Respuestas';
        }
    } catch (error) {
        console.error('Error enviando respuestas:', error);
        showError('Error de conexión');
        submitBtn.disabled = false;
        submitBtn.textContent = '📤 Enviar Respuestas';
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    const token = getTokenFromURL();
    
    if (!token) {
        showError('Token de encuesta no válido');
        setTimeout(() => {
            window.location.href = '/';
        }, 3000);
        return;
    }

    loadPublicSurvey(token);

    // Configurar envío del formulario
    document.getElementById('surveyForm').addEventListener('submit', submitResponses);
});
