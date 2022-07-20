FROM denoland/deno
LABEL org.opencontainers.image.source="https://github.com/craftamap/shopping-list"

WORKDIR /app
ADD . / /app/
RUN deno cache main.ts

CMD DENO_DEPLOYMENT_ID=LOCAL deno run \
    --allow-env=DENO_DEPLOYMENT_ID,ESBUILD_BINARY_PATH,XDG_CACHE_HOME,HOME \
    --allow-net \
    --allow-read \
    --allow-write=db.sqlite,db.sqlite-journal,/root/.cache/esbuild/bin,/tmp \
    --allow-run \
    main.ts
