// Configuración de la API
const API_BASE_URL = window.location.origin + '/api';

// Variables globales
let currentSurvey = null;

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

// Cargar encuesta
async function loadSurvey(surveyId) {
    try {
        console.log('🔍 Cargando encuesta ID:', surveyId);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        console.log('📊 Datos recibidos:', data);
        
        if (data.ok) {
            currentSurvey = data.encuesta;
            console.log('✅ Encuesta cargada:', currentSurvey);
            console.log('🔗 Enlaces:', currentSurvey.enlaces);
            updateSurveyTitle();
            renderLinks();
        } else {
            console.error('❌ Error en respuesta:', data);
            showError('Error al cargar la encuesta');
        }
    } catch (error) {
        console.error('❌ Error cargando encuesta:', error);
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

// Renderizar enlaces
function renderLinks() {
    console.log('🔗 Renderizando enlaces...');
    console.log('📊 Current survey:', currentSurvey);
    console.log('🔗 Enlaces disponibles:', currentSurvey?.enlaces);
    
    if (!currentSurvey || !currentSurvey.enlaces) {
        console.error('❌ No hay enlaces disponibles');
        console.log('🔍 Current survey existe:', !!currentSurvey);
        console.log('🔍 Enlaces existe:', !!currentSurvey?.enlaces);
        return;
    }

    const publicLink = `${window.location.origin}/public-survey.html?token=${currentSurvey.enlaces.publico}`;
    const resultsLink = `${window.location.origin}/public-results.html?token=${currentSurvey.enlaces.resultados}`;

    console.log('🔗 Enlace público:', publicLink);
    console.log('🔗 Enlace resultados:', resultsLink);

    // Actualizar enlace público - usar selector más específico
    const publicInput = document.querySelector('input[value="Cargando enlace..."]');
    console.log('🔍 Buscando input público:', publicInput);
    if (publicInput) {
        publicInput.value = publicLink;
        console.log('✅ Enlace público actualizado:', publicLink);
    } else {
        console.error('❌ No se encontró el input del enlace público');
        // Buscar todos los inputs para debuggear
        const allInputs = document.querySelectorAll('.link-input');
        console.log('🔍 Todos los inputs encontrados:', allInputs);
        allInputs.forEach((input, index) => {
            console.log(`🔍 Input ${index}:`, input, 'Valor:', input.value);
        });
    }

    // Actualizar enlace de resultados - buscar el segundo input
    const allInputs = document.querySelectorAll('.link-input');
    const resultsInput = allInputs[1]; // El segundo input
    console.log('🔍 Buscando input resultados:', resultsInput);
    if (resultsInput) {
        resultsInput.value = resultsLink;
        console.log('✅ Enlace resultados actualizado:', resultsLink);
    } else {
        console.error('❌ No se encontró el input del enlace resultados');
        console.log('🔍 Total de inputs encontrados:', allInputs.length);
    }

    // Configurar botones
    setupCopyButtons();
    setupActionButtons(resultsLink);
}

// Configurar botones de copiar
function setupCopyButtons() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const linkContainer = this.closest('.link-container');
            const input = linkContainer.querySelector('.link-input');
            
            if (input) {
                input.select();
                input.setSelectionRange(0, 99999); // Para móviles
                
                try {
                    document.execCommand('copy');
                    showSuccess('Enlace copiado al portapapeles');
                } catch (err) {
                    // Fallback para navegadores modernos
                    navigator.clipboard.writeText(input.value).then(() => {
                        showSuccess('Enlace copiado al portapapeles');
                    }).catch(() => {
                        showError('No se pudo copiar el enlace');
                    });
                }
            }
        });
    });
}

// Configurar botones de acción
function setupActionButtons(resultsLink) {
    const goBtn = document.querySelector('.link-item:nth-child(2) .copy-btn:first-child');
    if (goBtn) {
        goBtn.addEventListener('click', function() {
            window.open(resultsLink, '_blank');
        });
    }
}

// Copiar enlace específico
function copyLink(type) {
    if (!currentSurvey || !currentSurvey.enlaces) return;

    let linkToCopy = '';
    if (type === 'public') {
        linkToCopy = `${window.location.origin}/public-survey.html?token=${currentSurvey.enlaces.publico}`;
    } else if (type === 'results') {
        linkToCopy = `${window.location.origin}/public-results.html?token=${currentSurvey.enlaces.resultados}`;
    }

    if (linkToCopy) {
        try {
            navigator.clipboard.writeText(linkToCopy).then(() => {
                showSuccess('Enlace copiado al portapapeles');
            }).catch(() => {
                // Fallback
                const textArea = document.createElement('textarea');
                textArea.value = linkToCopy;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showSuccess('Enlace copiado al portapapeles');
            });
        } catch (err) {
            showError('No se pudo copiar el enlace');
        }
    }
}

// Ir a resultados
function goToResults() {
    if (!currentSurvey || !currentSurvey.enlaces) return;
    
    const resultsLink = `${window.location.origin}/public-results.html?token=${currentSurvey.enlaces.resultados}`;
    window.open(resultsLink, '_blank');
}

// Compartir en redes sociales
function shareOnSocial(platform) {
    if (!currentSurvey || !currentSurvey.enlaces) return;

    const publicLink = `${window.location.origin}/public-survey.html?token=${currentSurvey.enlaces.publico}`;
    const text = `¡Participa en mi encuesta: "${currentSurvey.titulo}"!`;
    
    let shareUrl = '';
    
    switch (platform) {
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(publicLink)}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicLink)}`;
            break;
        case 'whatsapp':
            shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + publicLink)}`;
            break;
        case 'linkedin':
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicLink)}`;
            break;
    }
    
    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }
}

// Generar código QR
function generateQR() {
    if (!currentSurvey || !currentSurvey.enlaces) return;

    const publicLink = `${window.location.origin}/public-survey.html?token=${currentSurvey.enlaces.publico}`;
    
    // Crear modal para mostrar QR
    const modal = document.createElement('div');
    modal.className = 'qr-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; max-width: 400px;">
            <h3>Código QR para tu encuesta</h3>
            <div id="qrcode" style="margin: 20px 0;"></div>
            <p style="font-size: 12px; color: #666; margin-bottom: 20px;">
                Escanea este código para acceder a la encuesta
            </p>
            <button onclick="this.closest('.qr-modal').remove()" 
                    style="background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                Cerrar
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Generar QR usando una API gratuita
    const qrImg = document.createElement('img');
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicLink)}`;
    qrImg.alt = 'Código QR';
    document.getElementById('qrcode').appendChild(qrImg);
}

// Navegación
function goToQuestions() {
    if (currentSurvey) {
        window.location.href = `crear_encuesta.html?id=${currentSurvey.id}`;
    }
}

function goToResponses() {
    if (currentSurvey) {
        window.location.href = `respuestas_encuesta.html?id=${currentSurvey.id}`;
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
        if (index === 0) { // Preguntas
            item.addEventListener('click', goToQuestions);
        } else if (index === 1) { // Respuestas
            item.addEventListener('click', goToResponses);
        }
    });
});
