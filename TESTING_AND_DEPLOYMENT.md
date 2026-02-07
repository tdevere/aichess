# Testing & Deployment README

## 🧪 Automated Testing

### Quick Start

```bash
# Run all tests via automated agent
npm run test:agent

# Run backend tests only
npm run test:backend

# Run E2E tests only (requires Docker stack running)
npm run test:e2e
```

### Test Agent

The **Test Agent** (`scripts/test-agent.js`) automates the entire testing workflow:

1. ✅ Starts Docker Compose stack
2. ✅ Waits for services to be healthy
3. ✅ Seeds test data (puzzles)
4. ✅ Runs backend integration tests (Jest)
5. ✅ Runs E2E tests (Playwright)
6. ✅ Generates test report
7. ✅ Cleans up Docker stack

**Usage**:
```bash
npm run test:agent

# Keep stack running after tests
KEEP_RUNNING=true npm run test:agent
```

### Test Coverage

#### Backend Integration Tests (`backend/src/__tests__/`)
- ✅ **Auth API**: Registration, login, token refresh, protected routes
- ✅ **Puzzle API**: Daily puzzle, random with filters, solve, stats, history
- ✅ **Bot API**: Profiles, game creation, move generation

#### Frontend E2E Tests (`frontend/tests/e2e/`)
- ✅ **Auth Flow**: Registration validation, login/logout, error handling
- ✅ **Puzzle Solving**: Load puzzle, use hints, show solution, retry, skip, filters
- ✅ **Game Navigation**: Play page, time controls, active games, bot selection

### Running Tests Locally

#### Backend Tests
```bash
cd backend
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

#### E2E Tests
```bash
# Start Docker stack first
docker compose up -d

# Wait for services
sleep 30

# Run Playwright tests
cd frontend
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific test file
npx playwright test tests/e2e/puzzles.spec.ts
```

---

## 🚀 Azure Deployment

### Prerequisites

- Azure CLI: `az login`
- Azure subscription with Contributor role
- GitHub repository with Actions enabled

### Step 1: Provision Infrastructure

```bash
# Run provisioning script
chmod +x .azure/provision.sh
./.azure/provision.sh
```

This creates:
- Container Registry (ACR)
- PostgreSQL Database (Burstable B1ms)
- Key Vault with secrets
- Backend Container App (0.5 vCore, WebSocket enabled)
- Frontend Container App (0.25 vCore)
- Application Insights

**Cost**: $46-71/month (under $75 budget)

### Step 2: Configure GitHub Secrets

Add to `Settings > Secrets and variables > Actions`:

```
AZURE_CREDENTIALS              # Service principal JSON
AZURE_REGISTRY_LOGIN_SERVER    # From provision output
AZURE_REGISTRY_USERNAME        # From provision output
AZURE_REGISTRY_PASSWORD        # From provision output
AZURE_RESOURCE_GROUP           # aichess-prod-rg
AZURE_BACKEND_APP              # aichess-prod-backend
AZURE_FRONTEND_APP             # aichess-prod-frontend
```

### Step 3: Initialize Database

```bash
# Connect to Azure PostgreSQL
PGPASSWORD='<from-keyvault>' psql \
  -h aichess-prod-db.postgres.database.azure.com \
  -U chessadmin \
  -d chess_db \
  -f backend/schema.sql
```

### Step 4: Deploy via GitHub Actions

```bash
git add .
git commit -m "Configure Azure deployment"
git push origin main
```

GitHub Actions will automatically:
1. Run all tests
2. Build Docker images
3. Push to Azure Container Registry
4. Deploy to Container Apps
5. Run smoke tests

### Manual Deployment

```bash
# Build and push images
az acr login --name aichessprodacr
docker build -t aichessprodacr.azurecr.io/backend:latest -f backend/Dockerfile .
docker push aichessprodacr.azurecr.io/backend:latest

docker build -t aichessprodacr.azurecr.io/frontend:latest -f frontend/Dockerfile .
docker push aichessprodacr.azurecr.io/frontend:latest

# Deploy
az containerapp update \
  --name aichess-prod-backend \
  --resource-group aichess-prod-rg \
  --image aichessprodacr.azurecr.io/backend:latest
```

---

## 📊 Monitoring

### View Logs
```bash
# Backend logs
az containerapp logs show \
  --name aichess-prod-backend \
  --resource-group aichess-prod-rg \
  --tail 100

# Stream live
az containerapp logs tail \
  --name aichess-prod-backend \
  --resource-group aichess-prod-rg \
  --follow
```

### Application Insights

Metrics automatically collected:
- HTTP request duration (p95, p99)
- Error rate
- Active WebSocket connections
- Database query performance

Access: Azure Portal → Application Insights → aichess-prod-insights

---

## 🔄 Blue-Green Deployment

```bash
# Deploy new version with label
az containerapp update \
  --name aichess-prod-backend \
  --resource-group aichess-prod-rg \
  --image aichessprodacr.azurecr.io/backend:v2 \
  --revision-suffix v2

# Route 10% traffic to new version
az containerapp ingress traffic set \
  --name aichess-prod-backend \
  --resource-group aichess-prod-rg \
  --revision-weight v1=90 v2=10

# If successful, shift all traffic
az containerapp ingress traffic set \
  --name aichess-prod-backend \
  --resource-group aichess-prod-rg \
  --revision-weight v2=100
```

---

## 📋 Quick Reference

### Local Development
```bash
npm run dev:backend    # Start backend dev server
npm run dev:frontend   # Start frontend dev server
npm run docker:up      # Start Docker stack
npm run docker:logs    # View container logs
```

### Testing
```bash
npm run test:agent     # Full automated test suite
npm run test:backend   # Backend integration tests
npm run test:e2e       # Playwright E2E tests
```

### Deployment
```bash
git push origin main   # Triggers CI/CD pipeline
```

### Azure Management
```bash
./.azure/provision.sh                    # Create infrastructure
az containerapp logs show ...            # View logs
az containerapp update ...               # Deploy new version
az consumption usage list ...            # Check costs
```

---

## 💰 Cost Tracking

**Estimated Monthly Cost**: $46-71

Breakdown:
- Container Registry: $5
- Container Apps (backend + frontend): $20-30
- PostgreSQL Burstable B1ms: $15-20
- Key Vault: $1
- Application Insights: $0-5
- **Redis (deferred)**: $15

**Budget Alert**: Set at $75/month in Azure Portal

---

## 📚 Documentation

- [Infrastructure Details](.azure/INFRASTRUCTURE.md)
- [Deployment Guide](.azure/DEPLOYMENT.md)
- [CI/CD Workflow](.github/workflows/ci-cd.yml)
- [Azure Deployment](.github/workflows/deploy-azure.yml)

---

## 🐛 Troubleshooting

**Tests failing?**
- Ensure Docker stack is running: `docker compose ps`
- Check service health: `curl http://localhost:5000/health`
- View backend logs: `docker compose logs backend`

**Deployment failing?**
- Verify GitHub secrets are set correctly
- Check Azure CLI is logged in: `az account show`
- Review GitHub Actions logs

**High costs?**
- Check current usage: `az consumption usage list --resource-group aichess-prod-rg`
- Scale down: Reduce min replicas to 0 for non-prod
- Defer Redis until traffic demands it

---

*For detailed instructions, see `.azure/DEPLOYMENT.md`*
