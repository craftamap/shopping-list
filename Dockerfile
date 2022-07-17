FROM denoland/deno

WORKDIR /app
ADD . / /app/
RUN deno cache main.ts

CMD deno run \
    --allow-env=DENO_DEPLOYMENT_ID,ESBUILD_BINARY_PATH,XDG_CACHE_HOME,HOME \
    --allow-net \
    --allow-read \
    --allow-write=db.sqlite,db.sqlite-journal,/root/.cache/esbuild/bin,/tmp \
    --allow-run \
    main.ts
