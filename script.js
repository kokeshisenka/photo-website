// Глобальні змінні
let currentState = {
    convert: {
        file: null,
        selectedFormat: null,
        result: null
    },
    upscale: {
        file: null,
        selectedModel: 'realesrgan-x4plus',
        result: null
    },
    files: []
};

// Ініціалізація
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Ініціалізація сайту...");
    initializeNavigation();
    initializeFileUploads();
    initializeFormatSelection();
    initializeModelSelection();
    loadFileManagement();
});

// Навігація
function initializeNavigation() {
    console.log("🔧 Ініціалізація навігації...");
    
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').replace('#', '');
            console.log("🔗 Клік по навігації:", targetId);
            
            // Видаляємо активний клас з усіх посилань
            navLinks.forEach(l => l.classList.remove('active'));
            // Додаємо активний клас до поточного посилання
            this.classList.add('active');
            
            // Перемикаємо секції
            switchSection(targetId);
        });
    });
    
    console.log("✅ Навігація ініціалізована");
}

// Перемикання секцій
function switchSection(sectionId) {
    console.log(`🔄 Перемикання на секцію: ${sectionId}`);
    
    // Приховуємо всі секції
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Показуємо обрану секцію
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        console.log("✅ Показано секцію:", sectionId);
        
        // Оновлюємо файли якщо це керування
        if (sectionId === 'manage') {
            refreshFileList();
        }
    } else {
        console.error("❌ Секція не знайдена:", sectionId);
    }
}

// Завантаження файлів
function initializeFileUploads() {
    console.log("📁 Ініціалізація завантаження файлів...");
    
    // Конвертація
    setupFileUpload('convertFileInput', 'convertUploadArea', handleConvertFileSelect);
    // Покращення
    setupFileUpload('upscaleFileInput', 'upscaleUploadArea', handleUpscaleFileSelect);
}

function setupFileUpload(inputId, areaId, callback) {
    const fileInput = document.getElementById(inputId);
    const uploadArea = document.getElementById(areaId);
    
    if (!fileInput || !uploadArea) {
        console.error(`❌ Елементи для завантаження не знайдені: ${inputId}, ${areaId}`);
        return;
    }
    
    // Клік по області
    uploadArea.addEventListener('click', function(e) {
        if (!e.target.closest('button')) {
            fileInput.click();
        }
    });
    
    // Drag & Drop
    ['dragover', 'dragenter'].forEach(event => {
        uploadArea.addEventListener(event, function(e) {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
    });
    
    ['dragleave', 'dragend', 'drop'].forEach(event => {
        uploadArea.addEventListener(event, function(e) {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });
    });
    
    uploadArea.addEventListener('drop', function(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            console.log("📂 Файл перетягнуто:", files[0].name);
            callback(files[0]);
        }
    });
    
    // Зміна файлу через input
    fileInput.addEventListener('change', function(e) {
        if (this.files.length > 0) {
            console.log("📂 Файл обрано:", this.files[0].name);
            callback(this.files[0]);
        }
    });
}

function handleConvertFileSelect(file) {
    console.log("🔄 Обробка файлу для конвертації:", file.name);
    
    if (!validateFile(file)) return;
    
    currentState.convert.file = file;
    showConvertPreview(file);
}

function handleUpscaleFileSelect(file) {
    console.log("🚀 Обробка файлу для покращення:", file.name);
    
    if (!validateFile(file)) return;
    
    currentState.upscale.file = file;
    showUpscalePreview(file);
}

function validateFile(file) {
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/webp', 
        'image/bmp', 'image/heic', 'image/heif'
    ];
    
    console.log(`📊 Перевірка файлу: ${file.name}, розмір: ${(file.size / 1024 / 1024).toFixed(2)}MB, тип: ${file.type}`);
    
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().match(/\.(heic|heif)$/)) {
        showError('Непідтримуваний формат файлу', 'Будь ласка, оберіть зображення у підтримуваному форматі (PNG, JPG, WEBP, BMP, HEIC).');
        return false;
    }
    
    if (file.size > maxSize) {
        showError('Файл занадто великий', `Максимальний розмір файлу: ${maxSize / 1024 / 1024}MB. Ваш файл: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        return false;
    }
    
    console.log("✅ Файл пройшов перевірку");
    return true;
}

// Попередній перегляд
function showConvertPreview(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const preview = document.getElementById('convertOriginalPreview');
        const info = document.getElementById('convertOriginalInfo');
        const previewSection = document.getElementById('convertPreview');
        
        if (!preview || !info || !previewSection) {
            console.error("❌ Елементи попереднього перегляду не знайдені");
            return;
        }
        
        preview.src = e.target.result;
        
        // Інформація про файл
        const img = new Image();
        img.onload = function() {
            const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
            info.innerHTML = `
                <p><strong>Розмір:</strong> ${this.width} × ${this.height} px</p>
                <p><strong>Вага:</strong> ${fileSizeMB} MB</p>
                <p><strong>Формат:</strong> ${file.type || getFileExtension(file.name)}</p>
            `;
        };
        img.src = e.target.result;
        
        // Показуємо секцію попереднього перегляду
        previewSection.classList.remove('hidden');
        
        console.log("✅ Попередній перегляд показано");
    };
    
    reader.onerror = function(e) {
        console.error("❌ Помилка читання файлу:", e);
        showError('Помилка читання файлу', 'Не вдалося прочитати обраний файл.');
    };
    
    reader.readAsDataURL(file);
}

function showUpscalePreview(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const preview = document.getElementById('upscaleOriginalPreview');
        const info = document.getElementById('upscaleOriginalInfo');
        const previewSection = document.getElementById('upscalePreview');
        
        if (!preview || !info || !previewSection) {
            console.error("❌ Елементи попереднього перегляду не знайдені");
            return;
        }
        
        preview.src = e.target.result;
        
        // Інформація про файл
        const img = new Image();
        img.onload = function() {
            const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
            info.innerHTML = `
                <p><strong>Поточний розмір:</strong> ${this.width} × ${this.height} px</p>
                <p><strong>Майбутній розмір:</strong> ${this.width * 4} × ${this.height * 4} px</p>
                <p><strong>Вага:</strong> ${fileSizeMB} MB</p>
            `;
        };
        img.src = e.target.result;
        
        // Показуємо секцію попереднього перегляду
        previewSection.classList.remove('hidden');
        
        console.log("✅ Попередній перегляд показано");
    };
    
    reader.onerror = function(e) {
        console.error("❌ Помилка читання файлу:", e);
        showError('Помилка читання файлу', 'Не вдалося прочитати обраний файл.');
    };
    
    reader.readAsDataURL(file);
}

// Вибір формату
function initializeFormatSelection() {
    const formatOptions = document.querySelectorAll('.format-option');
    
    if (formatOptions.length === 0) {
        console.error("❌ Елементи вибору формату не знайдені");
        return;
    }
    
    formatOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Видаляємо виділення з усіх опцій
            document.querySelectorAll('.format-option').forEach(opt => {
                opt.classList.remove('active');
            });
            
            // Додаємо виділення до обраної опції
            this.classList.add('active');
            
            // Зберігаємо вибраний формат
            currentState.convert.selectedFormat = this.getAttribute('data-format');
            
            // Активуємо кнопку конвертації
            document.getElementById('convertBtn').disabled = false;
            
            console.log(`✅ Обрано формат: ${currentState.convert.selectedFormat}`);
            
            // Показуємо попередній перегляд результату
            previewConversionResult();
        });
    });
    
    // Обробник кнопки конвертації
    const convertBtn = document.getElementById('convertBtn');
    if (convertBtn) {
        convertBtn.addEventListener('click', processConversion);
    } else {
        console.error("❌ Кнопка конвертації не знайдена");
    }
}

// Вибір моделі AI
function initializeModelSelection() {
    const modelOptions = document.querySelectorAll('.model-option');
    
    if (modelOptions.length === 0) {
        console.error("❌ Елементи вибору моделі не знайдені");
        return;
    }
    
    modelOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Видаляємо виділення з усіх опцій
            document.querySelectorAll('.model-option').forEach(opt => {
                opt.classList.remove('active');
            });
            
            // Додаємо виділення до обраної опції
            this.classList.add('active');
            
            // Зберігаємо вибрану модель
            currentState.upscale.selectedModel = this.getAttribute('data-model');
            
            console.log(`✅ Обрано модель: ${currentState.upscale.selectedModel}`);
        });
    });
    
    // Обробник кнопки покращення
    const upscaleBtn = document.getElementById('upscaleBtn');
    if (upscaleBtn) {
        upscaleBtn.addEventListener('click', processUpscale);
    } else {
        console.error("❌ Кнопка покращення не знайдена");
    }
}

// Попередній перегляд результату конвертації
function previewConversionResult() {
    const placeholder = document.getElementById('convertResultPlaceholder');
    const resultImg = document.getElementById('convertResultPreview');
    const resultInfo = document.getElementById('convertResultInfo');
    
    if (!placeholder || !resultImg || !resultInfo) {
        console.error("❌ Елементи результату конвертації не знайдені");
        return;
    }
    
    placeholder.classList.add('hidden');
    resultImg.classList.remove('hidden');
    resultInfo.classList.remove('hidden');
    
    // Тимчасово використовуємо оригінальне зображення
    resultImg.src = document.getElementById('convertOriginalPreview').src;
    
    const originalInfo = document.getElementById('convertOriginalInfo').textContent;
    resultInfo.innerHTML = originalInfo + `<p><strong>Новий формат:</strong> ${currentState.convert.selectedFormat.toUpperCase()}</p>`;
}

// Обробка конвертації
async function processConversion() {
    if (!currentState.convert.file || !currentState.convert.selectedFormat) {
        showError('Помилка', 'Будь ласка, оберіть файл та формат для конвертації.');
        return;
    }
    
    console.log(`🔄 Запуск конвертації в формат: ${currentState.convert.selectedFormat}`);
    
    showLoading('Конвертація', 'Конвертуємо ваше зображення...');
    
    try {
        const formData = new FormData();
        formData.append('file', currentState.convert.file);
        formData.append('format', currentState.convert.selectedFormat);
        formData.append('action', 'convert');
        
        const response = await fetch('/api/process', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Помилка сервера: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            currentState.convert.result = result;
            
            // Оновлюємо перегляд результату
            document.getElementById('convertResultPreview').src = result.download_url;
            document.getElementById('convertResultInfo').innerHTML = `
                <p><strong>Розмір:</strong> ${result.width} × ${result.height} px</p>
                <p><strong>Формат:</strong> ${currentState.convert.selectedFormat.toUpperCase()}</p>
                <p><strong>Вага:</strong> ${(result.file_size / 1024 / 1024).toFixed(2)} MB</p>
                <p><strong>Статус:</strong> Готово до завантаження</p>
            `;
            
            // Додаємо кнопку завантаження
            const actionButtons = document.querySelector('#convertPreview .action-buttons');
            actionButtons.innerHTML = `
                <a href="${result.download_url}" download="converted.${currentState.convert.selectedFormat}" class="btn btn-success">
                    <i class="fas fa-download"></i>
                    Завантажити ${currentState.convert.selectedFormat.toUpperCase()}
                </a>
                <button class="btn btn-primary" onclick="processNewConversion()">
                    <i class="fas fa-sync-alt"></i>
                    Нова конвертація
                </button>
                <button class="btn btn-secondary" onclick="resetConversion()">
                    <i class="fas fa-redo"></i>
                    Новий файл
                </button>
            `;
            
            // Додаємо файл до списку
            addFileToManagement({
                name: `converted.${currentState.convert.selectedFormat}`,
                size: result.file_size,
                url: result.download_url,
                type: 'converted'
            });
            
            hideLoading();
            showSuccess('Конвертація успішна!', 'Файл готовий до завантаження.');
            
            console.log("✅ Конвертація завершена успішно");
            
        } else {
            throw new Error(result.error || 'Невідома помилка');
        }
    } catch (error) {
        hideLoading();
        console.error("❌ Помилка конвертації:", error);
        showError('Помилка конвертації', error.message);
    }
}

// Обробка AI покращення
async function processUpscale() {
    if (!currentState.upscale.file) {
        showError('Помилка', 'Будь ласка, оберіть файл для покращення.');
        return;
    }
    
    console.log("🚀 Запуск AI покращення...");
    
    const realESRGAAvailable = await checkRealESRGANStatus();
    const loadingMessage = realESRGAAvailable 
        ? 'Використовуємо Real-ESRGAN для 4x покращення якості...' 
        : 'Використовуємо вдосконалений алгоритм для покращення якості...';
    
    showLoading('AI Покращення', loadingMessage, true);
    
    try {
        const formData = new FormData();
        formData.append('file', currentState.upscale.file);
        formData.append('model', currentState.upscale.selectedModel);
        formData.append('action', 'upscale');
        
        const response = await fetch('/api/process', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Помилка сервера: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            currentState.upscale.result = result;
            
            // Оновлюємо перегляд результату
            document.getElementById('upscaleResultPreview').src = result.download_url;
            document.getElementById('upscaleResultPreview').classList.remove('hidden');
            document.getElementById('upscaleResultPlaceholder').classList.add('hidden');
            
            const methodText = result.method === 'real_esrgan' ? 'Real-ESRGAN AI' : 'Розширений алгоритм';
            
            document.getElementById('upscaleResultInfo').innerHTML = `
                <p><strong>Новий розмір:</strong> ${result.width} × ${result.height} px</p>
                <p><strong>Збільшення:</strong> ${result.scale_factor || 4}x</p>
                <p><strong>Метод:</strong> ${methodText}</p>
                <p><strong>Вага:</strong> ${(result.file_size / 1024 / 1024).toFixed(2)} MB</p>
                <p><strong>Статус:</strong> Готово до завантаження</p>
            `;
            
            // Додаємо кнопку завантаження
            const actionButtons = document.querySelector('#upscalePreview .action-buttons');
            actionButtons.innerHTML = `
                <a href="${result.download_url}" download="upscaled_4x.png" class="btn btn-success">
                    <i class="fas fa-download"></i>
                    Завантажити PNG (4x)
                </a>
                <button class="btn btn-primary" onclick="processNewUpscale()">
                    <i class="fas fa-bolt"></i>
                    Покращити ще раз
                </button>
                <button class="btn btn-secondary" onclick="resetUpscale()">
                    <i class="fas fa-redo"></i>
                    Новий файл
                </button>
            `;
            
            // Додаємо файл до списку
            addFileToManagement({
                name: `upscaled_${result.scale_factor || 4}x.png`,
                size: result.file_size,
                url: result.download_url,
                type: 'upscaled'
            });
            
            hideLoading();
            showSuccess('AI Покращення успішне!', `Якість зображення покращена в ${result.scale_factor || 4} рази за допомогою ${methodText}.`);
            
            console.log("✅ AI покращення завершено успішно");
            
        } else {
            throw new Error(result.error || 'Невідома помилка');
        }
    } catch (error) {
        hideLoading();
        console.error("❌ Помилка AI покращення:", error);
        showError('Помилка AI покращення', error.message);
    }
}

// Real-ESRGAN статус
async function checkRealESRGANStatus() {
    try {
        const response = await fetch('/api/real_esrgan_status');
        const result = await response.json();
        return result.available || false;
    } catch (error) {
        console.log('Real-ESRGAN не доступний, використовуємо резервний метод');
        return false;
    }
}

// Керування файлами
function loadFileManagement() {
    const savedFiles = localStorage.getItem('photoProFiles');
    if (savedFiles) {
        currentState.files = JSON.parse(savedFiles);
    }
}

async function refreshFileList() {
    const filesList = document.getElementById('filesList');
    const totalFiles = document.getElementById('totalFiles');
    const totalSize = document.getElementById('totalSize');
    
    if (!filesList || !totalFiles || !totalSize) {
        console.error("❌ Елементи керування файлами не знайдені");
        return;
    }
    
    try {
        // Отримуємо файли з сервера
        const response = await fetch('/api/files');
        const result = await response.json();
        
        let allFiles = [...currentState.files];
        
        if (result.success) {
            // Комбінуємо локальні файли з серверними
            const serverFiles = result.files || [];
            allFiles = [...currentState.files, ...serverFiles];
        }
        
        // Оновлюємо статистику
        totalFiles.textContent = allFiles.length;
        
        const totalSizeMB = allFiles.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);
        totalSize.textContent = totalSizeMB.toFixed(2) + ' MB';
        
        // Оновлюємо список файлів
        filesList.innerHTML = '';
        
        if (allFiles.length === 0) {
            filesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>Немає файлів</h3>
                    <p>Завантажені файли з'являться тут</p>
                </div>
            `;
            return;
        }
        
        allFiles.forEach((file, index) => {
            const fileElement = document.createElement('div');
            fileElement.className = 'file-item';
            
            // Визначаємо іконку за типом файлу
            let fileIcon = 'fa-file-image';
            let typeBadge = '';
            
            if (file.type === 'upscaled') {
                fileIcon = 'fa-rocket';
                typeBadge = '<span class="file-type-badge upscaled">AI</span>';
            } else if (file.type === 'converted') {
                fileIcon = 'fa-sync-alt';
                typeBadge = '<span class="file-type-badge converted">CONV</span>';
            }
            
            fileElement.innerHTML = `
                <div class="file-info-small">
                    <i class="fas ${fileIcon} file-icon"></i>
                    <div class="file-details">
                        <h4>${file.name} ${typeBadge}</h4>
                        <p>${(file.size / 1024 / 1024).toFixed(2)} MB • ${file.width || '?'}×${file.height || '?'} px</p>
                    </div>
                </div>
                <div class="file-actions">
                    <a href="${file.url}" download="${file.name}" class="btn btn-primary btn-sm" title="Завантажити">
                        <i class="fas fa-download"></i>
                    </a>
                    <button class="btn btn-danger btn-sm" onclick="deleteFile(${index})" title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            filesList.appendChild(fileElement);
        });
        
        console.log("✅ Список файлів оновлено");
    } catch (error) {
        console.error('❌ Помилка завантаження списку файлів:', error);
        // Використовуємо тільки локальні файли
        const totalSizeMB = currentState.files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);
        totalFiles.textContent = currentState.files.length;
        totalSize.textContent = totalSizeMB.toFixed(2) + ' MB';
    }
}

function addFileToManagement(file) {
    currentState.files.unshift(file); // Додаємо на початок
    localStorage.setItem('photoProFiles', JSON.stringify(currentState.files));
    refreshFileList();
}

function deleteFile(index) {
    if (!confirm('Видалити цей файл?')) return;
    
    currentState.files.splice(index, 1);
    localStorage.setItem('photoProFiles', JSON.stringify(currentState.files));
    refreshFileList();
    showSuccess('Файл видалено', 'Файл успішно видалено.');
}

async function clearAllFiles() {
    if (!confirm('Видалити всі файли? Цю дію не можна скасувати.')) return;
    
    showLoading('Очищення', 'Видаляємо всі файли...');
    
    try {
        // Видаляємо файли на сервері
        const response = await fetch('/api/cleanup', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Очищаємо локальне сховище
            currentState.files = [];
            localStorage.setItem('photoProFiles', JSON.stringify(currentState.files));
            
            hideLoading();
            
            let message = `Видалено ${result.deleted_count} файлів`;
            if (result.errors && result.errors.length > 0) {
                message += ` (помилок: ${result.errors.length})`;
            }
            
            showSuccess('Файли очищено', message);
            refreshFileList();
            
            console.log("✅ Всі файли успішно видалено");
        } else {
            throw new Error(result.error || 'Помилка очищення');
        }
    } catch (error) {
        hideLoading();
        console.error("❌ Помилка очищення файлів:", error);
        
        // Альтернативний метод
        try {
            const deleteResponse = await fetch('/api/delete_all', {
                method: 'DELETE'
            });
            
            const deleteResult = await deleteResponse.json();
            
            if (deleteResult.success) {
                currentState.files = [];
                localStorage.setItem('photoProFiles', JSON.stringify(currentState.files));
                refreshFileList();
                showSuccess('Файли очищено', `Видалено ${deleteResult.deleted_count} файлів`);
            } else {
                throw new Error(deleteResult.error);
            }
        } catch (deleteError) {
            showError('Помилка очищення', 'Не вдалося видалити всі файли. Спробуйте ще раз.');
        }
    }
}

// Допоміжні функції
function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

function resetConversion() {
    currentState.convert = { file: null, selectedFormat: null, result: null };
    document.getElementById('convertPreview').classList.add('hidden');
    document.getElementById('convertBtn').disabled = true;
    document.querySelectorAll('.format-option').forEach(opt => opt.classList.remove('active'));
    console.log("🔄 Конвертація скинута");
}

function resetUpscale() {
    currentState.upscale = { file: null, selectedModel: 'realesrgan-x4plus', result: null };
    document.getElementById('upscalePreview').classList.add('hidden');
    document.getElementById('upscaleResultPreview').classList.add('hidden');
    document.getElementById('upscaleResultPlaceholder').classList.remove('hidden');
    console.log("🔄 Покращення скинуте");
}

function processNewConversion() {
    if (currentState.convert.file && currentState.convert.selectedFormat) {
        processConversion();
    }
}

function processNewUpscale() {
    if (currentState.upscale.file) {
        processUpscale();
    }
}

// UI функції
function showLoading(title, message, showProgress = false) {
    document.getElementById('loadingTitle').textContent = title;
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('progressFill').style.width = showProgress ? '0%' : '100%';
    document.getElementById('loadingModal').classList.remove('hidden');
    
    if (showProgress) {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }
            document.getElementById('progressFill').style.width = progress + '%';
        }, 500);
    }
}

function hideLoading() {
    document.getElementById('loadingModal').classList.add('hidden');
}

function showError(title, message) {
    document.getElementById('errorTitle').textContent = title;
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorModal').classList.remove('hidden');
}

function showSuccess(title, message) {
    console.log(`✅ ${title}: ${message}`);
    alert(`${title}\n${message}`);
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Глобальні функції для HTML
window.resetConversion = resetConversion;
window.resetUpscale = resetUpscale;
window.clearAllFiles = clearAllFiles;
window.deleteFile = deleteFile;
window.closeModal = closeModal;
window.processNewConversion = processNewConversion;
window.processNewUpscale = processNewUpscale;

console.log("✅ Скрипт завантажено успішно!");