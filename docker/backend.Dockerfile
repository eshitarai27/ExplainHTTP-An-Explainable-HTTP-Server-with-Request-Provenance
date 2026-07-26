# ExplainHTTP backend: pure standard-library Python, no runtime dependencies.
FROM python:3.12-slim

WORKDIR /app/backend

COPY backend/ .

ENV EXPLAINHTTP_HOST=0.0.0.0 \
    EXPLAINHTTP_PORT=8080 \
    PYTHONUNBUFFERED=1

EXPOSE 8080

CMD ["python", "server.py"]
