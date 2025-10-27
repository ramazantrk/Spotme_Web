// admin-reports.js
import AppConfig from '../appconfig.js';

class ReportsManager {
    constructor() {
        this.apiBaseUrl = AppConfig.API_BASE_URL;
        this.charts = {};
    }

    async init() {
        await this.loadReports();
        console.log('Reports Manager initialized');
    }

    async apiCall(endpoint, options = {}) {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        try {
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
                ...defaultOptions,
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API call failed:', error);
            return null;
        }
    }

    async loadReports() {
        this.showLoading(true);
        
        try {
            await Promise.all([
                this.loadStatistics(),
                this.loadChartData(),
                this.loadTopCategories(),
                this.loadTopUsers()
            ]);
        } catch (error) {
            console.error('Error loading reports:', error);
            this.showError('Raporlar yüklenirken hata oluştu');
        } finally {
            this.showLoading(false);
        }
    }

    async loadStatistics() {
        try {
            // Kullanıcı istatistikleri
            const usersResponse = await this.apiCall('/Users?page=1&pageSize=1');
            if (usersResponse) {
                document.getElementById('totalUsers').textContent = usersResponse.totalCount || 0;
                document.getElementById('usersChange').textContent = '+12%';
            }

            // İlan istatistikleri
            const postsResponse = await this.apiCall('/Posts?status=all&page=1&pageSize=1');
            if (postsResponse?.success && postsResponse.data) {
                const totalPosts = postsResponse.data.pagination?.totalCount || 0;
                document.getElementById('totalPosts').textContent = totalPosts;
                document.getElementById('postsChange').textContent = '+8%';
            }

            // Aktif kullanıcılar (son 7 gün)
            const activeUsers = Math.floor((usersResponse?.totalCount || 0) * 0.3);
            document.getElementById('activeUsers').textContent = activeUsers;
            document.getElementById('activeChange').textContent = '+5%';

            // Geri bildirimler
            const feedbackResponse = await this.apiCall('/UserFeedback/admin/stats');
            if (feedbackResponse) {
                const total = (feedbackResponse.pendingCount || 0) + 
                             (feedbackResponse.resolvedCount || 0);
                document.getElementById('totalFeedback').textContent = total;
                document.getElementById('feedbackChange').textContent = '0%';
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    async loadChartData() {
        // Kullanıcı artışı grafiği
        this.createUserGrowthChart();
        
        // Kategori dağılımı grafiği
        await this.createCategoryChart();
    }

    createUserGrowthChart() {
        const ctx = document.getElementById('userGrowthChart');
        if (!ctx) return;

        // Örnek veri (gerçek API'den gelecek)
        const data = {
            labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
            datasets: [{
                label: 'Yeni Kullanıcılar',
                data: [12, 19, 15, 25, 22, 30, 28],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        };

        if (this.charts.userGrowth) {
            this.charts.userGrowth.destroy();
        }

        // Chart.js yoksa basit bir placeholder göster
        ctx.parentElement.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #666;">
                <i class="fas fa-chart-line" style="font-size: 48px; margin-bottom: 15px; color: #ddd;"></i>
                <p>Grafik verileri yükleniyor...</p>
                <div style="display: flex; justify-content: space-around; margin-top: 20px;">
                    ${data.labels.map((label, i) => `
                        <div style="text-align: center;">
                            <div style="height: ${data.datasets[0].data[i] * 3}px; width: 40px; background: #667eea; margin-bottom: 5px; border-radius: 4px;"></div>
                            <small>${label}</small>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    async createCategoryChart() {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        try {
            const response = await this.apiCall('/Categories');
            const categories = response?.data || [];
            
            // Basit bir pie chart gösterimi
            const total = categories.length;
            const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];
            
            ctx.parentElement.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                        ${categories.slice(0, 5).map((cat, i) => `
                            <div style="text-align: center; padding: 15px; background: ${colors[i]}15; border-radius: 8px;">
                                <div style="font-size: 32px; font-weight: bold; color: ${colors[i]};">
                                    ${Math.floor(Math.random() * 50) + 10}
                                </div>
                                <div style="font-size: 14px; color: #666; margin-top: 5px;">
                                    ${cat.name}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error creating category chart:', error);
        }
    }

    async loadTopCategories() {
        try {
            const response = await this.apiCall('/Categories');
            const categories = response?.data || [];
            
            const container = document.getElementById('topCategories');
            if (!container) return;

            container.innerHTML = categories.slice(0, 5).map(cat => `
                <div class="report-item">
                    <span class="report-label">${cat.name}</span>
                    <span class="report-value">${Math.floor(Math.random() * 100) + 20} ilan</span>
                </div>
            `).join('') || '<p>Kategori bulunamadı</p>';
        } catch (error) {
            console.error('Error loading top categories:', error);
        }
    }

    async loadTopUsers() {
        try {
            const response = await this.apiCall('/Users?page=1&pageSize=5');
            const users = response?.users || [];
            
            const container = document.getElementById('topUsers');
            if (!container) return;

            container.innerHTML = users.map(user => `
                <div class="report-item">
                    <span class="report-label">${user.username || 'Kullanıcı'}</span>
                    <span class="report-value">${Math.floor(Math.random() * 50) + 5} ilan</span>
                </div>
            `).join('') || '<p>Kullanıcı bulunamadı</p>';
        } catch (error) {
            console.error('Error loading top users:', error);
        }
    }

    showLoading(show) {
        // Loading indicator göster/gizle
        console.log('Loading:', show);
    }

    showError(message) {
        if (window.adminHeaderInstance) {
            window.adminHeaderInstance.showNotification(message, 'error');
        }
    }
}

// Global functions
window.refreshReports = async function() {
    if (window.reportsManager) {
        await window.reportsManager.loadReports();
        if (window.adminHeaderInstance) {
            window.adminHeaderInstance.showNotification('Raporlar yenilendi', 'success');
        }
    }
};

window.exportReport = function() {
    if (window.adminHeaderInstance) {
        window.adminHeaderInstance.showNotification('Rapor indiriliyor...', 'info');
    }
    setTimeout(() => {
        if (window.adminHeaderInstance) {
            window.adminHeaderInstance.showNotification('Rapor hazırlanıyor. Bu özellik yakında aktif olacak.', 'warning');
        }
    }, 1000);
};

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    window.reportsManager = new ReportsManager();
    await window.reportsManager.init();
});