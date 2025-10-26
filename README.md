# svaz.app

**Autonomous Monolith Video Communication Platform**

A self-hosted, resilient video calling and messaging platform with automatic failover to peer-to-peer mode when servers are unavailable.

## 🎯 Philosophy

- **Autonomous Monolith**: Single docker-compose deployment containing all services
- **Heavy Client, Light Backend**: 90% of logic in PWA client, backend only for "Normal Mode"
- **Dual-Mode Operation**: Seamless switching between server-based and P2P modes
- **Absolute Reliability**: Works even when servers are completely down

## 🏗️ Architecture

The system consists of 6 services orchestrated by docker-compose:

1. **Caddy** - Reverse proxy with automatic SSL (Let's Encrypt)
2. **Frontend** - Next.js 16 PWA with offline-first architecture
3. **API** - Fastify 4 backend for authentication and signaling
4. **Database** - PostgreSQL 16 for user data
5. **LiveKit** - SFU server for group calls and guest links
6. **CoTURN** - STUN/TURN server for NAT traversal

## 🚀 Quick Start

### One-Command Installation (Recommended)

Install svaz.app on any Linux server or macOS with a single command:

```bash
curl -fsSL https://raw.githubusercontent.com/geladons/svazapp/main/install.sh | bash
```

Or with wget:

```bash
wget -qO- https://raw.githubusercontent.com/geladons/svazapp/main/install.sh | bash
```

The installation script will:
- ✅ Check system requirements (RAM, disk space, CPU)
- ✅ Install dependencies (Docker, Docker Compose, Git)
- ✅ Configure firewall and ports
- ✅ Clone the repository
- ✅ Auto-generate all secrets and keys
- ✅ Deploy all services with docker-compose
- ✅ Run health checks
- ✅ Provide access credentials

**Supported Platforms**:
- Ubuntu 20.04+
- Debian 11+
- CentOS 8+
- Fedora 35+
- macOS 12+ (with Docker Desktop)

**Installation Options**:

```bash
# Advanced installation (interactive configuration)
curl -fsSL https://raw.githubusercontent.com/geladons/svazapp/main/install.sh | bash -s -- --advanced

# Custom installation directory
curl -fsSL https://raw.githubusercontent.com/geladons/svazapp/main/install.sh | bash -s -- --dir /custom/path

# Unattended installation (skip confirmations)
curl -fsSL https://raw.githubusercontent.com/geladons/svazapp/main/install.sh | bash -s -- --yes

# Specify domain and email
curl -fsSL https://raw.githubusercontent.com/geladons/svazapp/main/install.sh | bash -s -- --domain svaz.app --email admin@svaz.app
```

For detailed installation instructions and manual setup, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

### Manual Installation

If you prefer to install manually or need more control:

**Prerequisites**:
- Docker Engine 24.0+
- Docker Compose 2.20+
- A domain name with DNS pointing to your server
- Ports 80, 443, 3478, 5349 open on your firewall

**Steps**:

1. Clone the repository:
```bash
git clone https://github.com/geladons/svazapp.git
cd svazapp
```

2. Configure environment:
```bash
cp .env.example .env
nano .env  # Edit with your values
```

3. Generate LiveKit configuration:
```bash
# Replace placeholders in template
sed "s/{LIVEKIT_API_KEY}/your_api_key/g; s/{LIVEKIT_API_SECRET}/your_secret/g" \
    livekit/livekit.yaml.template > livekit/livekit.yaml
```

4. Start services:
```bash
docker compose up -d
```

5. Access your instance at `https://your-domain.com`

For complete manual installation guide, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 📱 Features

### Normal Mode (Server-Based)
- User authentication and contacts
- 1-on-1 video calls via WebRTC + Socket.io signaling
- Group video calls via LiveKit SFU
- Guest calls with shareable links
- Real-time chat messaging
- Call history

### Emergency Mode (P2P Fallback)
- Automatic detection when servers are unavailable
- Peer-to-peer video calls via WebTorrent signaling
- P2P chat via RTCDataChannel
- "Walkie-Talkie Mode" with persistent notification
- Offline-first data storage with Dexie.js
- Asymmetric mode support (one user online, one offline)

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI**: React 19.2 + Shadcn/ui + Tailwind CSS
- **PWA**: next-pwa 5.6
- **State**: Zustand 5
- **Local DB**: Dexie.js 4.2 (IndexedDB wrapper)
- **WebRTC**: Native API + livekit-client
- **P2P**: WebTorrent for signaling

### Backend
- **Framework**: Fastify 4
- **ORM**: Prisma 5
- **Database**: PostgreSQL 16
- **Real-time**: Socket.io 4.7
- **SFU**: LiveKit Server 2.x
- **TURN**: CoTURN

## 📂 Project Structure

```
svazapp/
├── docker-compose.yml          # Service orchestration
├── .env.example                # Environment template
├── frontend/                   # Next.js PWA
│   ├── app/                    # App Router pages
│   ├── components/             # React components
│   ├── lib/                    # Utilities
│   ├── hooks/                  # Custom hooks
│   ├── store/                  # Zustand stores
│   └── sw/                     # Service Worker
├── api/                        # Fastify backend
│   ├── src/
│   │   ├── routes/             # API routes
│   │   ├── services/           # Business logic
│   │   ├── plugins/            # Fastify plugins
│   │   └── prisma/             # Database schema
│   └── Dockerfile
├── caddy/                      # Caddy configuration
│   ├── Caddyfile
│   └── Dockerfile
└── docs/                       # Documentation
```

## 🔧 Development

### Local Development Setup

1. **Install dependencies**

```bash
# Frontend
cd frontend
npm install

# API
cd ../api
npm install
```

2. **Run in development mode**

```bash
# Start database only
docker compose up -d db

# Run API
cd api
npm run dev

# Run Frontend (in another terminal)
cd frontend
npm run dev
```

3. **Access locally**
- Frontend: http://localhost:3000
- API: http://localhost:8080

## 📖 Documentation

- [Design Philosophy](./design.md) - Core principles and architecture decisions
- [Technical Architecture](./tech_stack.md) - Detailed technology stack
- [User Flows](./User_flow.md) - User interaction flows and scenarios
- [Development Rules](./rules.md) - Coding standards and conventions
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment instructions
- [Development Guide](./DEVELOPMENT.md) - Local development setup and workflows

## 🔒 Security

- All passwords are hashed with bcrypt
- JWT-based authentication
- HTTPS enforced (automatic SSL via Let's Encrypt)
- CORS protection
- Rate limiting on API endpoints
- No chat history stored on server (client-side only)

## 📊 Monitoring

Check service health:

```bash
# View all services
docker compose ps

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f api
docker compose logs -f frontend
```

## 🆘 Troubleshooting

### SSL Certificate Issues
- Ensure ports 80 and 443 are open
- Verify DNS A record points to your server IP
- Check Caddy logs: `docker compose logs caddy`

### Database Connection Issues
- Verify DATABASE_URL in .env
- Check if db service is running: `docker compose ps db`
- Restart API: `docker compose restart api`

### Services Not Starting
- Check Docker logs: `docker compose logs`
- Verify .env file exists and has correct values
- Ensure no port conflicts on host machine

## 📄 License

[Your License Here]

## 🤝 Contributing

This is a private/self-hosted project. Contributions welcome via pull requests.

## 📧 Support

For issues and questions, please open an issue on the repository.

