# GenClaim: AI-Powered Decentralized Parametric Travel Insurance

[![Deployed Contract](https://img.shields.io/badge/Contract-0x17f66D5426f3CeEcB664504d3dCbF773B528FDD7-brightgreen.svg)](./CONTRACT_ADDRESS.md)
[![Live Demo](https://img.shields.io/badge/Vercel-genclaim.vercel.app-blue.svg)](https://genclaim.vercel.app)
[![GenLayer SDK](https://img.shields.io/badge/GenLayer-v0.2.16-purple.svg)](https://genlayer.com)

**GenClaim** is a decentralized parametric travel insurance platform built as a **GenLayer Intelligent Contract**. It automates flight delay and cancellation insurance coverage by fetching real-time internet flight telemetry data (e.g., Flightradar24) and using decentralized LLM consensus to judge claims autonomously and trigger instant payouts.

---

## 📌 Deployed Contract Information

| Parameter | Value / Details |
| :--- | :--- |
| **Deployed Contract Address** | `0x17f66D5426f3CeEcB664504d3dCbF773B528FDD7` |
| **Contract Class Name** | `GenClaim` (inherits from `gl.Contract`) |
| **Contract Source Code** | [`genclaim_contract.py`](./genclaim_contract.py) |
| **Network** | GenLayer Studionet (`studionet`) |
| **SDK Version** | `v0.2.16` (`py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`) |
| **Live Web App** | [https://genclaim.vercel.app](https://genclaim.vercel.app) |
| **GitHub Repository** | [https://github.com/nhattung99/genclaim.git](https://github.com/nhattung99/genclaim.git) |

---

## 🧠 How the Intelligent Contract Works

GenClaim combines blockchain state immutability with non-deterministic web scraping and Large Language Model (LLM) reasoning through GenLayer's **Equivalence Principle**.

```
                       +-----------------------------------+
                       |    User Buys Policy (buy_policy)  |
                       +-----------------------------------+
                                         |
                                         v
                       +-----------------------------------+
                       | User Triggers Claim (trigger_claim)|
                       +-----------------------------------+
                                         |
                                         v
              +-------------------------------------------------+
              |  gl.vm.run_nondet_unsafe(leader_fn, validator_fn)|
              +-------------------------------------------------+
                 /                                           \
                /                                             \
  +--------------------------+                   +--------------------------+
  |       Leader Node        |                   |      Validator Nodes     |
  |  1. gl.nondet.web.render |                   |  1. Execute leader_fn()  |
  |  2. gl.nondet.exec_prompt|                   |  2. Verify JSON output   |
  |  3. Return JSON Result   |                   |  3. Validate consensus   |
  +--------------------------+                   +--------------------------+
                \                                             /
                 \                                           /
                  +-----------------------------------------+
                  |            Consensus Reached            |
                  +-----------------------------------------+
                                       |
                +----------------------+----------------------+
                |                                             |
                v                                             v
        [Claim Valid: True]                           [Claim Valid: False]
  - Update status to APPROVED                   - Update status to REJECTED
  - Trigger 5x payout via emit_transfer()
```

### 1. Persistent Storage Design
State variables are persisted on-chain using GenLayer's fixed-size `TreeMap` structures and `u256` integers to guarantee deterministic execution across nodes:
- `policies: TreeMap[str, u256]`: Maps Flight ID / Flight Code to the premium amount registered.
- `insured_users: TreeMap[Address, u256]`: Tracks user premium deposits and coverage amounts.
- `claim_status: TreeMap[str, str]`: Tracks the claim lifecycle (`"PENDING"`, `"APPROVED"`, `"REJECTED"`).
- `policy_holders: TreeMap[str, Address]`: Links a flight policy code to the purchasing user's wallet address.

### 2. Non-Deterministic Consensus (`run_nondet_unsafe`)
When a policy holder triggers a claim evaluation, the contract executes non-deterministic steps safely inside `gl.vm.run_nondet_unsafe`:
- **Leader Execution (`leader_fn`)**:
  1. Calls `gl.nondet.web.render(flight_radar_url, mode="text")` to render and extract flight status text.
  2. Passes the raw text into `gl.nondet.exec_prompt(prompt, response_format="json")` acting as an AI Insurance Adjuster to evaluate if the flight was delayed > 2 hours or cancelled.
  3. Returns a strict JSON payload: `{"is_valid_claim": bool, "reason": str}`.
- **Validator Execution (`validator_fn`)**:
  - Re-executes or validates the leader's evaluation independently to verify structural validity and reach agreement on the claim decision.

### 3. Automatic Payout Execution
If the consensus evaluates `is_valid_claim == True`:
- The claim status is updated to `"APPROVED"`.
- The contract calculates a parametric coverage payout (5x the premium amount).
- An asynchronous value transfer is dispatched to the policy holder using `recipient.emit_transfer(value=u256(payout_amount), on='finalized')`.

---

## 📜 Smart Contract Specification (`genclaim_contract.py`)

### Main Class Definition
The contract class is named **`GenClaim`** (extending `gl.Contract`) to prevent naming collisions with GenLayer's linter and CLI reflection tools:

```python
class GenClaim(gl.Contract):
    policies: TreeMap[str, u256]
    insured_users: TreeMap[Address, u256]
    claim_status: TreeMap[str, str]
    policy_holders: TreeMap[str, Address]
```

### Public Method Specifications

| Method Name | Visibility | Input Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- | :--- |
| `buy_policy` | `@gl.public.write` | `flight_id: str`, `premium_amount: int` | `bool` | Registers insurance coverage for a flight and records the sender's address. |
| `trigger_claim` | `@gl.public.write` | `flight_id: str`, `flight_radar_url: str` | `bool` | Fetches flight data, runs AI LLM adjudication consensus, updates status, and dispatches payout if valid. |
| `get_policy` | `@gl.public.view` | `flight_id: str` | `int` | Returns the registered premium amount for a flight. |
| `get_insured_user_balance` | `@gl.public.view` | `user: Address` | `int` | Returns the insured user's registered deposit balance. |
| `get_claim_status` | `@gl.public.view` | `flight_id: str` | `str` | Returns the status string (`"PENDING"`, `"APPROVED"`, `"REJECTED"`). |
| `get_policy_holder` | `@gl.public.view` | `flight_id: str` | `Address` | Returns the policy holder's wallet address. |

---

## 🛠️ Project Setup & Installation

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **MetaMask** or any Web3 Browser Wallet connected to GenLayer Studionet

### 1. Clone the Repository
```bash
git clone https://github.com/nhattung99/genclaim.git
cd genclaim
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (or copy `.env.example`):
```env
VITE_GENCLAIM_CONTRACT_ADDRESS=0x17f66D5426f3CeEcB664504d3dCbF773B528FDD7
```

---

## 🚀 Smart Contract Deployment Instructions

### Deploying via GenLayer Studio (Recommended)

1. Open [GenLayer Studio (Run & Debug)](https://studio.genlayer.com/run-debug).
2. Click **Reset Storage** and perform a hard refresh (`Ctrl + Shift + R`) to clear browser compiler caches.
3. Open `genclaim_contract.py` in the Studio editor.
4. Click **Deploy**.
5. Once deployed, note down the generated contract address (e.g., `0x17f66D5426f3CeEcB664504d3dCbF773B528FDD7`).

### Deploying via GenLayer CLI (Localnet)

1. Initialize localnet:
   ```bash
   genlayer init
   genlayer up
   ```
2. Deploy `genclaim_contract.py`:
   ```bash
   genlayer deploy genclaim_contract.py
   ```

---

## 💻 Running the Frontend Application

### Local Development Server
To start the React development server locally:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Building for Production
```bash
npm run build
```

### Deploying to Vercel
```bash
npx vercel --prod
```

---

## 🔐 Security & Linter Compliance (GenLayer v0.2.16)

The project strictly follows GenLayer Intelligent Contract development constraints:
1. **Magic Header**: Top lines explicitly state the dependency hash:
   `# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }`
2. **Unique Class Name**: Uses `class GenClaim(gl.Contract):` instead of generic `Contract` to avoid CLI reflection conflicts.
3. **No Direct `TreeMap` Reassignment**: Leaves `TreeMap` declarations unassigned in `__init__`.
4. **Deterministic Storage Types**: Uses fixed-size `u256` for storage representation.
5. **Safe Non-Determinism**: Wraps all web and LLM calls inside `gl.vm.run_nondet_unsafe`.

---

## 📄 License

MIT License - see [`LICENSE`](./LICENSE) for details.
