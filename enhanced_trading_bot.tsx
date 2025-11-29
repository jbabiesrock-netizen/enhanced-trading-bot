import { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Wallet, DollarSign, Settings, TrendingUp, TrendingDown, BarChart3, Shield, AlertTriangle, Play, Pause, Square, Download, Upload } from 'lucide-react';

const TRADING_PAIRS = [
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', coingecko_id: 'ethereum' },
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', coingecko_id: 'bitcoin' },
  { id: 'solana', name: 'Solana', symbol: 'SOL', coingecko_id: 'solana' },
  { id: 'matic', name: 'Polygon', symbol: 'MATIC', coingecko_id: 'matic-network' },
  { id: 'avalanche', name: 'Avalanche', symbol: 'AVAX', coingecko_id: 'avalanche-2' },
  { id: 'chainlink', name: 'Chainlink', symbol: 'LINK', coingecko_id: 'chainlink' }
];

interface TradingConfig {
  // Technical Indicators
  bbPeriod: number;
  bbStdDev: number;
  macdFast: number;
  macdSlow: number;
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  stochK: number;
  stochD: number;
  volumeThreshold: number;
  
  // Risk Management
  tradeAmount: number;
  maxPositionSize: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  maxDailyLoss: number;
  maxDrawdownPercent: number;
  paperTrading: boolean;
  
  // Advanced Features
  enableMultiTimeframe: boolean;
  confirmationRequired: boolean;
  emergencyStop: boolean;
  trailingStopPercent: number;
}

interface Position {
  entryPrice: number;
  amount: number;
  entryTime: string;
  stopLoss: number;
  takeProfit: number;
  trailingStop?: number;
  type: 'LONG' | 'SHORT';
}

interface Trade {
  type: 'BUY' | 'SELL';
  pair: string;
  price: number;
  amount: number;
  time: string;
  reason: string;
  status: 'Paper' | 'Live';
  profit?: number;
  profitPercent?: number;
  fees?: number;
}

interface Signal {
  type: 'BUY' | 'SELL' | 'HOLD' | 'ERROR' | 'WARNING' | 'INFO';
  pair: string;
  indicator: string;
  reason: string;
  time: string;
  strength?: number;
  confidence?: number;
}

interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalProfitPercent: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
}

export default function EnhancedTradingBot() {
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [selectedPair, setSelectedPair] = useState(TRADING_PAIRS[0]);
  const [prices, setPrices] = useState<{[key: string]: number}>({});
  const [priceHistory, setPriceHistory] = useState<{[key: string]: any[]}>({});
  const [volumeHistory, setVolumeHistory] = useState<{[key: string]: any[]}>({});
  const [signals, setSignals] = useState<Signal[]>([]);
  const [ethBalance, setEthBalance] = useState(0);
  const [positions, setPositions] = useState<{[key: string]: Position}>({});
  const [trades, setTrades] = useState<Trade[]>([]);
  const [walletStatus, setWalletStatus] = useState('checking');
  const [emergencyStopActivated, setEmergencyStopActivated] = useState(false);
  const [dailyPnL, setDailyPnL] = useState(0);
  const [maxDrawdown, setMaxDrawdown] = useState(0);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    totalProfit: 0,
    totalProfitPercent: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    profitFactor: 0,
    averageWin: 0,
    averageLoss: 0
  });

  const priceBufferRef = useRef<{[key: string]: number[]}>({});
  const volumeBufferRef = useRef<{[key: string]: number[]}>({});
  const priceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tradingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [config, setConfig] = useState<TradingConfig>({
    // Technical Indicators
    bbPeriod: 20,
    bbStdDev: 2,
    macdFast: 12,
    macdSlow: 26,
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    stochK: 14,
    stochD: 3,
    volumeThreshold: 1.5,
    
    // Risk Management
    tradeAmount: 0.01,
    maxPositionSize: 0.1,
    stopLossPercent: 2,
    takeProfitPercent: 5,
    maxDailyLoss: 100,
    maxDrawdownPercent: 10,
    paperTrading: true,
    
    // Advanced Features
    enableMultiTimeframe: true,
    confirmationRequired: true,
    emergencyStop: false,
    trailingStopPercent: 1
  });

  // Enhanced Security Functions
  const validateWalletConnection = useCallback(async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask not installed');
      }

      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Validate account format
      if (!accounts[0].startsWith('0x') || accounts[0].length !== 42) {
        throw new Error('Invalid account format');
      }

      return accounts[0];
    } catch (error) {
      console.error('Wallet validation error:', error);
      throw error;
    }
  }, []);

  const connectWallet = async () => {
    try {
      setWalletStatus('connecting');
      
      const validatedAccount = await validateWalletConnection();
      
      setWalletStatus('switching-network');
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          setWalletStatus('adding-network');
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base',
              nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org']
            }]
          });
        } else {
          throw switchError;
        }
      }
      
      setAccount(validatedAccount);
      setIsConnected(true);
      setWalletStatus('connected');
      await updateBalances(validatedAccount);
      startPriceFetching();
      
      addSignal({
        type: 'INFO',
        pair: 'SYSTEM',
        indicator: 'Wallet',
        reason: `Securely connected: ${validatedAccount.substring(0, 6)}...${validatedAccount.substring(38)}`,
        time: new Date().toLocaleTimeString()
      });
    } catch (error: any) {
      console.error('Wallet error:', error);
      setWalletStatus('error');
      addSignal({
        type: 'ERROR',
        pair: 'SYSTEM',
        indicator: 'Wallet',
        reason: error.message || 'Connection failed',
        time: new Date().toLocaleTimeString()
      });
    }
  };

  const updateBalances = async (address: string) => {
    try {
      const ethBalanceHex = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });
      setEthBalance(parseInt(ethBalanceHex, 16) / 1e18);
    } catch (error) {
      console.error('Balance error:', error);
    }
  };

  // Enhanced Price Fetching with Error Handling
  const fetchPrices = async () => {
    try {
      const ids = TRADING_PAIRS.map(p => p.coingecko_id).join(',');
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_vol=true`, {
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const newPrices: {[key: string]: number} = {};
      const newVolumes: {[key: string]: number} = {};
      const timestamp = new Date().toLocaleTimeString();
      
      TRADING_PAIRS.forEach(pair => {
        const price = data[pair.coingecko_id]?.usd;
        const volume = data[pair.coingecko_id]?.usd_24h_vol;
        
        if (price && price > 0) {
          newPrices[pair.id] = price;
          
          if (volume && volume > 0) {
            newVolumes[pair.id] = volume;
          }
          
          setPriceHistory(prev => ({
            ...prev,
            [pair.id]: [...(prev[pair.id] || []), { time: timestamp, price }].slice(-200)
          }));
          
          setVolumeHistory(prev => ({
            ...prev,
            [pair.id]: [...(prev[pair.id] || []), { time: timestamp, volume: volume || 0 }].slice(-200)
          }));
          
          if (!priceBufferRef.current[pair.id]) {
            priceBufferRef.current[pair.id] = [];
            volumeBufferRef.current[pair.id] = [];
          }
          
          priceBufferRef.current[pair.id].push(price);
          if (volume) {
            volumeBufferRef.current[pair.id].push(volume);
          }
          
          if (priceBufferRef.current[pair.id].length > 200) {
            priceBufferRef.current[pair.id] = priceBufferRef.current[pair.id].slice(-200);
            volumeBufferRef.current[pair.id] = volumeBufferRef.current[pair.id].slice(-200);
          }
        }
      });
      
      setPrices(newPrices);
    } catch (error) {
      console.error('Price fetch error:', error);
      addSignal({
        type: 'ERROR',
        pair: 'SYSTEM',
        indicator: 'Price Feed',
        reason: 'Failed to fetch prices - check connection',
        time: new Date().toLocaleTimeString()
      });
    }
  };

  const startPriceFetching = () => {
    fetchPrices();
    priceIntervalRef.current = setInterval(fetchPrices, 5000); // Faster updates
  };

  const stopPriceFetching = () => {
    if (priceIntervalRef.current) {
      clearInterval(priceIntervalRef.current);
    }
    if (tradingIntervalRef.current) {
      clearInterval(tradingIntervalRef.current);
    }
  };

  // Enhanced Technical Indicators
  const calculateSMA = (data: number[], period: number): number | null => {
    if (data.length < period) return null;
    const slice = data.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
  };

  const calculateStdDev = (data: number[], period: number, sma: number): number | null => {
    if (data.length < period) return null;
    const slice = data.slice(-period);
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
    return Math.sqrt(variance);
  };

  const calculateBollingerBands = (prices: number[]) => {
    const sma = calculateSMA(prices, config.bbPeriod);
    if (!sma) return null;
    const stdDev = calculateStdDev(prices, config.bbPeriod, sma);
    return {
      upper: sma + (stdDev * config.bbStdDev),
      middle: sma,
      lower: sma - (stdDev * config.bbStdDev)
    };
  };

  const calculateEMA = (data: number[], period: number): number | null => {
    if (data.length < period) return null;
    const multiplier = 2 / (period + 1);
    let ema = calculateSMA(data.slice(0, period), period);
    if (!ema) return null;
    
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
    }
    return ema;
  };

  const calculateRSI = (prices: number[], period: number = config.rsiPeriod): number | null => {
    if (prices.length < period + 1) return null;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  const calculateStochastic = (prices: number[], highPrices: number[], lowPrices: number[], kPeriod: number, dPeriod: number) => {
    if (prices.length < kPeriod) return null;
    
    const currentPrice = prices[prices.length - 1];
    const highestHigh = Math.max(...highPrices.slice(-kPeriod));
    const lowestLow = Math.min(...lowPrices.slice(-kPeriod));
    
    const k = ((currentPrice - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    // Simple moving average for %D
    let dSum = 0;
    for (let i = 0; i < dPeriod; i++) {
      const idx = prices.length - 1 - i;
      if (idx >= 0) {
        const price = prices[idx];
        const hh = Math.max(...highPrices.slice(idx - kPeriod + 1, idx + 1));
        const ll = Math.min(...lowPrices.slice(idx - kPeriod + 1, idx + 1));
        dSum += ((price - ll) / (hh - ll)) * 100;
      }
    }
    const d = dSum / dPeriod;
    
    return { k, d };
  };

  const calculateMACD = (prices: number[]) => {
    if (prices.length < config.macdSlow) return null;
    const emaFast = calculateEMA(prices, config.macdFast);
    const emaSlow = calculateEMA(prices, config.macdSlow);
    if (!emaFast || !emaSlow) return null;
    const macdLine = emaFast - emaSlow;
    
    // Calculate signal line (9-period EMA of MACD line)
    const macdHistory = [macdLine];
    for (let i = 1; i <= 9; i++) {
      const slice = prices.slice(-(config.macdSlow + i));
      const f = calculateEMA(slice, config.macdFast);
      const s = calculateEMA(slice, config.macdSlow);
      if (f && s) macdHistory.push(f - s);
    }
    const signalLine = calculateEMA(macdHistory, 9);
    
    return { 
      macd: macdLine, 
      signal: signalLine || macdLine * 0.9, 
      histogram: macdLine - (signalLine || macdLine * 0.9) 
    };
  };

  const calculateFibonacciLevels = (prices: number[], period: number = 50) => {
    if (prices.length < period) return null;
    
    const slice = prices.slice(-period);
    const high = Math.max(...slice);
    const low = Math.min(...slice);
    const diff = high - low;
    
    return {
      high,
      low,
      level0: high,
      level236: high - (diff * 0.236),
      level382: high - (diff * 0.382),
      level500: high - (diff * 0.5),
      level618: high - (diff * 0.618),
      level786: high - (diff * 0.786),
      level1000: low
    };
  };

  const calculateVolumeAnalysis = (volumes: number[]) => {
    if (volumes.length < 20) return null;
    
    const recentVolume = volumes[volumes.length - 1];
    const avgVolume = calculateSMA(volumes, 20);
    
    if (!avgVolume) return null;
    
    const volumeRatio = recentVolume / avgVolume;
    const isHighVolume = volumeRatio >= config.volumeThreshold;
    const isLowVolume = volumeRatio <= 0.5;
    
    return {
      current: recentVolume,
      average: avgVolume,
      ratio: volumeRatio,
      isHighVolume,
      isLowVolume
    };
  };

  const addSignal = (signal: Signal) => {
    setSignals(prev => [signal, ...prev].slice(0, 50));
  };

  // Enhanced Risk Management
  const checkRiskLimits = useCallback(() => {
    // Check daily loss limit
    if (dailyPnL <= -config.maxDailyLoss && !config.paperTrading) {
      addSignal({
        type: 'ERROR',
        pair: 'SYSTEM',
        indicator: 'Risk Management',
        reason: `Daily loss limit reached: -$${config.maxDailyLoss}`,
        time: new Date().toLocaleTimeString()
      });
      setIsRunning(false);
      return false;
    }

    // Check maximum drawdown
    if (maxDrawdown >= config.maxDrawdownPercent && !config.paperTrading) {
      addSignal({
        type: 'ERROR',
        pair: 'SYSTEM',
        indicator: 'Risk Management',
        reason: `Maximum drawdown reached: ${config.maxDrawdownPercent}%`,
        time: new Date().toLocaleTimeString()
      });
      setIsRunning(false);
      return false;
    }

    // Check emergency stop
    if (config.emergencyStop || emergencyStopActivated) {
      addSignal({
        type: 'WARNING',
        pair: 'SYSTEM',
        indicator: 'Emergency Stop',
        reason: 'Emergency stop activated - all trading halted',
        time: new Date().toLocaleTimeString()
      });
      setIsRunning(false);
      return false;
    }

    return true;
  }, [dailyPnL, maxDrawdown, config, emergencyStopActivated]);

  const updateTrailingStop = useCallback((pairId: string, currentPrice: number) => {
    setPositions(prev => {
      const updated = { ...prev };
      const position = updated[pairId];
      
      if (position && position.type === 'LONG') {
        const newTrailingStop = currentPrice * (1 - config.trailingStopPercent / 100);
        if (!position.trailingStop || newTrailingStop > position.trailingStop) {
          position.trailingStop = newTrailingStop;
        }
      }
      
      return updated;
    });
  }, [config.trailingStopPercent]);

  const checkStopLossAndTakeProfit = useCallback(() => {
    Object.keys(positions).forEach(pairId => {
      const position = positions[pairId];
      const currentPrice = prices[pairId];
      if (!position || !currentPrice) return;
      
      const entryPrice = position.entryPrice;
      const currentPnLPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
      
      // Update trailing stop for profitable positions
      if (currentPnLPercent > 0 && config.trailingStopPercent > 0) {
        updateTrailingStop(pairId, currentPrice);
      }
      
      const pair = TRADING_PAIRS.find(p => p.id === pairId);
      if (!pair) return;
      
      let shouldClose = false;
      let reason = '';
      
      // Check trailing stop first (more restrictive than regular stop loss)
      if (position.trailingStop && currentPrice <= position.trailingStop) {
        shouldClose = true;
        reason = `Trailing stop triggered at $${position.trailingStop.toFixed(2)}`;
      }
      // Check regular stop loss
      else if (currentPnLPercent <= -config.stopLossPercent) {
        shouldClose = true;
        reason = `Stop-loss at ${config.stopLossPercent}% loss`;
      }
      // Check take profit
      else if (currentPnLPercent >= config.takeProfitPercent) {
        shouldClose = true;
        reason = `Take-profit at ${config.takeProfitPercent}% gain`;
      }
      
      if (shouldClose) {
        addSignal({
          type: 'SELL',
          pair: pair.symbol,
          indicator: 'Risk Management',
          reason: reason,
          time: new Date().toLocaleTimeString()
        });
        executeTrade(pair, { type: 'SELL', reason });
      }
    });
  }, [positions, prices, config, updateTrailingStop]);

  const calculatePositionSize = useCallback((pair: any, signalStrength: number = 1) => {
    // Base position size calculation
    let size = config.tradeAmount;
    
    // Adjust based on signal strength
    size *= signalStrength;
    
    // Apply maximum position size limit
    size = Math.min(size, config.maxPositionSize);
    
    // Account for existing positions
    const existingPosition = positions[pair.id];
    if (existingPosition) {
      size = Math.min(size, config.maxPositionSize - existingPosition.amount);
    }
    
    // Ensure minimum size
    size = Math.max(size, 0.001);
    
    return size;
  }, [config.tradeAmount, config.maxPositionSize, positions]);

  const generateSignals = useCallback(() => {
    if (!checkRiskLimits()) return;
    
    TRADING_PAIRS.forEach(pair => {
      const pairPrices = priceBufferRef.current[pair.id];
      const pairVolumes = volumeBufferRef.current[pair.id];
      
      if (!pairPrices || pairPrices.length < Math.max(config.macdSlow, config.rsiPeriod)) return;
      
      const currentPrice = prices[pair.id];
      if (!currentPrice) return;
      
      // Calculate all indicators
      const bb = calculateBollingerBands(pairPrices);
      const macd = calculateMACD(pairPrices);
      const rsi = calculateRSI(pairPrices);
      const fib = calculateFibonacciLevels(pairPrices);
      const volume = pairVolumes ? calculateVolumeAnalysis(pairVolumes) : null;
      
      let signalStrength = 0;
      let buySignals = 0;
      let sellSignals = 0;
      
      const newSignals: Signal[] = [];
      
      // Bollinger Bands signals
      if (bb) {
        if (currentPrice <= bb.lower) {
          buySignals++;
          signalStrength += 0.3;
          newSignals.push({
            type: 'BUY',
            pair: pair.symbol,
            indicator: 'Bollinger Bands',
            reason: 'Price at lower band - oversold condition',
            time: new Date().toLocaleTimeString(),
            strength: 0.3
          });
        } else if (currentPrice >= bb.upper) {
          sellSignals++;
          signalStrength -= 0.3;
          newSignals.push({
            type: 'SELL',
            pair: pair.symbol,
            indicator: 'Bollinger Bands',
            reason: 'Price at upper band - overbought condition',
            time: new Date().toLocaleTimeString(),
            strength: 0.3
          });
        }
      }
      
      // MACD signals
      if (macd) {
        if (macd.histogram > 0 && macd.macd > macd.signal) {
          buySignals++;
          signalStrength += 0.25;
          newSignals.push({
            type: 'BUY',
            pair: pair.symbol,
            indicator: 'MACD',
            reason: 'Bullish momentum detected',
            time: new Date().toLocaleTimeString(),
            strength: 0.25
          });
        } else if (macd.histogram < 0 && macd.macd < macd.signal) {
          sellSignals++;
          signalStrength -= 0.25;
          newSignals.push({
            type: 'SELL',
            pair: pair.symbol,
            indicator: 'MACD',
            reason: 'Bearish momentum detected',
            time: new Date().toLocaleTimeString(),
            strength: 0.25
          });
        }
      }
      
      // RSI signals
      if (rsi !== null) {
        if (rsi <= config.rsiOversold) {
          buySignals++;
          signalStrength += 0.2;
          newSignals.push({
            type: 'BUY',
            pair: pair.symbol,
            indicator: 'RSI',
            reason: `RSI oversold at ${rsi.toFixed(1)}`,
            time: new Date().toLocaleTimeString(),
            strength: 0.2
          });
        } else if (rsi >= config.rsiOverbought) {
          sellSignals++;
          signalStrength -= 0.2;
          newSignals.push({
            type: 'SELL',
            pair: pair.symbol,
            indicator: 'RSI',
            reason: `RSI overbought at ${rsi.toFixed(1)}`,
            time: new Date().toLocaleTimeString(),
            strength: 0.2
          });
        }
      }
      
      // Fibonacci signals
      if (fib) {
        if (currentPrice <= fib.level618) {
          buySignals++;
          signalStrength += 0.15;
          newSignals.push({
            type: 'BUY',
            pair: pair.symbol,
            indicator: 'Fibonacci',
            reason: 'Price near 61.8% Fibonacci support',
            time: new Date().toLocaleTimeString(),
            strength: 0.15
          });
        } else if (currentPrice >= fib.level382) {
          sellSignals++;
          signalStrength -= 0.15;
          newSignals.push({
            type: 'SELL',
            pair: pair.symbol,
            indicator: 'Fibonacci',
            reason: 'Price near 38.2% Fibonacci resistance',
            time: new Date().toLocaleTimeString(),
            strength: 0.15
          });
        }
      }
      
      // Volume confirmation
      if (volume && volume.isHighVolume) {
        signalStrength *= 1.2; // Boost signal strength on high volume
        newSignals.forEach(signal => {
          signal.reason += ' (High volume confirmation)';
        });
      }
      
      // Execute trades based on consensus
      if (newSignals.length > 0) {
        const consensusSignal = signalStrength > 0.3 ? 'BUY' : signalStrength < -0.3 ? 'SELL' : 'HOLD';
        const strongestSignal = newSignals.reduce((prev, current) => 
          (current.strength || 0) > (prev.strength || 0) ? current : prev
        );
        
        if (consensusSignal !== 'HOLD') {
          strongestSignal.type = consensusSignal as 'BUY' | 'SELL';
          strongestSignal.confidence = Math.abs(signalStrength);
          addSignal(strongestSignal);
          
          if (isRunning && !config.confirmationRequired) {
            executeTrade(pair, strongestSignal);
          }
        } else {
          // Add HOLD signal for analysis
          addSignal({
            type: 'HOLD',
            pair: pair.symbol,
            indicator: 'Consensus',
            reason: 'Mixed signals - no clear direction',
            time: new Date().toLocaleTimeString(),
            confidence: Math.abs(signalStrength)
          });
        }
      }
    });
  }, [checkRiskLimits, prices, config, isRunning]);

  const executeTrade = async (pair: any, signal: Signal) => {
    const currentPrice = prices[pair.id];
    const position = positions[pair.id];
    
    if (!currentPrice) return;
    
    // Position validation
    if (signal.type === 'BUY' && position) return;
    if (signal.type === 'SELL' && !position) return;
    
    if (signal.type === 'BUY') {
      const positionSize = calculatePositionSize(pair, signal.confidence);
      const newPosition: Position = {
        entryPrice: currentPrice,
        amount: positionSize,
        entryTime: new Date().toLocaleTimeString(),
        stopLoss: currentPrice * (1 - config.stopLossPercent / 100),
        takeProfit: currentPrice * (1 + config.takeProfitPercent / 100),
        type: 'LONG'
      };
      
      setPositions(prev => ({ ...prev, [pair.id]: newPosition }));
      
      const newTrade: Trade = {
        type: 'BUY',
        pair: pair.symbol,
        price: currentPrice,
        amount: positionSize,
        time: new Date().toLocaleTimeString(),
        reason: signal.reason,
        status: config.paperTrading ? 'Paper' : 'Live',
        fees: config.paperTrading ? 0 : positionSize * currentPrice * 0.001 // 0.1% fee estimate
      };
      
      setTrades(prev => [newTrade, ...prev]);
      updatePerformanceMetrics([...trades, newTrade]);
      
    } else if (signal.type === 'SELL' && position) {
      const profit = (currentPrice - position.entryPrice) * position.amount;
      const profitPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
      const fees = config.paperTrading ? 0 : position.amount * currentPrice * 0.001;
      
      const newTrade: Trade = {
        type: 'SELL',
        pair: pair.symbol,
        price: currentPrice,
        amount: position.amount,
        time: new Date().toLocaleTimeString(),
        profit: profit - fees,
        profitPercent: profitPercent,
        reason: signal.reason,
        status: config.paperTrading ? 'Paper' : 'Live',
        fees: fees
      };
      
      setTrades(prev => [newTrade, ...prev]);
      updatePerformanceMetrics([...trades, newTrade]);
      updateDailyPnL(profit - fees);
      
      setPositions(prev => {
        const newPos = { ...prev };
        delete newPos[pair.id];
        return newPos;
      });
    }
  };

  const updatePerformanceMetrics = (allTrades: Trade[]) => {
    const closedTrades = allTrades.filter(t => t.type === 'SELL' && t.profit !== undefined);
    
    if (closedTrades.length === 0) return;
    
    const winningTrades = closedTrades.filter(t => (t.profit || 0) > 0);
    const losingTrades = closedTrades.filter(t => (t.profit || 0) < 0);
    
    const totalProfit = closedTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0);
    const totalProfitPercent = closedTrades.reduce((sum, trade) => sum + (trade.profitPercent || 0), 0);
    const averageWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0) / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ?
      losingTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0) / losingTrades.length : 0;
    
    const profitFactor = averageLoss !== 0 ? Math.abs(averageWin / averageLoss) : 0;
    
    // Calculate Sharpe ratio (simplified)
    const returns = closedTrades.map(t => t.profitPercent || 0);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const sharpeRatio = variance !== 0 ? avgReturn / Math.sqrt(variance) : 0;
    
    setPerformanceMetrics({
      totalTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: (winningTrades.length / closedTrades.length) * 100,
      totalProfit,
      totalProfitPercent: totalProfitPercent / closedTrades.length,
      maxDrawdown,
      sharpeRatio,
      profitFactor,
      averageWin,
      averageLoss
    });
  };

  const updateDailyPnL = (tradeProfit: number) => {
    setDailyPnL(prev => prev + tradeProfit);
  };

  const exportTrades = () => {
    const csvContent = [
      ['Type', 'Pair', 'Price', 'Amount', 'Time', 'Reason', 'Status', 'Profit', 'Profit%', 'Fees'],
      ...trades.map(trade => [
        trade.type,
        trade.pair,
        trade.price.toFixed(2),
        trade.amount.toFixed(6),
        trade.time,
        trade.reason,
        trade.status,
        trade.profit?.toFixed(2) || '',
        trade.profitPercent?.toFixed(2) || '',
        trade.fees?.toFixed(4) || ''
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const emergencyStop = () => {
    setEmergencyStopActivated(true);
    setIsRunning(false);
    setConfig(prev => ({ ...prev, emergencyStop: true }));
    
    // Close all positions
    Object.keys(positions).forEach(pairId => {
      const pair = TRADING_PAIRS.find(p => p.id === pairId);
      if (pair) {
        executeTrade(pair, { 
          type: 'SELL', 
          pair: pair.symbol,
          indicator: 'Emergency Stop',
          reason: 'Emergency stop - all positions closed',
          time: new Date().toLocaleTimeString()
        });
      }
    });
    
    addSignal({
      type: 'ERROR',
      pair: 'SYSTEM',
      indicator: 'Emergency Stop',
      reason: 'Emergency stop activated - all trading halted and positions closed',
      time: new Date().toLocaleTimeString()
    });
  };

  useEffect(() => {
    if (isRunning && Object.keys(prices).length > 0) {
      tradingIntervalRef.current = setInterval(() => {
        generateSignals();
        checkStopLossAndTakeProfit();
      }, 3000); // Faster trading interval
      return () => {
        if (tradingIntervalRef.current) {
          clearInterval(tradingIntervalRef.current);
        }
      };
    }
  }, [isRunning, prices, generateSignals, checkStopLossAndTakeProfit]);

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      setWalletStatus('available');
    } else {
      setWalletStatus('not-found');
    }
    return () => stopPriceFetching();
  }, []);

  const currentPosition = positions[selectedPair.id];
  const currentPrice = prices[selectedPair.id] || 0;
  const currentHistory = priceHistory[selectedPair.id] || [];
  const currentVolumeHistory = volumeHistory[selectedPair.id] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-slate-800/50 backdrop-blur rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-purple-400" />
              <h1 className="text-2xl font-bold">Enhanced Multi-Pair DEX Bot</h1>
              {emergencyStopActivated && (
                <span className="px-3 py-1 bg-red-600 text-white text-sm rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  EMERGENCY STOP
                </span>
              )}
            </div>
            {isConnected && (
              <span className="text-sm text-green-400">
                {account.substring(0, 6)}...{account.substring(38)}
              </span>
            )}
          </div>

          {!isConnected ? (
            <div>
              <button 
                onClick={connectWallet}
                className="w-full bg-purple-600 hover:bg-purple-700 p-6 rounded-xl text-center border-2 border-purple-400 transition-all"
              >
                <Wallet className="w-12 h-12 mx-auto mb-3" />
                <div className="text-xl font-bold mb-1">Connect MetaMask</div>
                <div className="text-sm text-purple-200">Required to start trading</div>
              </button>
              
              <div className="mt-3 p-3 bg-slate-700/50 rounded text-sm">
                <div className="font-semibold mb-2">Status:</div>
                {walletStatus === 'not-found' && (
                  <div className="text-red-400">❌ MetaMask not found - Install from metamask.io</div>
                )}
                {walletStatus === 'available' && <div className="text-green-400">✓ MetaMask detected</div>}
                {walletStatus === 'connecting' && <div className="text-blue-400">⏳ Connecting...</div>}
                {walletStatus === 'connected' && <div className="text-green-400">✓ Connected!</div>}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => { setIsConnected(false); setAccount(''); stopPriceFetching(); }}
                  className="bg-slate-600 hover:bg-slate-700 p-4 rounded-lg font-semibold transition-all"
                >
                  Disconnect
                </button>
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  disabled={emergencyStopActivated}
                  className={`p-4 rounded-lg font-semibold transition-all disabled:opacity-50 ${
                    isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isRunning ? '⏸ STOP BOT' : '▶ START BOT'}
                </button>
                <button
                  onClick={emergencyStop}
                  className="bg-red-800 hover:bg-red-900 p-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  EMERGENCY
                </button>
                <button
                  onClick={exportTrades}
                  className="bg-blue-600 hover:bg-blue-700 p-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  EXPORT
                </button>
              </div>
              
              <div className="bg-slate-700/50 p-3 rounded">
                <div className="text-xs text-slate-400 mb-2">Select Trading Pair</div>
                <div className="grid grid-cols-3 gap-2">
                  {TRADING_PAIRS.map(pair => (
                    <button
                      key={pair.id}
                      onClick={() => setSelectedPair(pair)}
                      className={`p-2 rounded text-sm font-semibold transition-all ${
                        selectedPair.id === pair.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-600 hover:bg-slate-500 text-slate-200'
                      }`}
                    >
                      {pair.symbol}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">
            <div className="bg-slate-700/50 p-3 rounded">
              <div className="text-xs text-slate-400">{selectedPair.symbol} Price</div>
              <div className="text-lg font-bold">${currentPrice > 0 ? currentPrice.toLocaleString() : '--'}</div>
            </div>
            <div className="bg-slate-700/50 p-3 rounded">
              <div className="text-xs text-slate-400">Network</div>
              <div className="text-lg font-bold">Base</div>
            </div>
            <div className="bg-slate-700/50 p-3 rounded">
              <div className="text-xs text-slate-400">Balance</div>
              <div className="text-lg font-bold">{ethBalance.toFixed(4)} ETH</div>
            </div>
            <div className="bg-slate-700/50 p-3 rounded">
              <div className="text-xs text-slate-400">Mode</div>
              <div className="text-lg font-bold">{config.paperTrading ? '📄 Paper' : '🔴 Live'}</div>
            </div>
            <div className="bg-slate-700/50 p-3 rounded">
              <div className="text-xs text-slate-400">Daily P&L</div>
              <div className={`text-lg font-bold ${dailyPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${dailyPnL.toFixed(2)}
              </div>
            </div>
            <div className="bg-slate-700/50 p-3 rounded">
              <div className="text-xs text-slate-400">Win Rate</div>
              <div className="text-lg font-bold">{performanceMetrics.winRate.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Active Position */}
        {currentPosition && (
          <div className="bg-green-900/30 backdrop-blur rounded-lg p-4 border border-green-700">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Active Position: {selectedPair.symbol}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
              <div>
                <div className="text-xs text-green-300">Entry</div>
                <div className="font-semibold">${currentPosition.entryPrice.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-green-300">Current</div>
                <div className="font-semibold">${currentPrice.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-green-300">Amount</div>
                <div className="font-semibold">{currentPosition.amount.toFixed(4)} {selectedPair.symbol}</div>
              </div>
              <div>
                <div className="text-xs text-green-300">Stop Loss</div>
                <div className="font-semibold text-red-400">${currentPosition.stopLoss.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-green-300">Take Profit</div>
                <div className="font-semibold text-green-400">${currentPosition.takeProfit.toFixed(2)}</div>
              </div>
              {currentPosition.trailingStop && (
                <div>
                  <div className="text-xs text-green-300">Trailing Stop</div>
                  <div className="font-semibold text-yellow-400">${currentPosition.trailingStop.toFixed(2)}</div>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-green-700">
              <div className={`text-lg font-bold ${currentPrice >= currentPosition.entryPrice ? 'text-green-400' : 'text-red-400'}`}>
                P&L: ${((currentPrice - currentPosition.entryPrice) * currentPosition.amount).toFixed(2)} 
                ({(((currentPrice - currentPosition.entryPrice) / currentPosition.entryPrice) * 100).toFixed(2)}%)
              </div>
            </div>
          </div>
        )}

        {/* Price Chart */}
        {currentHistory.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur rounded-lg p-4 border border-slate-700">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {selectedPair.name} Price Chart
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={currentHistory.slice(-100)}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <YAxis stroke="#94a3b8" domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Area type="monotone" dataKey="price" stroke="#a855f7" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Performance Metrics */}
        <div className="bg-slate-800/50 backdrop-blur rounded-lg p-4 border border-slate-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Performance Metrics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 p-3 rounded">
              <div className="text-xs text-slate-400">Total Trades</div>
              <div className="text-xl font-bold">{performanceMetrics.totalTrades}</div>
              <div className="text-xs text-green-400">{performanceMetrics.winningTrades} wins</div>
            </div>
            <div className="bg-slate-700/50 p-3 rounded">
              <div className="text-xs text-slate-400">Win Rate</div>
              <div className="text-xl font-bold text-green-400">{performanceMetrics.winRate.toFixed(1)}%</div>
              <div className="text-xs text-slate-400">{performanceMetrics.losingTrades} losses</div>
            </div>
            <div className="bg-slate-700/50 p-3 rounded">
              <div className="text-xs text-slate-400">Total Profit</div>
              <div className={`text-xl font-bold ${performanceMetrics.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${performanceMetrics.totalProfit.toFixed(2)}
              </div>
              <div className="text-xs text-slate-400">Avg: {performanceMetrics.totalProfitPercent.toFixed(2)}%</div>
            </div>
            <div className="bg-slate-700/50 p-3 rounded">
              <div className="text-xs text-slate-400">Risk Metrics</div>
              <div className="text-sm font-bold">Sharpe: {performanceMetrics.sharpeRatio.toFixed(2)}</div>
              <div className="text-xs text-slate-400">Factor: {performanceMetrics.profitFactor.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Trading Signals */}
        <div className="bg-slate-800/50 backdrop-blur rounded-lg p-4 border border-slate-700">
          <h3 className="font-semibold mb-3">Trading Signals</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {signals.length === 0 ? (
              <p className="text-slate-400 text-sm">No signals yet. Connect wallet and start the bot.</p>
            ) : (
              signals.map((signal, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded border text-sm ${
                    signal.type === 'BUY' ? 'bg-green-900/20 border-green-700' 
                    : signal.type === 'SELL' ? 'bg-red-900/20 border-red-700'
                    : signal.type === 'HOLD' ? 'bg-yellow-900/20 border-yellow-700'
                    : signal.type === 'ERROR' ? 'bg-red-900/30 border-red-600'
                    : 'bg-blue-900/20 border-blue-700'
                  }`}
                >
                  <div className="flex justify-between">
                    <div>
                      <div className="font-semibold">
                        {signal.type === 'BUY' ? '📈' : signal.type === 'SELL' ? '📉' : signal.type === 'HOLD' ? '⏸' : signal.type === 'ERROR' ? '🚨' : 'ℹ️'} {signal.type} {signal.pair} - {signal.indicator}
                      </div>
                      <div className="text-xs text-slate-300">{signal.reason}</div>
                      {signal.confidence && (
                        <div className="text-xs text-purple-300 mt-1">Confidence: {(signal.confidence * 100).toFixed(0)}%</div>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">{signal.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="bg-slate-800/50 backdrop-blur rounded-lg p-4 border border-slate-700">
          <h3 className="font-semibold mb-3">Recent Trades</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {trades.length === 0 ? (
              <p className="text-slate-400 text-sm">No trades yet.</p>
            ) : (
              trades.map((trade, idx) => (
                <div key={idx} className="p-3 bg-slate-700/50 rounded text-sm">
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <span className={`font-semibold ${trade.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.type} {trade.pair}
                      </span>
                      <span className="text-slate-300 ml-2">
                        {trade.amount.toFixed(4)} @ ${trade.price.toFixed(2)}
                      </span>
                      {trade.profit !== undefined && (
                        <span className={`ml-2 font-semibold ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)} ({trade.profitPercent.toFixed(2)}%)
                        </span>
                      )}
                      {trade.fees && trade.fees > 0 && (
                        <span className="text-xs text-yellow-400 ml-2">
                          Fees: ${trade.fees.toFixed(4)}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 ml-2">[{trade.status}]</span>
                    </div>
                    <span className="text-xs text-slate-400">{trade.time}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{trade.reason}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-slate-800/50 backdrop-blur rounded-lg p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5" />
            <h3 className="font-semibold">Enhanced Configuration</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-slate-400">Trade Amount</label>
              <input
                type="number"
                step="0.001"
                value={config.tradeAmount}
                onChange={(e) => setConfig({...config, tradeAmount: parseFloat(e.target.value)})}
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-sm"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Max Position Size</label>
              <input
                type="number"
                step="0.001"
                value={config.maxPositionSize}
                onChange={(e) => setConfig({...config, maxPositionSize: parseFloat(e.target.value)})}
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-sm"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Stop Loss %</label>
              <input
                type="number"
                value={config.stopLossPercent}
                onChange={(e) => setConfig({...config, stopLossPercent: parseFloat(e.target.value)})}
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-sm"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Take Profit %</label>
              <input
                type="number"
                value={config.takeProfitPercent}
                onChange={(e) => setConfig({...config, takeProfitPercent: parseFloat(e.target.value)})}
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-sm"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Daily Loss Limit</label>
              <input
                type="number"
                value={config.maxDailyLoss}
                onChange={(e) => setConfig({...config, maxDailyLoss: parseFloat(e.target.value)})}
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-sm"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Max Drawdown %</label>
              <input
                type="number"
                value={config.maxDrawdownPercent}
                onChange={(e) => setConfig({...config, maxDrawdownPercent: parseFloat(e.target.value)})}
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-sm"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Trailing Stop %</label>
              <input
                type="number"
                step="0.1"
                value={config.trailingStopPercent}
                onChange={(e) => setConfig({...config, trailingStopPercent: parseFloat(e.target.value)})}
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-sm"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">RSI Overbought</label>
              <input
                type="number"
                value={config.rsiOverbought}
                onChange={(e) => setConfig({...config, rsiOverbought: parseInt(e.target.value)})}
                className="w-full bg-slate-700 text-white rounded px-2 py-1 text-sm"
                disabled={isRunning}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.paperTrading}
                onChange={(e) => setConfig({...config, paperTrading: e.target.checked})}
                disabled={isRunning}
                className="w-4 h-4"
              />
              <span className="text-sm">Paper Trading</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.confirmationRequired}
                onChange={(e) => setConfig({...config, confirmationRequired: e.target.checked})}
                disabled={isRunning}
                className="w-4 h-4"
              />
              <span className="text-sm">Require Confirmation</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.enableMultiTimeframe}
                onChange={(e) => setConfig({...config, enableMultiTimeframe: e.target.checked})}
                disabled={isRunning}
                className="w-4 h-4"
              />
              <span className="text-sm">Multi-Timeframe</span>
            </label>
          </div>

          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded">
            <p className="text-sm text-yellow-200">
              ⚠️ <strong>Enhanced Security Warning:</strong> This bot includes advanced risk management, position sizing, and emergency stop features. Always test with Paper Trading enabled before using real funds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}