# Subject: Technical Integration & Data Migration Pipeline Deployment Guide

Dear IT Director,

I hope this email finds you well.

As part of the legacy data migration from GlobalHealth Corp to the SHC Platform, we have developed a secure, fault-tolerant ingestion pipeline tailored to your on-premise infrastructure.

### 1. How to Build & Run the Container
You can run this container directly within your on-premise Docker environment:

```bash
# Build the production Docker image
docker build -t globalhealth-ingestion-pipeline:1.0 .

# Run the container with your configuration
docker run --rm \
  -e API_BASE_URL="[https://api.mock-shc.com/v1/patients](https://api.mock-shc.com/v1/patients)" \
  -e API_BEARER_TOKEN="your_secure_bearer_token" \
  -e BATCH_SIZE=100 \
  -v $(pwd)/data:/app/data \
  globalhealth-ingestion-pipeline:1.0