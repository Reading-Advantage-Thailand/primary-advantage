.PHONY: up down restart logs shell migrate install
ARGS = $(filter-out $@,$(MAKECMDGOALS))

up:
	docker compose up -d

up-web:
	docker compose up web -d

down:
	docker compose down

down-web:
	docker compose down web	

restart:
	docker compose restart web

ิีbuild:
	docker compose build web

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

db:
	docker compose exec -it web npx prisma studio --hostname 0.0.0.0

db-reset-skip-seed:
	docker compose exec web npx prisma migrate reset --skip-seed

%:
	@: