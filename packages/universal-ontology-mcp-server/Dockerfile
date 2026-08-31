# The release manifest pins this multi-platform index. Never replace it with a
# floating tag: amd64 and arm64 release images must resolve from one identity.
FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e

LABEL org.opencontainers.image.title="Universal Ontology MCP Server" \
      org.opencontainers.image.licenses="MIT" \
      io.modelcontextprotocol.server.name="io.github.hadden-industries/universal-ontology"

WORKDIR /opt/universal-ontology-mcp-server
COPY --chown=node:node dist/universal-ontology-mcp-server.mjs ./server.mjs
COPY --chown=node:node LICENSE README.md THIRD_PARTY_NOTICES.md ./

# The stdio process needs no root privileges or listening port. Only its
# content-addressed ontology artifact cache is expected to remain writable.
USER node:node
VOLUME ["/home/node/.cache/universal-ontology-mcp-server/v1"]
STOPSIGNAL SIGTERM
ENTRYPOINT ["node", "/opt/universal-ontology-mcp-server/server.mjs"]
