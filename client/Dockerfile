# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:22-alpine
ARG NGINX_IMAGE=nginx:stable-alpine

# --- build static bundle ---
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
# Fail the image build if the production bundle exceeds the 200 KB gzip budget.
RUN npm run size

# --- serve with nginx ---
FROM ${NGINX_IMAGE} AS runtime
ENV API_UPSTREAM=http://backend:8080
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
