# Enhanced Multi-Pair Trading Bot

A secure, automated cryptocurrency trading bot with advanced technical indicators, comprehensive risk management, and real-time multi-pair trading capabilities. Built specifically for Chromebook compatibility with enhanced security features to replace hacked trading systems.

## 🚀 Key Features

### 🔒 Enhanced Security
- **Secure wallet validation** with input sanitization
- **Emergency stop mechanisms** for immediate trading halt
- **Transaction confirmation requirements**
- **Rate limiting and error handling**
- **Anti-tampering protection**

### 📊 Advanced Technical Analysis
- **Bollinger Bands** with customizable periods and standard deviations
- **MACD** (Moving Average Convergence Divergence) with signal line
- **RSI** (Relative Strength Index) with overbought/oversold levels
- **Stochastic Oscillator** for momentum analysis
- **Volume Analysis** with trend confirmation
- **Fibonacci Retracement Levels** for support/resistance

### 🛡️ Risk Management
- **Position sizing algorithms** based on signal strength
- **Stop-loss & take-profit protection**
- **Trailing stop functionality**
- **Daily loss limits**
- **Maximum drawdown protection**
- **Portfolio risk metrics**

### 💹 Trading Features
- **Real-time price tracking** for 6 major pairs
- **Auto BUY/SELL signals** with confidence scores
- **Multi-pair position management**
- **Trade history & comprehensive P&L tracking**
- **Performance analytics** (Win rate, Sharpe ratio, Profit factor)
- **Paper trading mode** for testing

### 📈 Supported Trading Pairs
- **ETH/USD** - Ethereum
- **BTC/USD** - Bitcoin
- **SOL/USD** - Solana
- **MATIC/USD** - Polygon
- **AVAX/USD** - Avalanche
- **LINK/USD** - Chainlink

## 🔧 Installation & Setup

### Prerequisites
- Chromebook with ChromeOS
- MetaMask browser extension
- Node.js 18+ (for development)
- Git

### Quick Start (Chromebook Ready)

1. **Clone or download the bot files**
2. **Install MetaMask** from [metamask.io](https://metamask.io)
3. **Open the project folder** in ChromeOS Files app
4. **Launch a local server** (use Python 3 if Node.js unavailable):
   ```bash
   python3 -m http.server 3000
   ```
5. **Access the bot** at `http://localhost:3000`

### Development Setup (Optional)
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🎯 How to Use

### 1. Connect Wallet
- Click "Connect MetaMask"
- Approve connection and network switch to Base
- Confirm account selection

### 2. Configure Settings
- **Trade Amount**: Size per position (default: 0.01)
- **Stop Loss %**: Maximum loss per trade (default: 2%)
- **Take Profit %**: Target profit per trade (default: 5%)
- **Daily Loss Limit**: Maximum daily loss (default: $100)
- **Trailing Stop %**: Dynamic stop adjustment (default: 1%)

### 3. Start Trading
- Ensure **Paper Trading** is enabled for testing
- Click **"START BOT"** to begin automated trading
- Monitor **signals** and **performance metrics**
- Use **Emergency Stop** if needed

### 4. Monitor Performance
- **Win Rate**: Percentage of profitable trades
- **Total P&L**: Cumulative profit/loss
- **Sharpe Ratio**: Risk-adjusted returns
- **Max Drawdown**: Largest peak-to-trough decline

## 🔍 Technical Indicators Explained

### Bollinger Bands
- **Upper Band**: Resistance level (overbought)
- **Middle Band**: 20-period SMA (trend)
- **Lower Band**: Support level (oversold)

### MACD
- **MACD Line**: Fast EMA - Slow EMA
- **Signal Line**: 9-period EMA of MACD
- **Histogram**: MACD - Signal (momentum)

### RSI (Relative Strength Index)
- **Above 70**: Overbought (sell signal)
- **Below 30**: Oversold (buy signal)
- **Range**: 0-100 momentum oscillator

### Fibonacci Retracement
- **23.6%**: Shallow retracement
- **38.2%**: Moderate retracement
- **50%**: Psychological level
- **61.8%**: Golden ratio (strong support/resistance)
- **78.6%**: Deep retracement

## 🚨 Security Features

### Emergency Stop
- **Immediate halt** of all trading activities
- **Automatic position closure** at market price
- **Prevents further losses** during market volatility

### Risk Limits
- **Daily loss limits** prevent catastrophic losses
- **Maximum drawdown protection** safeguards capital
- **Position sizing** limits exposure per trade

### Wallet Security
- **Connection validation** ensures legitimate wallet access
- **Transaction confirmations** prevent unauthorized trades
- **Network verification** ensures correct blockchain

## 📊 Performance Analytics

### Key Metrics
- **Win Rate**: Percentage of profitable trades
- **Profit Factor**: Total profit / Total loss
- **Sharpe Ratio**: Risk-adjusted performance
- **Average Win/Loss**: Typical trade outcomes
- **Max Drawdown**: Largest loss from peak

### Export Features
- **CSV Export**: Download complete trade history
- **Performance Reports**: Detailed analytics
- **Tax Documentation**: Simplified reporting

## ⚠️ Risk Disclaimer

**IMPORTANT**: This bot involves financial risk. Always:
1. **Start with paper trading** to test strategies
2. **Use small position sizes** initially
3. **Monitor performance closely** during live trading
4. **Set appropriate risk limits** based on your capital
5. **Understand market volatility** and potential losses
6. **Never invest more than you can afford to lose**

## 🔧 Configuration Options

### Technical Indicators
```javascript
{
  bbPeriod: 20,        // Bollinger Bands period
  bbStdDev: 2,         // Standard deviations
  rsiPeriod: 14,       // RSI calculation period
  rsiOverbought: 70,   // RSI overbought level
  rsiOversold: 30,     // RSI oversold level
  macdFast: 12,        // MACD fast EMA
  macdSlow: 26,        // MACD slow EMA
  volumeThreshold: 1.5 // Volume multiplier for signals
}
```

### Risk Management
```javascript
{
  tradeAmount: 0.01,           // Size per trade
  maxPositionSize: 0.1,        // Maximum position
  stopLossPercent: 2,          // Stop loss percentage
  takeProfitPercent: 5,        // Take profit percentage
  maxDailyLoss: 100,          // Daily loss limit ($)
  maxDrawdownPercent: 10,     // Max drawdown (%)
  trailingStopPercent: 1      // Trailing stop (%)
}
```

## 🛠️ Chromebook Optimization

### Performance Tips
1. **Close unnecessary tabs** to free memory
2. **Use paper trading mode** for testing
3. **Limit active pairs** if performance issues occur
4. **Clear browser cache** periodically
5. **Use ChromeOS task manager** to monitor resources

### Compatibility Notes
- **Works with MetaMask** extension
- **Optimized for Base network**
- **Responsive design** for various screen sizes
- **Efficient data fetching** to minimize bandwidth

## 📞 Support & Troubleshooting

### Common Issues
- **MetaMask not detected**: Install MetaMask extension
- **Connection failed**: Check internet connection and MetaMask
- **Price feed errors**: Verify CoinGecko API access
- **Performance issues**: Reduce trading frequency or pairs

### Getting Help
1. **Check console** for error messages
2. **Verify MetaMask** is unlocked and on Base network
3. **Ensure sufficient ETH** for gas fees (live trading)
4. **Test with paper trading** before using real funds

## 📄 License

MIT License - Feel free to modify and distribute responsibly.

---

**⚠️ WARNING**: Cryptocurrency trading involves substantial risk of loss. This bot is provided for educational and development purposes. Always conduct thorough research and consider consulting with financial professionals before engaging in live trading.

**🔒 SECURITY**: Never share your private keys or seed phrase. This bot only requires standard wallet connection through MetaMask and does not have access to your private keys.