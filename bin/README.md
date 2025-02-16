# Top-Level Bin Directory

## `dev` Command

The `dev` command is a helper for using docker compose.

For example, you can run a build via

```bash
dev build
```

And it will output and then execute:
```bash
Running: cd ~/klondikemarlen/express-light-rail && docker compose -f docker-compose.development.yaml build
```
