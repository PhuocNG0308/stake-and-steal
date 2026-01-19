# Running a Local Development Network (Devnet)

Guide for setting up and running a local Linera development network for testing.

## Quick Start

### Using `linera net up`

The simplest way to start a local devnet:

```bash
# Start local network with default settings
linera net up

# Start with specific number of validators
linera net up --validators 4

# Start with specific number of shards
linera net up --shards 2
```

This command:
1. Starts local validators
2. Creates a genesis configuration
3. Sets up initial chains
4. Configures your wallet to connect

---

## Docker Compose Setup

### Prerequisites

- Docker Desktop
- Docker Compose v2+

### docker-compose.yml

```yaml
version: '3.8'

services:
  # Storage service
  storage:
    image: linera-protocol/storage-service:latest
    ports:
      - "8942:8942"
    volumes:
      - storage-data:/data
    command: ["--storage", "rocksdb:/data"]

  # Validator 1
  validator-1:
    image: linera-protocol/linera-server:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    depends_on:
      - storage
    environment:
      - RUST_LOG=info
    command: [
      "run",
      "--storage", "service:http://storage:8942",
      "--genesis", "/config/genesis.json",
      "--server", "0.0.0.0:9000",
      "--metrics", "0.0.0.0:9001"
    ]
    volumes:
      - ./config:/config

  # Validator 2
  validator-2:
    image: linera-protocol/linera-server:latest
    ports:
      - "9010:9000"
      - "9011:9001"
    depends_on:
      - storage
    environment:
      - RUST_LOG=info
    command: [
      "run",
      "--storage", "service:http://storage:8942",
      "--genesis", "/config/genesis.json",
      "--server", "0.0.0.0:9000",
      "--metrics", "0.0.0.0:9001"
    ]
    volumes:
      - ./config:/config

  # Node service (GraphQL API)
  node-service:
    image: linera-protocol/linera-service:latest
    ports:
      - "8080:8080"
    depends_on:
      - validator-1
      - validator-2
    environment:
      - RUST_LOG=info
    command: [
      "--storage", "service:http://storage:8942",
      "--port", "8080"
    ]

volumes:
  storage-data:
```

### Starting the Network

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop network
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

---

## Kubernetes with Kind

### Prerequisites

- Docker
- kubectl
- Kind (Kubernetes in Docker)

### Create Kind Cluster

```bash
# Create cluster
kind create cluster --name linera-dev

# Verify
kubectl cluster-info --context kind-linera-dev
```

### Kubernetes Manifests

```yaml
# k8s/storage.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: linera-storage
spec:
  replicas: 1
  selector:
    matchLabels:
      app: linera-storage
  template:
    metadata:
      labels:
        app: linera-storage
    spec:
      containers:
      - name: storage
        image: linera-protocol/storage-service:latest
        ports:
        - containerPort: 8942
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: storage-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: linera-storage
spec:
  selector:
    app: linera-storage
  ports:
  - port: 8942
    targetPort: 8942
```

```yaml
# k8s/validators.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: linera-validator
spec:
  serviceName: linera-validators
  replicas: 4
  selector:
    matchLabels:
      app: linera-validator
  template:
    metadata:
      labels:
        app: linera-validator
    spec:
      containers:
      - name: validator
        image: linera-protocol/linera-server:latest
        ports:
        - containerPort: 9000
        - containerPort: 9001
        env:
        - name: RUST_LOG
          value: "info"
        args:
        - "run"
        - "--storage"
        - "service:http://linera-storage:8942"
        - "--genesis"
        - "/config/genesis.json"
```

### Deploy

```bash
# Apply manifests
kubectl apply -f k8s/

# Check status
kubectl get pods

# Port forward for local access
kubectl port-forward svc/linera-node-service 8080:8080
```

---

## Manual Setup

### Start Storage Service

```bash
linera-storage-service \
  --storage rocksdb:./storage-data \
  --listen 127.0.0.1:8942
```

### Generate Genesis

```bash
linera net generate \
  --validators 4 \
  --shards 1 \
  --output ./genesis
```

### Start Validators

```bash
# Terminal 1
linera-server run \
  --storage service:http://127.0.0.1:8942 \
  --genesis ./genesis/genesis.json \
  --server 127.0.0.1:9000

# Terminal 2
linera-server run \
  --storage service:http://127.0.0.1:8942 \
  --genesis ./genesis/genesis.json \
  --server 127.0.0.1:9010

# ... repeat for more validators
```

### Start Node Service

```bash
linera service \
  --storage service:http://127.0.0.1:8942 \
  --port 8080
```

---

## Wallet Configuration

### Connect to Local Network

```bash
# Initialize wallet for local network
linera wallet init \
  --genesis ./genesis/genesis.json \
  --with-new-chain

# Or connect to existing local network
linera wallet init \
  --faucet http://localhost:8080/faucet
```

### Verify Connection

```bash
# Show wallet info
linera wallet show

# Check chain balance
linera query-balance
```

---

## Development Workflow

### 1. Start Network

```bash
# Quick start
linera net up

# Or with Docker
docker-compose up -d
```

### 2. Initialize Wallet

```bash
linera wallet init --with-new-chain --faucet http://localhost:8080/faucet
```

### 3. Deploy Application

```bash
cd my-app
linera project publish-and-create
```

### 4. Start Frontend

```bash
cd frontend
npm run dev
```

### 5. Test and Iterate

```bash
# View logs
linera net logs

# Reset network (if needed)
linera net down
linera net up
```

---

## Useful Commands

### Network Management

```bash
# Check network status
linera net status

# View validator logs
linera net logs validator-1

# Restart specific service
linera net restart node-service

# Stop network
linera net down
```

### Chain Management

```bash
# Create additional chains
linera open-chain

# List chains
linera wallet show

# Request test tokens
linera wallet request-tokens
```

### Application Management

```bash
# List deployed applications
linera wallet show-applications

# Query application
linera query --app <app_id> "{ value }"
```

---

## Troubleshooting

### Network Won't Start

```bash
# Check if ports are in use
lsof -i :8080
lsof -i :9000

# Kill existing processes
pkill linera-server
pkill linera-service
```

### Storage Issues

```bash
# Clear storage and restart
rm -rf ./storage-data
linera net up
```

### Validator Sync Issues

```bash
# Restart validators
linera net restart

# Check validator health
curl http://localhost:9001/health
```

### Wallet Connection Issues

```bash
# Reinitialize wallet
rm -rf ~/.linera
linera wallet init --with-new-chain --faucet http://localhost:8080/faucet
```
