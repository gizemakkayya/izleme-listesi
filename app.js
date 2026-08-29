// ==========================================
// TMDB & UYGULAMA YAPILANDIRMASI
// ==========================================
const DEFAULT_TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280';

// ==========================================
// KULLANICI GİRİŞİ & BULUT YAPILANDIRMASI
// ==========================================
const AUTH_USERNAME = 'zilli';
const AUTH_PASSWORD = '123';
const STORAGE_KEY_AUTH = 'izleme_auth_zilli_v1';
const STORAGE_KEY_ITEMS = 'izleme_listesi_zilli_v10';
const STORAGE_KEY_ACTIVE_TAB = 'izleme_listesi_tab_v10';
const CLOUD_DB_URL = 'https://api.cl1p.net/izleme_listesi_zilli_account_db_v1';
const SSE_PING_URL = 'https://ntfy.sh/izleme_listesi_zilli_sync_ping_v1';
const MY_CLIENT_ID = 'client_' + Math.random().toString(36).substring(2, 9);

let sseConnection = null;
let cloudSaveTimeout = null;
let isUpdatingFromRemote = false;

// Sabit Kategoriler (Maddeler)
const MADDELER = [
  { id: 'filmler', name: '🎬 Filmler' },
  { id: 'diziler', name: '📺 Diziler' },
  { id: 'sirasi', name: '🎯 İzleme Listesi' },
  { id: 'izlendi', name: '✅ İzlendi' }
];

// Başlangıç Örnek İçerikleri
const DEFAULT_ITEMS = [
  {
    id: 693134,
    type: 'movie',
    title: 'Dune: Çöl Gezegeni Bölüm İki',
    original_title: 'Dune: Part Two',
    isWatched: false,
    inQueue: true,
    queueOrder: 1,
    userRating: 9,
    tmdbRating: 8.3,
    release_date: '2024-02-27',
    poster_path: '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    backdrop_path: '/xOMo8BRK7PfcJv9JCnx7s520bEx.jpg',
    overview: 'Paul Atreides, ailesini yok eden komploculardan intikam almak için Chani ve Fremenlerle birleşirken bir yolculuğa çıkar.',
    notes: 'Görsel efektler ve müzikler muazzam!',
    addedAt: Date.now()
  },
  {
    id: 157336,
    type: 'movie',
    title: 'Yıldızlararası',
    original_title: 'Interstellar',
    isWatched: false,
    inQueue: true,
    queueOrder: 2,
    userRating: null,
    tmdbRating: 8.4,
    release_date: '2014-11-05',
    poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdrop_path: '/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
    overview: 'İnsanlığın geleceğinin yıldızlar arasında olup olmadığını öğrenmek için galaksimizin ötesine seyahat eden bir grup kaşifin hikayesi.',
    notes: '',
    addedAt: Date.now() - 2000
  },
  {
    id: 1396,
    type: 'tv',
    title: 'Breaking Bad',
    original_title: 'Breaking Bad',
    isWatched: true, // Başlangıçta izlendi
    inQueue: false,
    queueOrder: 0,
    userRating: 10,
    tmdbRating: 8.9,
    release_date: '2008-01-20',
    poster_path: '/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
    backdrop_path: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
    overview: 'Walter White, ölümcül bir kanser teşhisi konduktan sonra ailesinin mali geleceğini güvenceye almak için uyuşturucu dünyasına girer.',
    notes: 'Tüm zamanların en iyi dizilerinden.',
    addedAt: Date.now() - 1000
  }
];

// ==========================================
// UYGULAMA DURUMU (APP STATE)
// ==========================================
let appState = {
  maddeler: MADDELER,
  items: loadItems(),
  activeMaddeId: loadActiveTab(),
  activeMedia: null,
  cache: {}
};

// ==========================================
// DOM ELEMANLARI
// ==========================================
// Giriş Ekranı Elemanları
const loginScreen = document.getElementById('login-screen');
const loginForm = document.getElementById('login-form');
const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');
const togglePasswordBtn = document.getElementById('toggle-password-btn');
const loginErrorMsg = document.getElementById('login-error');
const mainApp = document.getElementById('main-app');
const logoutBtn = document.getElementById('logout-btn');

// Ana Arayüz Elemanları
const maddelerList = document.getElementById('maddeler-list');
const mediaGrid = document.getElementById('media-grid');
const emptyBox = document.getElementById('empty-box');
const emptyTitle = document.getElementById('empty-title');
const emptyDesc = document.getElementById('empty-desc');
const emptyAddBtn = document.getElementById('empty-add-btn');

// Canlı Senkronizasyon Durum Elemanları
const syncStatus = document.getElementById('sync-status');
const syncStatusText = document.getElementById('sync-status-text');

// TMDB Ekle Modalı
const openAddMediaBtn = document.getElementById('open-add-media-btn');
const addMediaModal = document.getElementById('add-media-modal');
const addMediaModalClose = document.getElementById('add-media-modal-close');
const targetMaddeSelect = document.getElementById('target-madde-select');
const tmdbSearchInput = document.getElementById('tmdb-search-input');
const modalClearSearchBtn = document.getElementById('modal-clear-search-btn');
const tmdbSearchResults = document.getElementById('tmdb-search-results');

// Detay / Not Modalı
const detailModal = document.getElementById('detail-modal');
const detailModalClose = document.getElementById('detail-modal-close');
const modalHeroBg = document.getElementById('modal-hero-bg');
const modalPoster = document.getElementById('modal-poster');
const modalTypeBadge = document.getElementById('modal-type-badge');
const modalTmdbRating = document.getElementById('modal-tmdb-rating');
const modalYear = document.getElementById('modal-year');
const modalTitle = document.getElementById('modal-title');
const modalOverview = document.getElementById('modal-overview');
const modalMoveMaddeSelect = document.getElementById('modal-move-madde-select');
const modalUserRating = document.getElementById('modal-user-rating');
const modalUserNote = document.getElementById('modal-user-note');
const modalDeleteItemBtn = document.getElementById('modal-delete-item-btn');
const modalSaveItemBtn = document.getElementById('modal-save-item-btn');

const toastContainer = document.getElementById('toast-container');

// ==========================================
// YEREL & BULUT SENKRONİZASYON MOTORU
// ==========================================
function loadItems() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_ITEMS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('LocalStorage okuma hatası:', e);
  }
  return DEFAULT_ITEMS;
}

function saveItems() {
  if (isUpdatingFromRemote) return;

  // 1. Anında Yerel Depolamaya Yaz (Sıfır Gecikme)
  try {
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(appState.items));
  } catch (e) {
    console.error('LocalStorage yazma hatası:', e);
  }

  // 2. Buluta Kaydet ve Diğer Cihazlara Canlı Sinyal Gönder
  updateSyncStatus('syncing', 'Kaydediliyor...');
  clearTimeout(cloudSaveTimeout);
  cloudSaveTimeout = setTimeout(async () => {
    try {
      const res = await fetch(CLOUD_DB_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appState.items)
      });

      if (res.ok || res.status === 201) {
        // Diğer telefonlara canlı bildirim gönder
        await fetch(SSE_PING_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender: MY_CLIENT_ID, time: Date.now() })
        });
        updateSyncStatus('online', 'Canlı');
      } else {
        updateSyncStatus('offline', 'Kaydedilemedi');
      }
    } catch (err) {
      console.error('Buluta kaydetme hatası:', err);
      updateSyncStatus('offline', 'Çevrimdışı');
    }
  }, 300);
}

function updateSyncStatus(status, text) {
  if (!syncStatus) return;
  syncStatus.className = `sync-badge ${status}`;
  if (syncStatusText && text) syncStatusText.textContent = text;
}

async function fetchLatestFromCloud(showNotification = false) {
  try {
    const res = await fetch(CLOUD_DB_URL);
    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items) && items.length > 0) {
        const currentStr = JSON.stringify(appState.items);
        const incomingStr = JSON.stringify(items);
        if (currentStr !== incomingStr) {
          isUpdatingFromRemote = true;
          appState.items = items;
          try {
            localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(appState.items));
          } catch (e) {}
          renderMaddelerBar();
          renderActiveMaddeItems();
          isUpdatingFromRemote = false;

          if (showNotification) {
            showToast('Liste canlı olarak güncellendi! 🔄', '✨');
          }
        }
      }
    }
    updateSyncStatus('online', 'Canlı');
  } catch (e) {
    console.warn('Buluttan okuma hatası:', e);
  }
}

function connectRealtimeSSE() {
  if (sseConnection) {
    try { sseConnection.close(); } catch (e) {}
  }

  try {
    sseConnection = new EventSource(`${SSE_PING_URL}/sse`);

    sseConnection.onmessage = async (event) => {
      try {
        if (!event.data) return;
        const msgObj = JSON.parse(event.data);
        if (msgObj.event !== 'message' || !msgObj.message) return;

        const payload = JSON.parse(msgObj.message);
        // Kendi yaptığımız değişiklik ise yoksay
        if (payload.sender === MY_CLIENT_ID) return;

        updateSyncStatus('syncing', 'Güncelleniyor...');
        await fetchLatestFromCloud(true);
      } catch (err) {
        // SSE ayrıştırma
      }
    };

    sseConnection.onerror = () => {
      updateSyncStatus('offline', 'Bağlantı Bekleniyor...');
      setTimeout(() => {
        if (sseConnection && sseConnection.readyState === EventSource.CLOSED) {
          connectRealtimeSSE();
        }
      }, 5000);
    };

    sseConnection.onopen = () => {
      updateSyncStatus('online', 'Canlı');
    };
  } catch (e) {
    console.error('SSE bağlantı hatası:', e);
  }
}

async function initCloudSync() {
  updateSyncStatus('syncing', 'Bağlanıyor...');

  // 1. Buluttaki en güncel listeyi hemen çek
  await fetchLatestFromCloud(false);

  // 2. Canlı dinleyiciyi başlat
  connectRealtimeSSE();

  // 3. Mobil cihaz arka plandan öne gelince otomatik güncelle
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchLatestFromCloud(false);
    }
  });

  // 4. Güvence olarak her 10 saniyede bir kontrol et
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      fetchLatestFromCloud(false);
    }
  }, 10000);
}

function loadActiveTab() {
  try {
    const tab = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB);
    if (tab && MADDELER.some(m => m.id === tab)) return tab;
  } catch (e) {}
  return 'filmler';
}

function saveActiveTab(tabId) {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, tabId);
  } catch (e) {}
}

function showToast(message, icon = '✨') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => toast.remove(), 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ==========================================
// TMDB API
// ==========================================
async function fetchFromTMDB(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', DEFAULT_TMDB_API_KEY);
  url.searchParams.set('language', 'tr-TR');

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const cacheKey = url.toString();
  if (appState.cache[cacheKey]) return appState.cache[cacheKey];

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('TMDB API Hatası');
  const data = await res.json();
  appState.cache[cacheKey] = data;
  return data;
}

// ==========================================
// MADDELERİ ÇİZ & YÖNET
// ==========================================
function renderMaddelerBar() {
  maddelerList.innerHTML = '';

  appState.maddeler.forEach(madde => {
    let count = 0;
    if (madde.id === 'filmler') {
      count = appState.items.filter(i => i.type === 'movie').length;
    } else if (madde.id === 'diziler') {
      count = appState.items.filter(i => i.type === 'tv').length;
    } else if (madde.id === 'sirasi') {
      count = appState.items.filter(i => i.inQueue === true && !i.isWatched).length;
    } else if (madde.id === 'izlendi') {
      count = appState.items.filter(i => i.isWatched === true).length;
    }

    const pill = document.createElement('button');
    pill.className = `madde-pill ${madde.id === appState.activeMaddeId ? 'active' : ''}`;
    pill.innerHTML = `
      <span>${escapeHtml(madde.name)}</span>
      <span class="madde-count">${count}</span>
    `;

    pill.addEventListener('click', () => {
      appState.activeMaddeId = madde.id;
      saveActiveTab(madde.id);
      renderMaddelerBar();
      renderActiveMaddeItems();
    });

    maddelerList.appendChild(pill);
  });

  updateMaddeSelectOptions();
}

function updateMaddeSelectOptions() {
  targetMaddeSelect.innerHTML = '';
  modalMoveMaddeSelect.innerHTML = '';

  const opts = [
    { id: 'filmler', name: '🎬 Filmler' },
    { id: 'diziler', name: '📺 Diziler' }
  ];

  opts.forEach(m => {
    const opt1 = document.createElement('option');
    opt1.value = m.id;
    opt1.textContent = m.name;
    targetMaddeSelect.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = m.id;
    opt2.textContent = m.name;
    modalMoveMaddeSelect.appendChild(opt2);
  });

  if (appState.activeMaddeId === 'diziler') {
    targetMaddeSelect.value = 'diziler';
  } else {
    targetMaddeSelect.value = 'filmler';
  }
}

// ==========================================
// İZLEME SIRASI YÖNETİMİ & SIRALAMA
// ==========================================
function normalizeQueueOrders() {
  const queued = appState.items
    .filter(i => i.inQueue === true && !i.isWatched)
    .sort((a, b) => (a.queueOrder || 0) - (b.queueOrder || 0));

  queued.forEach((item, idx) => {
    item.queueOrder = idx + 1;
  });
}

function toggleQueueStatus(item) {
  const target = appState.items.find(i => i.id === item.id);
  if (!target) return;

  if (target.inQueue) {
    target.inQueue = false;
    target.queueOrder = 0;
    normalizeQueueOrders();
    saveItems();
    renderMaddelerBar();
    renderActiveMaddeItems();
    showToast(`"${target.title}" izleme sırasından çıkarıldı.`, '🎯');
  } else {
    normalizeQueueOrders();
    const maxOrder = appState.items
      .filter(i => i.inQueue && !i.isWatched)
      .reduce((max, i) => Math.max(max, i.queueOrder || 0), 0);

    target.inQueue = true;
    target.queueOrder = maxOrder + 1;
    saveItems();
    renderMaddelerBar();
    renderActiveMaddeItems();
    showToast(`"${target.title}" izleme sırasına (#${target.queueOrder}) eklendi!`, '🎯');
  }
}

function moveQueueItemUp(itemId) {
  normalizeQueueOrders();
  const queued = appState.items
    .filter(i => i.inQueue && !i.isWatched)
    .sort((a, b) => (a.queueOrder || 0) - (b.queueOrder || 0));

  const idx = queued.findIndex(i => i.id === itemId);
  if (idx > 0) {
    const prev = queued[idx - 1];
    const curr = queued[idx];
    const temp = prev.queueOrder;
    prev.queueOrder = curr.queueOrder;
    curr.queueOrder = temp;
    saveItems();
    renderActiveMaddeItems();
  }
}

function moveQueueItemDown(itemId) {
  normalizeQueueOrders();
  const queued = appState.items
    .filter(i => i.inQueue && !i.isWatched)
    .sort((a, b) => (a.queueOrder || 0) - (b.queueOrder || 0));

  const idx = queued.findIndex(i => i.id === itemId);
  if (idx >= 0 && idx < queued.length - 1) {
    const next = queued[idx + 1];
    const curr = queued[idx];
    const temp = next.queueOrder;
    next.queueOrder = curr.queueOrder;
    curr.queueOrder = temp;
    saveItems();
    renderActiveMaddeItems();
  }
}

// ==========================================
// SEÇİLEN MADDENİN İÇERİKLERİNİ ÇİZ
// ==========================================
function renderActiveMaddeItems() {
  const currentMadde = appState.maddeler.find(m => m.id === appState.activeMaddeId);
  if (!currentMadde) return;

  const isQueueTab = appState.activeMaddeId === 'sirasi';
  let filtered = [];

  if (appState.activeMaddeId === 'filmler') {
    filtered = appState.items.filter(i => i.type === 'movie');
  } else if (appState.activeMaddeId === 'diziler') {
    filtered = appState.items.filter(i => i.type === 'tv');
  } else if (appState.activeMaddeId === 'sirasi') {
    normalizeQueueOrders();
    filtered = appState.items
      .filter(i => i.inQueue === true && !i.isWatched)
      .sort((a, b) => (a.queueOrder || 0) - (b.queueOrder || 0));
  } else if (appState.activeMaddeId === 'izlendi') {
    filtered = appState.items.filter(i => i.isWatched === true);
  }

  mediaGrid.innerHTML = '';

  if (filtered.length === 0) {
    emptyBox.style.display = 'flex';
    if (appState.activeMaddeId === 'sirasi') {
      emptyTitle.textContent = 'İzleme listenizde henüz içerik yok';
      emptyDesc.textContent = 'Filmler veya Diziler sekmesinden içeriklerin üzerindeki "🎯 Listeye Ekle" butonuna basarak izleme listenizi oluşturabilirsiniz.';
    } else if (appState.activeMaddeId === 'izlendi') {
      emptyTitle.textContent = 'Henüz izlendi olarak işaretlenen içerik yok';
      emptyDesc.textContent = 'İçeriklerin üzerindeki "✓ İzledim" butonuna basarak buraya ekleyebilirsiniz.';
    } else {
      emptyTitle.textContent = `"${currentMadde.name}" kategorisinde henüz içerik yok`;
      emptyDesc.textContent = 'Yukarıdaki "+ Film / Dizi Ekle" butonuna tıklayarak buraya içerik ekleyebilirsiniz.';
    }
    return;
  }

  emptyBox.style.display = 'none';

  filtered.forEach((item, index) => {
    const posterUrl = item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : null;
    const year = item.release_date ? item.release_date.split('-')[0] : '';
    const rating = item.tmdbRating ? Number(item.tmdbRating).toFixed(1) : null;
    const isWatched = item.isWatched === true;
    const inQueue = item.inQueue === true && !isWatched;
    const queueOrder = item.queueOrder || (index + 1);

    const card = document.createElement('article');
    card.className = `media-card ${isWatched ? 'watched-card' : ''}`;
    card.innerHTML = `
      <div class="poster-wrap">
        ${posterUrl 
          ? `<img class="poster-img" src="${posterUrl}" alt="${escapeHtml(item.title)}" loading="lazy" />` 
          : `<div class="poster-fallback">🎬<span>Görsel Yok</span></div>`}
        
        ${isQueueTab ? `<div class="card-queue-rank">#${queueOrder}</div>` : ''}
        ${rating ? `<div class="card-rating-badge">⭐ ${rating}</div>` : ''}
        <div class="card-type-badge">${item.type === 'movie' ? '🎬 Film' : '📺 Dizi'}</div>
      </div>

      <div class="card-details">
        <div class="card-info">
          <div class="card-meta-top">
            <span class="card-year">${year || 'Tarih Yok'}</span>
            ${item.userRating ? `<span class="card-user-score">⭐ ${item.userRating}/10</span>` : '<span class="card-unrated">Puan Yok</span>'}
          </div>
          <h3 class="card-title">${escapeHtml(item.title)}</h3>
          ${item.notes ? `<div class="card-user-note">💬 ${escapeHtml(item.notes)}</div>` : ''}
        </div>

        <div class="card-actions">
          <button class="btn-card-watched ${isWatched ? 'completed' : ''}" title="${isWatched ? 'İzlendi işaretini kaldır' : 'İzlendi olarak işaretle'}">
            ${isWatched ? '✅ İzlendi' : '✓ İzledim'}
          </button>

          ${isQueueTab ? `
            <div class="queue-reorder-bar">
              <button class="btn-reorder btn-reorder-up" title="Yukarı Taşı" ${index === 0 ? 'disabled' : ''}>
                🔼 Yukarı
              </button>
              <button class="btn-reorder btn-reorder-down" title="Aşağı Taşı" ${index === filtered.length - 1 ? 'disabled' : ''}>
                🔽 Aşağı
              </button>
              <button class="btn-queue-remove" title="Listeden Çıkar">✕ Çıkar</button>
            </div>
          ` : (!isWatched ? `
            <button class="btn-card-queue-toggle ${inQueue ? 'in-queue' : ''}" title="${inQueue ? 'İzleme Listesinde (# ' + item.queueOrder + ')' : 'İzleme Listesine Ekle'}">
              ${inQueue ? `🎯 Listede (#${item.queueOrder})` : '🎯 Listeye Ekle'}
            </button>
          ` : '')}

          <div class="card-actions-sub">
            <button class="btn-card-action" title="Detayları Düzenle">✏️ Düzenle</button>
            <button class="btn-card-delete" title="Listeden Sil">🗑️ Sil</button>
          </div>
        </div>
      </div>
    `;

    // Karta tıklayınca detay aç
    card.addEventListener('click', (e) => {
      if (
        !e.target.closest('.btn-card-watched') && 
        !e.target.closest('.btn-card-delete') &&
        !e.target.closest('.btn-reorder') &&
        !e.target.closest('.btn-queue-remove') &&
        !e.target.closest('.btn-card-queue-toggle')
      ) {
        openDetailModal(item);
      }
    });

    // Sıralama butonları (İzleme Sırası sekmesinde)
    if (isQueueTab) {
      const upBtn = card.querySelector('.btn-reorder-up');
      if (upBtn) {
        upBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          moveQueueItemUp(item.id);
        });
      }

      const downBtn = card.querySelector('.btn-reorder-down');
      if (downBtn) {
        downBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          moveQueueItemDown(item.id);
        });
      }

      const removeBtn = card.querySelector('.btn-queue-remove');
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleQueueStatus(item);
        });
      }
    }

    // Normal kartlardaki "🎯 Sıraya Ekle" butonu
    const queueToggleBtn = card.querySelector('.btn-card-queue-toggle');
    if (queueToggleBtn) {
      queueToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleQueueStatus(item);
      });
    }

    // Düzenle butonu
    const editBtn = card.querySelector('.btn-card-action');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDetailModal(item);
      });
    }

    // "✓ İzledim" Butonu Tıklaması (Kalıcı Toggle)
    const watchedBtn = card.querySelector('.btn-card-watched');
    watchedBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleWatchedStatus(item);
    });

    // Listeden sil
    const delBtn = card.querySelector('.btn-card-delete');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteItem(item.id);
    });

    mediaGrid.appendChild(card);
  });
}

// "İzledim" Durumunu Değiştir ve Kalıcı Kaydet
function toggleWatchedStatus(item) {
  const index = appState.items.findIndex(i => i.id === item.id);
  if (index === -1) return;

  const target = appState.items[index];
  const newWatchedState = !target.isWatched;
  target.isWatched = newWatchedState;

  if (newWatchedState) {
    target.inQueue = false;
    target.queueOrder = 0;
    normalizeQueueOrders();
  }

  // LocalStorage'a hemen yaz
  saveItems();

  renderMaddelerBar();
  renderActiveMaddeItems();

  if (newWatchedState) {
    showToast(`"${target.title}" ➔ ✅ İzlendi olarak işaretlendi!`, '✅');
  } else {
    showToast(`"${target.title}" ➔ İzlendi işareti kaldırıldı.`, '↩️');
  }
}

function deleteItem(itemId) {
  const item = appState.items.find(i => i.id === itemId);
  appState.items = appState.items.filter(i => i.id !== itemId);
  normalizeQueueOrders();
  saveItems();
  renderMaddelerBar();
  renderActiveMaddeItems();
  if (item) showToast(`"${item.title}" listeden silindi.`, '🗑️');
}

// ==========================================
// TMDB'DEN FILM / DIZI EKLEME MODALI
// ==========================================
function openAddMediaModal() {
  addMediaModal.style.display = 'flex';
  targetMaddeSelect.value = appState.activeMaddeId === 'diziler' ? 'diziler' : 'filmler';
  tmdbSearchInput.value = '';
  modalClearSearchBtn.style.display = 'none';
  tmdbSearchResults.innerHTML = `
    <div class="search-hint">
      <span>💡</span>
      <p>Yukarıya eklemek istediğiniz film veya dizinin adını yazın.</p>
    </div>
  `;
  setTimeout(() => tmdbSearchInput.focus(), 100);
}

openAddMediaBtn.addEventListener('click', openAddMediaModal);
emptyAddBtn.addEventListener('click', openAddMediaModal);
addMediaModalClose.addEventListener('click', () => addMediaModal.style.display = 'none');
addMediaModal.addEventListener('click', (e) => {
  if (e.target === addMediaModal) addMediaModal.style.display = 'none';
});

let tmdbDebounce = null;
tmdbSearchInput.addEventListener('input', (e) => {
  const query = e.target.value;
  modalClearSearchBtn.style.display = query ? 'flex' : 'none';

  clearTimeout(tmdbDebounce);
  if (!query.trim()) {
    tmdbSearchResults.innerHTML = `
      <div class="search-hint">
        <span>💡</span>
        <p>Yukarıya eklemek istediğiniz film veya dizinin adını yazın.</p>
      </div>
    `;
    return;
  }

  tmdbSearchResults.innerHTML = `
    <div class="search-hint">
      <span>⏳</span>
      <p>TMDB'den aranıyor...</p>
    </div>
  `;

  tmdbDebounce = setTimeout(async () => {
    try {
      const data = await fetchFromTMDB('/search/multi', { query: query.trim() });
      const results = (data.results || []).filter(item => item.media_type === 'movie' || item.media_type === 'tv');

      if (results.length === 0) {
        tmdbSearchResults.innerHTML = `
          <div class="search-hint">
            <span>🔍</span>
            <p>Aradığınız isimde film veya dizi bulunamadı.</p>
          </div>
        `;
        return;
      }

      renderTMDBResults(results);
    } catch (err) {
      tmdbSearchResults.innerHTML = `
        <div class="search-hint">
          <span>⚠️</span>
          <p>Arama sırasında bir hata oluştu.</p>
        </div>
      `;
    }
  }, 350);
});

modalClearSearchBtn.addEventListener('click', () => {
  tmdbSearchInput.value = '';
  modalClearSearchBtn.style.display = 'none';
  tmdbSearchResults.innerHTML = `
    <div class="search-hint">
      <span>💡</span>
      <p>Yukarıya eklemek istediğiniz film veya dizinin adını yazın.</p>
    </div>
  `;
  tmdbSearchInput.focus();
});

function renderTMDBResults(results) {
  tmdbSearchResults.innerHTML = '';

  results.forEach(item => {
    const isMovie = item.media_type === 'movie';
    const title = item.title || item.name || item.original_title || item.original_name;
    const releaseDate = item.release_date || item.first_air_date || '';
    const year = releaseDate ? releaseDate.split('-')[0] : '';
    const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
    const posterUrl = item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : null;

    const isAlreadyInList = appState.items.some(i => i.id === item.id);

    const row = document.createElement('div');
    row.className = 'tmdb-result-item';
    row.innerHTML = `
      ${posterUrl 
        ? `<img class="result-poster" src="${posterUrl}" alt="${escapeHtml(title)}" />`
        : `<div class="result-fallback">🎬</div>`}
      
      <div class="result-info">
        <h4 class="result-title">${escapeHtml(title)}</h4>
        <div class="result-meta">
          <span>${isMovie ? '🎬 Film' : '📺 Dizi'}</span>
          ${year ? `<span>• ${year}</span>` : ''}
          ${rating ? `<span>• ⭐ ${rating}</span>` : ''}
        </div>
      </div>

      <div class="result-action">
        ${isAlreadyInList 
          ? `<button class="btn-add-quick added">✓ Listede</button>`
          : `<button class="btn-add-quick" data-add-id="${item.id}">+ Listeme Ekle</button>`}
      </div>
    `;

    const addBtn = row.querySelector('.btn-add-quick:not(.added)');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const newItem = {
          id: item.id,
          type: item.media_type,
          title: title,
          original_title: item.original_title || item.original_name || '',
          isWatched: false,
          userRating: null,
          tmdbRating: item.vote_average || null,
          release_date: releaseDate,
          poster_path: item.poster_path || '',
          backdrop_path: item.backdrop_path || '',
          overview: item.overview || '',
          notes: '',
          addedAt: Date.now()
        };

        appState.items.unshift(newItem);
        saveItems();

        renderMaddelerBar();
        renderActiveMaddeItems();

        addBtn.className = 'btn-add-quick added';
        addBtn.textContent = '✓ Listede';
        showToast(`"${title}" listenize eklendi! 🎉`, '✅');
      });
    }

    tmdbSearchResults.appendChild(row);
  });
}

// ==========================================
// DETAY & DÜZENLEME MODALI
// ==========================================
function openDetailModal(item) {
  appState.activeMedia = item;

  const year = item.release_date ? item.release_date.split('-')[0] : 'Bilinmiyor';
  const rating = item.tmdbRating ? item.tmdbRating.toFixed(1) : 'Puan Yok';
  const posterUrl = item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : '';
  const backdropUrl = item.backdrop_path ? `${BACKDROP_BASE_URL}${item.backdrop_path}` : '';

  modalTitle.textContent = item.title;
  modalTypeBadge.textContent = item.type === 'movie' ? '🎬 Film' : '📺 Dizi';
  modalTmdbRating.textContent = `⭐ ${rating}`;
  modalYear.textContent = year;
  modalOverview.textContent = item.overview || 'Bu içerik için özet bilgisi girilmemiş.';

  if (posterUrl) {
    modalPoster.src = posterUrl;
    modalPoster.style.display = 'block';
  } else {
    modalPoster.style.display = 'none';
  }

  if (backdropUrl) {
    modalHeroBg.style.backgroundImage = `url(${backdropUrl})`;
  } else {
    modalHeroBg.style.backgroundImage = 'none';
  }

  modalMoveMaddeSelect.value = item.type === 'tv' ? 'diziler' : 'filmler';
  modalUserRating.value = item.userRating || '';
  modalUserNote.value = item.notes || '';

  detailModal.style.display = 'flex';
}

function closeDetailModal() {
  detailModal.style.display = 'none';
  appState.activeMedia = null;
}

detailModalClose.addEventListener('click', closeDetailModal);
detailModal.addEventListener('click', (e) => {
  if (e.target === detailModal) closeDetailModal();
});

modalSaveItemBtn.addEventListener('click', () => {
  if (!appState.activeMedia) return;

  const item = appState.activeMedia;
  const newType = modalMoveMaddeSelect.value === 'diziler' ? 'tv' : 'movie';
  const userRating = modalUserRating.value ? Number(modalUserRating.value) : null;
  const notes = modalUserNote.value.trim();

  const index = appState.items.findIndex(i => i.id === item.id);
  if (index > -1) {
    appState.items[index].type = newType;
    appState.items[index].userRating = userRating;
    appState.items[index].notes = notes;

    saveItems();
    renderMaddelerBar();
    renderActiveMaddeItems();
    showToast(`"${item.title}" güncellendi! ✨`, '💾');
  }

  closeDetailModal();
});

modalDeleteItemBtn.addEventListener('click', () => {
  if (!appState.activeMedia) return;
  const item = appState.activeMedia;

  deleteItem(item.id);
  closeDetailModal();
});

// ESC Tuşu
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    addMediaModal.style.display = 'none';
    detailModal.style.display = 'none';
  }
});

// ==========================================
// KULLANICI GİRİŞİ & OTURUM KONTROLÜ
// ==========================================
function checkAuthStatus() {
  const isLoggedIn = localStorage.getItem(STORAGE_KEY_AUTH) === 'true';
  if (isLoggedIn) {
    showMainApp();
  } else {
    showLoginScreen();
  }
}

function showMainApp() {
  if (loginScreen) loginScreen.style.display = 'none';
  if (mainApp) mainApp.style.display = 'flex';

  renderMaddelerBar();
  renderActiveMaddeItems();
  initCloudSync();
}

function showLoginScreen() {
  if (mainApp) mainApp.style.display = 'none';
  if (loginScreen) {
    loginScreen.style.display = 'flex';
    if (loginErrorMsg) loginErrorMsg.style.display = 'none';
    if (loginUsernameInput) {
      loginUsernameInput.value = '';
      setTimeout(() => loginUsernameInput.focus(), 150);
    }
    if (loginPasswordInput) loginPasswordInput.value = '';
  }
}

// Giriş Formu Gönderimi
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = (loginUsernameInput.value || '').trim().toLowerCase();
    const password = (loginPasswordInput.value || '').trim();

    if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
      localStorage.setItem(STORAGE_KEY_AUTH, 'true');
      if (loginErrorMsg) loginErrorMsg.style.display = 'none';

      showToast(`Hoş geldin ${AUTH_USERNAME}! 🎉`, '✨');
      showMainApp();
    } else {
      if (loginErrorMsg) loginErrorMsg.style.display = 'block';
      const card = document.querySelector('.login-card');
      if (card) {
        card.classList.add('shake');
        setTimeout(() => card.classList.remove('shake'), 500);
      }
      if (loginPasswordInput) {
        loginPasswordInput.value = '';
        loginPasswordInput.focus();
      }
    }
  });
}

// Şifre Göster / Gizle Butonu
if (togglePasswordBtn && loginPasswordInput) {
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = loginPasswordInput.type === 'password';
    loginPasswordInput.type = isPassword ? 'text' : 'password';
    togglePasswordBtn.textContent = isPassword ? '🙈' : '👁️';
  });
}

// Çıkış Yap Butonu
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY_AUTH);
    showLoginScreen();
    showToast('Oturum kapatıldı. 👋', '🔒');
  });
}

// ==========================================
// BAŞLANGIÇ
// ==========================================
checkAuthStatus();


