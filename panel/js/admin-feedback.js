   import AppConfig from '../appconfig.js';
   
   
   const API_BASE_URL = AppConfig.API_BASE_URL;
        let feedbacks = [];
        let isDemoMode = false;
        
        // Authentication Manager - Kategori sayfasından alınmış
        const AuthManager = {
            checkAuth() {
                const token = this.getToken();
                
                if (!token) {
                    window.location.href = 'admin-login.html';
                    return false;
                }
                
                if (this.isTokenExpired(token)) {
                    this.logout();
                    return false;
                }
                
                return true;
            },

            getToken() {
                return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken') || '';
            },

            getAuthHeaders() {
                const token = this.getToken();
                const headers = {
                    'Content-Type': 'application/json'
                };
                
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                return headers;
            },

            isTokenExpired(token) {
                if (token.startsWith('demo-token-')) {
                    const tokenTime = parseInt(token.split('-')[2]);
                    const now = Date.now();
                    return (now - tokenTime) > 86400000; // 24 hours
                }
                
                try {
                    // JWT token kontrolü için
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const now = Math.floor(Date.now() / 1000);
                    return payload.exp && payload.exp < now;
                } catch (error) {
                    console.warn('Token parse error:', error);
                    return false;
                }
            },

            logout() {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                sessionStorage.removeItem('adminToken');
                sessionStorage.removeItem('adminUser');
                
                showNotification('Oturum süresi doldu, tekrar giriş yapın.', 'error');
                setTimeout(() => {
                    window.location.href = 'admin-login.html';
                }, 2000);
            },

            setupUI() {
                // User bilgilerini göster
                const user = JSON.parse(localStorage.getItem('adminUser') || sessionStorage.getItem('adminUser') || '{}');
                if (user && user.username) {
                    const headerActions = document.getElementById('headerActions');
                    if (headerActions) {
                        headerActions.innerHTML = `
                            <div class="auth-info">
                                <i class="fas fa-user"></i>
                                <span>Hoş geldiniz, <strong>${user.username}</strong></span>
                                ${user.isDemo ? '<span style="color: #f59e0b; font-weight: 600;">(Demo)</span>' : ''}
                            </div>
                            <button onclick="AuthManager.logout()" class="btn btn-secondary btn-sm">
                                <i class="fas fa-sign-out-alt"></i>
                                Çıkış
                            </button>
                        `;
                    }
                }
            }
        };

        // Demo verileri
        const demoFeedbacks = [
            {
                id: 1,
                user: { name: "Ahmet Yılmaz", email: "ahmet@example.com" },
                type: "bug",
                message: "Giriş yaparken sürekli hata alıyorum. Sayfa yenilenmiyor ve işlem tamamlanamıyor.",
                createdAt: new Date().toISOString(),
                isResolved: false,
                adminResponse: null
            },
            {
                id: 2,
                user: { name: "Fatma Demir", email: "fatma@example.com" },
                type: "feature",
                message: "Mobil uygulama için karanlık tema özelliği eklenebilir mi? Gece kullanımında göz yoruyor.",
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                isResolved: true,
                adminResponse: "Harika öneri için teşekkürler! Karanlık tema özelliği bir sonraki güncellemede eklenecek."
            },
            {
                id: 3,
                user: { name: "Mehmet Kaya", email: "mehmet@example.com" },
                type: "complaint",
                message: "Müşteri hizmetlerinden 3 gündür cevap alamıyorum. Bu durum oldukça üzücü.",
                createdAt: new Date(Date.now() - 172800000).toISOString(),
                isResolved: false,
                adminResponse: null
            },
            {
                id: 4,
                user: { name: "Ayşe Şen", email: "ayse@example.com" },
                type: "general",
                message: "Genel olarak sistemi beğeniyorum ancak yükleme hızları biraz yavaş.",
                createdAt: new Date(Date.now() - 259200000).toISOString(),
                isResolved: true,
                adminResponse: "Geri bildiriminiz için teşekkürler. Sunucu performansımızı iyileştirmek için çalışmalarımız devam ediyor."
            }
        ];

        document.addEventListener('DOMContentLoaded', function() {
            // Auth kontrolü
            if (!AuthManager.checkAuth()) {
                return; // Eğer auth başarısız ise sayfa yüklenmesini durdur
            }
            
            // Sayfa yüklendiğinde auth UI'ı kur
            AuthManager.setupUI();
            
            checkAPIConnection();
            setupEventListeners();
        });

        async function checkAPIConnection() {
            try {
                const response = await fetch(`${API_BASE_URL}/UserFeedback/admin/stats`, {
                    method: 'GET',
                    headers: AuthManager.getAuthHeaders()
                });

                if (response.status === 401) {
                    AuthManager.logout();
                    return;
                }

                if (response.ok) {
                    document.getElementById('corsWarning').style.display = 'none';
                    fetchStats();
                    fetchFeedbacks();
                } else {
                    throw new Error(`API Error: ${response.status}`);
                }
            } catch (error) {
                console.error('API bağlantı hatası:', error);
                showAPIError(error);
            }
        }

        function showAPIError(error) {
            const feedbackList = document.getElementById('feedbackList');
            feedbackList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>API Bağlantı Sorunu</h3>
                    <p>Backend API'sine bağlanılamıyor.</p>
                    <p style="font-size: 0.9em; margin-top: 10px; color: #dc3545;">${error.message}</p>
                    <button class="btn btn-primary" onclick="loadDemoData()" style="margin-top: 15px;">
                        <i class="fas fa-play"></i> Demo Modu'na Geç
                    </button>
                </div>
            `;
        }

        function loadDemoData() {
            isDemoMode = true;
            document.getElementById('corsWarning').style.display = 'none';
            
            // Demo istatistikler
            document.getElementById('totalFeedbacks').textContent = demoFeedbacks.length;
            document.getElementById('pendingFeedbacks').textContent = demoFeedbacks.filter(f => !f.isResolved).length;
            document.getElementById('resolvedFeedbacks').textContent = demoFeedbacks.filter(f => f.isResolved).length;
            document.getElementById('todayFeedbacks').textContent = demoFeedbacks.filter(f => 
                new Date(f.createdAt).toDateString() === new Date().toDateString()).length;
            
            feedbacks = demoFeedbacks;
            renderFeedbacks(feedbacks);
            
            showNotification('Demo modu aktif! Örnek verilerle çalışıyorsunuz.', 'info');
        }

        async function fetchStats() {
            if (isDemoMode) return;

            try {
                const response = await fetch(`${API_BASE_URL}/UserFeedback/admin/stats`, {
                    headers: AuthManager.getAuthHeaders()
                });
                
                if (response.status === 401) {
                    AuthManager.logout();
                    return;
                }
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`API istatistikleri yüklenemedi: ${response.status} - ${errorText}`);
                }
                
                const stats = await response.json();
                document.getElementById('totalFeedbacks').textContent = stats.totalCount;
                document.getElementById('pendingFeedbacks').textContent = stats.pendingCount;
                document.getElementById('resolvedFeedbacks').textContent = stats.resolvedCount;
                document.getElementById('todayFeedbacks').textContent = stats.todayCount;
            } catch (error) {
                console.error('İstatistikler yüklenirken hata:', error);
                showNotification(`İstatistikler yüklenirken bir sorun oluştu.`, 'error');
            }
        }

        async function fetchFeedbacks() {
            if (isDemoMode) {
                applyFiltersToDemo();
                return;
            }

            const container = document.getElementById('feedbackList');
            container.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Geri bildirimler yükleniyor...</p>
                </div>
            `;

            const status = document.getElementById('statusFilter').value;
            const type = document.getElementById('typeFilter').value;
            const search = document.getElementById('searchFilter').value;
            const date = document.getElementById('dateFilter').value;

            const queryParams = new URLSearchParams({
                status: status,
                type: type,
                search: search,
                date: date
            }).toString();

            try {
                const response = await fetch(`${API_BASE_URL}/UserFeedback/admin?${queryParams}`, {
                    headers: AuthManager.getAuthHeaders()
                });

                if (response.status === 401) {
                    AuthManager.logout();
                    return;
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    const errorMessage = `API geri bildirim listesi yüklenemedi: ${response.status} - ${errorText}`;
                    throw new Error(errorMessage);
                }
                
                const feedbacksData = await response.json();
                
                // API response formatını kontrol et ve normalize et
                let feedbacksArray = [];
                
                if (Array.isArray(feedbacksData)) {
                    // Direkt array dönerse
                    feedbacksArray = feedbacksData;
                } else if (feedbacksData.feedbacks && Array.isArray(feedbacksData.feedbacks)) {
                    // {feedbacks: [...]} formatında dönerse
                    feedbacksArray = feedbacksData.feedbacks;
                } else if (feedbacksData.data && Array.isArray(feedbacksData.data)) {
                    // {data: [...]} formatında dönerse
                    feedbacksArray = feedbacksData.data;
                } else {
                    console.warn('Unexpected API response format:', feedbacksData);
                    feedbacksArray = [];
                }
                
                // Veri normalizasyonu
                feedbacks = feedbacksArray.map(feedback => ({
                    id: feedback.id || feedback.Id,
                    user: {
                        name: feedback.user?.name || feedback.userName || feedback.UserName || 'Bilinmeyen Kullanıcı',
                        email: feedback.user?.email || feedback.userEmail || feedback.UserEmail || 'email@example.com'
                    },
                    type: feedback.type || feedback.Type || 'general',
                    message: feedback.message || feedback.Message || 'Mesaj bulunamadı',
                    createdAt: feedback.createdAt || feedback.CreatedAt || new Date().toISOString(),
                    isResolved: feedback.isResolved !== undefined ? feedback.isResolved : (feedback.IsResolved || false),
                    adminResponse: feedback.adminResponse || feedback.AdminResponse || null
                }));
                
                renderFeedbacks(feedbacks);

            } catch (error) {
                console.error('Geri bildirimler yüklenirken hata:', error);
                showAPIError(error);
            }
        }

        function applyFiltersToDemo() {
            const status = document.getElementById('statusFilter').value;
            const type = document.getElementById('typeFilter').value;
            const search = document.getElementById('searchFilter').value;
            const date = document.getElementById('dateFilter').value;

            let filteredFeedbacks = [...demoFeedbacks];

            if (status) {
                filteredFeedbacks = filteredFeedbacks.filter(f => 
                    status === 'pending' ? !f.isResolved : f.isResolved);
            }

            if (type) {
                filteredFeedbacks = filteredFeedbacks.filter(f => f.type === type);
            }

            if (search) {
                const searchLower = search.toLowerCase();
                filteredFeedbacks = filteredFeedbacks.filter(f => 
                    f.user.name.toLowerCase().includes(searchLower) || 
                    f.user.email.toLowerCase().includes(searchLower));
            }

            if (date) {
                filteredFeedbacks = filteredFeedbacks.filter(f => 
                    new Date(f.createdAt).toDateString() === new Date(date).toDateString());
            }

            renderFeedbacks(filteredFeedbacks);
        }

        function renderFeedbacks(feedbacksToRender) {
            const container = document.getElementById('feedbackList');
            if (feedbacksToRender.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h3>Geri bildirim bulunamadı</h3>
                        <p>Seçilen filtrelere uygun geri bildirim bulunmuyor.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = feedbacksToRender.map(feedback => {
                // Güvenli veri erişimi
                const userName = feedback.user?.name || feedback.userName || feedback.UserName || 'Bilinmeyen Kullanıcı';
                const userEmail = feedback.user?.email || feedback.userEmail || feedback.UserEmail || 'email@example.com';
                const feedbackType = feedback.type || feedback.Type || 'general';
                const feedbackMessage = feedback.message || feedback.Message || 'Mesaj bulunamadı';
                const createdAt = feedback.createdAt || feedback.CreatedAt || new Date().toISOString();
                const isResolved = feedback.isResolved !== undefined ? feedback.isResolved : (feedback.IsResolved || false);
                const adminResponse = feedback.adminResponse || feedback.AdminResponse || null;

                return `
                <div class="feedback-item">
                    <div class="feedback-header">
                        <div class="user-info">
                            <div class="user-name">${userName}</div>
                            <div class="user-email">${userEmail}</div>
                        </div>
                        <div class="feedback-meta">
                            <span class="feedback-type type-${feedbackType.toLowerCase()}">
                                ${getTypeLabel(feedbackType)}
                            </span>
                            <span class="feedback-date">
                                ${formatDate(createdAt)}
                            </span>
                            <span class="status-badge ${isResolved ? 'status-resolved' : 'status-pending'}">
                                ${isResolved ? 'Çözülmüş' : 'Bekleyen'}
                            </span>
                        </div>
                    </div>
                    <div class="feedback-message">
                        <strong>Mesaj:</strong><br>
                        ${feedbackMessage}
                    </div>
                    ${adminResponse ? `
                        <div style="background: #e8f5e8; padding: 10px; border-radius: 6px; margin: 10px 0;">
                            <strong>Admin Yanıtı:</strong><br>
                            ${adminResponse}
                        </div>
                    ` : ''}
                    <div class="feedback-actions">
                        ${!isResolved ? `
                            <button class="btn btn-primary" onclick="openResponseModal(${feedback.id || feedback.Id})">
                                <i class="fas fa-reply"></i> Yanıtla
                            </button>
                            <button class="btn btn-success" onclick="markAsResolved(${feedback.id || feedback.Id})">
                                <i class="fas fa-check"></i> Çözülmüş İşaretle
                            </button>
                        ` : `
                            <button class="btn btn-secondary" onclick="viewDetails(${feedback.id || feedback.Id})">
                                <i class="fas fa-eye"></i> Detay Görüntüle
                            </button>
                        `}
                        ${isDemoMode ? `<span class="status-badge" style="background: #17a2b8; color: white;">Demo</span>` : ''}
                    </div>
                </div>
            `}).join('');
        }

        function setupEventListeners() {
            document.getElementById('statusFilter').addEventListener('change', () => {
                if (isDemoMode) applyFiltersToDemo();
                else fetchFeedbacks();
            });
            document.getElementById('typeFilter').addEventListener('change', () => {
                if (isDemoMode) applyFiltersToDemo();
                else fetchFeedbacks();
            });
            document.getElementById('searchFilter').addEventListener('input', () => {
                if (isDemoMode) applyFiltersToDemo();
                else fetchFeedbacks();
            });
            document.getElementById('dateFilter').addEventListener('change', () => {
                if (isDemoMode) applyFiltersToDemo();
                else fetchFeedbacks();
            });

            document.querySelector('.close').addEventListener('click', closeModal);
            document.getElementById('responseForm').addEventListener('submit', submitResponse);
            
            window.addEventListener('click', function(event) {
                const modal = document.getElementById('responseModal');
                if (event.target === modal) {
                    closeModal();
                }
            });
        }

        function openResponseModal(feedbackId) {
            const feedback = feedbacks.find(f => f.id === feedbackId) || demoFeedbacks.find(f => f.id === feedbackId);
            if (!feedback) return;

            document.getElementById('feedbackId').value = feedbackId;
            document.getElementById('modalUserInfo').textContent = 
                `${feedback.user.name} (${feedback.user.email}) - ${getTypeLabel(feedback.type)}`;
            document.getElementById('responseMessage').value = '';
            document.getElementById('markAsResolved').checked = true;
            
            document.getElementById('responseModal').style.display = 'block';
        }

        function closeModal() {
            document.getElementById('responseModal').style.display = 'none';
        }

        async function submitResponse(event) {
            event.preventDefault();
            
            const feedbackId = parseInt(document.getElementById('feedbackId').value);
            const responseMessage = document.getElementById('responseMessage').value;
            const markAsResolved = document.getElementById('markAsResolved').checked;

            if (isDemoMode) {
                // Demo modunda simule et
                const feedbackIndex = demoFeedbacks.findIndex(f => f.id === feedbackId);
                if (feedbackIndex !== -1) {
                    demoFeedbacks[feedbackIndex].adminResponse = responseMessage;
                    demoFeedbacks[feedbackIndex].isResolved = markAsResolved;
                    
                    // İstatistikleri güncelle
                    document.getElementById('pendingFeedbacks').textContent = demoFeedbacks.filter(f => !f.isResolved).length;
                    document.getElementById('resolvedFeedbacks').textContent = demoFeedbacks.filter(f => f.isResolved).length;
                }
                
                showNotification('Demo modunda yanıt gönderildi!', 'success');
                closeModal();
                applyFiltersToDemo();
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/UserFeedback/${feedbackId}/respond`, {
                    method: 'POST',
                    headers: AuthManager.getAuthHeaders(),
                    body: JSON.stringify({
                        responseMessage: responseMessage,
                        markAsResolved: markAsResolved
                    })
                });

                if (response.status === 401) {
                    AuthManager.logout();
                    return;
                }

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Yanıt gönderilirken bir hata oluştu.');
                }

                showNotification('Yanıt başarıyla gönderildi!', 'success');
                closeModal();
                fetchStats();
                fetchFeedbacks();

            } catch (error) {
                console.error('Yanıt gönderilirken hata:', error);
                showNotification(`Hata: ${error.message}`, 'error');
            }
        }

        async function markAsResolved(feedbackId) {
            if (!confirm('Bu geri bildirimi çözülmüş olarak işaretlemek istediğinizden emin misiniz?')) {
                return;
            }

            if (isDemoMode) {
                // Demo modunda simule et
                const feedbackIndex = demoFeedbacks.findIndex(f => f.id === feedbackId);
                if (feedbackIndex !== -1) {
                    demoFeedbacks[feedbackIndex].isResolved = true;
                    
                    // İstatistikleri güncelle
                    document.getElementById('pendingFeedbacks').textContent = demoFeedbacks.filter(f => !f.isResolved).length;
                    document.getElementById('resolvedFeedbacks').textContent = demoFeedbacks.filter(f => f.isResolved).length;
                }
                
                showNotification('Demo modunda çözülmüş olarak işaretlendi!', 'success');
                applyFiltersToDemo();
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/UserFeedback/${feedbackId}/resolve`, {
                    method: 'PUT',
                    headers: AuthManager.getAuthHeaders()
                });

                if (response.status === 401) {
                    AuthManager.logout();
                    return;
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Geri bildirim çözülmüş olarak işaretlenemedi.');
                }

                showNotification('Geri bildirim başarıyla çözülmüş olarak işaretlendi!', 'success');
                fetchStats();
                fetchFeedbacks();

            } catch (error) {
                console.error('Çözülmüş olarak işaretlenirken hata:', error);
                showNotification(`Hata: ${error.message}`, 'error');
            }
        }

        function viewDetails(feedbackId) {
            const feedback = feedbacks.find(f => f.id === feedbackId) || demoFeedbacks.find(f => f.id === feedbackId);
            if (!feedback) return;
            
            alert(`
Kullanıcı: ${feedback.user.name}
Email: ${feedback.user.email}
Tür: ${getTypeLabel(feedback.type)}
Tarih: ${formatDate(feedback.createdAt)}

Mesaj:
${feedback.message}

Admin Yanıtı:
${feedback.adminResponse || 'Yanıt verilmemiş'}
            `);
        }

        function getTypeLabel(type) {
            const types = {
                'bug': 'Hata Bildirimi',
                'suggestion': 'Öneri',
                'complaint': 'Şikayet',
                'feature': 'Özellik İsteği',
                'general': 'Genel Geri Bildirim'
            };
            return types[type] || type;
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background: ${type === 'success' ? '#28a745' : (type === 'error' ? '#dc3545' : '#007bff')};
                color: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 2000;
                animation: slideIn 0.3s ease;
                max-width: 400px;
            `;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
        // admin-feedback.js dosyasının sonuna ekleyin

window.openResponseModal = openResponseModal;
window.closeModal = closeModal;
window.markAsResolved = markAsResolved;
window.viewDetails = viewDetails; 
window.loadDemoData = loadDemoData; // API hatası durumunda kullanılıyor
        