# Stage 0: Test (run with: docker build --target test .)
FROM node:22-alpine AS test
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx vitest run --coverage

# Stage 1: Build
# Pass the version in: docker build --build-arg APP_VERSION=0.1.$(git rev-list --count HEAD) .
FROM node:22-alpine AS build
ARG APP_VERSION=0.0.0-dev
ENV APP_VERSION=$APP_VERSION

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx vitest run && npm run build

# Stage 2: Serve
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
