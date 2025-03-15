build-frontend:
    cd frontend && yarn build

build-backend: build-frontend
    go build

build: build-backend
