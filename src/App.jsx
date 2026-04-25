import React, { useState, useEffect } from 'react';
import { Ship, Rocket, Anchor, Globe, ExternalLink, ShieldCheck, Zap, TrendingUp, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import logo from './assets/logo.png';

const SHIPMASTER_ADDRESS = "0x82D85064A49B7544e9D81d8192Ab125a42e8a4C4";
const PULSE_ADDRESS = "0x6E2b4b0F19EE0ECcb1dd1024e4E9318a9eC2FCD2"; 

const SHIPMASTER_ABI = [
  "function ship(string memory update, string memory link) public",
  "function getShipments(address builder) public view returns (tuple(string update, uint256 timestamp, string link)[])",
  "function totalShipped(address builder) public view returns (uint256)",
  "event Shipped(address indexed builder, uint256 indexed shipmentId, string update, uint256 timestamp)"
];

const PULSE_ABI = [
  "function checkIn() external",
  "function totalCheckIns(address builder) public view returns (uint256)",
  "function lastCheckIn(address builder) public view returns (uint256)",
  "event Pulse(address indexed builder, uint256 indexed count, uint256 timestamp)"
];

const App = () => {
  const [account, setAccount] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [isShipping, setIsShipping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ update: '', link: '' });
  const [stats, setStats] = useState({ total: 0, score: 840 });

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          fetchShipments(accounts[0]);
        }
      } catch (err) {
        console.error(err);
      }
    }
    setLoading(false);
  };

  const switchNetwork = async () => {
    const CELO_CHAIN_ID = '0xa4ec'; // 42220 in hex
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CELO_CHAIN_ID }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: CELO_CHAIN_ID,
                chainName: 'Celo Mainnet',
                nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
                rpcUrls: ['https://forno.celo.org'],
                blockExplorerUrls: ['https://celoscan.io'],
              },
            ],
          });
        } catch (addError) {
          console.error(addError);
        }
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask or a Celo-compatible wallet!");
      return;
    }
    try {
      await switchNetwork();
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      fetchShipments(accounts[0]);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchShipments = async (address) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== 42220) return;

      const shipContract = new ethers.Contract(SHIPMASTER_ADDRESS, SHIPMASTER_ABI, provider);
      const data = await shipContract.getShipments(address);
      const totalShips = await shipContract.totalShipped(address);
      
      let pulseTotal = 0;
      if (PULSE_ADDRESS !== "YOUR_NEW_PULSE_ADDRESS_HERE") {
        const pulseContract = new ethers.Contract(PULSE_ADDRESS, PULSE_ABI, provider);
        pulseTotal = await pulseContract.totalCheckIns(address);
      }

      const formatted = data.map((s, i) => ({
        id: i,
        update: s.update,
        link: s.link,
        time: new Date(Number(s.timestamp) * 1000).toLocaleString()
      })).reverse();
      
      setShipments(formatted);
      setStats(prev => ({ ...prev, total: Number(totalShips) + Number(pulseTotal) }));
    } catch (err) {
      console.error("Failed to fetch shipments:", err);
    }
  };

  const handleShip = async (e) => {
    e.preventDefault();
    if (!account) return connectWallet();
    if (!formData.update) return;

    setIsShipping(true);
    try {
      await switchNetwork();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(SHIPMASTER_ADDRESS, SHIPMASTER_ABI, signer);
      
      const tx = await contract.ship(formData.update, formData.link);
      await tx.wait();
      
      setFormData({ update: '', link: '' });
      fetchShipments(account);
    } catch (err) {
      console.error("Transaction failed:", err);
      alert("Shipment failed. Ensure you are on Celo Mainnet.");
    } finally {
      setIsShipping(false);
    }
  };

  const handlePulse = async () => {
    if (!account) return connectWallet();
    if (PULSE_ADDRESS === "YOUR_NEW_PULSE_ADDRESS_HERE") {
      alert("Please deploy DailyPulse.sol and update PULSE_ADDRESS in App.jsx first!");
      return;
    }

    setIsShipping(true);
    try {
      await switchNetwork();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(PULSE_ADDRESS, PULSE_ABI, signer);
      
      const tx = await contract.checkIn();
      await tx.wait();
      
      fetchShipments(account);
    } catch (err) {
      console.error("Pulse failed:", err);
      alert("Quick Check-in failed.");
    } finally {
      setIsShipping(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deep)' }}>
        <Loader2 className="animate-spin" color="var(--primary)" size={48} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <header>
        <div className="logo-section">
          <img src={logo} alt="ShipMaster Logo" className="logo-img" />
          <span className="logo-text">SHIPMASTER</span>
        </div>
        <button className="btn-primary" onClick={connectWallet}>
          {account ? `${account.substring(0, 6)}...${account.substring(38)}` : "Connect Wallet"}
        </button>
      </header>

      <main>
        <section className="hero">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Proof of Ship <br />
            <span style={{ color: 'var(--secondary)' }}>April 2026</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Log your achievements, boost your Celo Builder Score, and master the art of shipping.
          </motion.p>
        </section>

        <div className="grid-layout">
          <motion.div 
            className="glass-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Rocket color="var(--primary)" size={24} />
              <h2 style={{ fontSize: '1.5rem' }}>Ship an Update</h2>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(53, 208, 127, 0.05)', borderRadius: '16px', border: '1px dashed var(--secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>Ultra Low Fee Check-in</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Costs ~0.005 - 0.01 CELO</p>
                </div>
                <button 
                  className="btn-primary" 
                  onClick={handlePulse}
                  style={{ padding: '0.6rem 1.2rem', fontSize: '0.8rem', background: 'var(--secondary)', boxShadow: 'none' }}
                >
                  <Zap size={14} style={{ marginRight: '4px' }} /> Daily Pulse
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>Quick Ship Shortcuts</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {[
                  { label: "🚀 Daily Check-in", text: "Completed daily builder check-in and contribution sync." },
                  { label: "🛠️ Code Refactor", text: "Optimized smart contract logic and improved gas efficiency." },
                  { label: "✨ UI Polish", text: "Enhanced user interface aesthetics and micro-animations." }
                ].map((template, i) => (
                  <button 
                    key={i}
                    onClick={() => {
                      setFormData({ ...formData, update: template.text });
                      setTimeout(() => document.getElementById('ship-submit-btn').click(), 100);
                    }}
                    style={{
                      background: 'rgba(251, 204, 92, 0.05)',
                      border: '1px solid var(--border)',
                      color: 'var(--primary)',
                      padding: '0.5rem 0.8rem',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>
            
            <form className="ship-form" onSubmit={handleShip}>
              <div className="input-group">
                <label>What did you ship today?</label>
                <textarea 
                  placeholder="e.g. Implemented new UI components for the Celo event..."
                  rows="4"
                  value={formData.update}
                  onChange={(e) => setFormData({...formData, update: e.target.value})}
                  required
                />
              </div>
              <div className="input-group">
                <label>Proof Link (GitHub, Vercel, Twitter)</label>
                <input 
                  type="text" 
                  placeholder="https://..."
                  value={formData.link}
                  onChange={(e) => setFormData({...formData, link: e.target.value})}
                />
              </div>
              <button id="ship-submit-btn" className="btn-primary" type="submit" disabled={isShipping}>
                {isShipping ? "Launching Shipment..." : "Ship to Mainnet"}
              </button>
            </form>
          </motion.div>

          <motion.div 
            className="glass-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <TrendingUp color="var(--secondary)" size={24} />
              <h2 style={{ fontSize: '1.5rem' }}>Stats</h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Builder Score</p>
                <h3 style={{ fontSize: '2rem', color: 'var(--primary)' }}>840</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Total Ships</p>
                  <h4 style={{ fontSize: '1.2rem' }}>{stats.total}</h4>
                </div>
                <div>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Global Rank</p>
                  <h4 style={{ fontSize: '1.2rem' }}>#12</h4>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <section style={{ marginTop: '4rem' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>Recent Shipments</h2>
          <div className="shipment-list">
            <AnimatePresence>
              {shipments.map((ship, index) => (
                <motion.div 
                  key={ship.id}
                  className="shipment-item"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="shipment-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShieldCheck size={18} color="var(--secondary)" />
                      <h3>{ship.update}</h3>
                    </div>
                    <p>{ship.time} • <a href={`https://${ship.link}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>{ship.link} <ExternalLink size={12} /></a></p>
                  </div>
                  <span className="status-badge status-shipped">Verified</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      </main>

      <footer style={{ marginTop: '5rem', padding: '2rem 0', borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
        <p>© 2026 Celo ShipMaster • Built for Talent Protocol Proof of Ship</p>
      </footer>
    </div>
  );
};

export default App;
