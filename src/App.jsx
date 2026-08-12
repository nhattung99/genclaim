import { useState, useEffect } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import "./App.css";

const CONTRACT_ADDRESS = import.meta.env.VITE_GENCLAIM_CONTRACT_ADDRESS || "0x17f66D5426f3CeEcB664504d3dCbF773B528FDD7";

// Create read-only client
const readClient = createClient({
  chain: studionet,
});

function App() {
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [txHash, setTxHash] = useState("");

  // Buy Policy states
  const [buyFlightId, setBuyFlightId] = useState("");
  const [buyPremium, setBuyPremium] = useState("");

  // Trigger Claim states
  const [triggerFlightId, setTriggerFlightId] = useState("");
  const [triggerUrl, setTriggerUrl] = useState("https://www.flightradar24.com/data/flights/vn123");

  // Query states
  const [queryFlightId, setQueryFlightId] = useState("");
  const [queryResult, setQueryResult] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);

  // AI Adjudication Live Log states
  const [aiLogs, setAiLogs] = useState([]);
  const [isAiRunning, setIsAiRunning] = useState(false);

  // Faucet/Deposit states
  const [depositAmount, setDepositAmount] = useState("");

  // Check wallet on mount
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts) => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          }
        })
        .catch((err) => console.error("Error fetching accounts:", err));

      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount("");
        }
      });
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask or another Web3 browser wallet.");
      return;
    }
    setLoading(true);
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);

      // Switch sang studionet (chainId 61999 = 0xF21F)
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xF21F' }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xF21F',
              chainName: 'GenLayer Studionet',
              rpcUrls: ['https://studio.genlayer.com/api'],
              nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
            }],
          });
        }
      }

      setStatusMessage("Wallet connected successfully!");
    } catch (error) {
      console.error(error);
      setStatusMessage("Failed to connect wallet.");
    } finally {
      setLoading(false);
    }
  };

  const getWriteClient = () => {
    if (!account || !window.ethereum) return null;
    return createClient({
      chain: studionet,
      account: account,
      provider: window.ethereum,
    });
  };

  const buyPolicy = async (e) => {
    e.preventDefault();
    if (!account) {
      alert("Please connect your wallet first.");
      return;
    }
    if (!buyFlightId || !buyPremium) {
      alert("Please enter Flight ID and Premium Amount.");
      return;
    }

    setLoading(true);
    setStatusMessage("Preparing transaction to buy policy...");
    setTxHash("");

    try {
      const client = getWriteClient();
      await client.connect("studionet");

      const premiumValue = parseInt(buyPremium, 10);
      
      // Send write transaction
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "buy_policy",
        args: [buyFlightId, premiumValue],
      });

      setTxHash(hash);
      setStatusMessage("Transaction submitted. Waiting for finalization (GenLayer Consensus)...");

      // Wait for transaction finality
      await client.waitForTransactionReceipt({
        hash,
        status: "FINALIZED",
      });

      setStatusMessage(`Policy successfully purchased for flight ${buyFlightId}!`);
      setBuyFlightId("");
      setBuyPremium("");
      
      // Auto-query the new policy status
      fetchPolicyDetails(buyFlightId);
    } catch (error) {
      console.error(error);
      setStatusMessage("Transaction failed or rejected.");
    } finally {
      setLoading(false);
    }
  };

  const triggerClaim = async (e) => {
    e.preventDefault();
    if (!account) {
      alert("Please connect your wallet first.");
      return;
    }
    if (!triggerFlightId || !triggerUrl) {
      alert("Please enter Flight ID and Flightradar URL.");
      return;
    }

    setLoading(true);
    setIsAiRunning(true);
    setAiLogs([]);
    setTxHash("");

    // Simulate AI log sequence to keep users engaged during consensus
    const logs = [
      "Connecting to GenLayer network validators...",
      "Scraping flight telemetry records from Flightradar24 web render...",
      "Extracting status text data for flight " + triggerFlightId + "...",
      "Sending payload to non-deterministic AI Insurance Adjuster (LLM)...",
      "AI Adjuster analyzing flight history (checking delay > 2 hours or cancellation)...",
      "Reaching network consensus (Equivalence checking across multiple validators)...",
      "Executing state updates and processing payout transfers..."
    ];

    let currentLogIndex = 0;
    const logInterval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setAiLogs((prev) => [...prev, logs[currentLogIndex]]);
        currentLogIndex++;
      } else {
        clearInterval(logInterval);
      }
    }, 3500);

    try {
      setStatusMessage("Triggering AI Claim Adjudication...");
      const client = getWriteClient();
      await client.connect("studionet");

      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "trigger_claim",
        args: [triggerFlightId, triggerUrl],
      });

      setTxHash(hash);

      // Wait for consensus finalization
      const receipt = await client.waitForTransactionReceipt({
        hash,
        status: "FINALIZED",
      });

      clearInterval(logInterval);
      
      // Fetch details immediately to see outcome
      const outcomeStatus = await readClient.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_claim_status",
        args: [triggerFlightId],
      });

      setAiLogs((prev) => [
        ...prev,
        `Consensus Reached! Claim final status is: ${outcomeStatus}`
      ]);
      setStatusMessage(`Claim evaluation completed. Status: ${outcomeStatus}`);
      fetchPolicyDetails(triggerFlightId);
    } catch (error) {
      console.error(error);
      clearInterval(logInterval);
      setStatusMessage("Consensus evaluation failed or disagreed.");
      setAiLogs((prev) => [...prev, "Error: Consensus rejected the evaluation request."]);
    } finally {
      setLoading(false);
      setIsAiRunning(false);
    }
  };

  const fetchPolicyDetails = async (flightId) => {
    const fId = flightId || queryFlightId;
    if (!fId) return;

    setQueryLoading(true);
    try {
      const premium = await readClient.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_policy",
        args: [fId],
      });

      const balance = await readClient.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_insured_user_balance",
        args: [account || "0x0000000000000000000000000000000000000000"],
      });

      const status = await readClient.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_claim_status",
        args: [fId],
      });

      const holder = await readClient.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_policy_holder",
        args: [fId],
      });

      setQueryResult({
        flightId: fId,
        premium: Number(premium),
        balance: Number(balance),
        status: status || "NONE",
        holder: holder,
      });
    } catch (error) {
      console.error(error);
      alert("Failed to retrieve policy details.");
    } finally {
      setQueryLoading(false);
    }
  };

  // Fund Contract via Deposit
  const fundContract = async (e) => {
    e.preventDefault();
    if (!account) {
      alert("Please connect your wallet first.");
      return;
    }
    if (!depositAmount) {
      alert("Enter an amount to fund.");
      return;
    }
    setLoading(true);
    setStatusMessage("Funding contract...");
    try {
      const valueToSend = BigInt(depositAmount);
      
      // Send value directly to contract ghost wallet
      const tx = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: CONTRACT_ADDRESS,
            value: "0x" + valueToSend.toString(16),
          },
        ],
      });

      setTxHash(tx);
      setStatusMessage("Fund transfer submitted! Wait for finalization...");
    } catch (error) {
      console.error(error);
      setStatusMessage("Funding transaction failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="brand">
          <div className="logo-glow"></div>
          <span className="brand-title">GenClaim</span>
          <span className="brand-badge">Intelligent Travel Insurance</span>
        </div>
        <div className="nav-actions">
          {account ? (
            <div className="wallet-badge">
              <span className="dot"></span>
              {account.substring(0, 6)}...{account.substring(account.length - 4)}
            </div>
          ) : (
            <button className="connect-btn" onClick={connectWallet} disabled={loading}>
              {loading ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <h1>AI-Driven Parametric Travel Insurance</h1>
        <p className="hero-desc">
          Automated delay and cancellation protection using GenLayer Intelligent Contracts. Fetch flight data and judge claims using decentralised LLM consensus.
        </p>
        <div className="contract-info">
          <span>Active Contract Address:</span>
          <code className="contract-address">{CONTRACT_ADDRESS}</code>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="main-grid">
        {/* Left Column: Interactions */}
        <section className="interaction-column">
          {/* Card 1: Buy Policy */}
          <div className="card glass-card">
            <h2 className="card-title">1. Buy Travel Insurance</h2>
            <p className="card-subtitle">Purchase dynamic coverage for any flight.</p>
            <form onSubmit={buyPolicy} className="form-group">
              <label>Flight Code (e.g. VN123)</label>
              <input
                type="text"
                placeholder="VN123"
                value={buyFlightId}
                onChange={(e) => setBuyFlightId(e.target.value.toUpperCase())}
                required
              />
              <label>Premium Amount (in Cents, e.g. 1000 = $10.00)</label>
              <input
                type="number"
                placeholder="1000"
                value={buyPremium}
                onChange={(e) => setBuyPremium(e.target.value)}
                required
              />
              <button type="submit" className="action-btn purple-glow" disabled={loading}>
                Buy Policy
              </button>
            </form>
          </div>

          {/* Card 2: Trigger Claim */}
          <div className="card glass-card">
            <h2 className="card-title">2. Trigger Parametric Claim</h2>
            <p className="card-subtitle">Scrapes flight status and adjudicates claim via AI validators.</p>
            <form onSubmit={triggerClaim} className="form-group">
              <label>Flight Code</label>
              <input
                type="text"
                placeholder="VN123"
                value={triggerFlightId}
                onChange={(e) => setTriggerFlightId(e.target.value.toUpperCase())}
                required
              />
              <label>Flightradar24 URL or Mock flight page URL</label>
              <input
                type="url"
                value={triggerUrl}
                onChange={(e) => setTriggerUrl(e.target.value)}
                required
              />
              <button type="submit" className="action-btn cyan-glow" disabled={loading}>
                Evaluate Claim via AI
              </button>
            </form>
          </div>
        </section>

        {/* Right Column: Log console & Search Query */}
        <section className="status-column">
          {/* Card 3: Live AI Log Console */}
          <div className="card glass-card console-card">
            <h2 className="card-title">AI Adjuster Live Console</h2>
            <p className="card-subtitle">Real-time non-deterministic consensus updates.</p>
            <div className="console-screen">
              {aiLogs.length === 0 ? (
                <div className="console-placeholder">Waiting for claim execution trigger...</div>
              ) : (
                <div className="log-list">
                  {aiLogs.map((log, index) => (
                    <div key={index} className="log-line">
                      <span className="log-time">[{new Date().toLocaleTimeString()}]</span>{" "}
                      <span className="log-text">{log}</span>
                    </div>
                  ))}
                  {isAiRunning && (
                    <div className="log-line pulse">
                      <span className="log-time">[*]</span>{" "}
                      <span className="log-text">Running AI model inference...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Query Details */}
          <div className="card glass-card">
            <h2 className="card-title">3. Lookup Insurance Status</h2>
            <p className="card-subtitle">Retrieve on-chain records for a specific flight.</p>
            <div className="query-box">
              <input
                type="text"
                placeholder="Enter Flight ID (e.g. VN123)"
                value={queryFlightId}
                onChange={(e) => setQueryFlightId(e.target.value.toUpperCase())}
              />
              <button onClick={() => fetchPolicyDetails(null)} className="query-btn" disabled={queryLoading}>
                {queryLoading ? "Searching..." : "Query State"}
              </button>
            </div>

            {queryResult && (
              <div className="query-result animate-fade-in">
                <div className="result-row">
                  <span>Flight Code:</span>
                  <strong>{queryResult.flightId}</strong>
                </div>
                <div className="result-row">
                  <span>Premium Registered:</span>
                  <strong>${(queryResult.premium / 100).toFixed(2)} USD</strong>
                </div>
                <div className="result-row">
                  <span>Your Insured Deposit:</span>
                  <strong>${(queryResult.balance / 100).toFixed(2)} USD</strong>
                </div>
                <div className="result-row">
                  <span>Claim Status:</span>
                  <span className={`badge badge-${queryResult.status.toLowerCase()}`}>
                    {queryResult.status}
                  </span>
                </div>
                <div className="result-row">
                  <span>Policy Holder:</span>
                  <code className="address-trunc">{queryResult.holder}</code>
                </div>
              </div>
            )}
          </div>

          {/* Card 5: Fund Contract (Faucet) */}
          <div className="card glass-card">
            <h2 className="card-title">Fund Contract (Faucet)</h2>
            <p className="card-subtitle">Deposit native GEN to contract to guarantee payouts.</p>
            <form onSubmit={fundContract} className="query-box">
              <input
                type="number"
                placeholder="Amount in Wei (e.g. 1000000)"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                required
              />
              <button type="submit" className="query-btn" disabled={loading}>
                Send GEN
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Footer Info / Transaction logs */}
      {statusMessage && (
        <div className="status-banner animate-slide-up">
          <p>{statusMessage}</p>
          {txHash && (
            <div className="tx-link">
              <span>View on Explorer:</span>
              <a
                href={`https://explorer-studio.genlayer.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent-cyan)', wordBreak: 'break-all' }}
              >
                {txHash.substring(0, 16)}...{txHash.substring(txHash.length - 8)}
              </a>
            </div>
          )}
        </div>
      )}

      <footer className="footer">
        <p>&copy; 2026 GenClaim Platform. Powered by GenLayer Protocol & AI Consensus.</p>
      </footer>
    </div>
  );
}

export default App;
