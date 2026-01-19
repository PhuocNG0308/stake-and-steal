# Microchains in Linera

## Background

A **microchain** is a chain of blocks describing successive changes to a shared state. Linera microchains are similar to the familiar notion of blockchain, with the following important specificities:

- **Unlimited microchains**: An arbitrary number of microchains can coexist in a Linera network, all sharing the same set of validators and the same level of security
- **Lightweight creation**: Creating a new microchain only takes one transaction on an existing chain
- **Flexible block proposers**: The task of proposing new blocks in a microchain can be assumed either by validators or by end users depending on the configuration

### Types of Microchains

| Type | Description | Block Proposer |
|------|-------------|----------------|
| **Single-owner** | Owned by one user | Chain owner |
| **Multi-owner** | Shared between users | Multiple owners |
| **Public** | Infrastructure chains | Validators |

## Cross-chain messaging

In traditional networks with a single blockchain, every transaction can access the application's entire execution state. This is not the case in Linera where the state of an application is spread across multiple microchains.

### How messages work

1. When an application on one chain sends a message to itself on another chain, a **cross-chain request** is created
2. These requests are implemented using remote procedure calls (RPCs) within the validators' internal network
3. Messages are placed first in the target chain's **inbox**
4. When an owner of the target chain creates its next block, they reference messages from the inbox
5. This executes the selected messages and applies them to the chain state

### Message flow example

```
                           ┌───┐     ┌───┐     ┌───┐
                   Chain A │   ├────►│   ├────►│   │
                           └───┘     └───┘     └───┘
                                                 ▲
                                       ┌─────────┘
                                       │
                           ┌───┐     ┌─┴─┐     ┌───┐
                   Chain B │   ├────►│   ├────►│   │
                           └───┘     └─┬─┘     └───┘
                                       │         ▲
                                       │         │
                                       ▼         │
                           ┌───┐     ┌───┐     ┌─┴─┐
                   Chain C │   ├────►│   ├────►│   │
                           └───┘     └───┘     └───┘
```

> The Linera protocol allows receivers to discard messages but not to change the ordering of selected messages inside the communication queue between two chains.

## Chain ownership semantics

Active chains can have one or multiple owners. Chains with zero owners are permanently deactivated.

### Validators guarantee safety
On each chain, at each height, there is at most one unique block.

### Liveness relies on owners
There are different types of rounds and owners:

1. **Fast round** (optional): A super owner can propose blocks with very low latency - optimal for single-owner chains with no contention

2. **Multi-leader rounds**: All regular owners can propose blocks - works well with occasional, temporary contention

3. **Single-leader rounds**: Each regular chain owner gets a time slot in which only they can propose a new block - ideal for chains with many concurrent users

> The number of multi-leader rounds is configurable, allowing the system to dynamically switch to single-leader mode during periods of high contention.

## Creating and Managing Chains

### Creating a new chain

```bash
linera open-chain
```

### Creating a chain for another wallet

```bash
# Wallet 2 creates an unassigned keypair
linera --wallet wallet2.json keygen
# Output: 6443634d872afbbfcc3059ac87992c4029fa88e8feb0fff0723ac6c914088888

# Wallet 1 opens a chain for wallet 2
linera open-chain --to-public-key 6443634d872afbbfcc3059ac87992c4029fa88e8feb0fff0723ac6c914088888

# Wallet 2 assigns the chain
linera --wallet wallet2.json assign --key 6443634d872afbbfcc3059ac87992c4029fa88e8feb0fff0723ac6c914088888 --message-id <message-id>
```

### Creating a multi-owner chain

```bash
linera open-multi-owner-chain \
    --chain-id <chain-id> \
    --owner-public-keys <pubkey1> <pubkey2> \
    --multi-leader-rounds 2
```

## Reference

For a more formal treatment refer to the [Linera Whitepaper](https://linera.io/whitepaper).
