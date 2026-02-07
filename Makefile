.PHONY: up down restart logs shell migrate install
ARGS = $(filter-out $@,$(MAKECMDGOALS))

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart web

logs:
	docker compose logs -f web

shell:
	docker compose exec web sh

migrate:
	docker compose exec web npx prisma migrate dev

db-push:
	docker compose exec web npx prisma db push

install:
	docker compose exec web npm install $(ARGS)

proxy-off:
	docker compose stop cloud-sql-proxy

proxy-on:
	docker compose up -d cloud-sql-proxy

%:
	@: