FROM public.ecr.aws/lambda/nodejs:20-arm64 as builder
WORKDIR /usr/app

COPY package.json  ./
COPY index.ts ./index.ts
COPY lambda_a ./lambda_a
COPY lambda_b ./lambda_b
RUN npm install
RUN npm run build
    
FROM public.ecr.aws/lambda/nodejs:20-arm64
WORKDIR ${LAMBDA_TASK_ROOT}
COPY --from=builder /usr/app/dist/* ./

ARG N=0
ENV N_ITERATIONS=$N

CMD ["index.handler"]