from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import os
import uuid
import time
import threading
from PIL import Image
import cv2
import numpy as np
import subprocess

app = Flask(__name__, static_folder='.', template_folder='.')
CORS(app)

# Налаштування
UPLOAD_FOLDER = 'uploads'
MODELS_FOLDER = 'models'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'bmp', 'heic', 'heif'}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB

# Створюємо папки
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(MODELS_FOLDER, exist_ok=True)

# Шлях до Real-ESRGAN
REALESRGAN_PATH = 'realesrgan-ncnn-vulkan.exe'

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_file_size(filepath):
    return os.path.getsize(filepath)

@app.route('/')
def index():
    return send_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/api/process', methods=['POST'])
def process_image():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'Файл не знайдено'}), 400
        
        file = request.files['file']
        action = request.form.get('action')
        
        if file.filename == '':
            return jsonify({'success': False, 'error': 'Файл не обрано'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'Непідтримуваний формат файлу'}), 400
        
        # Перевіряємо розмір файлу
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({'success': False, 'error': f'Файл занадто великий. Максимум: {MAX_FILE_SIZE//1024//1024}MB'}), 400
        
        # Зберігаємо вхідний файл
        input_filename = f"{uuid.uuid4()}_{file.filename}"
        input_path = os.path.join(UPLOAD_FOLDER, input_filename)
        file.save(input_path)
        
        if action == 'convert':
            result = process_conversion(input_path, request.form.get('format'))
        elif action == 'upscale':
            result = process_upscale(input_path, request.form.get('model', 'realesrgan-x4plus'))
        else:
            return jsonify({'success': False, 'error': 'Невідома дія'}), 400
        
        # Видаляємо вхідний файл після обробки
        try:
            os.remove(input_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def process_conversion(input_path, target_format):
    """Конвертація зображення"""
    try:
        # Для HEIC файлів
        if input_path.lower().endswith(('.heic', '.heif')):
            try:
                import pillow_heif
                pillow_heif.register_heif_opener()
            except ImportError:
                return {'success': False, 'error': 'Для конвертації HEIC встановіть pillow-heif'}
        
        with Image.open(input_path) as img:
            # Конвертуємо в RGB для JPEG
            if target_format == 'jpg' and img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            output_filename = f"{uuid.uuid4()}.{target_format}"
            output_path = os.path.join(UPLOAD_FOLDER, output_filename)
            
            # Зберігаємо у вказаному форматі
            if target_format == 'jpg':
                img.save(output_path, 'JPEG', quality=95, optimize=True)
            elif target_format == 'png':
                img.save(output_path, 'PNG', optimize=True)
            elif target_format == 'webp':
                img.save(output_path, 'WEBP', quality=95, optimize=True)
            else:
                img.save(output_path, target_format.upper(), optimize=True)
            
            file_size = get_file_size(output_path)
            
            return {
                'success': True,
                'download_url': f'/api/download/{output_filename}',
                'filename': output_filename,
                'width': img.width,
                'height': img.height,
                'file_size': file_size,
                'format': target_format.upper()
            }
    except Exception as e:
        raise Exception(f'Помилка конвертації: {str(e)}')

def process_upscale(input_path, model_name):
    """Покращення якості з Real-ESRGAN"""
    try:
        output_filename = f"{uuid.uuid4()}_upscaled.png"
        output_path = os.path.join(UPLOAD_FOLDER, output_filename)
        
        # Перевіряємо чи існує Real-ESRGAN
        if not os.path.exists(REALESRGAN_PATH):
            print("⚠️ Real-ESRGAN не знайдено, використовуємо резервний метод")
            return process_upscale_fallback(input_path)
        
        # Перевіряємо наявність моделей
        model_param = os.path.join(MODELS_FOLDER, f'{model_name}.param')
        model_bin = os.path.join(MODELS_FOLDER, f'{model_name}.bin')
        
        if not os.path.exists(model_param) or not os.path.exists(model_bin):
            print(f"⚠️ Модель {model_name} не знайдена")
            return process_upscale_fallback(input_path)
        
        # Використовуємо Real-ESRGAN для 4x збільшення
        cmd = [
            REALESRGAN_PATH,
            '-i', input_path,
            '-o', output_path,
            '-n', model_name,
            '-s', '4',
            '-f', 'png',
            '-m', MODELS_FOLDER
        ]
        
        print(f"🚀 Запуск Real-ESRGAN: {' '.join(cmd)}")
        
        # Запускаємо Real-ESRGAN
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0:
            print(f"❌ Real-ESRGAN помилка: {result.stderr}")
            return process_upscale_fallback(input_path)
        
        # Перевіряємо результат
        if not os.path.exists(output_path):
            print("❌ Real-ESRGAN не створив вихідний файл")
            return process_upscale_fallback(input_path)
        
        # Отримуємо інформацію про зображення
        with Image.open(output_path) as img:
            width, height = img.size
        
        file_size = get_file_size(output_path)
        
        print(f"✅ Real-ESRGAN успішно обробив зображення: {width}x{height}")
        
        return {
            'success': True,
            'download_url': f'/api/download/{output_filename}',
            'filename': output_filename,
            'width': width,
            'height': height,
            'file_size': file_size,
            'scale_factor': 4,
            'method': 'real_esrgan'
        }
        
    except subprocess.TimeoutExpired:
        return {'success': False, 'error': 'Час обробки вийшов (5 хв)'}
    except Exception as e:
        print(f"❌ Real-ESRGAN помилка: {e}")
        return process_upscale_fallback(input_path)

def process_upscale_fallback(input_path):
    """Резервний метод покращення якості"""
    try:
        print("🔄 Використовуємо резервний метод покращення якості")
        
        img = cv2.imread(input_path)
        if img is None:
            raise ValueError("Не вдалося прочитати зображення")
        
        height, width = img.shape[:2]
        new_size = (width * 4, height * 4)
        
        # Використовуємо найкращу інтерполяцію
        upscaled = cv2.resize(img, new_size, interpolation=cv2.INTER_LANCZOS4)
        
        # Покращення різкості
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        upscaled = cv2.filter2D(upscaled, -1, kernel)
        
        # Додаткове покращення якості
        upscaled = cv2.fastNlMeansDenoisingColored(upscaled, None, 10, 10, 7, 21)
        
        output_filename = f"{uuid.uuid4()}_upscaled_enhanced.png"
        output_path = os.path.join(UPLOAD_FOLDER, output_filename)
        cv2.imwrite(output_path, upscaled)
        
        file_size = get_file_size(output_path)
        
        print(f"✅ Резервний метод успішно обробив зображення: {upscaled.shape[1]}x{upscaled.shape[0]}")
        
        return {
            'success': True,
            'download_url': f'/api/download/{output_filename}',
            'filename': output_filename,
            'width': upscaled.shape[1],
            'height': upscaled.shape[0],
            'file_size': file_size,
            'scale_factor': 4,
            'method': 'enhanced_fallback'
        }
    except Exception as e:
        raise Exception(f'Резервний метод не вдався: {str(e)}')

@app.route('/api/download/<filename>')
def download_file(filename):
    """Завантаження файлу"""
    try:
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'error': 'Файл не знайдено'}), 404
        
        return send_file(file_path, as_attachment=True)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/files', methods=['GET'])
def list_files():
    """Список файлів у папці uploads"""
    try:
        files = []
        for filename in os.listdir(UPLOAD_FOLDER):
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.isfile(file_path):
                # Отримуємо розмір зображення
                try:
                    with Image.open(file_path) as img:
                        width, height = img.size
                except:
                    width, height = 0, 0
                
                # Визначаємо тип файлу
                file_type = 'processed'
                if 'upscaled' in filename.lower():
                    file_type = 'upscaled'
                elif 'converted' in filename.lower() or any(filename.lower().endswith(ext) for ext in ['.jpg', '.png', '.webp', '.bmp']):
                    file_type = 'converted'
                
                files.append({
                    'name': filename,
                    'size': get_file_size(file_path),
                    'url': f'/api/download/{filename}',
                    'type': file_type,
                    'width': width,
                    'height': height
                })
        return jsonify({'success': True, 'files': files})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/cleanup', methods=['POST'])
def cleanup_files():
    """Очищення всіх файлів"""
    try:
        files = os.listdir(UPLOAD_FOLDER)
        deleted_count = 0
        errors = []
        
        for file in files:
            file_path = os.path.join(UPLOAD_FOLDER, file)
            try:
                os.remove(file_path)
                deleted_count += 1
                print(f"✅ Видалено: {file}")
            except Exception as e:
                errors.append(f"{file}: {str(e)}")
                print(f"❌ Помилка видалення {file}: {e}")
        
        # Очищаємо локальне сховище браузера
        response_data = {
            'success': True,
            'deleted_count': deleted_count,
            'total_files': len(files),
            'errors': errors,
            'message': f'Видалено {deleted_count} з {len(files)} файлів'
        }
        
        if errors:
            response_data['message'] += f'. Помилки: {len(errors)}'
        
        return jsonify(response_data)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/delete/<filename>', methods=['DELETE'])
def delete_file(filename):
    """Видалення конкретного файлу"""
    try:
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'error': 'Файл не знайдено'}), 404
        
        os.remove(file_path)
        print(f"✅ Видалено файл: {filename}")
        return jsonify({'success': True, 'message': 'Файл видалено'})
    except Exception as e:
        print(f"❌ Помилка видалення {filename}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/delete_all', methods=['DELETE'])
def delete_all_files():
    """Видалення всіх файлів (альтернативний метод)"""
    try:
        files = os.listdir(UPLOAD_FOLDER)
        deleted_count = 0
        
        for file in files:
            file_path = os.path.join(UPLOAD_FOLDER, file)
            try:
                os.remove(file_path)
                deleted_count += 1
            except:
                pass
        
        print(f"✅ Видалено всі файли: {deleted_count} файлів")
        return jsonify({
            'success': True,
            'deleted_count': deleted_count,
            'message': f'Видалено {deleted_count} файлів'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/real_esrgan_status', methods=['GET'])
def real_esrgan_status():
    """Перевірка доступності Real-ESRGAN"""
    try:
        if not os.path.exists(REALESRGAN_PATH):
            return jsonify({'available': False, 'message': 'Real-ESRGAN не знайдено'})
        
        # Перевіряємо наявність моделей
        model_param = os.path.join(MODELS_FOLDER, 'realesrgan-x4plus.param')
        model_bin = os.path.join(MODELS_FOLDER, 'realesrgan-x4plus.bin')
        
        models_available = os.path.exists(model_param) and os.path.exists(model_bin)
        
        return jsonify({
            'available': models_available,
            'executable': True,
            'models_available': models_available,
            'message': 'Real-ESRGAN доступний' if models_available else 'Real-ESRGAN доступний, але моделі відсутні'
        })
    except Exception as e:
        return jsonify({'available': False, 'message': str(e)})

# Фонова задача очищення старих файлів
def background_cleanup():
    while True:
        time.sleep(3600)  # Кожну годину
        try:
            with app.app_context():
                files = os.listdir(UPLOAD_FOLDER)
                old_files_deleted = 0
                
                for file in files:
                    file_path = os.path.join(UPLOAD_FOLDER, file)
                    # Видаляємо файли старші за 24 години
                    if os.path.getmtime(file_path) < (time.time() - 86400):
                        try:
                            os.remove(file_path)
                            old_files_deleted += 1
                        except:
                            pass
                
                if old_files_deleted > 0:
                    print(f"🧹 Автоматично видалено {old_files_deleted} старих файлів")
        except Exception as e:
            print(f"❌ Помилка автоматичного очищення: {e}")

if __name__ == '__main__':
    # Запускаємо очищення файлів у фоновому потоці
    cleanup_thread = threading.Thread(target=background_cleanup, daemon=True)
    cleanup_thread.start()
    
    print("🚀 Сервер запускається...")
    print("📁 Папка проекту:", os.getcwd())
    print("🔍 Перевірка Real-ESRGAN...")
    
    # Перевіряємо Real-ESRGAN
    if os.path.exists(REALESRGAN_PATH):
        print("✅ Real-ESRGAN знайдено")
    else:
        print("❌ Real-ESRGAN не знайдено. Використовуватимуться резервні методи.")
    
    port = int(os.environ.get('PORT', 5000))
    print(f"🌐 Сервер запускається на порті: {port}")
    print("⚡ Сервер готовий до роботи!")
    print("💾 Папка для файлів:", UPLOAD_FOLDER)
    
    app.run(host='0.0.0.0', port=port, debug=False)