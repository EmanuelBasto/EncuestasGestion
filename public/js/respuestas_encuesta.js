// Configuración de la API
const API_BASE_URL = window.location.origin + '/api';

// Variables globales
let currentSurvey = null;
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
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
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

// Cargar encuesta
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
            updateSurveyTitle();
            await loadResults();
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
    }
}

// Cargar resultados
async function loadResults() {
    if (!currentSurvey) return;

    try {
        console.log('🔍 Cargando resultados para encuesta:', currentSurvey.id);
        console.log('🔗 Enlaces disponibles:', currentSurvey.enlaces);
        
        // Usar el token de resultados si está disponible, sino usar el token correcto
        const resultsToken = currentSurvey.enlaces?.resultados || 'bc7db8bc17682befd8ac93269cc3d18c18458be1b18d675137d8c0166f7d2722';
        
        console.log('🔑 Usando token de resultados:', resultsToken.substring(0, 10) + '...');
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/responses/results/${resultsToken}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('📊 Respuesta del servidor:', response.status);
        const data = await response.json();
        console.log('📊 Datos recibidos:', data);
        
        if (data.ok) {
            surveyResults = data;
            renderDashboard();
        } else {
            console.error('❌ Error en respuesta:', data);
            showError('Error al cargar los resultados: ' + (data.message || 'Error desconocido'));
        }
    } catch (error) {
        console.error('❌ Error cargando resultados:', error);
        showError('Error de conexión: ' + error.message);
    }
}

// Renderizar dashboard
function renderDashboard() {
    if (!surveyResults) return;

    console.log('🎨 Renderizando dashboard...');
    console.log('📊 SurveyResults:', surveyResults);
    console.log('📊 Encuesta:', surveyResults.encuesta);
    console.log('📊 Estadísticas:', surveyResults.encuesta?.estadisticas);

    const dashboardContainer = document.querySelector('.dashboard-container');
    if (!dashboardContainer) return;

    const encuesta = surveyResults.encuesta;
    const estadisticas = encuesta?.estadisticas || {};

    dashboardContainer.innerHTML = `
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
            <div class="stat-card">
                <div class="stat-icon">📈</div>
                <div class="stat-content">
                    <h3>${estadisticas.primera_respuesta ? new Date(estadisticas.primera_respuesta).toLocaleDateString() : 'N/A'}</h3>
                    <p>Primera Respuesta</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🕒</div>
                <div class="stat-content">
                    <h3>${estadisticas.ultima_respuesta ? new Date(estadisticas.ultima_respuesta).toLocaleDateString() : 'N/A'}</h3>
                    <p>Última Respuesta</p>
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
    console.log('🔍 Renderizando pregunta:', question.id, question.enunciado);
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
    console.log('📊 Renderizando gráfica para pregunta:', question.id, 'Tipo:', question.tipo);
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
        await loadResults();
    }, 30000); // Actualizar cada 30 segundos
}

// Detener actualización automática
function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Navegación
function goToQuestions() {
    if (currentSurvey) {
        window.location.href = `crear_encuesta.html?id=${currentSurvey.id}`;
    }
}

function goToShare() {
    if (currentSurvey) {
        window.location.href = `compartir_encuesta.html?id=${currentSurvey.id}`;
    }
}

// Exportar datos
function exportData() {
    if (!surveyResults) return;
    
    const dataStr = JSON.stringify(surveyResults, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `encuesta_${currentSurvey.titulo}_resultados.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showSuccess('Datos exportados correctamente');
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;
    
    const surveyId = getSurveyIdFromURL();
    if (surveyId) {
        loadSurvey(surveyId);
        startAutoRefresh();
    } else {
        showError('ID de encuesta no válido');
        setTimeout(() => {
            window.location.href = 'encuesta.html';
        }, 2000);
    }

    // Configurar navegación
    const navItems = document.querySelectorAll('nav ul li');
    navItems.forEach((item, index) => {
        if (index === 0) { // Preguntas
            item.addEventListener('click', goToQuestions);
        } else if (index === 2) { // Compartir
            item.addEventListener('click', goToShare);
        }
    });

    // Configurar botón de exportar
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }

    // Limpiar interval al cerrar la página
    window.addEventListener('beforeunload', stopAutoRefresh);
});
