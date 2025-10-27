// admin-header.js - Header Management System with API Integration
import AppConfig from '../appconfig.js';

class AdminHeader {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.notifications = [];
        this.currentPage = null;
        this.apiBaseUrl = AppConfig.API_BASE_URL;
    }

    // Initialize header
    async init() {
        if (this.isInitialized) return;
        
        try {
            await this.loadHeader();
            this.setupEventListeners();
            this.loadUserInfo();
            this.setActivePage();
            await this.loadNotifications();
            await this.loadBadgeCounts();
            this.isInitialized = true;
            console.log('Admin Header initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Admin Header:', error);
        }
    }

    // API helper method
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
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Don't redirect on demo mode
                    if (!token || !token.startsWith('demo-token-')) {
                        this.redirectToLogin();
                    }
                    return null;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API call failed:', error);
            return null;
        }
    }

    // Load header HTML
    async loadHeader() {
        try {
            const response = await fetch('./admin-header.html');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const headerHTML = await response.text();
            
            document.body.insertAdjacentHTML('afterbegin', headerHTML);
            
            if (!document.querySelector('link[href="css/admin-header.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'admin-header.css';
                document.head.appendChild(link);
            }
        } catch (error) {
            console.error('Error loading header:', error);
            this.createFallbackHeader();
        }
    }

    // Create fallback header if loading fails
    createFallbackHeader() {
        const fallbackHeader = `
            <header class="admin-header">
                <div class="header-container">
                    <div class="header-top">
                        <div class="logo-section">
                            <div class="logo"><i class="fas fa-network-wired"></i></div>
                            <div class="logo-text">
                                <h1>LocalConnect</h1>
                                <p>Admin Panel</p>
                            </div>
                        </div>
                        <div class="header-actions">
                            <div class="notifications-btn" onclick="toggleNotifications()">
                                <i class="fas fa-bell"></i>
                                <span class="notification-count" id="notificationCount">0</span>
                            </div>
                            <div class="user-menu" onclick="toggleUserDropdown()">
                                <div class="user-avatar" id="userAvatar">A</div>
                                <div class="user-info">
                                    <span class="user-name" id="userName">Admin</span>
                                    <span class="user-role" id="userRole">Yönetici</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        `;
        document.body.insertAdjacentHTML('afterbegin', fallbackHeader);
    }

    // Setup all event listeners
    setupEventListeners() {
        document.addEventListener('click', this.handleGlobalClick.bind(this));
        this.setupSearch();
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));

        // Auto refresh every 30 seconds
        setInterval(() => {
            this.loadNotifications();
            this.loadBadgeCounts();
        }, 30000);
    }

    // Handle global clicks
    handleGlobalClick(event) {
        if (!event.target.closest('.user-menu')) {
            const dropdown = document.getElementById('userDropdown');
            if (dropdown) dropdown.classList.remove('active');
        }
        
        if (!event.target.closest('.notifications-btn') && !event.target.closest('#notificationPanel')) {
            const panel = document.getElementById('notificationPanel');
            if (panel) panel.classList.remove('active');
        }
    }

    // Setup search functionality
    setupSearch() {
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(searchInput.value);
                }
            });
        }
    }

    // Handle keyboard shortcuts
    handleKeyboardShortcuts(event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            const searchInput = document.getElementById('globalSearch');
            if (searchInput) searchInput.focus();
        }
        
        if (event.key === 'Escape') {
            this.closeAllDropdowns();
        }
    }

    // Handle window resize
    handleResize() {
        this.closeAllDropdowns();
    }

    // Close all open dropdowns
    closeAllDropdowns() {
        const dropdown = document.getElementById('userDropdown');
        const notificationPanel = document.getElementById('notificationPanel');
        
        if (dropdown) dropdown.classList.remove('active');
        if (notificationPanel) notificationPanel.classList.remove('active');
    }

    // Load user information
    loadUserInfo() {
        try {
            const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
            
            if (adminUser.username) {
                const userNameEl = document.getElementById('userName');
                const userAvatarEl = document.getElementById('userAvatar');
                const userRoleEl = document.getElementById('userRole');
                
                if (userNameEl) userNameEl.textContent = adminUser.username;
                if (userAvatarEl) userAvatarEl.textContent = adminUser.username.charAt(0).toUpperCase();
                
                if (userRoleEl) {
                    if (adminUser.isDemo) {
                        userRoleEl.textContent = 'Demo Kullanıcı';
                    } else {
                        userRoleEl.textContent = adminUser.role || 'Yönetici';
                    }
                }
            }
        } catch (error) {
            console.error('Error loading user info:', error);
        }
    }

    // Set active page
    setActivePage() {
        const currentPage = window.location.pathname.split('/').pop();
        const pageMap = {
            'admin-homepage.html': 'homepage',
            'admin-dashboard.html': 'dashboard',
            'admin-categories.html': 'categories',
            'admin-posts.html': 'posts',
            'admin-users.html': 'users',
            'admin-feedback.html': 'feedback',

        };
        
        const pageKey = pageMap[currentPage];
        if (pageKey) {
            this.currentPage = pageKey;
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                if (link.dataset.page === pageKey) {
                    link.classList.add('active');
                }
            });
        }
    }

    // Load notifications from API
    async loadNotifications() {
        try {
            const response = await this.apiCall('/admin/notifications');
            
            if (response && response.notifications) {
                this.notifications = response.notifications;
            } else {
                this.notifications = [];
            }
            
            this.updateNotificationCount();
            this.updateNotificationPanel();
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.notifications = [];
            this.updateNotificationCount();
        }
    }

    // Load badge counts from API - DÜZELTİLDİ
    async loadBadgeCounts() {
        try {
            const counts = {
                posts: 0,
                feedback: 0,
                users: 0
            };

            // İlanları çek - status=all ile tüm ilanları al
            try {
                const postsResponse = await this.apiCall('/Posts?status=all&page=1&pageSize=1');
                if (postsResponse && postsResponse.success && postsResponse.data) {
                    // Toplam ilan sayısını pagination'dan al
                    counts.posts = postsResponse.data.pagination?.totalCount || 0;
                }
            } catch (error) {
                console.error('Error loading posts count:', error);
            }

            // Geri bildirimleri çek
            try {
                const feedbackResponse = await this.apiCall('/UserFeedback/admin/stats');
                if (feedbackResponse) {
                    counts.feedback = feedbackResponse.pendingCount || 0;
                }
            } catch (error) {
                console.error('Error loading feedback count:', error);
            }

            // Kullanıcıları çek (eğer endpoint varsa)
            try {
                const usersResponse = await this.apiCall('/Users?page=1&pageSize=1');
                if (usersResponse && usersResponse.totalCount !== undefined) {
                    counts.users = usersResponse.totalCount || 0;
                }
            } catch (error) {
                console.error('Error loading users count:', error);
            }

            // Badge'leri güncelle
            this.updateBadgeCounts(counts);
            
        } catch (error) {
            console.error('Error loading badge counts:', error);
        }
    }

    // Update notification count
    updateNotificationCount() {
        const unreadCount = this.notifications.filter(n => n.unread || n.isUnread).length;
        const countEl = document.getElementById('notificationCount');
        
        if (countEl) {
            countEl.textContent = unreadCount;
            countEl.style.display = unreadCount > 0 ? 'block' : 'none';
        }
    }

    // Update notification panel content
    updateNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (!panel) return;

        const notificationList = panel.querySelector('.notification-list');
        if (!notificationList) return;

        notificationList.innerHTML = '';

        if (this.notifications.length === 0) {
            notificationList.innerHTML = '<div class="no-notifications">Yeni bildirim yok</div>';
            return;
        }

        this.notifications.forEach(notification => {
            const notificationEl = document.createElement('div');
            notificationEl.className = `notification-item ${notification.unread || notification.isUnread ? 'unread' : ''}`;
            
            notificationEl.innerHTML = `
                <div class="notification-icon">
                    <i class="fas fa-${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title || notification.message}</div>
                    <div class="notification-time">${this.formatTime(notification.createdAt || notification.time)}</div>
                </div>
            `;
            
            notificationList.appendChild(notificationEl);
        });
    }

    // Format notification time
    formatTime(timeString) {
        if (!timeString) return '';
        
        const date = new Date(timeString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Az önce';
        if (diffMins < 60) return `${diffMins} dakika önce`;
        if (diffHours < 24) return `${diffHours} saat önce`;
        if (diffDays < 7) return `${diffDays} gün önce`;
        
        return date.toLocaleDateString('tr-TR');
    }

    // Update badge counts - DÜZELTİLDİ
    updateBadgeCounts(counts) {
        // İlanlar badge'i
        if (counts.posts !== undefined) {
            const postsCountEl = document.getElementById('postsCount');
            if (postsCountEl) {
                postsCountEl.textContent = counts.posts;
                postsCountEl.style.display = counts.posts > 0 ? 'inline' : 'none';
            }
        }
        
        // Geri bildirimler badge'i
        if (counts.feedback !== undefined) {
            const feedbackCountEl = document.getElementById('feedbackCount');
            if (feedbackCountEl) {
                feedbackCountEl.textContent = counts.feedback;
                feedbackCountEl.style.display = counts.feedback > 0 ? 'inline' : 'none';
            }
        }

        // Kullanıcılar badge'i
        if (counts.users !== undefined) {
            const usersCountEl = document.getElementById('usersCount');
            if (usersCountEl) {
                usersCountEl.textContent = counts.users;
                usersCountEl.style.display = counts.users > 0 ? 'inline' : 'none';
            }
        }
    }

    // Perform search
    performSearch(query = null) {
        const searchInput = document.getElementById('globalSearch');
        const searchTerm = query || (searchInput ? searchInput.value.trim() : '');
        
        if (!searchTerm) {
            this.showNotification('Lütfen bir arama terimi girin', 'warning');
            return;
        }
        
        console.log('Searching for:', searchTerm);
        window.location.href = `admin-search.html?q=${encodeURIComponent(searchTerm)}`;
    }

    // Toggle user dropdown
    static toggleUserDropdown() {
        const dropdown = document.getElementById('userDropdown');
        const userMenu = document.querySelector('.user-menu');
        
        if (dropdown) {
            dropdown.classList.toggle('active');
            if (userMenu) {
                userMenu.classList.toggle('active');
            }
        }
    }

    // Toggle notifications panel
    static toggleNotifications() {
        const panel = document.getElementById('notificationPanel');
        if (panel) {
            panel.classList.toggle('active');
        }
    }

    // Toggle mobile menu
    static toggleMobileMenu() {
        const navMenu = document.getElementById('navMenu');
        if (navMenu) {
            navMenu.classList.toggle('mobile-active');
        }
    }

    // Mark all notifications as read
    static async markAllAsRead() {
        if (window.adminHeaderInstance) {
            try {
                await window.adminHeaderInstance.apiCall('/admin/notifications/mark-all-read', {
                    method: 'PUT'
                });
                
                window.adminHeaderInstance.notifications.forEach(n => {
                    n.unread = false;
                    n.isUnread = false;
                });
                
                window.adminHeaderInstance.updateNotificationCount();
                window.adminHeaderInstance.updateNotificationPanel();
                
                window.adminHeaderInstance.showNotification('Tüm bildirimler okundu olarak işaretlendi', 'success');
            } catch (error) {
                console.error('Error marking notifications as read:', error);
                window.adminHeaderInstance.showNotification('Bildirimler işaretlenirken hata oluştu', 'error');
            }
        }
    }

    // Logout function
    static logout() {
        if (!confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
            return;
        }
        
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminUser');
        
        AdminHeader.prototype.showNotification('Çıkış yapılıyor...', 'info');
        
        setTimeout(() => {
            window.location.href = 'admin-login.html';
        }, 1000);
    }

    // Show notification
    showNotification(message, type = 'info', duration = 4000) {
        const existing = document.querySelector('.toast-notification');
        if (existing) {
            existing.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = `toast-notification toast-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 2000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            animation: slideIn 0.3s ease;
            max-width: 400px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }

    // Get notification icon
    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle',
            'user': 'user',
            'feedback': 'comment',
            'system': 'cog',
            'general': 'bell'
        };
        return icons[type] || 'bell';
    }

    // Get notification color
    getNotificationColor(type) {
        const colors = {
            'success': '#22c55e',
            'error': '#ef4444',
            'warning': '#f59e0b',
            'info': '#3b82f6'
        };
        return colors[type] || '#3b82f6';
    }

    // Check authentication
    checkAuth() {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        
        if (!token) {
            this.redirectToLogin();
            return false;
        }
        
        if (token.startsWith('demo-token-')) {
            const tokenTime = parseInt(token.split('-')[2]);
            const now = Date.now();
            if ((now - tokenTime) > 86400000) {
                this.redirectToLogin();
                return false;
            }
        }
        
        return true;
    }

    // Redirect to login
    redirectToLogin() {
        this.showNotification('Oturum süresi doldu, giriş sayfasına yönlendiriliyorsunuz...', 'warning');
        setTimeout(() => {
            window.location.href = 'admin-login.html';
        }, 2000);
    }
}

// Create global instance
window.adminHeaderInstance = new AdminHeader();

// Global functions
window.toggleUserDropdown = AdminHeader.toggleUserDropdown;
window.toggleNotifications = AdminHeader.toggleNotifications;
window.toggleMobileMenu = AdminHeader.toggleMobileMenu;
window.markAllAsRead = AdminHeader.markAllAsRead;
window.performSearch = () => window.adminHeaderInstance?.performSearch();
window.logout = AdminHeader.logout;

// Auto-initialize
document.addEventListener('DOMContentLoaded', async function() {
    if (!window.location.pathname.includes('admin-login.html')) {
        if (window.adminHeaderInstance.checkAuth()) {
            await window.adminHeaderInstance.init();
        }
    }
});

// CSS animations
const headerStyle = document.createElement('style');
headerStyle.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .toast-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 2px;
        border-radius: 2px;
        opacity: 0.8;
    }
    
    .toast-close:hover {
        opacity: 1;
        background: rgba(255,255,255,0.2);
    }
    
    .nav-badge {
        background: #ef4444;
        color: white;
        border-radius: 10px;
        padding: 2px 6px;
        font-size: 11px;
        font-weight: bold;
        margin-left: 5px;
        min-width: 16px;
        text-align: center;
    }
`;
document.head.appendChild(headerStyle);