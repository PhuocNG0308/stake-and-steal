# Application State (Views)

Linera uses a **View** system for persistent state management on the microchains. Views are similar to ORM models but optimized for blockchain state.

## Overview

Views provide:
- Persistent storage that survives between block executions
- Automatic serialization/deserialization
- Efficient delta-based updates
- Type-safe state access

---

## Core View Types

### RegisterView

Stores a single value of type `T`:

```rust
use linera_sdk::views::{RegisterView, View};

#[derive(RootView, async_graphql::SimpleObject)]
#[view(context = "ViewStorageContext")]
pub struct MyState {
    pub counter: RegisterView<u64>,
    pub name: RegisterView<String>,
}

// Usage:
impl Contract for MyContract {
    async fn execute_operation(&mut self, operation: Operation) {
        // Get current value
        let current = *self.state.counter.get();
        
        // Set new value
        self.state.counter.set(current + 1);
    }
}
```

### LogView

An append-only log for storing sequences:

```rust
use linera_sdk::views::{LogView, View};

#[derive(RootView)]
#[view(context = "ViewStorageContext")]
pub struct MyState {
    pub events: LogView<Event>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub timestamp: u64,
    pub action: String,
}

// Usage:
async fn log_event(&mut self, action: String) {
    let event = Event {
        timestamp: self.runtime.system_time().micros(),
        action,
    };
    self.state.events.push(event);
}

// Reading:
async fn get_recent_events(&self, count: usize) -> Vec<Event> {
    self.state.events.read(..count).await.unwrap()
}
```

### QueueView

A FIFO queue for processing items in order:

```rust
use linera_sdk::views::{QueueView, View};

#[derive(RootView)]
#[view(context = "ViewStorageContext")]
pub struct MyState {
    pub pending_tasks: QueueView<Task>,
}

// Usage:
async fn add_task(&mut self, task: Task) {
    self.state.pending_tasks.push_back(task);
}

async fn process_next(&mut self) -> Option<Task> {
    self.state.pending_tasks.pop_front().await.ok().flatten()
}

// Peek without removing:
async fn peek_front(&self) -> Option<Task> {
    self.state.pending_tasks.front().await.ok().flatten()
}
```

### MapView

A key-value map:

```rust
use linera_sdk::views::{MapView, View};

#[derive(RootView)]
#[view(context = "ViewStorageContext")]
pub struct MyState {
    pub balances: MapView<AccountOwner, Amount>,
}

// Usage:
async fn get_balance(&self, owner: &AccountOwner) -> Amount {
    self.state.balances
        .get(owner)
        .await
        .unwrap()
        .unwrap_or(Amount::ZERO)
}

async fn set_balance(&mut self, owner: AccountOwner, amount: Amount) {
    self.state.balances.insert(&owner, amount).await.unwrap();
}

async fn remove_account(&mut self, owner: &AccountOwner) {
    self.state.balances.remove(owner).await.unwrap();
}

// Check existence:
async fn has_account(&self, owner: &AccountOwner) -> bool {
    self.state.balances.contains_key(owner).await.unwrap()
}

// Iterate over keys:
async fn all_owners(&self) -> Vec<AccountOwner> {
    self.state.balances.indices().await.unwrap()
}
```

### SetView

A set of unique values:

```rust
use linera_sdk::views::{SetView, View};

#[derive(RootView)]
#[view(context = "ViewStorageContext")]
pub struct MyState {
    pub whitelist: SetView<AccountOwner>,
}

// Usage:
async fn add_to_whitelist(&mut self, owner: AccountOwner) {
    self.state.whitelist.insert(&owner).await.unwrap();
}

async fn is_whitelisted(&self, owner: &AccountOwner) -> bool {
    self.state.whitelist.contains(owner).await.unwrap()
}

async fn remove_from_whitelist(&mut self, owner: &AccountOwner) {
    self.state.whitelist.remove(owner).await.unwrap();
}
```

### CollectionView

A collection of Views indexed by key (nested views):

```rust
use linera_sdk::views::{CollectionView, RegisterView, View};

#[derive(RootView)]
#[view(context = "ViewStorageContext")]
pub struct MyState {
    // Each user has their own sub-state
    pub users: CollectionView<UserId, UserState>,
}

#[derive(View, async_graphql::SimpleObject)]
#[view(context = "ViewStorageContext")]
pub struct UserState {
    pub balance: RegisterView<Amount>,
    pub transaction_count: RegisterView<u64>,
}

// Usage:
async fn get_user_balance(&self, user_id: &UserId) -> Amount {
    let user = self.state.users.load_entry(user_id).await.unwrap();
    *user.balance.get()
}

async fn update_user(&mut self, user_id: UserId, amount: Amount) {
    let mut user = self.state.users.load_entry_mut(&user_id).await.unwrap();
    user.balance.set(amount);
    user.transaction_count.set(*user.transaction_count.get() + 1);
}
```

---

## Advanced Patterns

### Custom Context

For custom view contexts:

```rust
use linera_sdk::views::{ViewStorageContext, CustomView};

#[derive(RootView)]
#[view(context = "ViewStorageContext")]
pub struct MyState {
    // views...
}
```

### Nested Collections

```rust
#[derive(RootView)]
#[view(context = "ViewStorageContext")]
pub struct GameState {
    // Map of game_id -> CollectionView of player_id -> PlayerState
    pub games: CollectionView<GameId, GameInstance>,
}

#[derive(View)]
#[view(context = "ViewStorageContext")]
pub struct GameInstance {
    pub players: CollectionView<PlayerId, PlayerState>,
    pub status: RegisterView<GameStatus>,
}
```

### Combining Views

```rust
#[derive(RootView, async_graphql::SimpleObject)]
#[view(context = "ViewStorageContext")]
pub struct ApplicationState {
    // Counters and flags
    pub total_supply: RegisterView<Amount>,
    pub is_paused: RegisterView<bool>,
    
    // User data
    pub balances: MapView<AccountOwner, Amount>,
    pub allowances: MapView<(AccountOwner, AccountOwner), Amount>,
    
    // History
    pub transfer_log: LogView<Transfer>,
    
    // Pending operations
    pub pending_withdrawals: QueueView<Withdrawal>,
    
    // Access control
    pub admins: SetView<AccountOwner>,
}
```

---

## Best Practices

### 1. Use Appropriate View Types

| Use Case | View Type |
|----------|-----------|
| Single value | `RegisterView<T>` |
| Key-value mapping | `MapView<K, V>` |
| Append-only log | `LogView<T>` |
| FIFO processing | `QueueView<T>` |
| Unique elements | `SetView<T>` |
| Per-entity state | `CollectionView<K, V>` |

### 2. Batch Operations

```rust
// Instead of multiple individual operations:
for (key, value) in items {
    self.state.map.insert(&key, value).await?;
}

// Views batch writes automatically when `store()` is called
```

### 3. Error Handling

```rust
async fn safe_get(&self, key: &Key) -> Result<Option<Value>, ViewError> {
    self.state.map.get(key).await
}
```

### 4. GraphQL Integration

Views can automatically derive GraphQL types:

```rust
#[derive(RootView, async_graphql::SimpleObject)]
#[view(context = "ViewStorageContext")]
pub struct ApplicationState {
    pub counter: RegisterView<u64>,
}

// This allows direct GraphQL queries like:
// query { counter }
```
