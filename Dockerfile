# Stage 0: Test (run with: docker build --target test .)
FROM node:20-alpine AS test
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npx vitest run --coverage

# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npx vitest run && npm run build

# Stage 2: Serve
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
