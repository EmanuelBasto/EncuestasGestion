// Configuración de la API
const API_BASE_URL = window.location.origin + '/api';

// Variables globales
let surveyResults = null;
let refreshInterval = null;

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

// Obtener token de la URL
function getTokenFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token');
}

// Cargar resultados públicos
async function loadPublicResults(token) {
    try {
        console.log('🔍 Cargando resultados públicos con token:', token.substring(0, 10) + '...');
        
        const response = await fetch(`${API_BASE_URL}/responses/results/${token}`);

        console.log('📊 Respuesta del servidor:', response.status);
        const data = await response.json();
        console.log('📊 Datos recibidos:', data);
        
        if (data.ok) {
            surveyResults = data;
            renderResults();
        } else {
            console.error('❌ Error en respuesta:', data);
            showError(data.message || 'Resultados no encontrados');
            setTimeout(() => {
                window.location.href = '/';
            }, 2500);
        }
    } catch (error) {
        console.error('❌ Error cargando resultados:', error);
        showError('Error de conexión: ' + error.message);
    }
}

// Renderizar resultados
function renderResults() {
    if (!surveyResults) return;

    console.log('🎨 Renderizando resultados públicos...');
    console.log('📊 SurveyResults:', surveyResults);
    console.log('📊 Encuesta:', surveyResults.encuesta);

    const encuesta = surveyResults.encuesta;
    const estadisticas = encuesta?.estadisticas || {};

    // Actualizar título
    document.getElementById('surveyTitle').textContent = encuesta.titulo;

    const resultsContent = document.getElementById('resultsContent');
    resultsContent.innerHTML = `
        <div class="stats-overview">
            <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                    <h3>${estadisticas.total_respuestas || 0}</h3>
                    <p>Respuestas Totales</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">❓</div>
                <div class="stat-content">
                    <h3>${estadisticas.total_preguntas || 0}</h3>
                    <p>Preguntas</p>
                </div>
            </div>
        </div>

        <div class="questions-results">
            ${encuesta.preguntas?.map(question => renderQuestionResult(question)).join('') || ''}
        </div>
    `;
}

// Renderizar resultado de pregunta
function renderQuestionResult(question) {
    console.log('🔍 Renderizando pregunta pública:', question.id, question.enunciado);
    console.log('📊 Estadísticas de pregunta:', question.estadisticas);
    
    const questionStats = question.estadisticas || {};
    
    return `
        <div class="question-result">
            <div class="question-header">
                <h3>${question.enunciado}</h3>
                <span class="question-type">${getQuestionTypeLabel(question.tipo)}</span>
            </div>
            
            <div class="question-chart">
                ${renderQuestionChart(question, questionStats)}
            </div>
        </div>
    `;
}

// Renderizar gráfica de pregunta
function renderQuestionChart(question, stats) {
    console.log('📊 Renderizando gráfica pública para pregunta:', question.id, 'Tipo:', question.tipo);
    console.log('📊 Stats recibidos:', stats);
    
    if (question.tipo === 'texto_abierto') {
        const textos = stats.textos || [];
        return `
            <div class="text-responses">
                <h4>Respuestas de texto:</h4>
                <div class="text-list">
                    ${textos.map(texto => `
                        <div class="text-item">
                            <span class="text-content">"${texto.texto}"</span>
                            <span class="text-count">${texto.frecuencia} vez${texto.frecuencia !== 1 ? 'es' : ''}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        const opciones = stats.opciones || [];
        const totalResponses = opciones.reduce((sum, opcion) => sum + parseInt(opcion.total_selecciones), 0);
        
        return `
            <div class="chart-container">
                ${opciones.map(opcion => {
                    const count = parseInt(opcion.total_selecciones);
                    const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
                    return `
                        <div class="chart-bar">
                            <div class="bar-label">${opcion.texto}</div>
                            <div class="bar-container">
                                <div class="bar-fill" style="width: ${percentage}%"></div>
                                <div class="bar-text">${count} (${percentage.toFixed(1)}%)</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
}

// Obtener etiqueta del tipo de pregunta
function getQuestionTypeLabel(tipo) {
    const labels = {
        'seleccion_unica': 'Selección Única',
        'seleccion_multiple': 'Selección Múltiple',
        'texto_abierto': 'Texto Abierto'
    };
    return labels[tipo] || tipo;
}

// Iniciar actualización automática
function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    refreshInterval = setInterval(async () => {
        const token = getTokenFromURL();
        if (token) {
            await loadPublicResults(token);
        }
    }, 30000); // Actualizar cada 30 segundos
}

// Detener actualización automática
function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    const token = getTokenFromURL();
    
    if (!token) {
        showError('Token de resultados no válido');
        setTimeout(() => {
            window.location.href = '/';
        }, 2500);
        return;
    }

    loadPublicResults(token);
    startAutoRefresh();

    // Limpiar interval al cerrar la página
    window.addEventListener('beforeunload', stopAutoRefresh);
});
