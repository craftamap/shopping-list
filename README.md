# <img src="https://raw.githubusercontent.com/craftamap/shopping-list/master/static/icon.svg" width="32" height="32"> shopping-list 

This is my pet shopping-list project that I use daily. It's based on the 
[fresh framework](https://fresh.deno.dev/docs/introduction), using a sqlite 
database as it's storage.

## Development

The project requires a recent version of Deno.

Start the project:

```
deno task start
```

This will watch the project directory and restart as necessary.

## Production

For production use, I recommend the docker container attached to this 
repository. Make sure to create a volume for the database, which is located at
`/app/db.sqlite`.

If you do not want to use the container, you can still use the Dockerfile as 
reference on what's required to run the application.
