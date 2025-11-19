FROM python:3.11-slim

# Встановлюємо системні залежності для Pillow та OpenCV
RUN apt-get update && apt-get install -y \
    libtiff6 \
    libjpeg62-turbo \
    libopenjp2-7 \
    libwebp7 \
    zlib1g \
    libopencv-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копіюємо requirements та встановлюємо залежності
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копіюємо код
COPY . .

CMD ["gunicorn", "server:app", "-b", "0.0.0.0:8000"]
