# =============================================================================
# CoTURN Dockerfile with Custom Entrypoint
# =============================================================================
FROM coturn/coturn:latest

# Install curl for IP detection
USER root
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Switch back to coturn user
USER nobody

# Expose ports
EXPOSE 3478 3478/udp 5349 5349/udp

# Use custom entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]

