# All commands run inside Docker. No local Node.js required.

.PHONY: dev app build install preview

# Development server (hot reload)
dev:
	docker compose up dev

# Production: build image and serve on :8080
app:
	docker compose up --build app

# Install dependencies (in container; writes to mounted volume)
install:
	docker compose run --rm dev sh -c "npm install"

# Build for production (in container)
build:
	docker compose run --rm dev sh -c "npm install && npm run build"

# Preview production build locally (serves on :4173)
preview: build
	docker compose run --rm -p 4173:4173 dev sh -c "npm run preview -- --host"
