# Stage 0: Test (run with: docker build --target test .)
FROM docker.io/library/node:22-alpine AS test
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx vitest run --coverage

# Stage 1: Build
# Pass the version in: docker build --build-arg APP_VERSION=0.1.$(git rev-list --count HEAD) .
FROM docker.io/library/node:22-alpine AS build
ARG APP_VERSION=0.0.0-dev
ENV APP_VERSION=$APP_VERSION

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx vitest run && npm run build

# Static HTTP probe for HEALTHCHECK (no shell, curl, or wget in the runtime image).
FROM docker.io/library/golang:1.22-alpine AS healthcheck
WORKDIR /src
COPY docker/healthcheck/main.go .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /healthcheck main.go

# Stage 2: Serve (Docker Hardened Images nginx — distroless runtime, UID 65532, port 8080)
# Authenticate before build: docker login dhi.io
FROM dhi.io/nginx:1.30-alpine3.23

COPY --chown=65532:65532 nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=65532:65532 /app/dist /usr/share/nginx/html
COPY --from=healthcheck --chmod=755 --chown=65532:65532 /healthcheck /usr/local/bin/healthcheck

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["/usr/local/bin/healthcheck"]
