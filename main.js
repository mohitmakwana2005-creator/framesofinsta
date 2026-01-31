document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const canvas = document.getElementById('photo-canvas');
    const emptyState = document.getElementById('empty-state');
    const downloadBtn = document.getElementById('download-btn');
    const resetBtn = document.getElementById('reset-btn');
    const thumbnailsContainer = document.getElementById('thumbnails-container');
    const ctx = canvas.getContext('2d');

    // Controls
    const ratioBtns = document.querySelectorAll('.ratio-btn');
    const colorInput = document.getElementById('frame-color');
    const colorValue = document.getElementById('color-value');
    const colorDots = document.querySelectorAll('.color-dot');

    // Sliders & Value displays
    const paddingSlider = document.getElementById('padding-slider');
    const paddingVal = document.getElementById('padding-val');
    const roundSlider = document.getElementById('round-slider');
    const roundVal = document.getElementById('round-val');
    const shadowSlider = document.getElementById('shadow-slider');
    const shadowVal = document.getElementById('shadow-val');

    // Advanced Controls
    const advancedToggle = document.getElementById('advanced-toggle');
    const advancedControls = document.getElementById('advanced-controls');
    const blurCheck = document.getElementById('blur-check');

    // State
    const defaultSettings = {
        ratio: '1:1',
        color: '#ffffff',
        padding: 20,
        blur: false,
        round: 0,
        shadow: 0
    };

    const state = {
        images: [], // Array of { name: str, img: Image, settings: {...} }
        activeIndex: -1
    };

    // --- Core Logic Helpers ---

    function getCurrentSettings() {
        if (state.activeIndex === -1) return { ...defaultSettings };
        return state.images[state.activeIndex].settings;
    }

    function updateUIFromSettings(settings) {
        // Ratio buttons
        ratioBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.ratio === settings.ratio);
        });

        // Color
        colorInput.value = settings.color;
        colorValue.textContent = settings.color.toUpperCase();

        // Sliders & Text
        paddingSlider.value = settings.padding;
        paddingVal.textContent = `${settings.padding}%`;

        blurCheck.checked = settings.blur;

        roundSlider.value = settings.round;
        roundVal.textContent = `${settings.round}%`;

        shadowSlider.value = settings.shadow;
        shadowVal.textContent = settings.shadow;
    }

    // --- Event Listeners ---

    // Toggle Advanced
    advancedToggle.addEventListener('click', () => {
        advancedControls.classList.toggle('show');
        advancedToggle.classList.toggle('open');
    });

    // Reset
    resetBtn.addEventListener('click', () => {
        state.images = [];
        state.activeIndex = -1;

        updateUIFromSettings(defaultSettings);

        fileInput.value = '';
        canvas.style.display = 'none';
        emptyState.style.display = 'block';
        downloadBtn.disabled = true;
        resetBtn.style.display = 'none';
        thumbnailsContainer.style.display = 'none';
        thumbnailsContainer.innerHTML = '';
    });

    // File Upload
    dropZone.addEventListener('click', (e) => {
        if (e.target === dropZone || e.target.parentElement === dropZone) {
            if (state.images.length === 0) fileInput.click();
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Ratio Selection
    ratioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (state.activeIndex !== -1) {
                state.images[state.activeIndex].settings.ratio = btn.dataset.ratio;
                updateUIFromSettings(state.images[state.activeIndex].settings);
                renderCanvas();
            }
        });
    });

    // Color Selection
    colorInput.addEventListener('input', (e) => {
        if (state.activeIndex !== -1) {
            state.images[state.activeIndex].settings.color = e.target.value;
            colorValue.textContent = e.target.value.toUpperCase();
            renderCanvas();
        }
    });

    colorDots.forEach(dot => {
        dot.addEventListener('click', () => {
            if (state.activeIndex !== -1) {
                const color = dot.dataset.color;
                state.images[state.activeIndex].settings.color = color;
                colorInput.value = color;
                colorValue.textContent = color.toUpperCase();
                renderCanvas();
            }
        });
    });

    // Sliders & Checks
    paddingSlider.addEventListener('input', (e) => {
        if (state.activeIndex !== -1) {
            const val = parseInt(e.target.value, 10);
            state.images[state.activeIndex].settings.padding = val;
            paddingVal.textContent = `${val}%`;
            renderCanvas();
        }
    });

    blurCheck.addEventListener('change', (e) => {
        if (state.activeIndex !== -1) {
            state.images[state.activeIndex].settings.blur = e.target.checked;
            renderCanvas();
        }
    });

    roundSlider.addEventListener('input', (e) => {
        if (state.activeIndex !== -1) {
            const val = parseInt(e.target.value, 10);
            state.images[state.activeIndex].settings.round = val;
            roundVal.textContent = `${val}%`;
            renderCanvas();
        }
    });

    shadowSlider.addEventListener('input', (e) => {
        if (state.activeIndex !== -1) {
            const val = parseInt(e.target.value, 10);
            state.images[state.activeIndex].settings.shadow = val;
            shadowVal.textContent = val;
            renderCanvas();
        }
    });

    // Download
    downloadBtn.addEventListener('click', async () => {
        if (state.images.length === 0) return;

        downloadBtn.disabled = true;
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Processing...';

        try {
            if (state.images.length === 1) {
                const link = document.createElement('a');
                link.download = `insta-frame-${state.images[0].name.split('.')[0]}.png`;
                link.href = canvas.toDataURL('image/png', 1.0);
                link.click();
            } else {
                const zip = new JSZip();

                // Keep track of current preview to return to it
                const originalActive = state.activeIndex;

                for (let i = 0; i < state.images.length; i++) {
                    state.activeIndex = i;
                    renderCanvas(); // Render with THIS image's specific settings

                    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
                    const fileName = `frame-${state.images[i].name.split('.')[0]}.png`;
                    zip.file(fileName, blob);
                }

                state.activeIndex = originalActive;
                renderCanvas();

                const content = await zip.generateAsync({ type: "blob" });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = "insta-framer-batch.zip";
                link.click();
            }

            setTimeout(() => {
                if (confirm("Download complete! Start over?")) {
                    resetBtn.click();
                }
            }, 1000);

        } catch (err) {
            console.error("Download failed", err);
            alert("Something went wrong during download.");
        } finally {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = originalText;
        }
    });

    // --- Core Logic ---

    function handleFiles(files) {
        if (files.length === 0) return;

        let firstSuccessfulIndex = -1;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/')) continue;

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const newIndex = state.images.length;

                    state.images.push({
                        name: file.name,
                        img: img,
                        settings: { ...defaultSettings } // Each image gets its OWN copy of settings
                    });

                    addThumbnail(img, newIndex);

                    if (state.activeIndex === -1) {
                        state.activeIndex = 0;
                        activateImage(0);

                        canvas.style.display = 'block';
                        emptyState.style.display = 'none';
                        downloadBtn.disabled = false;
                        resetBtn.style.display = 'flex';
                        thumbnailsContainer.style.display = 'flex';
                    }

                    updateDownloadButton();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    function addThumbnail(img, index) {
        const thumb = document.createElement('img');
        thumb.src = img.src;
        thumb.classList.add('thumbnail');
        thumb.dataset.index = index;

        thumb.addEventListener('click', () => {
            activateImage(index);
        });

        thumbnailsContainer.appendChild(thumb);
    }

    function activateImage(index) {
        state.activeIndex = index;

        // Update Thumbnails UI
        const thumbs = thumbnailsContainer.querySelectorAll('.thumbnail');
        thumbs.forEach(t => t.classList.remove('active'));
        if (thumbs[index]) thumbs[index].classList.add('active');

        // Load THIS image's settings into the UI
        const settings = state.images[index].settings;
        updateUIFromSettings(settings);

        renderCanvas();
    }

    function updateDownloadButton() {
        if (state.images.length > 1) {
            downloadBtn.innerHTML = `<i class="ph ph-download-simple"></i> Download All (${state.images.length}) as ZIP`;
        } else {
            downloadBtn.innerHTML = '<i class="ph ph-download-simple"></i> Download Image';
        }
    }

    function renderCanvas() {
        if (state.activeIndex === -1 || !state.images[state.activeIndex]) return;

        const imgData = state.images[state.activeIndex];
        const img = imgData.img;
        const settings = imgData.settings;

        let targetRatioVal = 1;
        const [rw, rh] = settings.ratio.split(':').map(Number);
        targetRatioVal = rw / rh;

        const iw = img.width;
        const ih = img.height;
        const imageRatio = iw / ih;

        let canvasWidth, canvasHeight;

        if (imageRatio > targetRatioVal) {
            canvasWidth = iw;
            canvasHeight = iw / targetRatioVal;
        } else {
            canvasHeight = ih;
            canvasWidth = ih * targetRatioVal;
        }

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // 1. Draw Background
        if (settings.blur) {
            ctx.save();
            ctx.filter = `blur(${canvasWidth * 0.05}px)`;
            const coverScale = Math.max(canvasWidth / iw, canvasHeight / ih);
            const cw = iw * coverScale;
            const ch = ih * coverScale;
            ctx.drawImage(img, (canvasWidth - cw) / 2, (canvasHeight - ch) / 2, cw, ch);
            ctx.restore();

            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        } else {
            ctx.fillStyle = settings.color;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        // 2. Draw Main Image with Padding
        const paddingPercent = settings.padding / 200;
        const safeWidth = canvasWidth * (1 - paddingPercent * 2);
        const safeHeight = canvasHeight * (1 - paddingPercent * 2);

        const scale = Math.min(safeWidth / iw, safeHeight / ih);
        const drawW = iw * scale;
        const drawH = ih * scale;
        const drawX = (canvasWidth - drawW) / 2;
        const drawY = (canvasHeight - drawH) / 2;

        ctx.save();

        if (settings.shadow > 0) {
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = settings.shadow * 2;
            ctx.shadowOffsetY = settings.shadow;
        }

        if (settings.round > 0) {
            ctx.beginPath();
            const radius = (settings.round / 100) * (Math.min(drawW, drawH) / 2);
            ctx.roundRect(drawX, drawY, drawW, drawH, radius);
            ctx.clip();
        }

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();
    }
});
