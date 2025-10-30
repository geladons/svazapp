# =============================================================================
# CoTURN Dockerfile with Custom Entrypoint
# =============================================================================
FROM coturn/coturn:latest

# Install curl and coreutils (for timeout command) for IP detection
USER root
RUN apt-get update && apt-get install -y curl coreutils && rm -rf /var/lib/apt/lists/*

# Create directory for config and set permissions
RUN mkdir -p /etc/coturn && chmod 755 /etc/coturn

# Copy turnserver.conf.template to container
COPY turnserver.conf.template /etc/coturn/turnserver.conf.template

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# NOTE: We stay as root user because entrypoint needs to write to /etc/coturn/
# The turnserver process itself will drop privileges automatically

# Expose ports
EXPOSE 3478 3478/udp 5349 5349/udp

# Use custom entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]

