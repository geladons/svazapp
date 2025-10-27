FROM caddy:2-alpine

# Copy Caddyfile and template
COPY Caddyfile /etc/caddy/Caddyfile
COPY Caddyfile.template /etc/caddy/Caddyfile.template

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose ports
EXPOSE 80 443 443/udp 2019

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:2019/config/ || exit 1

# Set entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]

