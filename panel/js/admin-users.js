// admin-users.js
import AppConfig from '../appconfig.js';

const API_BASE_URL = AppConfig.API_BASE_URL;

// State
let currentPage = 1;
let totalPages = 1;
let users = [];

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
        return true;
    },

    getToken() {
        return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken') || '';
    },

    getAuthHeaders() {
        const token = this.getToken();
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    },

    isTokenExpired(token) {
        if (token.startsWith('demo-token-')) {
            const tokenTime = parseInt(token.split('-')[2]);
            return (Date.now() - tokenTime) > 86400000;
        }
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp && payload.exp < Math.floor(Date.now() / 1000);
        } catch {
            return false;
        }
    },

    logout() {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminUser');
        showNotification('Oturum süresi doldu', 'error');
        setTimeout(() => window.location.href = 'admin-login.html', 2000);
    },

    setupUI() {
        const user = JSON.parse(localStorage.getItem('adminUser') || sessionStorage.getItem('adminUser') || '{}');
        if (user?.username) {
            const headerActions = document.getElementById('headerActions');
            if (headerActions) {
                headerActions.innerHTML = `
                    <div class="auth-info">
                        <i class="fas fa-user"></i>
                        <span>Hoş geldiniz, <strong>${user.username}</strong></span>
                    </div>
                    <button onclick="AuthManager.logout()" class="btn btn-secondary btn-sm">
                        <i class="fas fa-sign-out-alt"></i> Çıkış
                    </button>
                `;
            }
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!AuthManager.checkAuth()) return;
    AuthManager.setupUI();
    
    fetchUserStats();
    fetchUsers();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', debounce(fetchUsers, 500));
    document.getElementById('statusFilter').addEventListener('change', fetchUsers);
    document.getElementById('sortFilter').addEventListener('change', fetchUsers);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// Fetch User Stats
async function fetchUserStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/Admin/users/stats`, {
            headers: AuthManager.getAuthHeaders()
        });

        if (response.status === 401) {
            AuthManager.logout();
            return;
        }

        if (!response.ok) throw new Error('İstatistikler yüklenemedi');

        const result = await response.json();
        const stats = result.data;

        document.getElementById('totalUsers').textContent = stats.totalUsers;
        document.getElementById('activeUsers').textContent = stats.activeUsers;
        document.getElementById('newUsersMonth').textContent = stats.newUsersThisMonth;
        document.getElementById('usersWithPosts').textContent = stats.usersWithPosts;
    } catch (error) {
        console.error('Stats fetch error:', error);
        showNotification('İstatistikler yüklenirken hata oluştu', 'error');
    }
}

// Fetch Users
async function fetchUsers() {
    const container = document.getElementById('usersTableContainer');
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Kullanıcılar yükleniyor...</p>
        </div>
    `;

    const search = document.getElementById('searchInput').value;
    const status = document.getElementById('statusFilter').value;
    const sort = document.getElementById('sortFilter').value;

    const params = new URLSearchParams({
        page: currentPage,
        pageSize: 20,
        ...(search && { search }),
        ...(status !== 'all' && { status })
    });

    try {
        const response = await fetch(`${API_BASE_URL}/Admin/users?${params}`, {
            headers: AuthManager.getAuthHeaders()
        });

        if (response.status === 401) {
            AuthManager.logout();
            return;
        }

        if (!response.ok) throw new Error('Kullanıcılar yüklenemedi');

        const result = await response.json();
        users = result.data.users;
        
        // Apply client-side sorting
        sortUsers(users, sort);

        const pagination = result.data.pagination;
        totalPages = pagination.totalPages;

        renderUsers(users);
        updatePagination(pagination);
    } catch (error) {
        console.error('Users fetch error:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Hata Oluştu</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="fetchUsers()">Tekrar Dene</button>
            </div>
        `;
    }
}

// Sort Users
function sortUsers(users, sortType) {
    switch (sortType) {
        case 'newest':
            users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'oldest':
            users.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'name':
            users.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'posts':
            users.sort((a, b) => b.postCount - a.postCount);
            break;
    }
}

// Render Users
function renderUsers(users) {
    const container = document.getElementById('usersTableContainer');

    if (users.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users-slash"></i>
                <h3>Kullanıcı Bulunamadı</h3>
                <p>Arama kriterlerine uygun kullanıcı bulunamadı.</p>
            </div>
        `;
        return;
    }

    const tableHTML = `
        <table class="users-table">
            <thead>
                <tr>
                    <th>Kullanıcı</th>
                    <th>Telefon</th>
                    <th>Durum</th>
                    <th>İlanlar</th>
                    <th>Kayıt Tarihi</th>
                    <th>İşlemler</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>
                            <div class="user-info">
                                ${user.profilePictureUrl ? 
                                    `<img src="${AppConfig.API_BASE+user.profilePictureUrl}" alt="${user.name}" class="user-avatar">` :
                                    `<div class="user-avatar-placeholder">${user.name.charAt(0).toUpperCase()}</div>`
                                }
                                <div class="user-details">
                                    <div class="user-name">${user.name}</div>
                                    <div class="user-email">${user.email}</div>
                                </div>
                            </div>
                        </td>
                        <td>${user.phoneNumber || '-'}</td>
                        <td>
                            <span class="badge ${user.isActive ? 'badge-active' : 'badge-inactive'}">
                                ${user.isActive ? 'Aktif' : 'Pasif'}
                            </span>
                        </td>
                        <td>
                            <div class="post-count">
                                <i class="fas fa-newspaper"></i>
                                <span>${user.postCount}</span>
                            </div>
                        </td>
                        <td>${formatDate(user.createdAt)}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn-icon btn-view" onclick="viewUserDetails(${user.id})" title="Detay">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn-icon btn-toggle" onclick="toggleUserStatus(${user.id})" title="${user.isActive ? 'Pasif Yap' : 'Aktif Yap'}">
                                    <i class="fas fa-${user.isActive ? 'toggle-on' : 'toggle-off'}"></i>
                                </button>
                                <button class="btn-icon btn-delete" onclick="deleteUser(${user.id})" title="Sil">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}

// Update Pagination
function updatePagination(pagination) {
    const paginationContainer = document.getElementById('paginationContainer');
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    if (pagination.totalPages > 1) {
        paginationContainer.style.display = 'flex';
        pageInfo.textContent = `Sayfa ${pagination.currentPage} / ${pagination.totalPages}`;
        prevBtn.disabled = pagination.currentPage === 1;
        nextBtn.disabled = pagination.currentPage === pagination.totalPages;
    } else {
        paginationContainer.style.display = 'none';
    }
}

// Change Page
function changePage(direction) {
    currentPage += direction;
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    fetchUsers();
}

// View User Details
async function viewUserDetails(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/Admin/users/${userId}`, {
            headers: AuthManager.getAuthHeaders()
        });

        if (response.status === 401) {
            AuthManager.logout();
            return;
        }

        if (!response.ok) throw new Error('Kullanıcı detayları yüklenemedi');

        const result = await response.json();
        const user = result.data;

        const modalContent = `
            <div class="user-detail-header">
                ${user.profilePictureUrl ? 
                    `<img src="${AppConfig.API_BASE+user.profilePictureUrl}" alt="${user.name}" class="user-detail-avatar">` :
                    `<div class="user-avatar-placeholder" style="width: 100px; height: 100px; font-size: 2.5rem;">${user.name.charAt(0).toUpperCase()}</div>`
                }
                <div class="user-detail-info">
                    <h3>${user.name}</h3>
                    <p><i class="fas fa-envelope"></i> ${user.email}</p>
                    <p><i class="fas fa-phone"></i> ${user.phoneNumber || 'Belirtilmemiş'}</p>
                    <span class="badge ${user.isActive ? 'badge-active' : 'badge-inactive'}">
                        ${user.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                </div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-chart-bar"></i> İstatistikler</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">Toplam İlan</div>
                        <div class="detail-value">${user.stats.totalPosts}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Aktif İlan</div>
                        <div class="detail-value">${user.stats.activePosts}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Favoriler</div>
                        <div class="detail-value">${user.stats.favoritesCount}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Kayıt Tarihi</div>
                        <div class="detail-value">${formatDate(user.createdAt)}</div>
                    </div>
                </div>
            </div>

            ${user.posts && user.posts.length > 0 ? `
                <div class="detail-section">
                    <h4><i class="fas fa-newspaper"></i> Son İlanlar</h4>
                    <ul class="recent-posts">
                        ${user.posts.map(post => `
                            <li class="recent-post-item">
                                <div>
                                    <div class="post-title">${post.title}</div>
                                    <div class="post-meta">
                                        ${formatDate(post.createdAt)} - 
                                        <span class="badge ${post.status === 2 ? 'badge-active' : 'badge-inactive'}">
                                            ${post.status === 2 ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </div>
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
        `;

        document.getElementById('userDetailContent').innerHTML = modalContent;
        document.getElementById('userDetailModal').style.display = 'block';
    } catch (error) {
        console.error('User detail error:', error);
        showNotification('Kullanıcı detayları yüklenirken hata oluştu', 'error');
    }
}

// Toggle User Status
async function toggleUserStatus(userId) {
    const user = users.find(u => u.id === userId);
    if (!confirm(`${user.name} kullanıcısını ${user.isActive ? 'pasif' : 'aktif'} yapmak istediğinize emin misiniz?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/Admin/users/${userId}/toggle-status`, {
            method: 'PUT',
            headers: AuthManager.getAuthHeaders()
        });

        if (response.status === 401) {
            AuthManager.logout();
            return;
        }

        if (!response.ok) throw new Error('Durum değiştirilemedi');

        showNotification('Kullanıcı durumu güncellendi', 'success');
        fetchUsers();
        fetchUserStats();
    } catch (error) {
        console.error('Toggle status error:', error);
        showNotification('Durum değiştirilirken hata oluştu', 'error');
    }
}

// Delete User
async function deleteUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!confirm(`${user.name} kullanıcısını silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/Admin/users/${userId}`, {
            method: 'DELETE',
            headers: AuthManager.getAuthHeaders()
        });

        if (response.status === 401) {
            AuthManager.logout();
            return;
        }

        if (!response.ok) throw new Error('Kullanıcı silinemedi');

        showNotification('Kullanıcı başarıyla silindi', 'success');
        fetchUsers();
        fetchUserStats();
    } catch (error) {
        console.error('Delete user error:', error);
        showNotification('Kullanıcı silinirken hata oluştu', 'error');
    }
}

// Close Modal
function closeUserDetailModal() {
    document.getElementById('userDetailModal').style.display = 'none';
}

// Reset Filters
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('sortFilter').value = 'newest';
    currentPage = 1;
    fetchUsers();
}

// Refresh Users
function refreshUsers() {
    currentPage = 1;
    fetchUsers();
    fetchUserStats();
}

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Show Notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 2000;
        animation: slideIn 0.3s ease;
    `;
    notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

// Export functions
window.changePage = changePage;
window.viewUserDetails = viewUserDetails;
window.toggleUserStatus = toggleUserStatus;
window.deleteUser = deleteUser;
window.closeUserDetailModal = closeUserDetailModal;
window.resetFilters = resetFilters;
window.refreshUsers = refreshUsers;
window.AuthManager = AuthManager;