import AppConfig from '../appconfig.js';

// Global Variables
let currentTab = 'hero';
let editingStatId = null;
let editingFeatureId = null;
let editingSponsorId = null;
let editingAppLinkId = null;

// API Configuration
const API_BASE_URL = AppConfig.API_BASE_URL;

// Application State Management
const AppState = {
    isLoading: false,
    user: null,
    heroSection: null,
    heroStats: [],
    features: [],
    sponsors: [],
    ctaSection: null,
    appLinks: [],
    pageSettings: []
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async function() {
    // Auth kontrolü
    if (!AuthManager.checkAuth()) return;
    
    // Header'ı yükle
    const script = document.createElement('script');
    script.src = 'js/admin-header.js';
    script.onload = () => {
        AuthManager.setupUI();
    };
    document.head.appendChild(script);
    
    // Event listener'ları kur
    EventManager.setupEventListeners();
    
    // İlk tab'ı yükle
    await loadTabData('hero');
});

// Authentication Manager
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
        
        AppState.user = JSON.parse(localStorage.getItem('adminUser') || '{}');
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
        return false;
    },

    logout() {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminUser');
        
        UIManager.showNotification('Oturum süresi doldu, tekrar giriş yapın.', 'error');
        setTimeout(() => {
            window.location.href = 'admin-login.html';
        }, 2000);
    },

    setupUI() {
        const headerActions = document.getElementById('headerActions');
        if (AppState.user && AppState.user.username) {
            headerActions.innerHTML = `
                <div class="auth-info">
                    <i class="fas fa-user"></i>
                    <span>Hoş geldiniz, <strong>${AppState.user.username}</strong></span>
                    ${AppState.user.isDemo ? '<span style="color: #f59e0b; font-weight: 600;">(Demo)</span>' : ''}
                </div>
                <button onclick="AuthManager.logout()" class="btn btn-secondary btn-sm">
                    <i class="fas fa-sign-out-alt"></i>
                    Çıkış
                </button>
            `;
        }
    }
};

// API Manager
const APIManager = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...AuthManager.getAuthHeaders(),
                ...options.headers
            }
        };

        const response = await fetch(url, config);
        
        if (response.status === 401) {
            AuthManager.logout();
            throw new Error('Unauthorized - Please login again');
        }

        return response;
    }
};

// Hero Section Manager
const HeroManager = {
    async load() {
        try {
            const response = await APIManager.request('/HomePage/hero');
            if (!response.ok) throw new Error('Hero section yüklenemedi');
            
            const data = await response.json();
            AppState.heroSection = data;
            this.renderForm(data);
            this.showCurrentData(data);
        } catch (error) {
            console.error('Error loading hero section:', error);
            UIManager.showNotification('Hero section yüklenirken hata oluştu', 'error');
        }
    },

    showCurrentData(data) {
        const heroTab = document.getElementById('hero-tab');
        let infoCard = heroTab.querySelector('.current-data-card');
        
        if (!infoCard) {
            infoCard = document.createElement('div');
            infoCard.className = 'current-data-card';
            infoCard.style.cssText = 'background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;';
            heroTab.insertBefore(infoCard, heroTab.querySelector('.section-card'));
        }
        
        infoCard.innerHTML = `
            <h4 style="margin: 0 0 15px 0; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-info-circle" style="color: #3b82f6;"></i>
                Şu Anki Hero Section Bilgileri
            </h4>
            <div style="display: grid; gap: 12px;">
                <div>
                    <strong style="color: #64748b;">Başlık:</strong>
                    <p style="margin: 5px 0 0 0; color: #1e293b;">${data.title || 'Henüz eklenmemiş'}</p>
                </div>
                <div>
                    <strong style="color: #64748b;">Alt Başlık:</strong>
                    <p style="margin: 5px 0 0 0; color: #1e293b;">${data.subtitle || 'Henüz eklenmemiş'}</p>
                </div>
                <div>
                    <strong style="color: #64748b;">Açıklama:</strong>
                    <p style="margin: 5px 0 0 0; color: #1e293b;">${data.description || 'Henüz eklenmemiş'}</p>
                </div>
                <div>
                    <strong style="color: #64748b;">Durum:</strong>
                    <span class="status-badge ${data.isActive ? 'status-active' : 'status-inactive'}" style="margin-left: 8px;">
                        ${data.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                </div>
                ${data.updatedAt ? `
                    <div style="margin-top: 8px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                        <small style="color: #94a3b8;">
                            <i class="fas fa-clock"></i> Son güncelleme: ${new Date(data.updatedAt).toLocaleString('tr-TR')}
                        </small>
                    </div>
                ` : ''}
            </div>
        `;
    },

     renderForm(data) {
        document.getElementById('heroTitle').value = data.title || '';
        document.getElementById('heroSubtitle').value = data.subtitle || '';
        document.getElementById('heroDescription').value = data.description || '';
        document.getElementById('heroIsActive').checked = data.isActive || false;
    },

    async save(formData) {
        try {
            UIManager.showLoading(true);
            const response = await APIManager.request('/HomePage/hero', {
                method: 'PUT',
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Hero section güncellenemedi');
            
            const data = await response.json();
            AppState.heroSection = data;
            UIManager.showNotification('Hero section başarıyla güncellendi!', 'success');
        } catch (error) {
            console.error('Error saving hero section:', error);
            UIManager.showNotification('Hero section güncellenirken hata oluştu', 'error');
        } finally {
            UIManager.showLoading(false);
        }
    }
};

// Hero Stats Manager
const HeroStatsManager = {
    async load() {
        try {
            const response = await APIManager.request('/HomePage/hero-stats');
            if (!response.ok) throw new Error('İstatistikler yüklenemedi');
            
            const data = await response.json();
            AppState.heroStats = Array.isArray(data) ? data : [];
            this.render();
        } catch (error) {
            console.error('Error loading hero stats:', error);
            UIManager.showNotification('İstatistikler yüklenirken hata oluştu', 'error');
        }
    },

    render() {
        const container = document.getElementById('statsTableContainer');
        
        if (AppState.heroStats.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-bar"></i>
                    <h3>Henüz istatistik eklenmemiş</h3>
                    <p>Yeni istatistik eklemek için yukarıdaki butona tıklayın</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Sıra</th>
                        <th>Etiket</th>
                        <th>Değer</th>
                        <th>Durum</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    ${AppState.heroStats.map(stat => `
                        <tr>
                            <td>${stat.displayOrder}</td>
                            <td>${stat.label}</td>
                            <td><strong>${stat.value}</strong></td>
                            <td>
                                <span class="status-badge ${stat.isActive ? 'status-active' : 'status-inactive'}">
                                    ${stat.isActive ? 'Aktif' : 'Pasif'}
                                </span>
                            </td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-primary btn-sm" onclick="openStatModal(${stat.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="HeroStatsManager.delete(${stat.id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    async save(id, formData) {
        try {
            UIManager.showLoading(true);
            const endpoint = id ? `/HomePage/hero-stats/${id}` : '/HomePage/hero-stats';
            const method = id ? 'PUT' : 'POST';
            
            const response = await APIManager.request(endpoint, {
                method: method,
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('İstatistik kaydedilemedi');
            
            await this.load();
            closeStatModal();
            UIManager.showNotification('İstatistik başarıyla kaydedildi!', 'success');
        } catch (error) {
            console.error('Error saving stat:', error);
            UIManager.showNotification('İstatistik kaydedilirken hata oluştu', 'error');
        } finally {
            UIManager.showLoading(false);
        }
    },

    async delete(id) {
        if (!confirm('Bu istatistiği silmek istediğinize emin misiniz?')) return;
        
        try {
            UIManager.showLoading(true);
            const response = await APIManager.request(`/HomePage/hero-stats/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('İstatistik silinemedi');
            
            await this.load();
            UIManager.showNotification('İstatistik başarıyla silindi!', 'success');
        } catch (error) {
            console.error('Error deleting stat:', error);
            UIManager.showNotification('İstatistik silinirken hata oluştu', 'error');
        } finally {
            UIManager.showLoading(false);
        }
    }
};

// Features Manager
const FeaturesManager = {
    async load() {
        try {
            const response = await APIManager.request('/HomePage/features?includeInactive=true');
            if (!response.ok) throw new Error('Özellikler yüklenemedi');
            
            const data = await response.json();
            AppState.features = Array.isArray(data) ? data : [];
            this.render();
        } catch (error) {
            console.error('Error loading features:', error);
            UIManager.showNotification('Özellikler yüklenirken hata oluştu', 'error');
        }
    },

    render() {
        const container = document.getElementById('featuresTableContainer');
        
        if (AppState.features.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lightbulb"></i>
                    <h3>Henüz özellik eklenmemiş</h3>
                    <p>Yeni özellik eklemek için yukarıdaki butona tıklayın</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Sıra</th>
                        <th>Icon</th>
                        <th>Başlık</th>
                        <th>Açıklama</th>
                        <th>Durum</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    ${AppState.features.map(feature => `
                        <tr>
                            <td>${feature.displayOrder}</td>
                            <td><span style="font-size: 20px;">${feature.icon}</span></td>
                            <td><strong>${feature.title}</strong></td>
                            <td>${feature.description.substring(0, 50)}...</td>
                            <td>
                                <span class="status-badge ${feature.isActive ? 'status-active' : 'status-inactive'}">
                                    ${feature.isActive ? 'Aktif' : 'Pasif'}
                                </span>
                            </td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-primary btn-sm" onclick="openFeatureModal(${feature.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="FeaturesManager.delete(${feature.id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    async save(id, formData) {
        try {
            UIManager.showLoading(true);
            const endpoint = id ? `/HomePage/features/${id}` : '/HomePage/features';
            const method = id ? 'PUT' : 'POST';
            
            const response = await APIManager.request(endpoint, {
                method: method,
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Özellik kaydedilemedi');
            
            await this.load();
            closeFeatureModal();
            UIManager.showNotification('Özellik başarıyla kaydedildi!', 'success');
        } catch (error) {
            console.error('Error saving feature:', error);
            UIManager.showNotification('Özellik kaydedilirken hata oluştu', 'error');
        } finally {
            UIManager.showLoading(false);
        }
    },

    async delete(id) {
        if (!confirm('Bu özelliği silmek istediğinize emin misiniz?')) return;
        
        try {
            UIManager.showLoading(true);
            const response = await APIManager.request(`/HomePage/features/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Özellik silinemedi');
            
            await this.load();
            UIManager.showNotification('Özellik başarıyla silindi!', 'success');
        } catch (error) {
            console.error('Error deleting feature:', error);
            UIManager.showNotification('Özellik silinirken hata oluştu', 'error');
        } finally {
            UIManager.showLoading(false);
        }
    }
};

// Sponsors Manager
const SponsorsManager = {
    async load() {
        try {
            const response = await APIManager.request('/HomePage/sponsors?includeInactive=true');
            if (!response.ok) throw new Error('Sponsorlar yüklenemedi');
            
            const data = await response.json();
            AppState.sponsors = Array.isArray(data) ? data : [];
            this.render();
        } catch (error) {
            console.error('Error loading sponsors:', error);
            UIManager.showNotification('Sponsorlar yüklenirken hata oluştu', 'error');
        }
    },

    render() {
        const container = document.getElementById('sponsorsTableContainer');
        
        if (AppState.sponsors.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-handshake"></i>
                    <h3>Henüz sponsor eklenmemiş</h3>
                    <p>Yeni sponsor eklemek için yukarıdaki butona tıklayın</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Sıra</th>
                        <th>Logo</th>
                        <th>Sponsor Adı</th>
                        <th>Website</th>
                        <th>Durum</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    ${AppState.sponsors.map(sponsor => `
                        <tr>
                            <td>${sponsor.displayOrder}</td>
                            <td><img src="${sponsor.logoUrl}" alt="${sponsor.name}" style="width: 50px; height: 50px; object-fit: contain;"></td>
                            <td><strong>${sponsor.name}</strong></td>
                            <td>${sponsor.websiteUrl ? `<a href="${sponsor.websiteUrl}" target="_blank">Link</a>` : '-'}</td>
                            <td>
                                <span class="status-badge ${sponsor.isActive ? 'status-active' : 'status-inactive'}">
                                    ${sponsor.isActive ? 'Aktif' : 'Pasif'}
                                </span>
                            </td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-primary btn-sm" onclick="openSponsorModal(${sponsor.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="SponsorsManager.delete(${sponsor.id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    async save(id, formData) {
        try {
            UIManager.showLoading(true);
            const endpoint = id ? `/HomePage/sponsors/${id}` : '/HomePage/sponsors';
            const method = id ? 'PUT' : 'POST';
            
            const response = await APIManager.request(endpoint, {
                method: method,
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Sponsor kaydedilemedi');
            
            await this.load();
            closeSponsorModal();
            UIManager.showNotification('Sponsor başarıyla kaydedildi!', 'success');
        } catch (error) {
            console.error('Error saving sponsor:', error);
            UIManager.showNotification('Sponsor kaydedilirken hata oluştu', 'error');
        } finally {
            UIManager.showLoading(false);
        }
    },

    async delete(id) {
        if (!confirm('Bu sponsoru silmek istediğinize emin misiniz?')) return;
        
        try {
            UIManager.showLoading(true);
            const response = await APIManager.request(`/HomePage/sponsors/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Sponsor silinemedi');
            
            await this.load();
            UIManager.showNotification('Sponsor başarıyla silindi!', 'success');
        } catch (error) {
            console.error('Error deleting sponsor:', error);
            UIManager.showNotification('Sponsor silinirken hata oluştu', 'error');
        } finally {
            UIManager.showLoading(false);
        }
    }
};

// CTA Manager
const CtaManager = {
    async load() {
        try {
            const response = await APIManager.request('/HomePage/cta');
            if (!response.ok) throw new Error('CTA section yüklenemedi');
            
            const data = await response.json();
            AppState.ctaSection = data;
            this.renderForm(data);
        } catch (error) {
            console.error('Error loading CTA section:', error);
            UIManager.showNotification('CTA section yüklenirken hata oluştu', 'error');
        }
    },

    renderForm(data) {
        document.getElementById('ctaTitle').value = data.title || '';
        document.getElementById('ctaSubtitle').value = data.subtitle || '';
        document.getElementById('ctaIsActive').checked = data.isActive || false;
    },

    async save(formData) {
        try {
            UIManager.showLoading(true);
            const response = await APIManager.request('/HomePage/cta', {
                method: 'PUT',
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('CTA section güncellenemedi');
            
            const data = await response.json();
            AppState.ctaSection = data;
            UIManager.showNotification('CTA section başarıyla güncellendi!', 'success');
        } catch (error) {
            console.error('Error saving CTA section:', error);
            UIManager.showNotification('CTA section güncellenirken hata oluştu', 'error');
        } finally {
            UIManager.showLoading(false);
        }
    }
};

// App Links Manager
const AppLinksManager = {
    async load() {
        try {
            const response = await APIManager.request('/HomePage/app-links');
            if (!response.ok) throw new Error('App links yüklenemedi');
            
            const data = await response.json();
            AppState.appLinks = Array.isArray(data) ? data : [];
            this.render();
        } catch (error) {
            console.error('Error loading app links:', error);
            UIManager.showNotification('App links yüklenirken hata oluştu', 'error');
        }
    },

    render() {
        const container = document.getElementById('appLinksTableContainer');
        
        if (AppState.appLinks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-mobile-alt"></i>
                    <h3>Henüz uygulama linki eklenmemiş</h3>
                    <p>Yeni link eklemek için yukarıdaki butona tıklayın</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Platform</th>
                        <th>Buton Metni</th>
                        <th>URL</th>
                        <th>Durum</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    ${AppState.appLinks.map(link => `
                        <tr>
                            <td><strong>${link.platform}</strong></td>
                            <td>${link.buttonText}</td>
                            <td><a href="${link.url}" target="_blank">Link</a></td>
                            <td>
                                <span class="status-badge ${link.isActive ? 'status-active' : 'status-inactive'}">
                                    ${link.isActive ? 'Aktif' : 'Pasif'}
                                </span>
                            </td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-primary btn-sm" onclick="openAppLinkModal(${link.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="AppLinksManager.delete(${link.id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    async save(id, formData) {
        try {
            UIManager.showLoading(true);
            const endpoint = id ? `/HomePage/app-links/${id}` : '/HomePage/app-links';
            const method = id ? 'PUT' : 'POST';
            
            const response = await APIManager.request(endpoint, {
                method: method,
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('App link kaydedilemedi');
            
            await this.load();
            closeAppLinkModal();
            UIManager.showNotification('App link başarıyla kaydedildi!', 'success');
        } catch (error) {
            console.error('Error saving app link:', error);
            UIManager.showNotification('App link kaydedilirken hata oluştu', 'error');
        } finally {
            UIManager.showLoading(false);
        }
    },

    async delete(id) {
        if (!confirm('Bu linki silmek istediğinize emin misiniz?')) return;
        
        try {
            UIManager.showLoading(true);
            const response = await APIManager.request(`/HomePage/app-links/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('App link silinemedi');
            
            await this.load();
            UIManager.showNotification('App link başarıyla silindi!', 'success');
        } catch (error) {
            console.error('Error deleting app link:', error);
            UIManager.showNotification('App link silinirken hata oluştu', 'error');
        } finally {
            UIManager.showLoading(false);
        }
    }
};

// Page Settings Manager
const PageSettingsManager = {
    async load() {
        try {
            const response = await APIManager.request('/HomePage/settings');
            if (!response.ok) throw new Error('Sayfa ayarları yüklenemedi');
            
            const data = await response.json();
            AppState.pageSettings = Array.isArray(data) ? data : [];
            this.render();
        } catch (error) {
            console.error('Error loading page settings:', error);
            UIManager.showNotification('Sayfa ayarları yüklenirken hata oluştu', 'error');
        }
    },

    render() {
        const container = document.getElementById('settingsContainer');
        
        if (AppState.pageSettings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-cog"></i>
                    <h3>Henüz ayar eklenmemiş</h3>
                </div>
            `;
            return;
        }

        container.innerHTML = AppState.pageSettings.map(setting => `
            <div class="form-group">
                <label class="form-label">${setting.key} ${setting.description ? `<small>(${setting.description})</small>` : ''}</label>
                <textarea class="form-textarea" id="setting-${setting.key}" rows="3">${setting.value || ''}</textarea>
                <button class="btn btn-primary btn-sm" style="margin-top: 10px;" onclick="PageSettingsManager.save('${setting.key}')">
                    <i class="fas fa-save"></i> Kaydet
                </button>
            </div>
        `).join('');
    },

    async save(key) {
        try {
            UIManager.showLoading(true);
            const value = document.getElementById(`setting-${key}`).value;
            
            const response = await APIManager.request(`/HomePage/settings/${key}`, {
                method: 'PUT',
                body: JSON.stringify({ value })
            });

            if (!response.ok) throw new Error('Ayar güncellenemedi');
            
            UIManager.showNotification('Ayar başarıyla güncellendi!', 'success');
        } catch (error) {
            console.error('Error saving setting:', error);
            UIManager.showNotification('Ayar güncellenirken hata oluştu', 'error');
        } finally {
            UIManager.showLoading(false);
        }
    }
};

// UI Manager
const UIManager = {
    showLoading(show) {
        let overlay = document.getElementById('loadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            `;
            overlay.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin" style="font-size: 48px; color: white;"></i></div>';
            document.body.appendChild(overlay);
        }
        overlay.style.display = show ? 'flex' : 'none';
    },

    showNotification(message, type) {
        const container = document.getElementById('alertContainer');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type === 'success' ? 'success' : 'error'} show`;
        alert.textContent = message;
        
        container.innerHTML = '';
        container.appendChild(alert);
        
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 300);
        }, 4000);
    }
};

// Event Manager
const EventManager = {
    setupEventListeners() {
        // Hero Form
        const heroForm = document.getElementById('heroForm');
        if (heroForm) {
            heroForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = {
                    title: document.getElementById('heroTitle').value,
                    subtitle: document.getElementById('heroSubtitle').value,
                    description: document.getElementById('heroDescription').value,
                    isActive: document.getElementById('heroIsActive').checked
                };
                await HeroManager.save(formData);
            });
        }

        // Stat Form
        const statForm = document.getElementById('statForm');
        if (statForm) {
            statForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = {
                    label: document.getElementById('statLabel').value,
                    value: document.getElementById('statValue').value,
                    displayOrder: parseInt(document.getElementById('statOrder').value),
                    isActive: document.getElementById('statIsActive').checked
                };
                await HeroStatsManager.save(editingStatId, formData);
            });
        }

        // Feature Form
        const featureForm = document.getElementById('featureForm');
        if (featureForm) {
            featureForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = {
                    icon: document.getElementById('featureIcon').value,
                    title: document.getElementById('featureTitle').value,
                    description: document.getElementById('featureDescription').value,
                    displayOrder: parseInt(document.getElementById('featureOrder').value),
                    isActive: document.getElementById('featureIsActive').checked
                };
                await FeaturesManager.save(editingFeatureId, formData);
            });
        }

        // Sponsor Form
        const sponsorForm = document.getElementById('sponsorForm');
        if (sponsorForm) {
            sponsorForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = {
                    name: document.getElementById('sponsorName').value,
                    logoUrl: document.getElementById('sponsorLogoUrl').value,
                    websiteUrl: document.getElementById('sponsorWebsiteUrl').value,
                    description: document.getElementById('sponsorDescription').value,
                    displayOrder: parseInt(document.getElementById('sponsorOrder').value),
                    isActive: document.getElementById('sponsorIsActive').checked
                };
                await SponsorsManager.save(editingSponsorId, formData);
            });
        }

        // CTA Form
        const ctaForm = document.getElementById('ctaForm');
        if (ctaForm) {
            ctaForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = {
                    title: document.getElementById('ctaTitle').value,
                    subtitle: document.getElementById('ctaSubtitle').value,
                    isActive: document.getElementById('ctaIsActive').checked
                };
                await CtaManager.save(formData);
            });
        }

        // App Link Form
        const appLinkForm = document.getElementById('appLinkForm');
        if (appLinkForm) {
            appLinkForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = {
                    platform: document.getElementById('appLinkPlatform').value,
                    url: document.getElementById('appLinkUrl').value,
                    buttonText: document.getElementById('appLinkButtonText').value,
                    isActive: document.getElementById('appLinkIsActive').checked
                };
                await AppLinksManager.save(editingAppLinkId, formData);
            });
        }
    }
};

// Tab Manager
async function switchTab(tabName, event) {
    currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // İlk yüklemede veya event olmadan çağrıldığında
        document.querySelector(`.tab[onclick*="${tabName}"]`)?.classList.add('active');
    }
    
    // Update tab contents
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Load data for the tab
    await loadTabData(tabName);
}

// Global fonksiyon olarak export et
window.switchTab = switchTab;

async function loadTabData(tabName) {
    UIManager.showLoading(true);
    try {
        switch(tabName) {
            case 'hero':
                await HeroManager.load();
                break;
            case 'stats':
                await HeroStatsManager.load();
                break;
            case 'features':
                await FeaturesManager.load();
                break;
            case 'sponsors':
                await SponsorsManager.load();
                break;
            case 'cta':
                await CtaManager.load();
                break;
            case 'app-links':
                await AppLinksManager.load();
                break;
            case 'settings':
                await PageSettingsManager.load();
                break;
        }
    } catch (error) {
        console.error('Error loading tab data:', error);
        UIManager.showNotification('Veri yüklenirken hata oluştu', 'error');
    } finally {
        UIManager.showLoading(false);
    }
}

// Modal Functions - Stat
function openStatModal(id = null) {
    editingStatId = id;
    const modal = document.getElementById('statModal');
    const modalTitle = document.getElementById('statModalTitle');
    
    if (id) {
        modalTitle.textContent = 'İstatistik Düzenle';
        const stat = AppState.heroStats.find(s => s.id === id);
        if (stat) {
            document.getElementById('statId').value = stat.id;
            document.getElementById('statLabel').value = stat.label;
            document.getElementById('statValue').value = stat.value;
            document.getElementById('statOrder').value = stat.displayOrder;
            document.getElementById('statIsActive').checked = stat.isActive;
        }
    } else {
        modalTitle.textContent = 'Yeni İstatistik';
        document.getElementById('statForm').reset();
        document.getElementById('statId').value = '';
        document.getElementById('statIsActive').checked = true;
    }
    
    modal.classList.add('show');
}

function closeStatModal() {
    document.getElementById('statModal').classList.remove('show');
    document.getElementById('statForm').reset();
    editingStatId = null;
}

// Modal Functions - Feature
function openFeatureModal(id = null) {
    editingFeatureId = id;
    const modal = document.getElementById('featureModal');
    const modalTitle = document.getElementById('featureModalTitle');
    
    if (id) {
        modalTitle.textContent = 'Özellik Düzenle';
        const feature = AppState.features.find(f => f.id === id);
        if (feature) {
            document.getElementById('featureId').value = feature.id;
            document.getElementById('featureIcon').value = feature.icon;
            document.getElementById('featureTitle').value = feature.title;
            document.getElementById('featureDescription').value = feature.description;
            document.getElementById('featureOrder').value = feature.displayOrder;
            document.getElementById('featureIsActive').checked = feature.isActive;
        }
    } else {
        modalTitle.textContent = 'Yeni Özellik';
        document.getElementById('featureForm').reset();
        document.getElementById('featureId').value = '';
        document.getElementById('featureIsActive').checked = true;
    }
    
    modal.classList.add('show');
}

function closeFeatureModal() {
    document.getElementById('featureModal').classList.remove('show');
    document.getElementById('featureForm').reset();
    editingFeatureId = null;
}

// Modal Functions - Sponsor
function openSponsorModal(id = null) {
    editingSponsorId = id;
    const modal = document.getElementById('sponsorModal');
    const modalTitle = document.getElementById('sponsorModalTitle');
    
    if (id) {
        modalTitle.textContent = 'Sponsor Düzenle';
        const sponsor = AppState.sponsors.find(s => s.id === id);
        if (sponsor) {
            document.getElementById('sponsorId').value = sponsor.id;
            document.getElementById('sponsorName').value = sponsor.name;
            document.getElementById('sponsorLogoUrl').value = sponsor.logoUrl;
            document.getElementById('sponsorWebsiteUrl').value = sponsor.websiteUrl || '';
            document.getElementById('sponsorDescription').value = sponsor.description || '';
            document.getElementById('sponsorOrder').value = sponsor.displayOrder;
            document.getElementById('sponsorIsActive').checked = sponsor.isActive;
        }
    } else {
        modalTitle.textContent = 'Yeni Sponsor';
        document.getElementById('sponsorForm').reset();
        document.getElementById('sponsorId').value = '';
        document.getElementById('sponsorIsActive').checked = true;
    }
    
    modal.classList.add('show');
}

function closeSponsorModal() {
    document.getElementById('sponsorModal').classList.remove('show');
    document.getElementById('sponsorForm').reset();
    editingSponsorId = null;
}

// Modal Functions - App Link
function openAppLinkModal(id = null) {
    editingAppLinkId = id;
    const modal = document.getElementById('appLinkModal');
    const modalTitle = document.getElementById('appLinkModalTitle');
    
    if (id) {
        modalTitle.textContent = 'Link Düzenle';
        const link = AppState.appLinks.find(l => l.id === id);
        if (link) {
            document.getElementById('appLinkId').value = link.id;
            document.getElementById('appLinkPlatform').value = link.platform;
            document.getElementById('appLinkUrl').value = link.url;
            document.getElementById('appLinkButtonText').value = link.buttonText;
            document.getElementById('appLinkIsActive').checked = link.isActive;
        }
    } else {
        modalTitle.textContent = 'Yeni Uygulama Linki';
        document.getElementById('appLinkForm').reset();
        document.getElementById('appLinkId').value = '';
        document.getElementById('appLinkIsActive').checked = true;
    }
    
    modal.classList.add('show');
}

function closeAppLinkModal() {
    document.getElementById('appLinkModal').classList.remove('show');
    document.getElementById('appLinkForm').reset();
    editingAppLinkId = null;
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});

// Logout function
function logout() {
    AuthManager.logout();
}

// Global fonksiyon olarak export et
window.switchTab = switchTab;

// Modal/Manager functions for HTML onclick attributes
window.openStatModal = openStatModal;
window.closeStatModal = closeStatModal;
window.HeroStatsManager = HeroStatsManager; // for delete button

window.openFeatureModal = openFeatureModal;
window.closeFeatureModal = closeFeatureModal;
window.FeaturesManager = FeaturesManager; // for delete button

window.openSponsorModal = openSponsorModal;
window.closeSponsorModal = closeSponsorModal;
window.SponsorsManager = SponsorsManager; // for delete button

window.openAppLinkModal = openAppLinkModal;
window.closeAppLinkModal = closeAppLinkModal;
window.AppLinksManager = AppLinksManager; // for delete button

window.logout = logout; // for admin-homepage.html:345

// ... other functions/managers that are called directly from HTML onclick