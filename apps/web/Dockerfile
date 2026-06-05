FROM node:22-alpine AS builder
WORKDIR /app
RUN npm i -g pnpm
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @confess/web run build

FROM node:22-alpine
WORKDIR /app
RUN npm i -g pnpm
COPY --from=builder /app ./
EXPOSE 3000
CMD ["pnpm", "--filter", "@confess/web", "run", "start"]
