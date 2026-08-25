# L33tSaaS supermarket — root context for Fly
FROM python:3.12-slim
WORKDIR /app

COPY store/ /app/store/
COPY saas_output/ /app/saas_output/
COPY saas_pipeline_state/ /app/saas_pipeline_state/
COPY vault/ /app/vault/
COPY brand/ /app/brand/
COPY quality/ /app/quality/

ENV PORT=8080
ENV SAAS_OUTPUT_DIR=/app/saas_output
ENV SAAS_STATE_DIR=/app/saas_pipeline_state
ENV PYTHONUNBUFFERED=1

EXPOSE 8080
CMD ["python", "store/app.py"]
