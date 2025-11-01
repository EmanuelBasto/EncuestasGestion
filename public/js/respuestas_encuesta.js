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

    // Guardar el tipo de gráfica global seleccionado antes de limpiar
    const globalSelect = document.getElementById('globalChartType');
    const savedGlobalType = globalSelect ? globalSelect.value : '';

    // Limpiar gráficas anteriores antes de renderizar nuevas
    questionCharts.forEach((chart, questionId) => {
        if (chart) {
            chart.destroy();
        }
    });
    questionCharts.clear();
    questionChartData.clear();
    
    // Guardar los tipos seleccionados antes de limpiar
    const savedTypes = new Map(selectedChartType);
    selectedChartType.clear();

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
        </div>

        <div class="global-chart-selector">
            <label for="globalChartType" class="global-chart-label">Tipo de gráfica para todas las preguntas:</label>
            <select id="globalChartType" class="global-chart-select" onchange="changeAllCharts(this.value)">
                <option value="">Selecciona una opción</option>
                <option value="doughnut">Rosca</option>
                <option value="pie">Circular</option>
                <option value="bar">Barras Verticales</option>
                <option value="bar_horizontal">Barras Horizontales</option>
                <option value="line">Línea</option>
                <option value="radar">Radar</option>
                <option value="polarArea">Área Polar</option>
                <option value="scatter">Dispersión</option>
                <option value="bubble">Burbujas</option>
            </select>
        </div>

        <div class="questions-results">
            ${encuesta.preguntas?.map(question => renderQuestionResult(question, savedTypes.get(question.id))).join('') || ''}
        </div>
    `;
    
    // Restaurar el tipo de gráfica global seleccionado
    setTimeout(() => {
        const newGlobalSelect = document.getElementById('globalChartType');
        if (newGlobalSelect && savedGlobalType) {
            newGlobalSelect.value = savedGlobalType;
        }
    }, 0);
}

// Renderizar resultado de pregunta
function renderQuestionResult(question, savedType = null) {
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
                ${renderQuestionChart(question, questionStats, savedType)}
            </div>
        </div>
    `;
}

// Renderizar gráfica de pregunta
function renderQuestionChart(question, stats, savedType = null) {
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
                            <span class="text-count">${Number(texto.frecuencia)} ${Number(texto.frecuencia) === 1 ? 'vez' : 'veces'}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        const opciones = stats.opciones || [];
        const canvasId = `chart-q${question.id}`;
        const selectId = `chart-type-q${question.id}`;
        const chosenType = savedType || selectedChartType.get(question.id) || 'doughnut';
        
        setTimeout(() => {
            initSingleChart(question.id, opciones, chosenType);
            // Respaldo: añadir listener programático por si el inline no dispara
            const sel = document.getElementById(`chart-type-q${question.id}`);
            if (sel) {
                sel.value = chosenType;
                if (!sel._listenerAttached) {
                    sel.addEventListener('change', (e) => changeChartType(question.id, e.target.value));
                    sel._listenerAttached = true;
                }
            }
        }, 0);
        
        return `
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; gap: 8px; align-items: center; justify-content: flex-end;">
                    <label for="${selectId}" style="font-size: 0.9em; color: #555;">Tipo de gráfica:</label>
                    <select id="${selectId}" onchange="changeChartType(${question.id}, this.value)" style="padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 6px;">
                        <option value="doughnut">Rosca</option>
                        <option value="pie">Circular</option>
                        <option value="bar">Barras Verticales</option>
                        <option value="bar_horizontal">Barras Horizontales</option>
                        <option value="line">Línea</option>
                        <option value="radar">Radar</option>
                        <option value="polarArea">Área Polar</option>
                        <option value="scatter">Dispersión</option>
                        <option value="bubble">Burbujas</option>
                    </select>
                </div>
                <div style="background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 8px; max-width: 420px;">
                    <canvas id="${canvasId}" style="width: 100%; height: 160px;"></canvas>
                </div>
            </div>
        `;
    }
}

// Mapa global de charts por pregunta
const questionCharts = new Map();
const questionChartData = new Map(); // { labels, counts, colors }
const selectedChartType = new Map(); // preguntaId -> tipo elegido

// Inicializa una sola gráfica con tipo seleccionable
function initSingleChart(questionId, opcionesStats, chartType) {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById(`chart-q${questionId}`);
    if (!canvas) return;

    // Destruir previa si existe
    const existing = questionCharts.get(questionId);
    if (existing) {
        existing.destroy();
        questionCharts.delete(questionId);
    }

    const labels = opcionesStats.map(o => o.texto);
    const counts = opcionesStats.map(o => parseInt(o.total_selecciones));
    const colors = ['#4F46E5','#22C55E','#F59E0B','#EF4444','#06B6D4','#8B5CF6','#F43F5E','#10B981'];
    const palette = labels.map((_, i) => colors[i % colors.length]);

    // Guardar datos base para futuros cambios de tipo
    questionChartData.set(questionId, { labels, counts, colors: palette });

    const config = buildChartConfig(chartType, labels, counts, palette);
    const chart = new Chart(canvas.getContext('2d'), config);
    questionCharts.set(questionId, chart);
}

// Cambiar tipo de gráfica por pregunta
function changeChartType(questionId, newType) {
    const chart = questionCharts.get(questionId);
    const base = questionChartData.get(questionId);
    if (!base) return;
    if (chart) {
        chart.destroy();
    }
    const canvas = document.getElementById(`chart-q${questionId}`);
    if (!canvas) return;
    const config = buildChartConfig(newType, base.labels, base.counts, base.colors);
    const newChart = new Chart(canvas.getContext('2d'), config);
    questionCharts.set(questionId, newChart);
    selectedChartType.set(questionId, newType);
}

// Cambiar todas las gráficas al mismo tipo
function changeAllCharts(newType) {
    // Si no se seleccionó nada, no hacer nada
    if (!newType || newType === '') {
        return;
    }
    
    // Actualizar el selector global
    const globalSelect = document.getElementById('globalChartType');
    if (globalSelect) {
        globalSelect.value = newType;
    }
    
    // Cambiar todas las gráficas que tienen datos
    questionChartData.forEach((data, questionId) => {
        changeChartType(questionId, newType);
        
        // Actualizar también el selector individual de cada pregunta
        const individualSelect = document.getElementById(`chart-type-q${questionId}`);
        if (individualSelect) {
            individualSelect.value = newType;
        }
    });
}

// Construir configuración según tipo
function buildChartConfig(type, labels, counts, colors) {
    let chartType = type;
    let options = { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };
    let datasets;

    if (type === 'scatter') {
        datasets = [{
            label: 'Puntos',
            data: counts.map((y, i) => ({ x: i + 1, y })),
            backgroundColor: colors,
        }];
        options = { scales: { x: { beginAtZero: true }, y: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { display: false } } };
    } else if (type === 'bubble') {
        datasets = [{
            label: 'Burbujas',
            data: counts.map((y, i) => ({ x: i + 1, y, r: Math.max(6, Math.min(20, y * 2)) })),
            backgroundColor: colors,
        }];
        options = { scales: { x: { beginAtZero: true }, y: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { display: false } } };
    } else if (type === 'radar') {
        datasets = [{ label: 'Selecciones', data: counts, backgroundColor: colors[0] + '55', borderColor: colors[0], borderWidth: 2 }];
    } else if (type === 'polarArea') {
        datasets = [{ data: counts, backgroundColor: colors }];
    } else if (type === 'line') {
        datasets = [{ label: 'Selecciones', data: counts, backgroundColor: colors[0], borderColor: colors[0], fill: false, tension: 0.3 }];
        options = { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { display: false } } };
    } else if (type === 'bar_horizontal') {
        chartType = 'bar';
        datasets = [{ label: 'Selecciones', data: counts, backgroundColor: colors, borderColor: colors, borderWidth: 1 }];
        options = { indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { display: false } } };
    } else if (type === 'bar') {
        datasets = [{ label: 'Selecciones', data: counts, backgroundColor: colors, borderColor: colors, borderWidth: 1 }];
        options = { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { display: false } } };
    } else { // pie / doughnut
        datasets = [{ data: counts, backgroundColor: colors }];
    }

    return {
        type: chartType,
        data: { labels, datasets },
        options
    };
}

// Exponer funciones al ámbito global para uso desde HTML inline
window.changeChartType = changeChartType;
window.initSingleChart = initSingleChart;
window.changeAllCharts = changeAllCharts;

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
    // Limpiar intervalo anterior si existe
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    // Actualizar inmediatamente y luego cada 30 segundos
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
        loadSurvey(surveyId).then(() => {
            // Iniciar actualización automática después de cargar los datos iniciales
            startAutoRefresh();
        });
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

    // Configurar botón de volver a encuestas
    const backBtn = document.getElementById('backToSurveysBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'encuesta.html';
        });
    }

    // Limpiar interval al cerrar la página
    window.addEventListener('beforeunload', stopAutoRefresh);
});
