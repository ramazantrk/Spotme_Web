  import AppConfig from '../appconfig.js';

        const API_BASE_URL = AppConfig.API_BASE_URL;
        let allReports = [];
        let currentReportId = null;

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            refreshReports();
        });

        async function refreshReports() {
            try {
                const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
                const response = await fetch(`${API_BASE_URL}/Report/admin/all`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) throw new Error('Şikayetler yüklenemedi');

                const data = await response.json();
                allReports = data.data || data || [];
                renderTable();
                showNotification('Şikayetler yenilendi', 'success');
            } catch (error) {
                console.error('Error:', error);
                showNotification('Şikayetler yüklenirken hata oluştu', 'error');
            }
        }

        function applyFilters() {
            const status = document.getElementById('statusFilter').value;
            const type = document.getElementById('typeFilter').value;
            const search = document.getElementById('searchInput').value.toLowerCase();

            const filtered = allReports.filter(report => {
                const statusMatch = !status || report.status === status;
                const typeMatch = !type || report.reportType === type;
                const searchMatch = !search ||
                    report.reportedUserId?.toString().includes(search) ||
                    report.reportedPostId?.toString().includes(search) ||
                    report.reason?.toLowerCase().includes(search);

                return statusMatch && typeMatch && searchMatch;
            });

            renderTable(filtered);
        }

        function renderTable(reports = allReports) {
            const container = document.getElementById('tableContainer');
            document.getElementById('totalCount').textContent = reports.length;

            if (reports.length === 0) {
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
                        ${reports.map(report => `
                            <tr>
                                <td>#${report.id}</td>
                                <td>${report.reportType === 'User' ? '👤 Kullanıcı' : '📄 İlan'}</td>
                                <td>${report.reason?.substring(0, 40) || '-'}...</td>
                                <td><span class="status-badge status-${report.status.toLowerCase()}">${getStatusText(report.status)}</span></td>
                                <td>${new Date(report.createdAt).toLocaleDateString('tr-TR')}</td>
                                <td>
                                    <div class="actions">
                                        <button class="action-btn action-btn-view" onclick="viewDetail(${report.id})">
                                            <i class="fas fa-eye"></i> Görüntüle
                                        </button>
                                        <button class="action-btn action-btn-delete" onclick="deleteReport(${report.id})">
                                            <i class="fas fa-trash"></i> Sil
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

            container.innerHTML = html;
        }

        async function viewDetail(reportId) {
            try {
                const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
                const response = await fetch(`${API_BASE_URL}/Report/admin/${reportId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) throw new Error('Detay yüklenemedi');

                const report = await response.json();
                currentReportId = report.id;

                const content = `
                    <div class="info-row">
                        <span class="info-label">ID:</span>
                        <span class="info-value">#${report.id}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Tür:</span>
                        <span class="info-value">${report.reportType === 'User' ? '👤 Kullanıcı' : '📄 İlan'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Durum:</span>
                        <span class="info-value"><span class="status-badge status-${report.status.toLowerCase()}">${getStatusText(report.status)}</span></span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Neden:</span>
                        <span class="info-value">${report.reason}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Açıklama:</span>
                        <span class="info-value">${report.description || '-'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Raporlayan:</span>
                        <span class="info-value">Kullanıcı #${report.reporterId}</span>
                    </div>
                    ${report.reportType === 'User' ? `
                        <div class="info-row">
                            <span class="info-label">Şikayet Yapılan:</span>
                            <span class="info-value">Kullanıcı #${report.reportedUserId}</span>
                        </div>
                    ` : `
                        <div class="info-row">
                            <span class="info-label">Şikayet Yapılan:</span>
                            <span class="info-value">İlan #${report.reportedPostId}</span>
                        </div>
                    `}
                    <div class="info-row">
                        <span class="info-label">Tarih:</span>
                        <span class="info-value">${new Date(report.createdAt).toLocaleString('tr-TR')}</span>
                    </div>
                    ${report.adminNotes ? `
                        <div class="info-row">
                            <span class="info-label">Yönetici Notu:</span>
                            <span class="info-value">${report.adminNotes}</span>
                        </div>
                    ` : ''}
                `;

                document.getElementById('detailContent').innerHTML = content;
                document.getElementById('statusSelect').value = report.status;
                document.getElementById('noteTextarea').value = report.adminNotes || '';
                openModal('detailModal');
            } catch (error) {
                console.error('Error:', error);
                showNotification('Detay yüklenirken hata oluştu', 'error');
            }
        }

        function openEditModal() {
            closeModal('detailModal');
            openModal('editModal');
        }

        async function updateReport() {
            try {
                const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
                const status = document.getElementById('statusSelect').value;
                const note = document.getElementById('noteTextarea').value;

                const response = await fetch(`${API_BASE_URL}/Report/admin/${currentReportId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        status: status,
                        adminNotes: note
                    })
                });

                if (!response.ok) throw new Error('Güncelleme başarısız');

                showNotification('Şikayet başarıyla güncellendi', 'success');
                closeModal('editModal');
                refreshReports();
            } catch (error) {
                console.error('Error:', error);
                showNotification('Güncellenirken hata oluştu', 'error');
            }
        }

        async function deleteReport(reportId) {
            if (confirm('Bu şikayeti silmek istediğinize emin misiniz?')) {
                try {
                    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
                    const response = await fetch(`${API_BASE_URL}/Report/admin/${reportId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.ok) throw new Error('Silme başarısız');

                    showNotification('Şikayet silindi', 'success');
                    refreshReports();
                } catch (error) {
                    console.error('Error:', error);
                    showNotification('Silinirken hata oluştu', 'error');
                }
            }
        }

        function exportReports() {
            let csv = 'ID,Tür,Neden,Durum,Tarih\n';
            allReports.forEach(report => {
                csv += `${report.id},"${report.reportType}","${report.reason}","${report.status}","${report.createdAt}"\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sikayet-raporu-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            showNotification('Rapor indirildi', 'success');
        }

        function openModal(modalId) {
            document.getElementById(modalId).classList.add('active');
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('active');
        }

        function getStatusText(status) {
            const statusMap = {
                'Pending': 'Beklemede',
                'Reviewing': 'İnceleniyor',
                'Resolved': 'Çözüldü',
                'Rejected': 'Reddedildi'
            };
            return statusMap[status] || status;
        }

        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.remove();
            }, 3000);
        }

        // Close modal when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });