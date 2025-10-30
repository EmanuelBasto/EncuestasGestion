// Configuración de la API
const API_BASE_URL = window.location.origin + '/api';

// Variables globales
let surveyData = null;
let responses = {};
let surveyVersion = null; // Versión actual de la encuesta
let versionCheckInterval = null; // Intervalo para verificar cambios
let surveyChanged = false; // Flag si detectó cambios

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
            surveyVersion = data.version; // Guardar la versión inicial
            renderSurvey();
            startVersionCheck(token); // Iniciar verificación periódica
            
            // Configurar listener para cambios inmediatos mediante localStorage
            // Esto detecta cambios cuando el autor guarda la encuesta en otra pestaña
            setupStorageListener();
        } else {
            showError(data.message || 'Encuesta no encontrada');
            setTimeout(() => {
                window.location.href = '/';
            }, 2500);
        }
    } catch (error) {
        console.error('Error cargando encuesta:', error);
        showError('Error de conexión');
    }
}

// Verificar versión de la encuesta
async function checkSurveyVersion(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/responses/check-version/${token}`);
        const data = await response.json();
        
        if (data.ok) {
            // Si la versión es diferente, hay cambios
            if (data.version !== surveyVersion) {
                console.log('⚠️ Cambios detectados en la encuesta');
                surveyChanged = true;
                showSurveyChangedModal();
                stopVersionCheck(); // Dejar de verificar
            }
        }
    } catch (error) {
        console.error('Error verificando versión:', error);
    }
}

// Iniciar verificación periódica de cambios
function startVersionCheck(token) {
    // Verificar cada 10 segundos si hay cambios
    versionCheckInterval = setInterval(() => {
        checkSurveyVersion(token);
    }, 10000);
}

// Detener verificación de versión
function stopVersionCheck() {
    if (versionCheckInterval) {
        clearInterval(versionCheckInterval);
        versionCheckInterval = null;
    }
}

// Mostrar modal de cambios en la encuesta
function showSurveyChangedModal() {
    const modal = document.createElement('div');
    modal.id = 'survey-changed-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
            <h2 style="color: #e74c3c; margin-bottom: 20px;">⚠️ La encuesta ha sido modificada</h2>
            <p style="margin-bottom: 25px; color: #555;">
                El autor ha realizado cambios en esta encuesta. 
                Para asegurar que estás respondiendo la versión más reciente, por favor recarga la página.
            </p>
            <button onclick="location.reload()" 
                    style="background: #3498db; color: white; padding: 12px 30px; 
                           border: none; border-radius: 5px; font-size: 16px; cursor: pointer;">
                🔄 Recargar Página
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Bloquear el formulario
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
    }
}

// Renderizar encuesta
function renderSurvey() {
    if (!surveyData) return;

    // Actualizar título
    document.getElementById('surveyTitle').textContent = surveyData.titulo;

    // Ordenar preguntas por posición antes de renderizar
    const sortedQuestions = [...surveyData.preguntas].sort((a, b) => (a.posicion || 0) - (b.posicion || 0));
    
    console.log('📋 Preguntas ordenadas para renderizar:', sortedQuestions.map(q => ({ id: q.id, posicion: q.posicion, enunciado: q.enunciado })));

    // Renderizar preguntas
    const questionsContainer = document.getElementById('questionsContainer');
    questionsContainer.innerHTML = sortedQuestions.map((question, index) => 
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
    const hint = (question.respuesta_correcta || '').trim();
    return `
        <div class="text-input-container">
            ${hint ? `<div class="text-hint" style="margin-bottom: 8px; color: #555; font-size: 0.95em; background: #f7f9fc; border: 1px solid #e3e8f0; padding: 10px 12px; border-radius: 6px;">${hint}</div>` : ''}
            <textarea name="question_${question.id}" 
                      placeholder="Escribe tu respuesta aquí (máximo 800 caracteres)..."
                      onchange="updateResponse(${question.id}, this.value)"
                      oninput="validateTextLength(this, ${question.id}); autoResize(this);"
                      rows="6"
                      maxlength="800"
                      style="min-height: 150px; resize: none; overflow-y: hidden;"></textarea>
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

    const unansweredQuestions = [];
    const invalidTextAnswers = [];

    // Validar TODAS las preguntas (no solo las obligatorias)
    surveyData.preguntas.forEach(q => {
        const response = responses[q.id];
        console.log('🔍 Validando pregunta:', q.id, 'Respuesta:', response);
        
        if (q.tipo === 'texto_abierto') {
            if (!response || response.toString().trim() === '') {
                unansweredQuestions.push(q.enunciado);
            } else if (response.length > 800) {
                invalidTextAnswers.push(q.enunciado);
            }
        } else if (q.tipo === 'seleccion_multiple') {
            if (!response || response.length === 0) {
                unansweredQuestions.push(q.enunciado);
            }
        } else if (q.tipo === 'seleccion_unica') {
            if (!response || response.toString().trim() === '') {
                unansweredQuestions.push(q.enunciado);
            }
        }
    });

    const isValid = unansweredQuestions.length === 0 && invalidTextAnswers.length === 0;
    // El botón ahora siempre está habilitado - la validación se hace al enviar
    
    // Mostrar mensajes de error si existen
    if (unansweredQuestions.length > 0 || invalidTextAnswers.length > 0) {
        let errorMessage = '';
        
        if (unansweredQuestions.length > 0) {
            errorMessage += 'Debes responder todas las preguntas:\n• ' + unansweredQuestions.join('\n• ');
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
    
    // Verificar si la encuesta ha cambiado
    if (surveyChanged) {
        showError('⚠️ La encuesta ha sido modificada. Por favor, recarga la página para continuar.');
        return;
    }
    
    // Validar antes de enviar
    if (!surveyData) return;

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '📤 Enviando...';

    try {
        // Verificar que TODAS las preguntas tengan respuestas
        const unansweredQuestions = []; // Guardar IDs en lugar de enunciados
        const invalidTextAnswers = [];
        
        surveyData.preguntas.forEach((q, index) => {
            const response = responses[q.id];
            
            if (q.tipo === 'texto_abierto') {
                if (!response || response.toString().trim() === '') {
                    unansweredQuestions.push({ id: q.id, enunciado: q.enunciado, index: index });
                } else if (response.length > 800) {
                    invalidTextAnswers.push({ id: q.id, enunciado: q.enunciado, index: index });
                }
            } else if (q.tipo === 'seleccion_multiple') {
                if (!response || response.length === 0) {
                    unansweredQuestions.push({ id: q.id, enunciado: q.enunciado, index: index });
                }
            } else if (q.tipo === 'seleccion_unica') {
                if (!response || response.toString().trim() === '') {
                    unansweredQuestions.push({ id: q.id, enunciado: q.enunciado, index: index });
                }
            }
        });

        // Mostrar errores si existen
        if (unansweredQuestions.length > 0 || invalidTextAnswers.length > 0) {
            let errorMessage = '';
            
            if (unansweredQuestions.length > 0) {
                // Usar el índice real de la pregunta
                const firstUnanswered = unansweredQuestions[0];
                const questionNumber = firstUnanswered.index + 1;
                
                errorMessage = `Se tienen que responder todas las preguntas.\n\nPregunta #${questionNumber} no respondida: "${firstUnanswered.enunciado}"`;
                
                // Si hay más preguntas sin responder, agregar mensaje
                if (unansweredQuestions.length > 1) {
                    errorMessage += `\n\nTambién hay ${unansweredQuestions.length - 1} ${unansweredQuestions.length - 1 === 1 ? 'pregunta más' : 'preguntas más'} sin responder.`;
                }
            }
            
            if (invalidTextAnswers.length > 0) {
                if (errorMessage) errorMessage += '\n\n';
                errorMessage += 'Respuestas muy largas (máximo 800 caracteres):\n• ' + invalidTextAnswers.map(q => q.enunciado).join('\n• ');
            }
            
            showError(errorMessage);
            submitBtn.disabled = false;
            submitBtn.textContent = '📤 Enviar Respuestas';
            return; // No enviar si hay errores
        }

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
            
            // Guardar en localStorage que ya se envió esta encuesta
            const token = getTokenFromURL();
            localStorage.setItem(`survey_completed_${token}`, 'true');
            
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
        }, 2500);
        return;
    }

    // Verificar si ya se completó esta encuesta
    const isCompleted = localStorage.getItem(`survey_completed_${token}`);
    if (isCompleted === 'true') {
        // Mostrar mensaje de agradecimiento directamente
        document.querySelector('.container').innerHTML = `
            <div class="thank-you">
                <div class="thank-you-content">
                    <h1>¡Gracias por tu participación!</h1>
                    <p>Tu respuesta ha sido registrada exitosamente.</p>
                    <div class="success-icon">✅</div>
                </div>
            </div>
        `;
        return;
    }

    loadPublicSurvey(token);

    // Configurar envío del formulario
    document.getElementById('surveyForm').addEventListener('submit', submitResponses);
});

// Variable global para mantener el canal abierto
let surveyBroadcastChannel = null;

// Configurar listener para cambios en la encuesta
function setupStorageListener() {
    if (!surveyData) return;
    
    // Usar BroadcastChannel para comunicación directa entre pestañas
    try {
        surveyBroadcastChannel = new BroadcastChannel(`survey_updates_${surveyData.id}`);
        surveyBroadcastChannel.onmessage = (event) => {
            console.log('📨 Mensaje recibido en BroadcastChannel:', event.data);
            if (event.data && event.data.type === 'survey_updated') {
                // Comparar IDs como strings para evitar problemas de tipos
                const receivedSurveyId = String(event.data.surveyId);
                const currentSurveyId = String(surveyData.id);
                console.log(`🔍 Comparando IDs: recibido=${receivedSurveyId}, actual=${currentSurveyId}`);
                if (receivedSurveyId === currentSurveyId) {
                    console.log('⚠️ Encuesta actualizada detectada mediante BroadcastChannel');
                    surveyChanged = true;
                    showSurveyChangedModal();
                    stopVersionCheck(); // Dejar de verificar
                }
            }
        };
        console.log(`🔊 Escuchando actualizaciones de encuesta ${surveyData.id} mediante BroadcastChannel`);
    } catch (error) {
        console.error('Error configurando BroadcastChannel:', error);
    }
    
    // Fallback: Escuchar cambios en localStorage para navegadores que no soportan BroadcastChannel
    window.addEventListener('storage', (e) => {
        if (!e.key || !e.newValue) return;
        
        // Si la encuesta ya se cargó y hay un evento de actualización
        if (surveyData && e.key.startsWith(`survey_updated_${surveyData.id}_`)) {
            console.log('⚠️ Encuesta actualizada detectada mediante localStorage');
            surveyChanged = true;
            showSurveyChangedModal();
            stopVersionCheck(); // Dejar de verificar
        }
    });
}

// Función para ajustar automáticamente la altura del textarea
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(150, textarea.scrollHeight) + 'px';
}
