# Cross-Chain Messages

Cross-chain messaging enables communication between microchains in Linera. This is how applications transfer assets and synchronize state across chains.

## Overview

```
┌─────────────┐    Message    ┌─────────────┐
│  Chain A    │ ────────────► │  Chain B    │
│ (sender)    │               │ (receiver)  │
└─────────────┘               └─────────────┘
     │                              │
     │ execute_operation()          │ execute_message()
     │ prepare_message()            │
     │ send_to(chain_b)             │
     ▼                              ▼
```

---

## Sending Messages

### Basic Message Sending

In your contract's `execute_operation`:

```rust
async fn execute_operation(&mut self, operation: Operation) -> Response {
    match operation {
        Operation::CrossChainTransfer { target_chain, recipient, amount } => {
            // 1. Debit sender on this chain
            let sender = self.get_sender();
            self.debit(sender, amount).await;
            
            // 2. Prepare and send message
            self.runtime
                .prepare_message(Message::Credit { recipient, amount })
                .send_to(target_chain);
            
            Response::Ok
        }
    }
}
```

### Message Configuration

```rust
// Simple send
self.runtime
    .prepare_message(Message::Credit { to, amount })
    .send_to(target_chain);

// With authentication forwarding
self.runtime
    .prepare_message(Message::Credit { to, amount })
    .with_authentication()  // Forward caller's authentication
    .send_to(target_chain);

// With tracking (receive confirmation)
self.runtime
    .prepare_message(Message::Credit { to, amount })
    .with_tracking()  // Get notified when message is delivered
    .send_to(target_chain);
```

---

## Receiving Messages

### Basic Message Handling

```rust
async fn execute_message(&mut self, message: Message) {
    match message {
        Message::Credit { recipient, amount } => {
            // Credit tokens on this chain
            self.credit(recipient, amount).await;
        }
        
        Message::Notification { status } => {
            // Handle notification
            log::info!("Received notification: {:?}", status);
        }
    }
}
```

### Getting Message Context

```rust
async fn execute_message(&mut self, message: Message) {
    // Get the source of this message
    let message_id = self.runtime.message_id()
        .expect("Should have message ID");
    
    let source_chain = message_id.chain_id;
    let source_height = message_id.height;
    let source_index = message_id.index;
    
    // Check if message is bounced (rejected by target)
    let is_bounced = self.runtime.message_is_bouncing()
        .unwrap_or(false);
    
    match message {
        Message::Credit { recipient, amount } => {
            if is_bounced {
                // Message was rejected, refund the sender
                self.credit(self.get_original_sender(), amount).await;
            } else {
                self.credit(recipient, amount).await;
            }
        }
    }
}
```

---

## Message Types Design

### Simple Messages

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    /// Transfer credit to recipient
    Credit {
        recipient: AccountOwner,
        amount: u128,
    },
    
    /// Request balance from another chain
    BalanceRequest {
        requester_chain: ChainId,
        account: AccountOwner,
    },
    
    /// Response to balance request
    BalanceResponse {
        account: AccountOwner,
        balance: u128,
    },
}
```

### Complex Messages

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    /// Batch transfer
    BatchCredit {
        transfers: Vec<(AccountOwner, u128)>,
        metadata: TransferMetadata,
    },
    
    /// Cross-chain swap initiation
    SwapInitiate {
        offer: SwapOffer,
        sender: AccountOwner,
        expiry: Timestamp,
    },
    
    /// Cross-chain swap acceptance
    SwapAccept {
        swap_id: SwapId,
        acceptor: AccountOwner,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwapOffer {
    pub give_token: ApplicationId,
    pub give_amount: u128,
    pub want_token: ApplicationId,
    pub want_amount: u128,
}
```

---

## Cross-Chain Patterns

### 1. Simple Transfer

```rust
// Sender chain
Operation::Transfer { target_chain, to, amount } => {
    // Debit locally
    self.debit(sender, amount).await;
    
    // Credit on target
    self.runtime
        .prepare_message(Message::Credit { to, amount })
        .send_to(target_chain);
}

// Receiver chain
Message::Credit { to, amount } => {
    self.credit(to, amount).await;
}
```

### 2. Request-Response

```rust
// Requester chain
Operation::RequestData { target_chain } => {
    let my_chain = self.runtime.chain_id();
    
    self.runtime
        .prepare_message(Message::DataRequest { 
            reply_to: my_chain,
            query: "balance".to_string(),
        })
        .send_to(target_chain);
}

// Data provider chain
Message::DataRequest { reply_to, query } => {
    let data = self.get_data(&query).await;
    
    self.runtime
        .prepare_message(Message::DataResponse { query, data })
        .send_to(reply_to);
}

// Back on requester chain
Message::DataResponse { query, data } => {
    self.process_response(query, data).await;
}
```

### 3. Atomic Swap (Two-Phase)

```rust
// Phase 1: Lock on Chain A
Operation::InitiateSwap { chain_b, offer } => {
    let swap_id = self.generate_swap_id();
    
    // Lock tokens
    self.lock_tokens(sender, offer.give_amount, swap_id).await;
    
    // Notify Chain B
    self.runtime
        .prepare_message(Message::SwapProposal {
            swap_id,
            offer,
            initiator: sender,
            initiator_chain: self.runtime.chain_id(),
        })
        .send_to(chain_b);
}

// Phase 1: Accept on Chain B
Message::SwapProposal { swap_id, offer, initiator, initiator_chain } => {
    // Store pending swap
    self.state.pending_swaps.insert(&swap_id, PendingSwap {
        offer,
        initiator,
        initiator_chain,
        status: SwapStatus::Pending,
    }).await.unwrap();
}

Operation::AcceptSwap { swap_id } => {
    let swap = self.state.pending_swaps.get(&swap_id).await.unwrap().unwrap();
    
    // Lock acceptor's tokens
    self.lock_tokens(sender, swap.offer.want_amount, swap_id).await;
    
    // Confirm to Chain A
    self.runtime
        .prepare_message(Message::SwapAccepted {
            swap_id,
            acceptor: sender,
        })
        .send_to(swap.initiator_chain);
}

// Phase 2: Execute on Chain A
Message::SwapAccepted { swap_id, acceptor } => {
    let swap = self.state.locked_swaps.get(&swap_id).await.unwrap().unwrap();
    
    // Release locked tokens to acceptor
    self.release_to(swap_id, acceptor, swap.give_amount).await;
    
    // Notify Chain B to release
    self.runtime
        .prepare_message(Message::SwapExecute { swap_id })
        .send_to(/* chain_b */);
}
```

---

## Error Handling

### Bouncing Messages

When a message cannot be processed, it can "bounce" back:

```rust
async fn execute_message(&mut self, message: Message) {
    if self.runtime.message_is_bouncing().unwrap_or(false) {
        // This message bounced - handle the failure
        match message {
            Message::Credit { recipient, amount } => {
                // Refund the original sender
                // (recipient was the intended target, now we need to reverse)
                self.handle_bounce_refund(amount).await;
            }
        }
        return;
    }
    
    // Normal message processing
    match message {
        Message::Credit { recipient, amount } => {
            if !self.can_credit(&recipient) {
                panic!("Cannot credit - message will bounce");
            }
            self.credit(recipient, amount).await;
        }
    }
}
```

### Validation Before Sending

```rust
Operation::Transfer { target_chain, to, amount } => {
    // Validate before sending
    let balance = self.get_balance(&sender).await;
    assert!(balance >= amount, "Insufficient balance");
    
    // Validate target chain (if known chains)
    assert!(self.is_valid_target(&target_chain), "Invalid target chain");
    
    self.debit(sender, amount).await;
    
    self.runtime
        .prepare_message(Message::Credit { to, amount })
        .send_to(target_chain);
}
```

---

## Message Ordering

Messages are delivered in order per source chain:

```rust
// Chain A sends:
self.runtime.prepare_message(Message::First).send_to(chain_b);
self.runtime.prepare_message(Message::Second).send_to(chain_b);
self.runtime.prepare_message(Message::Third).send_to(chain_b);

// Chain B receives in order:
// 1. Message::First
// 2. Message::Second  
// 3. Message::Third
```

However, messages from different chains may interleave.

---

## Best Practices

### 1. Idempotent Message Handlers

```rust
Message::Credit { id, recipient, amount } => {
    // Check if already processed
    if self.state.processed_messages.contains(&id).await.unwrap() {
        return; // Already processed, skip
    }
    
    self.credit(recipient, amount).await;
    self.state.processed_messages.insert(&id).await.unwrap();
}
```

### 2. Include Sufficient Context

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreditMessage {
    pub id: MessageId,           // Unique identifier
    pub recipient: AccountOwner, // Who receives
    pub amount: u128,            // How much
    pub source_tx: TxId,         // Original transaction
    pub timestamp: u64,          // When initiated
}
```

### 3. Handle All Edge Cases

```rust
async fn execute_message(&mut self, message: Message) {
    // Check bounce first
    if self.runtime.message_is_bouncing().unwrap_or(false) {
        self.handle_bounced_message(message).await;
        return;
    }
    
    // Validate message source if needed
    let source = self.runtime.message_id().unwrap().chain_id;
    if !self.is_trusted_source(&source) {
        panic!("Untrusted message source");
    }
    
    // Process message
    self.process_message(message).await;
}
```
