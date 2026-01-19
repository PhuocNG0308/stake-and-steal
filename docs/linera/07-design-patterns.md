# Common Design Patterns for Linera Applications

## Applications with only user chains

Some applications such as payments only require user chains, hence are **fully horizontally scalable**.

```
Validators
    │
    ▼
┌─────────────┐    initiates transfer    ┌─────────────┐
│ user chain 1│ ────────────────────────► │ user chain 2│
└─────────────┘    sends assets          └─────────────┘
       ▲                                        │
       │              notifies                  │
       └────────────────────────────────────────┘
```

**Example:** [fungible demo application](https://github.com/linera-io/linera-protocol/tree/main/examples/fungible)

---

## Client/server applications

Pre-existing applications (e.g. written in Solidity) generally run on a single chain for all users. Those can be embedded in an **app chain** to act as a service.

```
Validators
    │
    ▼
┌─────────────┐                          ┌─────────────┐
│ user chain 1│ ──initiates request────► │  app chain  │
└─────────────┘                          └─────────────┘
       ▲           sends request              │
       │                                      │
       │           sends response             │
       │◄─────────────────────────────────────┘
```

> Depending on the application, blocks produced in the app chain may be restricted to only contain messages (no operations) to ensure block producers have no influence other than selecting incoming messages.

**Example:** [crowd-funding demo application](https://github.com/linera-io/linera-protocol/tree/main/examples/crowd-funding)

---

## Using personal chains to scale applications

User chains can also help applications scale horizontally by taking work out of the app chains.

### Benefits of personal chains:

- Validating ZK proofs
- Sending web queries to external oracle services (e.g. AI inference)
- Downloading data blobs from external data availability layers
- Computing app-specific invariants

```
Microchains
    │
    ▼
┌─────────────┐   submits ZK proof     ┌─────────────┐
│ user chain 1│ ─────────────────────► │ airdrop chain│
└─────────────┘   sends trusted msg    └─────────────┘
                  "ZK proof is valid"
```

**Example:** [airdrop demo application](https://github.com/linera-io/airdrop-demo)

---

## Using temporary chains to scale applications

Temporary chains can be created on demand and configured to accept blocks from specific users.

### Use case: Games/Tournaments

```
                         ┌───────────────────┐
                         │ tournament app    │
                         │      chain        │
                         └─────────┬─────────┘
                                   │
              creates              │              creates
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ temporary game  │    │ temporary game  │    │ temporary game  │
│    chain 1      │    │    chain 2      │    │    chain 3      │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
    plays│                 plays│                 plays│
         ▼                      ▼                      ▼
    user chain 1           user chain 2           user chain 3
```

**Example:** [hex-game demo application](https://github.com/linera-io/linera-protocol/tree/main/examples/hex-game)

---

## Just-in-time oracles

Linera clients are connected and don't rely on external RPC providers. This enables on-chain applications to query certain clients in real time.

### AI Oracle Architecture

```
┌─────────────┐                    ┌─────────────┐
│ Oracle TEE  │                    │  Validators │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │ oracle response                  │ notifies
       │                                  │
       ▼                                  ▼
┌─────────────┐   oracle query    ┌─────────────┐
│ oracle chain│ ◄────────────────  │  app chain  │
└──────┬──────┘                    └─────────────┘
       │
       │ submit response
       ▼
┌─────────────┐
│oracle client│ ──────► AI oracle ──────► Web
└─────────────┘
```

Clients may run an AI oracle off-chain in a trusted execution environment (TEE), allowing on-chain applications to extract important information from the Internet.
