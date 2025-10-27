import AppConfig from '../appconfig.js';

const API_BASE_URL = AppConfig.API_BASE_URL;

let currentPage = 1;
let totalPages = 1;
let allPosts = [];

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    loadCategories();
    loadPosts();
    setupEventListeners();
});

// Event listeners
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', filterPosts);
    document.getElementById('statusFilter').addEventListener('change', filterPosts);
    document.getElementById('categoryFilter').addEventListener('change', filterPosts);
    document.getElementById('sortFilter').addEventListener('change', filterPosts);
}

// Kategorileri yükle
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/Posts/categories`);
        const data = await response.json();
        
        const categoryFilter = document.getElementById('categoryFilter');
        data.data.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categoryFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Kategoriler yüklenemedi:', error);
    }
}

// İlanları yükle
async function loadPosts() {
    try {
        const response = await fetch(`${API_BASE_URL}/Posts?status=all&page=${currentPage}&pageSize=50`);
        const data = await response.json();
        
        if (data.success) {
            allPosts = data.data.posts;
            totalPages = data.data.pagination.totalPages;
            
            updateStats(allPosts);
            displayPosts(allPosts);
            updatePagination();
        }
    } catch (error) {
        console.error('İlanlar yüklenemedi:', error);
        showError();
    }
}

// İstatistikleri güncelle
function updateStats(posts) {
    document.getElementById('totalPosts').textContent = posts.length;
    // Status: 1=Passive, 2=Active, 3=Archived
    document.getElementById('activePosts').textContent = posts.filter(p => p.status === 'Inactive' || p.status === 2).length;
    document.getElementById('pendingPosts').textContent = posts.filter(p => p.status === 'Active' || p.status === 1).length;
    
    const today = new Date().toDateString();
    const todayPosts = posts.filter(p => new Date(p.createdAt).toDateString() === today);
    document.getElementById('todayPosts').textContent = todayPosts.length;
}

// İlanları göster
function displayPosts(posts) {
    const container = document.getElementById('postsTableContainer');
    
    if (posts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>İlan Bulunamadı</h3>
                <p>Henüz sistemde ilan bulunmuyor.</p>
            </div>
        `;
        document.getElementById('paginationContainer').style.display = 'none';
        return;
    }

    let html = `
        <table class="posts-table">
            <thead>
                <tr>
                    <th>İlan</th>
                    <th>Kategori</th>
                    <th>Kullanıcı</th>
                    <th>Fiyat</th>
                    <th>Durum</th>
                    <th>Tarih</th>
                    <th>İşlemler</th>
                </tr>
            </thead>
            <tbody>
    `;

    posts.forEach(post => {
        const imageUrl = post.images && post.images.length > 0 
            ? API_BASE_URL.replace('/api', '') + post.images[0].url 
            : null;
        
        // Status mapping: 1=Passive, 2=Active, 3=Archived
        let statusText = 'Bilinmeyen';
        let statusClass = 'badge-draft';
        
        if (post.status === 'Inactive' || post.status === 2 || post.status === '2') {
            statusText = 'Aktif';
            statusClass = 'badge-active';
        } else if (post.status === 'Active' || post.status === 1 || post.status === '1') {
            statusText = 'Pasif';
            statusClass = 'badge-inactive';
        } else if (post.status === 'Archived' || post.status === 3 || post.status === '3') {
            statusText = 'Arşivlendi';
            statusClass = 'badge-draft';
        }
        
        html += `
            <tr>
                <td>
                    <div class="post-info">
                        ${imageUrl 
                            ? `<img src="${imageUrl}" alt="${post.title}" class="post-image">` 
                            : `<div class="post-image-placeholder"><i class="fas fa-image"></i></div>`
                        }
                        <div class="post-details">
                            <div class="post-title">${post.title}</div>
                            <div class="post-meta">
                                <span><i class="fas fa-map-marker-alt"></i> ${post.location?.city || 'Konum yok'}</span>
                            </div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge category-badge">
                        ${post.category?.name || 'Kategorisiz'}
                    </span>
                </td>
                <td>${post.user?.fullName || 'Bilinmeyen'}</td>
                <td>
                    <div class="price-display">
                        ${post.price ? post.price.toLocaleString('tr-TR') + ' ₺' : 'Belirtilmemiş'}
                    </div>
                </td>
                <td>
                    <span class="badge ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td>${new Date(post.createdAt).toLocaleDateString('tr-TR')}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-view" onclick="window.viewPost(${post.id})" title="Görüntüle">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon btn-edit" onclick="window.editPost(${post.id})" title="Düzenle">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-toggle" onclick="window.togglePostStatus(${post.id})" title="Durum Değiştir">
                            <i class="fas fa-toggle-on"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="window.deletePost(${post.id})" title="Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
    document.getElementById('paginationContainer').style.display = 'flex';
}

// İlanları filtrele
function filterPosts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const status = document.getElementById('statusFilter').value;
    const category = document.getElementById('categoryFilter').value;
    const sort = document.getElementById('sortFilter').value;

    let filtered = [...allPosts];

    // Arama filtresi
    if (searchTerm) {
        filtered = filtered.filter(post => {
            const titleMatch = post.title && post.title.toLowerCase().includes(searchTerm);
            const descMatch = post.description && post.description.toLowerCase().includes(searchTerm);
            const userMatch = post.user?.fullName && post.user.fullName.toLowerCase().includes(searchTerm);
            const locationMatch = post.location?.city && post.location.city.toLowerCase().includes(searchTerm);
            
            return titleMatch || descMatch || userMatch || locationMatch;
        });
    }

    // Durum filtresi
    if (status !== 'all') {
        filtered = filtered.filter(post => {
            // Status mapping: 1=Passive, 2=Active, 3=Archived
            if (status.toLowerCase() === 'active') {
                return post.status === 'Inactive' || post.status === 2 || post.status === '2';
            } else if (status.toLowerCase() === 'inactive') {
                return post.status === 'Active' || post.status === 1 || post.status === '1';
            } else if (status.toLowerCase() === 'draft') {
                return post.status === 'Archived' || post.status === 3 || post.status === '3';
            }
            return false;
        });
    }

    // Kategori filtresi
    if (category !== 'all') {
        filtered = filtered.filter(post => 
            post.category?.id == category
        );
    }

    // Sıralama
    switch(sort) {
        case 'newest':
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'oldest':
            filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'price-high':
            filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
            break;
        case 'price-low':
            filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
            break;
    }

    displayPosts(filtered);
}

// Filtreleri sıfırla
window.resetFilters = function() {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('categoryFilter').value = 'all';
    document.getElementById('sortFilter').value = 'newest';
    displayPosts(allPosts);
}

// İlanları yenile
window.refreshPosts = function() {
    loadPosts();
}

// Sayfa değiştir
window.changePage = function(direction) {
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        loadPosts();
    }
}

// Pagination güncelle
function updatePagination() {
    document.getElementById('pageInfo').textContent = `Sayfa ${currentPage} / ${totalPages}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

// İlan görüntüle
window.viewPost = async function(postId) {
    try {
        const response = await fetch(`${API_BASE_URL}/Posts/${postId}`);
        const data = await response.json();
        
        if (data.success) {
            showPostDetail(data.data);
        }
    } catch (error) {
        console.error('İlan detayı yüklenemedi:', error);
        alert('İlan detayları yüklenirken bir hata oluştu.');
    }
}

// İlan detayını göster
function showPostDetail(post) {
    const modal = document.getElementById('postDetailModal');
    const content = document.getElementById('postDetailContent');

    let imagesHtml = '';
    if (post.images && post.images.length > 0) {
        imagesHtml = `
            <div class="detail-section">
                <h4><i class="fas fa-images"></i> Resimler</h4>
                <div class="post-detail-images">
                    ${post.images.map(img => 
                        `<img src="${API_BASE_URL.replace('/api', '') + img.url}" alt="İlan resmi" class="post-detail-image">`
                    ).join('')}
                </div>
            </div>
        `;
    }

    content.innerHTML = `
        <div class="detail-section">
            <h4><i class="fas fa-info-circle"></i> Genel Bilgiler</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">İlan Başlığı</div>
                    <div class="detail-value">${post.title}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Kategori</div>
                    <div class="detail-value">${post.category?.name || 'Yok'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Fiyat</div>
                    <div class="detail-value">${post.price ? post.price.toLocaleString('tr-TR') + ' ₺' : 'Belirtilmemiş'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Durum</div>
                    <div class="detail-value">${post.status}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Kullanıcı</div>
                    <div class="detail-value">${post.user?.fullName || 'Bilinmeyen'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Telefon</div>
                    <div class="detail-value">${post.phoneNumber || 'Yok'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Konum</div>
                    <div class="detail-value">${post.location?.city || 'Belirtilmemiş'}, ${post.location?.district || ''}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Oluşturma Tarihi</div>
                    <div class="detail-value">${new Date(post.createdAt).toLocaleDateString('tr-TR')}</div>
                </div>
            </div>
        </div>

        ${imagesHtml}

        <div class="detail-section">
            <h4><i class="fas fa-align-left"></i> Açıklama</h4>
            <div class="detail-description">
                ${post.description || 'Açıklama yok'}
            </div>
        </div>
    `;

    modal.style.display = 'block';
}

// Modal kapat
window.closePostDetailModal = function() {
    document.getElementById('postDetailModal').style.display = 'none';
}

// Modal dışına tıklandığında kapat
window.onclick = function(event) {
    const modal = document.getElementById('postDetailModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// İlan düzenle
window.editPost = function(postId) {
    // İlan düzenleme sayfasına yönlendir
    window.location.href = `edit-post.html?id=${postId}`;
}

// İlan durumunu değiştir
window.togglePostStatus = async function(postId) {
    if (!confirm('İlan durumunu değiştirmek istediğinize emin misiniz?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/Posts/${postId}/toggle-status`, {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            alert('İlan durumu başarıyla değiştirildi.');
            loadPosts();
        } else {
            alert('İlan durumu değiştirilemedi.');
        }
    } catch (error) {
        console.error('İlan durumu değiştirilemedi:', error);
        alert('İlan durumu değiştirilirken bir hata oluştu.');
    }
}

// İlan sil
window.deletePost = async function(postId) {
    if (!confirm('Bu ilanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/Posts/${postId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        
        if (data.success) {
            alert('İlan başarıyla silindi.');
            loadPosts();
        } else {
            alert('İlan silinemedi.');
        }
    } catch (error) {
        console.error('İlan silinemedi:', error);
        alert('İlan silinirken bir hata oluştu.');
    }
}

// Hata göster
function showError() {
    const container = document.getElementById('postsTableContainer');
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Bir Hata Oluştu</h3>
            <p>İlanlar yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyin.</p>
            <button class="btn btn-primary" onclick="window.refreshPosts()">
                <i class="fas fa-redo"></i> Tekrar Dene
            </button>
        </div>
    `;
}