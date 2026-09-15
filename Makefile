# Staff Pulse — build, test and run shortcuts. `make help` lists the targets.

COMPOSE ?= docker compose
CLIENT_PORT ?= $(shell grep -s "^CLIENT_PORT=" .env | cut -d= -f2)

.DEFAULT_GOAL := help
.PHONY: help build-server build-client build test-server test-client test start stop logs

help: ## Show this help
	@grep -E "^[a-zA-Z_-]+:.*## " $(MAKEFILE_LIST) | awk -F ":.*## " '{ printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2 }'

# Dependencies are (re)installed only when node_modules is missing or the lockfile changed.
backend/node_modules: backend/package-lock.json
	cd backend && npm ci
	@touch $@

client/node_modules: client/package-lock.json
	cd client && npm ci
	@touch $@

build-server: backend/node_modules ## Compile the backend to backend/dist
	cd backend && npm run build

build-client: client/node_modules ## Build the client to client/dist and check the 200 KB gzip budget
	cd client && npm run build && npm run size

build: build-server build-client ## Build everything: backend, client and production Docker images
	$(COMPOSE) build

test-server: backend/node_modules ## Backend: typecheck + unit, integration and contract tests
	cd backend && npm run typecheck && npm test

test-client: client/node_modules ## Client: typecheck + lint + tests
	cd client && npm run typecheck && npm run lint && npm test

test: test-server test-client ## Run all tests

start: ## Start the app in Docker (builds images if needed)
	$(COMPOSE) up -d --build
	@echo "Staff Pulse is running: http://localhost:$(or $(CLIENT_PORT),5173)"

stop: ## Stop and remove the containers
	$(COMPOSE) down

logs: ## Follow logs of both services
	$(COMPOSE) logs -f
