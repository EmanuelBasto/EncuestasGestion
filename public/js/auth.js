// Configuración de la API
const API_BASE_URL = window.location.origin + '/api';

// Utilidades
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
}

function hideError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.classList.remove('show');
    }
}

function showLoading(buttonId, loadingId) {
    const button = document.getElementById(buttonId);
    const loading = document.getElementById(loadingId);
    
    if (button) button.disabled = true;
    if (loading) loading.style.display = 'block';
}

function hideLoading(buttonId, loadingId) {
    const button = document.getElementById(buttonId);
    const loading = document.getElementById(loadingId);
    
    if (button) button.disabled = false;
    if (loading) loading.style.display = 'none';
}

function showSuccess(message) {
    // Crear elemento de éxito temporal
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message show';
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

// Funcionalidad de mostrar/ocultar contraseña
function setupPasswordToggle(toggleId, inputId) {
    const toggle = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    
    if (toggle && input) {
        toggle.addEventListener('click', () => {
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            toggle.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }
}

// Validaciones
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    // Mínimo 6 caracteres, máximo 12 caracteres
    if (password.length < 6 || password.length > 12) {
        return { valid: false, message: 'La contraseña debe tener entre 6 y 12 caracteres' };
    }
    
    // Al menos una letra mayúscula
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'La primera letra debe ser mayúscula' };
    }
    
    // No permitir caracteres especiales (!,?,/,$,)
    if (/[!?\/$,]/.test(password)) {
        return { valid: false, message: 'La contraseña no puede contener caracteres especiales (!,?,/,$,)' };
    }
    
    return { valid: true };
}

function validatePasswordsMatch(password, confirmPassword) {
    return password === confirmPassword;
}

// Funcionalidad de Login
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const resetModal = document.getElementById('resetModal');
    const closeModal = document.getElementById('closeModal');
    const resetForm = document.getElementById('resetForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Limpiar errores
            hideError('emailError');
            hideError('passwordError');
            
            // Validaciones
            let hasErrors = false;
            
            if (!email) {
                showError('emailError', 'El correo es requerido');
                hasErrors = true;
            } else if (!validateEmail(email)) {
                showError('emailError', 'El correo no es válido');
                hasErrors = true;
            }
            
            if (!password) {
                showError('passwordError', 'La contraseña es requerida');
                hasErrors = true;
            }
            
            if (hasErrors) return;
            
            // Enviar datos
            showLoading('loginBtn', 'loading');
            
            try {
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (data.ok) {
                    // Guardar token
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    showSuccess('¡Login exitoso!');
                    
                    // Redirigir después de un momento
                    setTimeout(() => {
                        window.location.href = '/dashboard'; // O la página principal
                    }, 1000);
                } else {
                    showError('passwordError', data.message || 'Credenciales incorrectas');
                }
            } catch (error) {
                console.error('Error en login:', error);
                showError('passwordError', 'Error de conexión');
            } finally {
                hideLoading('loginBtn', 'loading');
            }
        });
    }

    // Modal de reset de contraseña
    if (forgotPasswordLink && resetModal) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            resetModal.style.display = 'flex';
        });
    }

    if (closeModal && resetModal) {
        closeModal.addEventListener('click', () => {
            resetModal.style.display = 'none';
        });
    }

    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('resetEmail').value;
            
            hideError('resetEmailError');
            
            if (!email) {
                showError('resetEmailError', 'El correo es requerido');
                return;
            }
            
            if (!validateEmail(email)) {
                showError('resetEmailError', 'El correo no es válido');
                return;
            }
            
            showLoading('resetBtn', 'resetLoading');
            
            try {
                const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email })
                });
                
                const data = await response.json();
                
                if (data.ok) {
                    showSuccess('Se ha enviado un correo con las instrucciones');
                    resetModal.style.display = 'none';
                    resetForm.reset();
                } else {
                    showError('resetEmailError', data.message || 'Error al enviar el correo');
                }
            } catch (error) {
                console.error('Error en forgot-password:', error);
                showError('resetEmailError', 'Error de conexión');
            } finally {
                hideLoading('resetBtn', 'resetLoading');
            }
        });
    }
}

// Funcionalidad de Registro
function setupRegisterForm() {
    const registerForm = document.getElementById('registerForm');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nombre = document.getElementById('nombre').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Limpiar errores
            hideError('nombreError');
            hideError('emailError');
            hideError('passwordError');
            hideError('confirmPasswordError');
            
            // Validaciones
            let hasErrors = false;
            
            if (!nombre.trim()) {
                showError('nombreError', 'El nombre es requerido');
                hasErrors = true;
            }
            
            if (!email) {
                showError('emailError', 'El correo es requerido');
                hasErrors = true;
            } else if (!validateEmail(email)) {
                showError('emailError', 'El correo no es válido');
                hasErrors = true;
            }
            
            if (!password) {
                showError('passwordError', 'La contraseña es requerida');
                hasErrors = true;
            } else {
                const passwordValidation = validatePassword(password);
                if (!passwordValidation.valid) {
                    showError('passwordError', passwordValidation.message);
                    hasErrors = true;
                }
            }
            
            if (!confirmPassword) {
                showError('confirmPasswordError', 'Confirma tu contraseña');
                hasErrors = true;
            } else if (!validatePasswordsMatch(password, confirmPassword)) {
                showError('confirmPasswordError', 'Las contraseñas no coinciden');
                hasErrors = true;
            }
            
            if (hasErrors) return;
            
            // Enviar datos
            showLoading('registerBtn', 'loading');
            
            try {
                const response = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        nombre: nombre.trim(), 
                        email, 
                        password, 
                        confirmPassword 
                    })
                });
                
                const data = await response.json();
                
                if (data.ok) {
                    // Guardar token
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    showSuccess('¡Cuenta creada exitosamente!');
                    
                    // Redirigir después de un momento
                    setTimeout(() => {
                        window.location.href = '/dashboard'; // O la página principal
                    }, 1000);
                } else {
                    if (data.errors && data.errors.length > 0) {
                        data.errors.forEach(error => {
                            const field = error.path || error.param;
                            showError(`${field}Error`, error.msg);
                        });
                    } else {
                        showError('emailError', data.message || 'Error al crear la cuenta');
                    }
                }
            } catch (error) {
                console.error('Error en registro:', error);
                showError('emailError', 'Error de conexión');
            } finally {
                hideLoading('registerBtn', 'loading');
            }
        });
    }
}

// Funcionalidad de Reset de Contraseña
function setupResetForm() {
    const resetForm = document.getElementById('resetForm');

    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Obtener token de la URL
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            
            if (!token) {
                showError('passwordError', 'Token no válido');
                return;
            }
            
            // Limpiar errores
            hideError('passwordError');
            hideError('confirmPasswordError');
            
            // Validaciones
            let hasErrors = false;
            
            if (!password) {
                showError('passwordError', 'La contraseña es requerida');
                hasErrors = true;
            } else {
                const passwordValidation = validatePassword(password);
                if (!passwordValidation.valid) {
                    showError('passwordError', passwordValidation.message);
                    hasErrors = true;
                }
            }
            
            if (!confirmPassword) {
                showError('confirmPasswordError', 'Confirma tu contraseña');
                hasErrors = true;
            } else if (!validatePasswordsMatch(password, confirmPassword)) {
                showError('confirmPasswordError', 'Las contraseñas no coinciden');
                hasErrors = true;
            }
            
            if (hasErrors) return;
            
            // Enviar datos
            showLoading('resetBtn', 'loading');
            
            try {
                const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        token, 
                        password, 
                        confirmPassword 
                    })
                });
                
                const data = await response.json();
                
                if (data.ok) {
                    showSuccess('¡Contraseña restablecida exitosamente!');
                    
                    // Redirigir al login después de un momento
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                } else {
                    showError('passwordError', data.message || 'Error al restablecer la contraseña');
                }
            } catch (error) {
                console.error('Error en reset-password:', error);
                showError('passwordError', 'Error de conexión');
            } finally {
                hideLoading('resetBtn', 'loading');
            }
        });
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Configurar toggles de contraseña
    setupPasswordToggle('togglePassword', 'password');
    setupPasswordToggle('toggleConfirmPassword', 'confirmPassword');
    
    // Configurar formularios según la página
    if (document.getElementById('loginForm')) {
        setupLoginForm();
    }
    
    if (document.getElementById('registerForm')) {
        setupRegisterForm();
    }
    
    if (document.getElementById('resetForm')) {
        setupResetForm();
    }
    
    // Verificar si hay token guardado (usuario ya logueado)
    const token = localStorage.getItem('token');
    if (token && window.location.pathname.includes('login.html')) {
        // Si ya está logueado, redirigir
        window.location.href = '/dashboard';
    }
});
