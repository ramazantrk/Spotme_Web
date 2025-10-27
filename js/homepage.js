import AppConfig from "../panel/appconfig.js";

const API_BASE_URL =  AppConfig.API_BASE_URL;

document.addEventListener('DOMContentLoaded', () => {
    fetchHomePageData();
});

async function fetchHomePageData() {
    try {
        const response = await fetch(`${API_BASE_URL}/HomePage/public`);
        
        if (!response.ok) {
            throw new Error(`HTTP Hata: ${response.status} (${response.statusText})`);
        }
        
        const data = await response.json();
        
        if (!data) {
            console.error("API'den boş veri geldi.");
            showErrorMessage("Veriler yüklenemedi");
            return;
        }

        console.log("API'den gelen veri:", data); // Debug için

        // Hero Section - null ise güncelleme
        if (data.heroSection) {
            updateHeroSection(data.heroSection);
        } else {
            console.warn("heroSection null geldi, statik içerik korunuyor");
        }
        
        // Hero Stats - boş array kontrolü
        if (data.heroStats && data.heroStats.length > 0 && data.appDownloadLinks) {
            updateHeroStats(data.heroStats, data.appDownloadLinks);
        } else if (data.appDownloadLinks && data.appDownloadLinks.length > 0) {
            // Sadece download linklerini güncelle, stats'i koru
            updateOnlyDownloadLinks(data.appDownloadLinks);
        } else {
            console.warn("heroStats veya appDownloadLinks eksik, statik içerik korunuyor");
        }

        // Features
        if (data.features && data.features.length > 0) {
            updateFeatures(data.features);
        } else {
            console.warn("features eksik, statik içerik korunuyor");
        }

        // Sponsors
        if (data.sponsors && data.sponsors.length > 0) {
            updateSponsors(data.sponsors);
        } else {
            console.warn("sponsors eksik, statik içerik korunuyor");
        }

        // CTA Section - null kontrolü
        if (data.ctaSection) {
            updateCtaSection(data.ctaSection, data.appDownloadLinks);
        } else {
            console.warn("ctaSection null geldi, statik içerik korunuyor");
            // Sadece CTA'daki download linklerini güncelle
            if (data.appDownloadLinks && data.appDownloadLinks.length > 0) {
                updateCtaDownloadLinks(data.appDownloadLinks);
            }
        }

    } catch (error) {
        console.error("Ana sayfa verileri alınamadı:", error);
        showErrorMessage("Veriler yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.");
    }
}

function showErrorMessage(message) {
    const titleElement = document.getElementById('hero-title');
    if (titleElement) {
        titleElement.textContent = message;
        titleElement.style.color = '#ef4444';
    }
}

// --- Hero Section ---
function updateHeroSection(hero) {
    if (!hero) {
        console.warn("Hero section verisi eksik");
        return; 
    }
    
    const titleEl = document.getElementById('hero-title');
    const subtitleEl = document.getElementById('hero-subtitle');
    const descriptionEl = document.getElementById('hero-description');
    
    if (titleEl && hero.title) {
        titleEl.innerHTML = hero.title.replace(/\n/g, '<br>');
    }
    if (subtitleEl && hero.subtitle) {
        subtitleEl.textContent = hero.subtitle;
    }
    if (descriptionEl && hero.description) {
        descriptionEl.textContent = hero.description;
    }
}

// --- Hero Stats & Download Links ---
function updateHeroStats(stats, links) {
    if (!stats || !Array.isArray(stats) || !links || !Array.isArray(links)) {
        console.warn("Stats veya links eksik/hatalı");
        return;
    }

    const statsContainer = document.getElementById('hero-stats-container');
    const linksContainer = document.getElementById('hero-download-buttons');
    
    if (!statsContainer || !linksContainer) {
        console.warn("Stats veya links container bulunamadı");
        return;
    }
    
    // İstatistikleri Ekle
    statsContainer.innerHTML = '';
    stats.forEach(stat => {
        const statDiv = document.createElement('div');
        statDiv.classList.add('stat');
        statDiv.innerHTML = `
            <span class="stat-number">${stat.count || '0'}</span>
            <span class="stat-label">${stat.label || ''}</span>
        `;
        statsContainer.appendChild(statDiv);
    });

    // İndirme Linklerini Ekle
    linksContainer.innerHTML = '';
    links.forEach(link => {
        const linkEl = document.createElement('a');
        linkEl.href = link.url || '#';
        linkEl.classList.add('download-btn');
        
        // API'den gelen veri: platform ve buttonText kullanılıyor
        const platform = link.platform || link.label || '';
        const buttonText = link.buttonText || link.label || 'İndir';
        
        const svgIcon = getDownloadIcon(platform);
        
        linkEl.innerHTML = `${svgIcon}${buttonText}`;
        
        linksContainer.appendChild(linkEl);
    });
}

// Sadece download linklerini güncelle (stats olmadan)
function updateOnlyDownloadLinks(links) {
    const linksContainer = document.getElementById('hero-download-buttons');
    if (!linksContainer || !links || !Array.isArray(links)) return;
    
    linksContainer.innerHTML = '';
    links.forEach(link => {
        const linkEl = document.createElement('a');
        linkEl.href = link.url || '#';
        linkEl.classList.add('download-btn');
        
        const platform = link.platform || link.label || '';
        const buttonText = link.buttonText || link.label || 'İndir';
        const svgIcon = getDownloadIcon(platform);
        
        linkEl.innerHTML = `${svgIcon}${buttonText}`;
        linksContainer.appendChild(linkEl);
    });
}

// CTA bölümündeki download linklerini güncelle
function updateCtaDownloadLinks(links) {
    const linksContainer = document.querySelector('.cta-section .download-buttons');
    if (!linksContainer || !links || !Array.isArray(links)) return;
    
    linksContainer.innerHTML = '';
    links.forEach(link => {
        const linkEl = document.createElement('a');
        linkEl.href = link.url || '#';
        linkEl.classList.add('download-btn');
        
        const platform = link.platform || link.label || '';
        const buttonText = link.buttonText || link.label || 'İndir';
        const svgIcon = getDownloadIcon(platform);

        linkEl.innerHTML = `${svgIcon}${buttonText}`;
        linksContainer.appendChild(linkEl);
    });
}

// --- Features ---
function updateFeatures(features) {
    if (!features || !Array.isArray(features)) {
        console.warn("Features verisi eksik veya array değil");
        return;
    }
    
    const grid = document.querySelector('.features-grid');
    if (!grid) {
        console.warn("Features grid bulunamadı");
        return;
    }

    grid.innerHTML = '';
    features.forEach(feature => {
        const card = document.createElement('div');
        card.classList.add('feature-card');
        card.innerHTML = `
            <div class="feature-icon">${feature.icon || '⭐'}</div> 
            <h3 class="feature-title">${feature.title || ''}</h3>
            <p class="feature-description">${feature.description || ''}</p>
        `;
        grid.appendChild(card);
    });
}

// --- Sponsors ---
function updateSponsors(sponsors) {
    if (!sponsors || !Array.isArray(sponsors)) {
        console.warn("Sponsors verisi eksik veya array değil");
        return;
    }
    
    const grid = document.querySelector('.sponsor-grid');
    if (!grid) {
        console.warn("Sponsor grid bulunamadı");
        return;
    }

    grid.innerHTML = '';
    sponsors.forEach(sponsor => {
        const card = document.createElement('div');
        card.classList.add('sponsor-card');
        card.innerHTML = `
            <img src="${sponsor.logoUrl || 'placeholder.png'}" 
                 alt="${sponsor.name || 'Sponsor'}" 
                 class="sponsor-logo"
                 onerror="this.src='placeholder.png'">
            <div class="sponsor-name">${sponsor.name || ''}</div>
        `;
        grid.appendChild(card);
    });
}

// --- CTA Section ---
function updateCtaSection(cta, links) {
    if (!cta) {
        console.warn("CTA verisi eksik");
        return;
    }
    
    const titleEl = document.querySelector('.cta-title');
    const subtitleEl = document.querySelector('.cta-subtitle');
    
    if (titleEl && cta.title) {
        titleEl.textContent = cta.title;
    }
    if (subtitleEl && cta.subtitle) {
        subtitleEl.textContent = cta.subtitle;
    }

    if (!links || !Array.isArray(links)) return;
    
    const linksContainer = document.querySelector('.cta-section .download-buttons');
    if (!linksContainer) return;
    
    linksContainer.innerHTML = '';
    links.forEach(link => {
        const linkEl = document.createElement('a');
        linkEl.href = link.url || '#';
        linkEl.classList.add('download-btn');
        
        // API'den gelen veri: platform ve buttonText kullanılıyor
        const platform = link.platform || link.label || '';
        const buttonText = link.buttonText || link.label || 'İndir';
        
        const svgIcon = getDownloadIcon(platform);

        linkEl.innerHTML = `${svgIcon}${buttonText}`;
        linksContainer.appendChild(linkEl);
    });
}

// --- Helper: SVG İkon Seçimi ---
function getDownloadIcon(label) {
    if (!label) return '';
    
    const lowerLabel = label.toLowerCase();
    
    // Apple App Store ikonu (orijinal HTML'deki gibi - kalem ikonu)
    if (lowerLabel.includes('app store') || lowerLabel.includes('ios') || lowerLabel.includes('apple')) {
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="currentColor"/>
        </svg>`;
    } 
    
    // Google Play Store ikonu (orijinal HTML'deki gibi)
    if (lowerLabel.includes('google') || lowerLabel.includes('play') || lowerLabel.includes('android')) {
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" fill="currentColor" />
        </svg>`;
    }
    
    return '';
}