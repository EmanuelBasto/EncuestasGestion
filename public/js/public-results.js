// Configuración de la API
const API_BASE_URL = window.location.origin + '/api';

// Variables globales
let surveyResults = null;
let refreshInterval = null;

// Mapa global de charts por pregunta
const questionCharts = new Map();
const questionChartData = new Map(); // { labels, counts, colors }
const selectedChartType = new Map(); // preguntaId -> tipo elegido

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
                ${renderQuestionChart(question, questionStats, savedType)}
            </div>
        </div>
    `;
}

// Renderizar gráfica de pregunta
function renderQuestionChart(question, stats, savedType = null) {
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
