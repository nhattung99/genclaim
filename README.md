# GenClaim: AI-Powered Decentralized Parametric Travel Insurance

[![Deployed Contract](https://img.shields.io/badge/Contract-0x17f66D5426f3CeEcB664504d3dCbF773B528FDD7-brightgreen.svg)](./CONTRACT_ADDRESS.md)
[![Live Demo](https://img.shields.io/badge/Vercel-genclaim.vercel.app-blue.svg)](https://genclaim.vercel.app)
[![GenLayer SDK](https://img.shields.io/badge/GenLayer-v0.2.16-purple.svg)](https://genlayer.com)

**GenClaim** is a decentralized parametric travel insurance platform built as a **GenLayer Intelligent Contract**. It automates flight delay and cancellation insurance coverage by fetching real-time internet flight telemetry data (Flightradar24) and using decentralized LLM consensus to judge claims autonomously and trigger instant payouts.

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

## 🛡️ Security Architecture & Anti-Fraud Features

Following GenLayer security guidelines, GenClaim implements key protection mechanisms:

1. **Payable & Backed Premiums (`@gl.public.write.payable`)**:
   - `buy_policy` is strictly `payable` and requires `gl.message.value > 0`. Anyone attempting to register an unbacked policy without sending native tokens will be rejected.
2. **Immutable & Holder-Bound Policies**:
   - Policy records cannot be overwritten (`policies[flight_id] > 0` check).
   - Each policy is permanently bound to `gl.message.sender_address` upon registration.
3. **Authoritative Evidence Source (Anti-Spoofing)**:
   - `trigger_claim(flight_id: str)` no longer accepts unauthenticated caller-supplied URLs.
   - The contract deterministically constructs the official Flightradar URL (`https://www.flightradar24.com/data/flights/{clean_flight}`) inside `leader_fn`, preventing fake HTML injection.
4. **Guaranteed Payout Settlement**:
   - Payouts (5x backed premium) are dispatched directly to the bound policy holder address via `emit_transfer()`.

---

## 🧠 How the Intelligent Contract Works

```
                       +-----------------------------------+
                       | Buy Policy (buy_policy - Payable) |
                       +-----------------------------------+
                                         |
                                         v (Bound Holder & Premium)
                       +-----------------------------------+
                       |   Trigger Claim (trigger_claim)   |
                       +-----------------------------------+
                                         |
                                         v (Authoritative URL constructed internally)
              +-------------------------------------------------+
              |    gl.vm.run_nondet(leader_fn, validator_fn)    |
              +-------------------------------------------------+
                 /                                           \
                /                                             \
  +--------------------------+                   +--------------------------+
  |       Leader Node        |                   |      Validator Nodes     |
  |  1. Render Flightradar   |                   |  1. Execute leader_fn()  |
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
    to bound policy holder
```

---

## 📜 Smart Contract Specification (`genclaim_contract.py`)

### Public Method Specifications

| Method Name | Visibility | Input Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- | :--- |
| `buy_policy` | `@gl.public.write.payable` | `flight_id: str`, `premium_amount: int` | `bool` | Registers backed insurance coverage for a flight and binds sender address immutably. |
| `trigger_claim` | `@gl.public.write` | `flight_id: str` | `bool` | Fetches authoritative flight data, runs AI adjudication consensus, updates status, and dispatches payout to policy holder. |
| `get_policy` | `@gl.public.view` | `flight_id: str` | `int` | Returns the registered backed premium amount for a flight. |
| `get_insured_user_balance` | `@gl.public.view` | `user: Address` | `int` | Returns total backed premium balance deposited by user address. |
| `get_claim_status` | `@gl.public.view` | `flight_id: str` | `str` | Returns the claim lifecycle status (`"PENDING"`, `"APPROVED"`, `"REJECTED"`). |
| `get_policy_holder` | `@gl.public.view` | `flight_id: str` | `Address` | Returns the policy holder address bound to a flight. |

---

## 🛠️ Project Setup & Installation

```bash
git clone https://github.com/nhattung99/genclaim.git
cd genclaim
npm install
npm run dev
```

---

## 📄 License

MIT License - see [`LICENSE`](./LICENSE) for details.
