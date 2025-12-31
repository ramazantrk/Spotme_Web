import AppConfig from '../appconfig.js';

const API_BASE_URL = AppConfig.API_BASE_URL;
let allReports = [];
let currentReportId = null;

// Status Enum Mapping (Backend enum'e göre 1-5)
const STATUS_ENUM = {
    'Pending': 1,
    'UnderReview': 2,
    'Resolved': 3,
    'Rejected': 4,
    'ActionTaken': 5,
    1: 'Beklemede',
    2: 'İnceleniyor',
    3: 'Çözüldü',
    4: 'Reddedildi',
    5: 'İşlem Yapıldı'
};

// Type Enum Mapping
const TYPE_ENUM = {
    'User': 0,
    'Post': 1,
    0: 'Kullanıcı',
    1: 'İlan'
};

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
    refreshReports();
});

// Şikayetleri API'den çeken ana fonksiyon
async function refreshReports() {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        
        if (!token) {
            showNotification('Token bulunamadı', 'error');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/Report/admin/all`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Backend PagedResult dönüyor, items property'sine erişim
        allReports = data.items || data.data || (Array.isArray(data) ? data : []);
        
        console.log("Başarıyla çekilen şikayet sayısı:", allReports.length);
        
        renderTable(allReports);
        showNotification('Şikayetler yenilendi', 'success');
    } catch (error) {
        console.error('Refresh Reports Error:', error);
        showNotification('Şikayetler yüklenirken hata oluştu: ' + error.message, 'error');
    }
}

// Filtreleme işlemini yapan fonksiyon
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter')?.value;
    const typeFilter = document.getElementById('typeFilter')?.value;
    const search = document.getElementById('searchInput')?.value.toLowerCase();

    const filtered = allReports.filter(report => {
        const statusVal = report.status?.toString();
        const typeVal = report.type?.toString();
        const reasonVal = (report.reason || "").toLowerCase();

        const statusMatch = !statusFilter || statusVal === statusFilter;
        const typeMatch = !typeFilter || typeVal === typeFilter;
        const searchMatch = !search || reasonVal.includes(search);

        return statusMatch && typeMatch && searchMatch;
    });

    renderTable(filtered);
}

// Tabloyu HTML'e basan fonksiyon
function renderTable(reports = allReports) {
    const container = document.getElementById('tableContainer');
    const totalCountEl = document.getElementById('totalCount');

    const safeReports = Array.isArray(reports) ? reports : [];

    if (totalCountEl) {
        totalCountEl.textContent = safeReports.length;
    }

    if (safeReports.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fas fa-inbox"></i></div>
                <h3>Şikayet bulunamadı</h3>
                <p>Filtreleri kontrol edin veya daha sonra tekrar deneyin</p>
            </div>
        `;
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Tür</th>
                    <th>Neden</th>
                    <th>Durum</th>
                    <th>Tarih</th>
                    <th>İşlemler</th>
                </tr>
            </thead>
            <tbody>
                ${safeReports.map(report => {
                    const idVal = report.id;
                    const statusVal = report.status;
                    const typeVal = report.type;
                    const reasonVal = report.reason || 'Neden belirtilmemiş';
                    const dateVal = report.createdAt;

                    return `
                    <tr>
                        <td>#${idVal}</td>
                        <td>${typeVal == 0 ? '👤 Kullanıcı' : '📄 İlan'}</td>
                        <td>${reasonVal.substring(0, 40)}${reasonVal.length > 40 ? '...' : ''}</td>
                        <td><span class="status-badge status-${getStatusClass(statusVal)}">${getStatusText(statusVal)}</span></td>
                        <td>${dateVal ? new Date(dateVal).toLocaleDateString('tr-TR') : '-'}</td>
                        <td>
                            <div class="actions">
                                <button class="action-btn action-btn-view" onclick="viewDetail(${idVal})">
                                    <i class="fas fa-eye"></i> Görüntüle
                                </button>
                                <button class="action-btn action-btn-delete" onclick="deleteReport(${idVal})">
                                    <i class="fas fa-trash"></i> Sil
                                </button>
                            </div>
                        </td>
                    </tr>
                `}).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// Detay görüntüleme modalını açan fonksiyon
async function viewDetail(reportId) {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        
        if (!token) {
            showNotification('Token bulunamadı', 'error');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/Report/admin/${reportId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Detay yüklenemedi`);
        }

        const report = await response.json();
        currentReportId = report.id;

        const content = `
            <div class="info-row"><span class="info-label">ID:</span><span class="info-value">#${currentReportId}</span></div>
            <div class="info-row"><span class="info-label">Tür:</span><span class="info-value">${report.type == 0 ? '👤 Kullanıcı' : '📄 İlan'}</span></div>
            <div class="info-row"><span class="info-label">Durum:</span><span class="info-value"><span class="status-badge status-${getStatusClass(report.status)}">${getStatusText(report.status)}</span></span></div>
            <div class="info-row"><span class="info-label">Neden:</span><span class="info-value">${report.reason}</span></div>
            <div class="info-row"><span class="info-label">Açıklama:</span><span class="info-value">${report.description || '-'}</span></div>
            <div class="info-row"><span class="info-label">Raporlayan:</span><span class="info-value">${report.reporterName || 'Bilinmiyor'}</span></div>
            <div class="info-row"><span class="info-label">Hedef:</span><span class="info-value">${report.reportedUserName || report.reportedPostTitle || 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">Tarih:</span><span class="info-value">${new Date(report.createdAt).toLocaleString('tr-TR')}</span></div>
            <div class="info-row"><span class="info-label">Yönetici Notu:</span><span class="info-value">${report.adminNote || '-'}</span></div>
        `;

        document.getElementById('detailContent').innerHTML = content;
        
        // ✅ FİX: Select value'su number olmalı
        document.getElementById('statusSelect').value = report.status;
        document.getElementById('noteTextarea').value = report.adminNote || '';
        openModal('detailModal');
    } catch (error) {
        console.error('View Detail Error:', error);
        showNotification('Detay yüklenirken hata oluştu: ' + error.message, 'error');
    }
}

// ✅ FİX: Güncelleme - Status value'su number gönder
async function updateReport() {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        
        if (!token) {
            showNotification('Token bulunamadı', 'error');
            return;
        }

        // ✅ Select'in value'su direkt number
        const statusValue = parseInt(document.getElementById('statusSelect').value);
        const adminNote = document.getElementById('noteTextarea').value;

        // NaN kontrolü
        if (isNaN(statusValue)) {
            showNotification('Geçersiz durum seçimi', 'error');
            return;
        }

        const requestBody = {
            status: statusValue,  // Number olarak gönder
            adminNote: adminNote
        };

        console.log('Update payload:', requestBody);

        const response = await fetch(`${API_BASE_URL}/Report/admin/${currentReportId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Server response:', errorData);
            throw new Error(`HTTP ${response.status}: ${errorData.message || 'Güncelleme başarısız'}`);
        }

        showNotification('Şikayet başarıyla güncellendi', 'success');
        closeModal('editModal');
        refreshReports();
    } catch (error) {
        console.error('Update Report Error:', error);
        showNotification('Güncellenirken hata oluştu: ' + error.message, 'error');
    }
}

// Şikayet silme
async function deleteReport(reportId) {
    if (!confirm('Bu şikayeti silmek istediğinize emin misiniz?')) return;
    
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        
        if (!token) {
            showNotification('Token bulunamadı', 'error');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/Report/admin/${reportId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Silme başarısız`);
        }

        showNotification('Şikayet silindi', 'success');
        refreshReports();
    } catch (error) {
        console.error('Delete Report Error:', error);
        showNotification('Silinirken hata oluştu: ' + error.message, 'error');
    }
}

// Yardımcı Fonksiyonlar
function getStatusText(status) {
    const statusMap = {
        1: 'Beklemede',
        2: 'İnceleniyor',
        3: 'Çözüldü',
        4: 'Reddedildi',
        5: 'İşlem Yapıldı'
    };
    return statusMap[status] || 'Bilinmiyor';
}

function getStatusClass(status) {
    const classMap = {
        1: 'pending',
        2: 'reviewing',
        3: 'resolved',
        4: 'rejected',
        5: 'action-taken'
    };
    return classMap[status] || 'pending';
}

// Modal Yönetimi
function openModal(modalId) { 
    document.getElementById(modalId)?.classList.add('active'); 
}

function closeModal(modalId) { 
    document.getElementById(modalId)?.classList.remove('active'); 
}

function openEditModal() { 
    closeModal('detailModal'); 
    openModal('editModal'); 
}

// CSV Aktarımı
function exportReports() {
    let csv = 'ID,Tür,Neden,Durum,Tarih\n';
    allReports.forEach(r => {
        csv += `${r.id},"${r.type == 0 ? 'User' : 'Post'}","${r.reason}","${getStatusText(r.status)}","${r.createdAt}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sikayet-raporu-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

// Global Functions
window.refreshReports = refreshReports;
window.applyFilters = applyFilters;
window.viewDetail = viewDetail;
window.deleteReport = deleteReport;
window.updateReport = updateReport;
window.exportReports = exportReports;
window.closeModal = closeModal;
window.openEditModal = openEditModal;

// Modal dışına tıklayınca kapatma
document.querySelectorAll('.modal').forEach(modal => {
    modal?.addEventListener('click', (e) => { 
        if (e.target === modal) modal.classList.remove('active'); 
    });
});