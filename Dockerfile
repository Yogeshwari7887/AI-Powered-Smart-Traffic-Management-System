# Use Python 3.10 slim (compatible with torch 2.1.0)
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Prevent Python buffering issues
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV OMP_NUM_THREADS=1

# Install system dependencies for OpenCV and Torch
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Upgrade pip and install Python dependencies
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files
COPY . .

# Expose port (Render uses PORT environment variable automatically)
EXPOSE 10000

# Start Flask app with Gunicorn
CMD ["gunicorn", "app:app"]
