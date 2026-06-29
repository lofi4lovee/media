// --- STATE MANAGEMENT ---
const state = {
    // Images
    imageQuery: '',
    imagePage: 1,
    imageOrientation: '', // landscape, portrait, square
    // Songs
    songQuery: '',
    songOffset: 0,
    currentPlayingAudio: null,
    currentPlayingBtn: null
};

// API Keys
const PEXELS_API_KEY = 'F5GY5xTk5YuS3NslDKxmhW94LAL51xpts7av26v3BE6mHFvCB5H5KQCn';
// Public client ID for Jamendo API (Royalty Free Music)
const JAMENDO_CLIENT_ID = 'b5b63fb3'; 

// --- DOM ELEMENTS ---
// Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Images
const imgSearchInput = document.getElementById('img-search-input');
const imgRatioSelect = document.getElementById('img-ratio-select');
const btnSearchImg = document.getElementById('btn-search-img');
const imgSpinner = document.getElementById('img-spinner');
const imageGrid = document.getElementById('image-grid');
const btnLoadMoreImg = document.getElementById('btn-load-more-img');
const loadMoreImgSpinner = document.getElementById('load-more-img-spinner');

// Modal Elements
const modalImagePreview = document.getElementById('modal-image-preview');
const btnClosePreview = document.getElementById('btn-close-preview');
const previewModalImg = document.getElementById('preview-modal-img');
const btnModalDownload = document.getElementById('btn-modal-download');
const presetBtns = document.querySelectorAll('.preset-btn');
const customInputsWrapper = document.getElementById('custom-inputs-wrapper');
let selectedPresetW = '';
let selectedPresetH = '';
let isCustomSize = false;
let currentOriginalUrl = '';

// Songs
const songSearchInput = document.getElementById('song-search-input');
const songSourceSelect = document.getElementById('song-source-select');
const btnSearchSong = document.getElementById('btn-search-song');
const songSpinner = document.getElementById('song-spinner');
const songsList = document.getElementById('songs-list');
const audioPlayer = document.getElementById('audio-player');

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    // Theme setup
    const themeCheckbox = document.getElementById('theme-checkbox');
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (themeCheckbox) themeCheckbox.checked = true;
    } else {
        document.body.classList.remove('light-theme');
        if (themeCheckbox) themeCheckbox.checked = false;
    }

    setupEventListeners();
    
    // Initial searches
    searchImages(imgSearchInput.value.trim(), true);
    searchSongs(songSearchInput.value.trim());
});

function setupEventListeners() {
    // Theme toggle
    const themeCheckbox = document.getElementById('theme-checkbox');
    if (themeCheckbox) {
        themeCheckbox.addEventListener('change', () => {
            if (themeCheckbox.checked) {
                document.body.classList.add('light-theme');
                localStorage.setItem('theme', 'light');
            } else {
                document.body.classList.remove('light-theme');
                localStorage.setItem('theme', 'dark');
            }
        });
    }

    // Tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active to clicked
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
            document.getElementById(targetId).classList.remove('hidden');
        });
    });

    // Modal Events
    if (btnClosePreview) {
        btnClosePreview.addEventListener('click', () => modalImagePreview.classList.add('hidden'));
        modalImagePreview.addEventListener('click', (e) => {
            if (e.target === modalImagePreview) modalImagePreview.classList.add('hidden');
        });
    }

    // Preset Button Logic
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (btn.id === 'preset-custom') {
                isCustomSize = true;
                customInputsWrapper.classList.remove('hidden');
                selectedPresetW = '';
                selectedPresetH = '';
            } else {
                isCustomSize = false;
                customInputsWrapper.classList.add('hidden');
                selectedPresetW = btn.getAttribute('data-w');
                selectedPresetH = btn.getAttribute('data-h');
            }
            updatePreviewImage();
        });
    });
    
    document.getElementById('custom-w').addEventListener('input', updatePreviewImage);
    document.getElementById('custom-h').addEventListener('input', updatePreviewImage);

    // Image Search
    btnSearchImg.addEventListener('click', () => {
        const query = imgSearchInput.value.trim();
        if (query) searchImages(query, true);
    });
    imgSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && imgSearchInput.value.trim()) {
            searchImages(imgSearchInput.value.trim(), true);
        }
    });
    imgRatioSelect.addEventListener('change', () => {
        const query = imgSearchInput.value.trim();
        if (query) searchImages(query, true);
    });
    btnLoadMoreImg.addEventListener('click', () => {
        searchImages(state.imageQuery, false);
    });

    // Song Search
    btnSearchSong.addEventListener('click', () => {
        const query = songSearchInput.value.trim();
        if (query) searchSongs(query);
    });
    songSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && songSearchInput.value.trim()) {
            searchSongs(songSearchInput.value.trim());
        }
    });

    // Audio Player Events
    audioPlayer.addEventListener('ended', () => {
        if (state.currentPlayingBtn) {
            state.currentPlayingBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        }
        state.currentPlayingAudio = null;
        state.currentPlayingBtn = null;
    });
}

// --- IMAGE SEARCH (PEXELS API) ---
async function searchImages(query, isNewSearch) {
    if (isNewSearch) {
        state.imageQuery = query;
        state.imagePage = 1;
        state.imageOrientation = imgRatioSelect.value;
        imageGrid.innerHTML = '';
        btnLoadMoreImg.classList.add('hidden');
        imgSpinner.classList.remove('hidden');
        btnSearchImg.disabled = true;
    } else {
        state.imagePage++;
        loadMoreImgSpinner.classList.remove('hidden');
        btnLoadMoreImg.disabled = true;
    }

    try {
        let url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&page=${state.imagePage}`;
        if (state.imageOrientation) {
            url += `&orientation=${state.imageOrientation}`;
        }

        const res = await fetch(url, {
            headers: { 'Authorization': PEXELS_API_KEY }
        });
        
        if (!res.ok) throw new Error("API Error");
        const data = await res.json();
        
        if (data.photos && data.photos.length > 0) {
            data.photos.forEach(photo => renderImageCard(photo));
            btnLoadMoreImg.classList.remove('hidden');
        } else if (isNewSearch) {
            imageGrid.innerHTML = '<p style="color:var(--text-muted); grid-column:1/-1; text-align:center;">No images found.</p>';
        }
    } catch (err) {
        console.error("Image search failed:", err);
        if (isNewSearch) {
            imageGrid.innerHTML = '<p style="color:red; grid-column:1/-1; text-align:center;">Failed to load images. Try again later.</p>';
        }
    } finally {
        imgSpinner.classList.add('hidden');
        btnSearchImg.disabled = false;
        loadMoreImgSpinner.classList.add('hidden');
        btnLoadMoreImg.disabled = false;
    }
}

function renderImageCard(photo) {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    
    // Set aspect ratio based on orientation
    if (state.imageOrientation === 'landscape' || photo.width > photo.height) {
        card.style.aspectRatio = '16/9';
    } else if (state.imageOrientation === 'portrait' || photo.height > photo.width) {
        card.style.aspectRatio = '9/16';
    } else {
        card.style.aspectRatio = '1';
    }

    const img = document.createElement('img');
    img.src = photo.src.large;
    img.alt = photo.alt || "HD Image";
    img.loading = "lazy";

    const overlay = document.createElement('div');
    overlay.className = 'img-overlay';

    card.style.cursor = 'pointer';
    card.onclick = () => {
        openImagePreviewModal(photo.src.large2x, photo.src.original, photo.id);
    };

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn-download-img';
    downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i> HD';
    downloadBtn.onclick = (e) => {
        e.stopPropagation();
        downloadMedia(photo.src.original, `image-${photo.id}.jpg`);
    };

    overlay.appendChild(downloadBtn);
    card.appendChild(img);
    card.appendChild(overlay);
    
    imageGrid.appendChild(card);
}

function updatePreviewImage() {
    if (!currentOriginalUrl) return;
    
    let finalW = selectedPresetW;
    let finalH = selectedPresetH;
    
    if (isCustomSize) {
        finalW = document.getElementById('custom-w').value;
        finalH = document.getElementById('custom-h').value;
    }
    
    const urlObj = new URL(currentOriginalUrl);
    urlObj.searchParams.set('auto', 'compress');
    urlObj.searchParams.set('cs', 'tinysrgb');
    
    if (finalW || finalH) {
        urlObj.searchParams.set('fit', 'crop');
        if (finalW) urlObj.searchParams.set('w', finalW);
        if (finalH) urlObj.searchParams.set('h', finalH);
    } else {
        urlObj.searchParams.set('w', '1200');
    }
    
    const newUrl = urlObj.toString();
    
    // Only fetch if url changed
    if (previewModalImg.src !== newUrl) {
        const loadingEl = document.getElementById('preview-loading');
        if (loadingEl) loadingEl.classList.remove('hidden');
        
        previewModalImg.onload = () => {
            if (loadingEl) loadingEl.classList.add('hidden');
        };
        
        previewModalImg.src = newUrl;
    }
}

function openImagePreviewModal(previewUrl, originalUrl, id) {
    currentOriginalUrl = originalUrl;
    previewModalImg.src = previewUrl;
    modalImagePreview.classList.remove('hidden');
    
    // Clear previous inputs
    document.getElementById('custom-w').value = '';
    document.getElementById('custom-h').value = '';
    
    // Reset to Original by default
    presetBtns.forEach(b => b.classList.remove('active'));
    presetBtns[0].classList.add('active');
    isCustomSize = false;
    customInputsWrapper.classList.add('hidden');
    selectedPresetW = '';
    selectedPresetH = '';
    
    btnModalDownload.onclick = () => {
        let finalW = selectedPresetW;
        let finalH = selectedPresetH;
        
        if (isCustomSize) {
            finalW = document.getElementById('custom-w').value;
            finalH = document.getElementById('custom-h').value;
        }
        
        let finalUrl = originalUrl;
        
        // If custom dimensions are provided, append Pexels parameters
        if (finalW || finalH) {
            finalUrl += `?auto=compress&cs=tinysrgb&fit=crop`;
            if (finalW) finalUrl += `&w=${finalW}`;
            if (finalH) finalUrl += `&h=${finalH}`;
        }
        
        const suffix = (finalW || finalH) ? `-size-${finalW || 'auto'}x${finalH || 'auto'}` : '-original';
        downloadMedia(finalUrl, `image-${id}${suffix}.jpg`);
    };
}

// --- SONG SEARCH (JIOSAAVN API / iTunes Fallback) ---
async function searchSongs(query) {
    state.songQuery = query;
    songsList.innerHTML = '';
    songSpinner.classList.remove('hidden');
    btnSearchSong.disabled = true;

    const source = songSourceSelect.value;

    try {
        if (source === 'saavn') {
            // Using saavn.sumit.co (Alternative JioSaavn API endpoint)
            const url = `https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(query)}&page=1&limit=100`;
            const res = await fetch(url);
            
            if (!res.ok) throw new Error("API Error");
            const data = await res.json();
            
            let songs = [];
            if (data && data.success && data.data && data.data.results) {
                songs = data.data.results;
            }

            if (songs.length > 0) {
                songs.forEach(song => renderSongItem(song));
            } else {
                songsList.innerHTML = '<p style="color:var(--text-muted); text-align:center;">No songs found on JioSaavn.</p>';
            }
        } else if (source === 'itunes') {
            const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=100`;
            const itunesRes = await fetch(itunesUrl);
            const itunesData = await itunesRes.json();
            
            if (itunesData.results && itunesData.results.length > 0) {
                itunesData.results.forEach(song => renderItunesSongItem(song));
            } else {
                songsList.innerHTML = '<p style="color:var(--text-muted); text-align:center;">No songs found on iTunes.</p>';
            }
        }
    } catch (err) {
        console.error("Song search failed:", err);
        songsList.innerHTML = '<p style="color:red; text-align:center;">Failed to load songs. Try again later.</p>';
    } finally {
        songSpinner.classList.add('hidden');
        btnSearchSong.disabled = false;
    }
}

// Render JioSaavn Song
function renderSongItem(song) {
    const item = document.createElement('div');
    item.className = 'song-item';

    // Thumbnail
    const img = document.createElement('img');
    img.className = 'song-thumb';
    // Get highest quality image
    const imageObj = song.image && song.image.length > 0 ? song.image[song.image.length - 1] : null;
    img.src = imageObj ? imageObj.url : 'https://via.placeholder.com/60?text=Audio';
    img.loading = "lazy";

    // Info
    const info = document.createElement('div');
    info.className = 'song-info';
    
    const title = document.createElement('div');
    title.className = 'song-title';
    title.innerHTML = song.name;
    
    const artist = document.createElement('div');
    artist.className = 'song-artist';
    artist.innerHTML = song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist';
    
    info.appendChild(title);
    info.appendChild(artist);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'song-actions';

    const playBtn = document.createElement('button');
    playBtn.className = 'btn-play';
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    
    // Get highest quality audio
    const audioObj = song.downloadUrl && song.downloadUrl.length > 0 ? song.downloadUrl[song.downloadUrl.length - 1] : null;
    const audioUrl = audioObj ? audioObj.url : null;
    
    if (audioUrl) {
        playBtn.onclick = () => {
            togglePlay(audioUrl, playBtn);
        };
    } else {
        playBtn.disabled = true;
        playBtn.style.opacity = '0.5';
    }

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn-download-song';
    downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i> Download';
    
    if (audioUrl) {
        downloadBtn.onclick = () => {
            downloadMedia(audioUrl, `${song.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`);
        };
    } else {
        downloadBtn.disabled = true;
        downloadBtn.style.opacity = '0.5';
    }

    actions.appendChild(playBtn);
    actions.appendChild(downloadBtn);

    item.appendChild(img);
    item.appendChild(info);
    item.appendChild(actions);

    songsList.appendChild(item);
}

// Render iTunes Fallback Song
function renderItunesSongItem(song) {
    const item = document.createElement('div');
    item.className = 'song-item';

    const img = document.createElement('img');
    img.className = 'song-thumb';
    img.src = song.artworkUrl100 || 'https://via.placeholder.com/60?text=Audio';
    img.loading = "lazy";

    const info = document.createElement('div');
    info.className = 'song-info';
    
    const title = document.createElement('div');
    title.className = 'song-title';
    title.textContent = song.trackName;
    
    const artist = document.createElement('div');
    artist.className = 'song-artist';
    artist.textContent = song.artistName;
    
    info.appendChild(title);
    info.appendChild(artist);

    const actions = document.createElement('div');
    actions.className = 'song-actions';

    const playBtn = document.createElement('button');
    playBtn.className = 'btn-play';
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    
    if (song.previewUrl) {
        playBtn.onclick = () => {
            togglePlay(song.previewUrl, playBtn);
        };
    }

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn-download-song';
    downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i> Download';
    
    if (song.previewUrl) {
        downloadBtn.onclick = () => {
            downloadMedia(song.previewUrl, `${song.trackName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.m4a`);
        };
    }

    actions.appendChild(playBtn);
    actions.appendChild(downloadBtn);

    item.appendChild(img);
    item.appendChild(info);
    item.appendChild(actions);

    songsList.appendChild(item);
}

// --- AUDIO PLAYBACK LOGIC ---
function togglePlay(audioUrl, btnElement) {
    // If clicking the same song that is currently playing/paused
    if (state.currentPlayingAudio === audioUrl) {
        if (audioPlayer.paused) {
            audioPlayer.play();
            btnElement.innerHTML = '<i class="fa-solid fa-pause"></i>';
        } else {
            audioPlayer.pause();
            btnElement.innerHTML = '<i class="fa-solid fa-play"></i>';
        }
        return;
    }

    // Reset previous button if exists
    if (state.currentPlayingBtn) {
        state.currentPlayingBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    }

    // Play new song
    audioPlayer.src = audioUrl;
    audioPlayer.play().then(() => {
        btnElement.innerHTML = '<i class="fa-solid fa-pause"></i>';
        state.currentPlayingAudio = audioUrl;
        state.currentPlayingBtn = btnElement;
    }).catch(err => {
        console.error("Playback failed", err);
        alert("Audio playback failed.");
    });
}

// --- UNIVERSAL DOWNLOADER ---
async function downloadMedia(url, filename) {
    try {
        // Show loading state cursor
        document.body.style.cursor = 'wait';
        
        const response = await fetch(url);
        const blob = await response.blob();
        
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        }, 100);
        
    } catch (error) {
        console.error('Download failed:', error);
        // Fallback for strict CORS: open in new tab
        window.open(url, '_blank');
    } finally {
        document.body.style.cursor = 'default';
    }
}
