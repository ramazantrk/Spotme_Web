import AppConfig from '../appconfig.js';
      
      
      // Global Variables
        let categories = [];
        let selectedIcon = 'th';
        let editingCategoryId = null;
        let currentFilter = 'all';
        
        // API Configuration
        const API_BASE_URL = AppConfig.API_BASE_URL;

        // Font Awesome Icon Database - Kategorize edilmiş
        const iconDatabase = {
            business: [
                'briefcase', 'building', 'chart-line', 'chart-pie', 'handshake', 'landmark', 
                'money-bill', 'coins', 'wallet', 'credit-card', 'calculator', 'scale-balanced',
                'file-invoice', 'clipboard', 'folder', 'archive', 'box', 'boxes-stacked'
            ],
            transport: [
                'car', 'bus', 'truck', 'motorcycle', 'bicycle', 'plane', 'helicopter', 'ship',
                'train', 'taxi', 'van-shuttle', 'tractor', 'road', 'gas-pump', 'parking',
                'traffic-light', 'map', 'map-location', 'compass', 'location-dot'
            ],
            home: [
                'home', 'house', 'door-open', 'couch', 'bed', 'bath', 'toilet', 'shower',
                'kitchen-set', 'blender', 'mug-hot', 'utensils', 'wine-glass', 'chair',
                'table', 'lamp', 'lightbulb', 'fan', 'temperature-high', 'fire'
            ],
            tech: [
                'laptop', 'desktop', 'mobile', 'tablet', 'keyboard', 'mouse', 'tv',
                'headphones', 'microphone', 'camera', 'video', 'gamepad', 'print',
                'wifi', 'ethernet', 'server', 'database', 'code', 'bug', 'robot'
            ],
            social: [
                'users', 'user', 'user-group', 'user-tie', 'user-graduate', 'child',
                'baby', 'heart', 'star', 'gift', 'cake-candles', 'champagne-glasses',
                'music', 'guitar', 'drum', 'microphone-lines', 'masks-theater', 'palette'
            ],
            other: [
                'th', 'th-large', 'th-list', 'bookmark', 'tag', 'tags', 'bell',
                'envelope', 'phone', 'fax', 'comment', 'comments', 'clock',
                'calendar', 'hourglass', 'stopwatch', 'flag', 'trophy', 'award',
                'medal', 'certificate', 'graduation-cap', 'book', 'book-open',
                'newspaper', 'pen', 'pencil', 'eraser', 'scissors', 'paperclip',
                'thumbtack', 'lock', 'key', 'shield', 'eye', 'eye-slash',
                'bell', 'bell-slash', 'volume-high', 'volume-xmark', 'video',
                'video-slash', 'image', 'images', 'file', 'file-pdf', 'file-word',
                'file-excel', 'download', 'upload', 'cloud', 'cloud-arrow-down',
                'cloud-arrow-up', 'database', 'floppy-disk', 'trash', 'trash-can',
                'plus', 'minus', 'xmark', 'check', 'circle-check', 'circle-xmark',
                'triangle-exclamation', 'circle-info', 'question', 'arrows-rotate',
                'gear', 'sliders', 'wrench', 'screwdriver', 'hammer', 'tools',
                'bolt', 'fire', 'snowflake', 'sun', 'moon', 'star', 'cloud',
                'umbrella', 'rainbow', 'seedling', 'tree', 'leaf', 'spa',
                'dumbbell', 'running', 'person-biking', 'person-swimming', 'futbol',
                'basketball', 'baseball', 'volleyball', 'bowling-ball', 'table-tennis',
                'heartbeat', 'prescription-bottle', 'pills', 'syringe', 'thermometer',
                'stethoscope', 'hospital', 'ambulance', 'truck-medical', 'wheelchair',
                'shopping-cart', 'shopping-bag', 'store', 'shop', 'basket-shopping',
                'receipt', 'barcode', 'qrcode', 'percent', 'dollar-sign',
                'utensils', 'pizza-slice', 'burger', 'ice-cream', 'apple-whole',
                'carrot', 'pepper-hot', 'fish', 'shrimp', 'egg',
                'tshirt', 'shirt', 'shoe-prints', 'hat-cowboy', 'glasses',
                'ring', 'crown', 'gem', 'paw', 'dog', 'cat', 'horse',
                'cow', 'fish-fins', 'frog', 'spider', 'dove', 'dragon',
                'flask', 'microscope', 'atom', 'magnet', 'magnet', 'vial',
                'suitcase', 'plane-departure', 'plane-arrival', 'hotel', 'bed',
                'tent', 'campground', 'mountain', 'person-hiking', 'map-location-dot'
            ]
        };

        // Icon Picker Manager
        const IconPicker = {
            currentMode: 'create', // 'create' or 'edit'
            currentCategory: 'all',
            allIcons: [],

            init() {
                // Tüm iconları tek bir array'e topla
                this.allIcons = Object.values(iconDatabase).flat();
                this.setupEventListeners();
            },

            setupEventListeners() {
                // Arama
                document.getElementById('iconSearch')?.addEventListener('input', (e) => {
                    this.filterIcons(e.target.value);
                });

                // Kategori filtreleme
                document.querySelectorAll('.icon-category-tab').forEach(tab => {
                    tab.addEventListener('click', (e) => {
                        document.querySelectorAll('.icon-category-tab').forEach(t => t.classList.remove('active'));
                        e.currentTarget.classList.add('active');
                        this.currentCategory = e.currentTarget.dataset.category;
                        this.renderIcons();
                    });
                });

                // Modal dışına tıklayınca kapat
                document.getElementById('iconPickerModal')?.addEventListener('click', (e) => {
                    if (e.target.id === 'iconPickerModal') {
                        this.close();
                    }
                });
            },

            open(mode = 'create') {
                this.currentMode = mode;
                this.currentCategory = 'all';
                document.getElementById('iconSearch').value = '';
                document.querySelectorAll('.icon-category-tab').forEach(t => t.classList.remove('active'));
                document.querySelector('.icon-category-tab[data-category="all"]').classList.add('active');
                this.renderIcons();
                document.getElementById('iconPickerModal').style.display = 'block';
            },

            close() {
                document.getElementById('iconPickerModal').style.display = 'none';
            },

            renderIcons(searchTerm = '') {
                const grid = document.getElementById('iconPickerGrid');
                const countEl = document.getElementById('iconPickerCount');
                
                let iconsToShow = this.currentCategory === 'all' 
                    ? this.allIcons 
                    : iconDatabase[this.currentCategory] || [];

                // Arama filtresi
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    iconsToShow = iconsToShow.filter(icon => icon.includes(term));
                }

                // Grid'i temizle
                grid.innerHTML = '';

                // İkonları render et
                iconsToShow.forEach(icon => {
                    const item = document.createElement('div');
                    item.className = 'icon-picker-item';
                    if ((this.currentMode === 'create' && icon === selectedIcon) || 
                        (this.currentMode === 'edit' && icon === this.getEditSelectedIcon())) {
                        item.classList.add('selected');
                    }
                    
                    item.innerHTML = `
                        <i class="fas fa-${icon}"></i>
                        <span>${icon}</span>
                    `;
                    
                    item.addEventListener('click', () => this.selectIcon(icon));
                    grid.appendChild(item);
                });

                // Sayıyı güncelle
                countEl.textContent = `${iconsToShow.length} ikon gösteriliyor`;
            },

            filterIcons(searchTerm) {
                this.renderIcons(searchTerm);
            },

           selectIcon(icon) {
        if (this.currentMode === 'create') {
            selectedIcon = icon;
            document.getElementById('selectedIcon').innerHTML = `
                <i class="fas fa-${icon}"></i>
                <span>${icon}</span>
            `;
        } else {
            // DÜZENLEME MODU (Edit Mode) - KESİN ÇÖZÜM BURADA
            const editIconEl = document.getElementById('editSelectedIcon');

            if (editIconEl) {
                // 1. İkonun Görüntüsünü Güncelle
                editIconEl.innerHTML = `
                    <i class="fas fa-${icon}"></i>
                    <span>${icon}</span>
                `;
                // 2. İkon Değerini data-icon özelliğine setAttribute ile ata (Daha Garanti)
                editIconEl.setAttribute('data-icon', icon);
            }
        }
        
        this.close();
    },

            getEditSelectedIcon() {
                return document.getElementById('editSelectedIcon')?.dataset.icon || 'th';
            }
        };

        // Application State Management
        const AppState = {
            isLoading: false,
            user: null,
            categories: [],
            currentFilter: 'all',
            searchTerm: ''
        };

        // Initialize Application
// Mevcut kodunuzda sadece bunu değiştirin:
document.addEventListener('DOMContentLoaded', async function() {
    // Auth kontrolü
    if (!AuthManager.checkAuth()) return;
    
    // Icon Picker'ı initialize et
    IconPicker.init();
    
    // Kategorileri ÖNCE yükle
    await CategoryManager.loadFromAPI();
    
    // Sonra header'ı yükle
    const script = document.createElement('script');
    script.src = 'js/admin-header.js';
    script.onload = () => {
        // Header yüklendikten sonra UI'ı kur
        AuthManager.setupUI();
    };
    document.head.appendChild(script);
    
    // Event listener'ları kur
    EventManager.setupEventListeners();
});
        // Main Initialization
        async function initializeApp() {
            try {
                UIManager.showLoading(true);
                
                // Setup all components
                AuthManager.setupUI();
                EventManager.setupEventListeners();
                IconPicker.init();
                
                // Load initial data
                await APIManager.checkConnection();
                await CategoryManager.loadFromAPI();
                
                UIManager.showNotification('Uygulama başarıyla yüklendi', 'success');
            } catch (error) {
                console.error('App initialization failed:', error);
                UIManager.showNotification('Uygulama yüklenirken hata oluştu', 'error');
            } finally {
                UIManager.showLoading(false);
            }
        }

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
            },

            async checkConnection() {
                try {
                    const response = await this.request('/Categories');
                    const data = await response.json();
                    
                    const debugDiv = document.getElementById('debugInfo');
                    debugDiv.innerHTML = `
                        <div style="color: #22c55e; font-weight: 600;">
                            <i class="fas fa-check-circle"></i> API Bağlantısı Başarılı
                        </div>
                        <div style="margin-top: 8px; font-size: 0.8rem;">
                            <strong>Status:</strong> ${response.status} | 
                            <strong>Endpoint:</strong> ${API_BASE_URL}/Categories
                        </div>
                    `;
                } catch (error) {
                    const debugDiv = document.getElementById('debugInfo');
                    debugDiv.innerHTML = `
                        <div style="color: #ef4444; font-weight: 600;">
                            <i class="fas fa-times-circle"></i> API Bağlantı Hatası
                        </div>
                        <div style="margin-top: 8px; font-size: 0.8rem;">
                            <strong>Error:</strong> ${error.message}
                        </div>
                    `;
                }
            }
        };

        // Category Manager
        const CategoryManager = {
            async loadFromAPI() {
                try {
                    const response = await APIManager.request('/Categories?includeInactive=true');
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    const data = await response.json();
                    
                    // Handle different response formats
                    let categoriesArray = [];
                    if (Array.isArray(data)) {
                        categoriesArray = data;
                    } else if (data.success && Array.isArray(data.data)) {
                        categoriesArray = data.data;
                    } else if (data.data && Array.isArray(data.data)) {
                        categoriesArray = data.data;
                    }
                    
                    AppState.categories = categoriesArray.map(cat => ({
                        id: cat.id || cat.Id,
                        name: cat.name || cat.Name || 'Unknown',
                        icon: cat.icon || cat.Icon || 'th',
                        color: cat.color || cat.Color || '#667eea',
                        isActive: cat.isActive !== undefined ? cat.isActive : (cat.IsActive !== undefined ? cat.IsActive : true),
                        postCount: cat.postCount || cat.PostCount || 0
                    }));
                    
                    UIManager.renderCategories();
                    UIManager.updateCategoryCount();
                    
                } catch (error) {
                    console.error('Error loading categories:', error);
                    UIManager.showNotification('Kategoriler yüklenirken hata oluştu: ' + error.message, 'error');
                    AppState.categories = [];
                    UIManager.renderCategories();
                }
            },

            async create(categoryData) {
                const response = await APIManager.request('/Categories', {
                    method: 'POST',
                    body: JSON.stringify(categoryData)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }

                return await response.json();
            },

            async update(id, categoryData) {
                const response = await APIManager.request(`/Categories/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        name: categoryData.name,
                        icon: categoryData.icon,
                        color: categoryData.color,
                        isActive: categoryData.isActive
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }

                return await response.json();
            },

            async toggleStatus(id) {
                const response = await APIManager.request(`/Categories/${id}/toggle-status`, {
                    method: 'POST'
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }

                return await response.json();
            },

            async delete(id) {
                const response = await APIManager.request(`/Categories/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }

                return response.status === 204 ? {} : await response.json();
            },

            getFiltered() {
                let filtered = AppState.categories;

                // Apply status filter
                if (AppState.currentFilter !== 'all') {
                    const isActive = AppState.currentFilter === 'active';
                    filtered = filtered.filter(cat => cat.isActive === isActive);
                }

                // Apply search filter
                if (AppState.searchTerm) {
                    filtered = filtered.filter(cat => 
                        cat.name.toLowerCase().includes(AppState.searchTerm.toLowerCase())
                    );
                }

                return filtered;
            }
        };

        // UI Manager
        const UIManager = {
            showLoading(show) {
                const overlay = document.getElementById('loadingOverlay');
                overlay.style.display = show ? 'flex' : 'none';
                AppState.isLoading = show;
            },

            showNotification(message, type) {
                const notification = document.getElementById('notification');
                notification.textContent = message;
                notification.className = `notification ${type}`;
                notification.classList.add('show');
                
                setTimeout(() => {
                    notification.classList.remove('show');
                }, 4000);
            },

            updateCategoryCount() {
                const countEl = document.getElementById('categoryCount');
                const filtered = CategoryManager.getFiltered();
                countEl.textContent = filtered.length;
            },

            renderCategories() {
                const grid = document.getElementById('categoriesGrid');
                const filtered = CategoryManager.getFiltered();
                
                if (filtered.length === 0) {
                    grid.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <h3>Kategori bulunamadı</h3>
                            <p>${AppState.searchTerm ? 'Arama kriterlerinize uygun kategori bulunamadı' : 'Henüz kategori eklenmemiş'}</p>
                        </div>
                    `;
                    return;
                }

                grid.innerHTML = '';
                filtered.forEach((category, index) => {
                    const card = this.createCategoryCard(category);
                    card.style.animationDelay = `${index * 0.1}s`;
                    grid.appendChild(card);
                });

                this.updateCategoryCount();
            },

            createCategoryCard(category) {
                const card = document.createElement('div');
                card.className = `category-card ${!category.isActive ? 'inactive' : ''}`;
                card.style.setProperty('--category-color', category.color);
                
                card.innerHTML = `
                    <div class="category-header">
                        <div class="category-info">
                            <div class="category-icon" style="background: ${category.isActive ? category.color : '#94a3b8'}">
                                <i class="fas fa-${category.icon}"></i>
                            </div>
                            <div class="category-details">
                                <h3>${category.name}</h3>
                                <span class="category-status ${category.isActive ? 'status-active' : 'status-inactive'}">
                                    ${category.isActive ? 'Aktif' : 'Pasif'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="category-actions">
                        <button class="btn btn-primary btn-sm" onclick="FormManager.editCategory(${category.id})">
                            <i class="fas fa-edit"></i> Düzenle
                        </button>
                        <button class="btn ${category.isActive ? 'btn-secondary' : 'btn-success'} btn-sm" 
                                onclick="FormManager.toggleCategory(${category.id})">
                            <i class="fas fa-${category.isActive ? 'pause' : 'play'}"></i> 
                            ${category.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="FormManager.deleteCategory(${category.id})">
                            <i class="fas fa-trash"></i> Sil
                        </button>
                    </div>
                `;
                
                return card;
            },

            resetForm() {
                document.getElementById('categoryForm').reset();
                document.getElementById('colorPreview').style.backgroundColor = '#667eea';
                document.getElementById('colorValue').value = '#667eea';
                document.getElementById('categoryColor').value = '#667eea';
                
                selectedIcon = 'th';
                document.getElementById('selectedIcon').innerHTML = `
                    <i class="fas fa-th"></i>
                    <span>th</span>
                `;
            }
        };

        // Form Manager
        const FormManager = {
            async handleCategorySubmit(e) {
                e.preventDefault();
                
                const name = document.getElementById('categoryName').value.trim();
                const color = document.getElementById('categoryColor').value;
                
                if (!name) {
                    UIManager.showNotification('Kategori adı boş olamaz!', 'error');
                    return;
                }

                if (AppState.categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
                    UIManager.showNotification('Bu kategori zaten mevcut!', 'error');
                    return;
                }

                const categoryData = {
                    name: name,
                    icon: selectedIcon || 'th',
                    color: color,
                    isActive: true
                };

                try {
                    UIManager.showLoading(true);
                    await CategoryManager.create(categoryData);
                    await CategoryManager.loadFromAPI();
                    
                    UIManager.resetForm();
                    UIManager.showNotification('Kategori başarıyla eklendi!', 'success');
                } catch (error) {
                    console.error('Error creating category:', error);
                    UIManager.showNotification('Kategori eklenirken hata oluştu: ' + error.message, 'error');
                } finally {
                    UIManager.showLoading(false);
                }
            },

            async editCategory(id) {
                try {
                    const category = AppState.categories.find(cat => cat.id === id);
                    if (!category) {
                        UIManager.showNotification('Kategori bulunamadı!', 'error');
                        return;
                    }

                    editingCategoryId = id;
                    
                    document.getElementById('editCategoryId').value = id;
                    document.getElementById('editCategoryName').value = category.name;
                    document.getElementById('editCategoryColor').value = category.color;
                    document.getElementById('editColorValue').value = category.color;
                    document.getElementById('editColorPreview').style.backgroundColor = category.color;

                    // Set selected icon
                    document.getElementById('editSelectedIcon').innerHTML = `
                        <i class="fas fa-${category.icon}"></i>
                        <span>${category.icon}</span>
                    `;
                    document.getElementById('editSelectedIcon').dataset.icon = category.icon;

                    document.getElementById('editModal').style.display = 'block';
                } catch (error) {
                    console.error('Error loading category for edit:', error);
                    UIManager.showNotification('Kategori yüklenirken hata oluştu!', 'error');
                }
            },

            async handleEditSubmit(e) {
                e.preventDefault();
                
                const id = parseInt(document.getElementById('editCategoryId').value);
                const name = document.getElementById('editCategoryName').value.trim();
                const color = document.getElementById('editCategoryColor').value;
                const selectedEditIcon = IconPicker.getEditSelectedIcon();
                
                if (!name) {
                    UIManager.showNotification('Kategori adı boş olamaz!', 'error');
                    return;
                }

                if (AppState.categories.some(cat => cat.id !== id && cat.name.toLowerCase() === name.toLowerCase())) {
                    UIManager.showNotification('Bu kategori adı başka bir kategori tarafından kullanılıyor!', 'error');
                    return;
                }

                const categoryData = {
                    name: name,
                    color: color,
                    icon: selectedEditIcon,
                    isActive: true
                };

                try {
                    UIManager.showLoading(true);
                    await CategoryManager.update(id, categoryData);
                    await CategoryManager.loadFromAPI();
                    
                    this.closeModal();
                    UIManager.showNotification('Kategori başarıyla güncellendi!', 'success');
                } catch (error) {
                    console.error('Error updating category:', error);
                    UIManager.showNotification('Kategori güncellenirken hata oluştu: ' + error.message, 'error');
                } finally {
                    UIManager.showLoading(false);
                }
            },

            async toggleCategory(id) {
                try {
                    UIManager.showLoading(true);
                    const result = await CategoryManager.toggleStatus(id);
                    await CategoryManager.loadFromAPI();
                    
                    UIManager.showNotification(result.message || 'Kategori durumu değiştirildi!', 'success');
                } catch (error) {
                    console.error('Error toggling category:', error);
                    UIManager.showNotification('Kategori durumu değiştirilirken hata oluştu: ' + error.message, 'error');
                } finally {
                    UIManager.showLoading(false);
                }
            },

            async deleteCategory(id) {
                if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
                
                try {
                    UIManager.showLoading(true);
                    await CategoryManager.delete(id);
                    await CategoryManager.loadFromAPI();
                    
                    UIManager.showNotification('Kategori başarıyla silindi!', 'success');
                } catch (error) {
                    console.error('Error deleting category:', error);
                    UIManager.showNotification('Kategori silinirken hata oluştu: ' + error.message, 'error');
                } finally {
                    UIManager.showLoading(false);
                }
            },

            closeModal() {
                document.getElementById('editModal').style.display = 'none';
                editingCategoryId = null;
            }
        };


        // Event Manager
        const EventManager = {
            setupEventListeners() {
                this.setupColorPickers();
                this.setupForms();
                this.setupFilters();
                this.setupSearch();
                this.setupModal();
                this.setupIconPickers(); 
            },
                     setupIconPickers() {
                // YENİ Kategori Ekleme Formu için
                document.getElementById('selectedIcon')?.addEventListener('click', () => {
                    IconPicker.open('create');
                });
                
                // Kategori Düzenleme Formu için
                document.getElementById('editSelectedIcon')?.addEventListener('click', () => {
                    IconPicker.open('edit');
                });
            },

            setupColorPickers() {
                // Main form color picker
                document.getElementById('colorPreview').addEventListener('click', () => {
                    document.getElementById('categoryColor').click();
                });

                document.getElementById('categoryColor').addEventListener('change', (e) => {
                    const color = e.target.value;
                    document.getElementById('colorPreview').style.backgroundColor = color;
                    document.getElementById('colorValue').value = color;
                });

                // Edit modal color picker
                document.getElementById('editColorPreview').addEventListener('click', () => {
                    document.getElementById('editCategoryColor').click();
                });

                document.getElementById('editCategoryColor').addEventListener('change', (e) => {
                    const color = e.target.value;
                    document.getElementById('editColorPreview').style.backgroundColor = color;
                    document.getElementById('editColorValue').value = color;
                });
            },

            setupForms() {
                document.getElementById('categoryForm').addEventListener('submit', FormManager.handleCategorySubmit);
                document.getElementById('editCategoryForm').addEventListener('submit', FormManager.handleEditSubmit.bind(FormManager));
            },

            setupFilters() {
                document.querySelectorAll('.filter-tab').forEach(tab => {
                    tab.addEventListener('click', () => {
                        // Update active tab
                        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                        tab.classList.add('active');
                        
                        // Update filter state
                        AppState.currentFilter = tab.dataset.filter;
                        UIManager.renderCategories();
                    });
                });
            },

            setupSearch() {
                document.getElementById('searchCategories').addEventListener('input', (e) => {
                    AppState.searchTerm = e.target.value;
                    UIManager.renderCategories();
                });
            },

            setupModal() {
                document.getElementById('editModal').addEventListener('click', (e) => {
                    if (e.target === document.getElementById('editModal')) {
                        FormManager.closeModal();
                    }
                });

                // ESC key to close modal
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        if (document.getElementById('editModal').style.display === 'block') {
                            FormManager.closeModal();
                        }
                        if (document.getElementById('iconPickerModal').style.display === 'block') {
                            IconPicker.close();
                        }
                    }
                });
            }
        };

        // Global functions for onclick handlers
        window.closeModal = FormManager.closeModal.bind(FormManager);
        window.FormManager = FormManager;
        window.AuthManager = AuthManager;
        window.CategoryManager = CategoryManager;
        window.IconPicker = IconPicker;