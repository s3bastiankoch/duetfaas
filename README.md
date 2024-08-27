# Duet FaaS

```sh
pnpm install
```

```sh
pnpm setup:duet
```

```sh
artillery run ./loadtest.yml --output report.json
```

```sh
pnpm teardown:duet
```

# Traditional FaaS

```sh
pnpm install
```

```sh
pnpm setup:classic
```

```sh
artillery run ./loadtest.classic.yml --output report.json
```

```sh
pnpm teardown:classic
```

## Firecracker Duet FaaS

Refer to `infrastructure/firecracker/lambda/README.md`
