# Degree descriptions pipeline: deps only; scripts run from mounted volume.
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Scripts (config, pipeline, merge, etc.) come from the host via mount -v .../degree-descriptions:/app
# No ENTRYPOINT/CMD: run with e.g.  docker run ... degree-desc python pipeline.py
ENV DEGREES_JSON=/data/src/data/degrees.json \
    OUTPUT_DIR=/app/output
