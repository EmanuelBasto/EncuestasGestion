// Configuración de la API
const API_BASE_URL = window.location.origin + '/api';

// Variables globales
let encuestas = [];
let currentSurveyId = null;

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
        console.log('No hay token en localStorage');
        window.location.href = 'index.html';
        return false;
    }
    
    // Verificar si el token es válido haciendo una petición al servidor
    fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (!data.ok) {
            console.log('Token inválido, redirigiendo al login');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        } else {
            console.log('Token válido, usuario autenticado:', data.user);
        }
    })
    .catch(error => {
        console.error('Error verificando token:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });
    
    return true;
}

// Obtener encuestas del usuario
async function loadSurveys() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/surveys`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.ok) {
            encuestas = data.encuestas;
            renderSurveys();
        } else {
            showError('Error al cargar las encuestas');
        }
    } catch (error) {
        console.error('Error cargando encuestas:', error);
        showError('Error de conexión');
    }
}

// Renderizar lista de encuestas
function renderSurveys() {
    const surveysContainer = document.querySelector('.surveys-container');
    if (!surveysContainer) return;

    if (encuestas.length === 0) {
        surveysContainer.innerHTML = `
            <div class="no-surveys">
                <p>No tienes encuestas creadas aún.</p>
                <p>Haz clic en el botón azul para crear tu primera encuesta.</p>
            </div>
        `;
        return;
    }

    surveysContainer.innerHTML = encuestas.map(encuesta => `
        <div class="survey-card" data-id="${encuesta.id}">
            <div class="survey-header">
                <h3>${encuesta.titulo}</h3>
                <div class="survey-status ${encuesta.activa ? 'active' : 'inactive'}">
                    ${encuesta.activa ? 'Activa' : 'Inactiva'}
                </div>
            </div>
            <div class="survey-stats">
                <span>📝 ${encuesta.total_preguntas} preguntas</span>
                <span>📊 ${encuesta.total_respuestas} respuestas</span>
                <span>📅 ${new Date(encuesta.creada_en).toLocaleDateString()}</span>
            </div>
            <div class="survey-actions">
                <button class="btn-edit" onclick="editSurvey(${encuesta.id})">
                    ✏️ Editar
                </button>
                <button class="btn-results" onclick="viewResults(${encuesta.id})">
                    📊 Ver Resultados
                </button>
                <button class="btn-share" onclick="shareSurvey(${encuesta.id})">
                    🔗 Compartir
                </button>
                <button class="btn-delete" onclick="deleteSurvey(${encuesta.id})">
                    🗑️ Eliminar
                </button>
            </div>
        </div>
    `).join('');
}

// Crear nueva encuesta
async function createSurvey() {
    const titulo = prompt('Ingresa el título de tu encuesta:');
    if (!titulo || titulo.trim() === '') return;

    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            showError('No hay token de autenticación. Por favor, inicia sesión nuevamente.');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/surveys`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ titulo: titulo.trim() })
        });

        const data = await response.json();
        
        if (data.ok) {
            showSuccess('¡Encuesta creada exitosamente!');
            await loadSurveys();
            // Redirigir a editar la encuesta
            setTimeout(() => {
                window.location.href = `crear_encuesta.html?id=${data.encuesta.id}`;
            }, 1000);
        } else {
            showError(data.message || 'Error al crear la encuesta');
        }
    } catch (error) {
        console.error('Error creando encuesta:', error);
        showError('Error de conexión');
    }
}

// Editar encuesta
function editSurvey(id) {
    window.location.href = `crear_encuesta.html?id=${id}`;
}

// Ver resultados
function viewResults(id) {
    window.location.href = `respuestas_encuesta.html?id=${id}`;
}

// Compartir encuesta
function shareSurvey(id) {
    window.location.href = `compartir_encuesta.html?id=${id}`;
}

// Eliminar encuesta
async function deleteSurvey(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta encuesta? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/surveys/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.ok) {
            showSuccess('Encuesta eliminada correctamente');
            await loadSurveys();
        } else {
            showError(data.message || 'Error al eliminar la encuesta');
        }
    } catch (error) {
        console.error('Error eliminando encuesta:', error);
        showError('Error de conexión');
    }
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;
    
    // Configurar botón de crear encuesta
    const addButton = document.querySelector('.boton-add');
    if (addButton) {
        addButton.addEventListener('click', createSurvey);
    }

    // Configurar botón de logout si existe
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Cargar encuestas
    loadSurveys();
});
