FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Copy data and models into expected locations
COPY data/ /app/data/
COPY models/ /app/models/

EXPOSE 8000

CMD ["sh", "-c", "uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000}"]
