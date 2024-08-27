# Simple Request Queue

A very simple request queue that solves the problem of concurrency in emulated lambda functions.

```sh
docker build -t request-queue:latest .
```

```sh
docker run -d -p 80:80 -e LAMBDA1_ADDRESS=http://192.168.1.2:8080/2015-03-31/functions/function/invocations -e LAMBDA2_ADDRESS=http://192.168.1.3:8080/2015-03-31/functions/function/invocations --name request-queue request-queue:latest
```
