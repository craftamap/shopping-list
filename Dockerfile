FROM node:22 AS frontend

COPY frontend /app/frontend
WORKDIR /app/frontend
RUN ["yarn", "install"]
RUN ["yarn", "build"]

FROM golang AS backend

WORKDIR /app
COPY . .
COPY --from=frontend /app/frontend/dist /app/frontend/dist
RUN ["go", "get"]
RUN ["go", "build", "-v"]

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=backend /app/shopping-list /app/shopping-list

ENTRYPOINT ["./shopping-list"]
CMD ["serve"]
