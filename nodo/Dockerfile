# Banco remoto: el mismo motor que el teléfono (mobile/src/core/credito).
# zod queda en /app/node_modules para que schemas.ts lo resuelva.
FROM node:22-bookworm-slim
WORKDIR /app
RUN npm install zod@4.5.4
COPY nodo/index.mjs nodo/credito.mjs ./nodo/
COPY mobile/src/core ./mobile/src/core
ENV ROL=banco
ENV SKIP_P2P=1
WORKDIR /app/nodo
CMD ["node", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "index.mjs"]
