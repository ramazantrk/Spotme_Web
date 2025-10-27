  import AppConfig from '../appconfig.js';
  
  
  const API_BASE_URL = AppConfig.API_BASE_URL;
        
        document.addEventListener('DOMContentLoaded', function() {
            // Check if already logged in
            if (localStorage.getItem('adminToken')) {
                window.location.href = 'admin-feedback.html';
                return;
            }

            setupLoginForm();
        });

        function setupLoginForm() {
            document.getElementById('loginForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value.trim();
                
                if (!username || !password) {
                    showError('Kullanıcı adı ve şifre gereklidir!');
                    return;
                }

                await login(username, password);
            });

            // Demo credentials quick fill (for development)
            document.addEventListener('keydown', function(e) {
                if (e.ctrlKey && e.key === 'd') {
                    e.preventDefault();
                    document.getElementById('username').value = 'admin';
                    document.getElementById('password').value = 'admin123';
                }
            });
        }

async function login(username, password) {
    showLoading(true);
    hideMessages();

    try {
        const response = await fetch(`${API_BASE_URL}/Auth/admin-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok && data.success && data.token) {
            // ✅ Token başarılı şekilde geldi
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminUser', JSON.stringify({
                username: data.user?.username || username,
                role: data.user?.role || 'admin',
                loginTime: new Date().toISOString()
            }));
            console.log("Token:", localStorage.getItem('adminToken'));


            showSuccess('Giriş başarılı! Yönlendiriliyorsunuz...');
            
            setTimeout(() => {
                window.location.href = 'admin-feedback.html';
            }, 1500);
            return;
        } else {
            // ❌ Yanlış kullanıcı adı/şifre
            showError('Geçersiz kullanıcı adı veya şifre!');
        }

    } catch (error) {
        console.error('Login error:', error);

        // Geliştirme ortamında fallback
        if (username === 'admin' && password === 'admin123') {
            const demoToken = 'demo-token-' + Date.now();
            localStorage.setItem('adminToken', demoToken);
            localStorage.setItem('adminUser', JSON.stringify({
                username: username,
                loginTime: new Date().toISOString(),
                isDemo: true
            }));

            showSuccess('Demo giriş başarılı! Yönlendiriliyorsunuz...');
            setTimeout(() => {
                window.location.href = 'admin-feedback.html';
            }, 1500);
        } else {
            showError('Sunucuya bağlanılamadı!');
        }
    } finally {
        showLoading(false);
    }
}

        function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }

        function showSuccess(message) {
            const successDiv = document.getElementById('successMessage');
            successDiv.textContent = message;
            successDiv.style.display = 'block';
        }

        function hideMessages() {
            document.getElementById('errorMessage').style.display = 'none';
            document.getElementById('successMessage').style.display = 'none';
        }

        function showLoading(show) {
            const loginBtn = document.getElementById('loginBtn');
            const loading = document.getElementById('loading');
            
            loginBtn.disabled = show;
            loading.style.display = show ? 'block' : 'none';
            
            if (show) {
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Giriş yapılıyor...';
            } else {
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Giriş Yap';
            }
        }