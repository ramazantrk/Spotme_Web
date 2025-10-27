// API Base URL
import AppConfig from '../appconfig.js';

const API_BASE_URL = AppConfig.API_BASE_URL;

// Authentication Manager - Diğer admin sayfalarıyla uyumlu
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
            // JWT token kontrolü
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

// API çağrısı için genel fonksiyon
async function apiCall(endpoint, options = {}) {
    const defaultOptions = {
        headers: AuthManager.getAuthHeaders()
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, mergedOptions);
        
        if (!response.ok) {
            if (response.status === 401) {
                AuthManager.logout();
                throw new Error('Oturum süresi doldu');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Dashboard istatistiklerini getir
async function fetchDashboardStats() {
    try {
        const response = await apiCall('/Dashboard/stats');
        return response.data;
    } catch (error) {
        console.error('Dashboard stats error:', error);
        return null;
    }
}

// Kullanıcı aktivitesini getir
async function fetchUserActivity(days = 7) {
    try {
        const response = await apiCall(`/Dashboard/user-activity?days=${days}`);
        return response.data;
    } catch (error) {
        console.error('User activity error:', error);
        return null;
    }
}

// Kategori dağılımını getir
async function fetchCategoryDistribution() {
    try {
        const response = await apiCall('/Dashboard/category-distribution');
        return response.data;
    } catch (error) {
        console.error('Category distribution error:', error);
        return null;
    }
}

// Son aktiviteleri getir
async function fetchRecentActivities(limit = 10) {
    try {
        const response = await apiCall(`/Dashboard/recent-activities?limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error('Recent activities error:', error);
        return null;
    }
}

// İstatistik kartlarını güncelle
function updateStatCards(stats) {
    if (!stats) return;

    // Kullanıcı sayısı
    const userCard = document.querySelector('.stat-card.users');
    if (userCard) {
        userCard.querySelector('.stat-number').textContent = stats.users.total.toLocaleString();
        const userChange = userCard.querySelector('.stat-change');
        userChange.innerHTML = `<i class="fas fa-arrow-${stats.users.isPositive ? 'up' : 'down'}"></i> ${stats.users.changeRate}%`;
        userChange.className = `stat-change ${stats.users.isPositive ? 'positive' : 'negative'}`;
    }

    // İlan sayısı
    const postCard = document.querySelector('.stat-card.posts');
    if (postCard) {
        postCard.querySelector('.stat-number').textContent = stats.posts.total.toLocaleString();
        const postChange = postCard.querySelector('.stat-change');
        postChange.innerHTML = `<i class="fas fa-arrow-${stats.posts.isPositive ? 'up' : 'down'}"></i> ${stats.posts.changeRate}%`;
        postChange.className = `stat-change ${stats.posts.isPositive ? 'positive' : 'negative'}`;
    }

    // Kategori sayısı
    const categoryCard = document.querySelector('.stat-card.categories');
    if (categoryCard) {
        categoryCard.querySelector('.stat-number').textContent = stats.categories.total;
        const categoryChange = categoryCard.querySelector('.stat-change');
        categoryChange.innerHTML = `<i class="fas fa-arrow-up"></i> +${stats.categories.newCount}`;
    }

    // Gelir
    const revenueCard = document.querySelector('.stat-card.revenue');
    if (revenueCard) {
        revenueCard.querySelector('.stat-number').textContent = '₺' + stats.revenue.total.toLocaleString();
        const revenueChange = revenueCard.querySelector('.stat-change');
        revenueChange.innerHTML = `<i class="fas fa-arrow-${stats.revenue.isPositive ? 'up' : 'down'}"></i> ${stats.revenue.changeRate}%`;
        revenueChange.className = `stat-change ${stats.revenue.isPositive ? 'positive' : 'negative'}`;
    }
}

// Kullanıcı aktivite grafiğini güncelle
function updateUserActivityChart(data) {
    if (!data) return;

    const ctx = document.getElementById('userActivityChart');
    if (!ctx) return;

    // Var olan grafiği yok et
    if (window.userActivityChartInstance) {
        window.userActivityChartInstance.destroy();
    }

    window.userActivityChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: data.datasets.map((dataset, index) => ({
                label: dataset.label,
                data: dataset.data,
                borderColor: index === 0 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(72, 187, 120, 0.8)',
                backgroundColor: index === 0 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(72, 187, 120, 0.1)',
                tension: 0.4,
                fill: true
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: 'rgba(255, 255, 255, 0.8)'
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: 'rgba(255, 255, 255, 0.7)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: { color: 'rgba(255, 255, 255, 0.7)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Kategori dağılım grafiğini güncelle
function updateCategoryChart(data) {
    if (!data) return;

    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    // Var olan grafiği yok et
    if (window.categoryChartInstance) {
        window.categoryChartInstance.destroy();
    }

    window.categoryChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.data,
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(72, 187, 120, 0.8)',
                    'rgba(237, 137, 54, 0.8)',
                    'rgba(159, 122, 234, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(156, 163, 175, 0.8)'
                ],
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        padding: 15
                    }
                }
            }
        }
    });
}

// Son aktiviteleri güncelle
function updateRecentActivities(activities) {
    if (!activities || activities.length === 0) return;

    const activityCard = document.querySelector('.activity-card');
    if (!activityCard) return;

    // Mevcut aktiviteleri temizle (başlık hariç)
    const items = activityCard.querySelectorAll('.activity-item');
    items.forEach(item => item.remove());

    // Yeni aktiviteleri ekle
    activities.forEach(activity => {
        const iconClass = getActivityIcon(activity.type);
        const activityHTML = `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${activity.text}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `;
        activityCard.insertAdjacentHTML('beforeend', activityHTML);
    });
}

// Aktivite tipine göre ikon seç
function getActivityIcon(type) {
    const icons = {
        'new-user': 'fa-user-plus',
        'new-post': 'fa-plus-circle',
        'feedback': 'fa-comment',
        'system': 'fa-cog'
    };
    return icons[type] || 'fa-circle';
}

// Sayfa yüklendiğinde verileri çek
async function initDashboard() {
    // Auth kontrolü
    if (!AuthManager.checkAuth()) {
        return;
    }

    // Auth UI'ı kur
    AuthManager.setupUI();

    try {
        // Loading state göster
        showLoading();

        // Tüm verileri paralel olarak çek
        const [stats, userActivity, categoryDist, activities] = await Promise.all([
            fetchDashboardStats(),
            fetchUserActivity(7),
            fetchCategoryDistribution(),
            fetchRecentActivities(4)
        ]);

        // Verileri güncelle
        updateStatCards(stats);
        updateUserActivityChart(userActivity);
        updateCategoryChart(categoryDist);
        updateRecentActivities(activities);

        // Loading state'i kaldır
        hideLoading();

        // Sayı animasyonlarını başlat
        setTimeout(animateNumbers, 500);
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        hideLoading();
        showNotification('Dashboard verileri yüklenirken bir hata oluştu.', 'error');
    }
}

// Loading göster
function showLoading() {
    document.body.insertAdjacentHTML('beforeend', `
        <div id="dashboard-loading" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
             background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="color: white; font-size: 24px;">
                <i class="fas fa-spinner fa-spin"></i> Yükleniyor...
            </div>
        </div>
    `);
}

// Loading gizle
function hideLoading() {
    const loading = document.getElementById('dashboard-loading');
    if (loading) loading.remove();
}

// Bildirim göster
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
    notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Sayıları animasyonlu göster
function animateNumbers() {
    const numbers = document.querySelectorAll('.stat-number');
    numbers.forEach(num => {
        const text = num.textContent;
        const target = parseInt(text.replace(/[₺,]/g, ''));
        if (isNaN(target)) return;
        
        const prefix = text.includes('₺') ? '₺' : '';
        let current = 0;
        const increment = target / 100;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                num.textContent = prefix + target.toLocaleString();
                clearInterval(timer);
            } else {
                num.textContent = prefix + Math.floor(current).toLocaleString();
            }
        }, 20);
    });
}

// CSS animasyonu ekle
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

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();

    // Grafik periyod değişikliği
    const periodSelect = document.querySelector('.chart-period');
    if (periodSelect) {
        periodSelect.addEventListener('change', async (e) => {
            const days = e.target.value === 'Son 7 Gün' ? 7 : 
                        e.target.value === 'Son 30 Gün' ? 30 : 90;
            const userActivity = await fetchUserActivity(days);
            updateUserActivityChart(userActivity);
        });
    }

    // Hover efektleri
    document.querySelectorAll('.glass-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Otomatik yenileme (5 dakikada bir)
    setInterval(async () => {
        const stats = await fetchDashboardStats();
        updateStatCards(stats);
    }, 5 * 60 * 1000);
});

// Global fonksiyonları export et
window.AuthManager = AuthManager;
window.dashboardAPI = {
    fetchDashboardStats,
    fetchUserActivity,
    fetchCategoryDistribution,
    fetchRecentActivities,
    initDashboard
};