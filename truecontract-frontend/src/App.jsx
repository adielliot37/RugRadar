import React, { useState } from 'react';
import './App.css';


const API_BASE_URL = 'http://localhost:3000/api/analyze';


const LoadingSpinner = () => (
    <svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const StarRating = ({ rating, setRating }) => {
    return (
        <div className="star-rating">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`star-button ${star <= rating ? 'active' : ''}`}
                >
                    {star <= rating ? '★' : '☆'}
                </button>
            ))}
        </div>
    );
};

const RugMeter = ({ rugScore }) => {
    const score = Math.min(100, Math.max(0, rugScore));
    const rotation = (score / 100) * 180 - 90;

    const getRugLevel = (score) => {
        if (score >= 80) return { label: 'EXTREME DANGER', color: '#dc2626', emoji: '🚨' };
        if (score >= 60) return { label: 'HIGH RISK', color: '#ef4444', emoji: '⚠️' };
        if (score >= 40) return { label: 'MODERATE RISK', color: '#f97316', emoji: '⚡' };
        if (score >= 20) return { label: 'LOW RISK', color: '#eab308', emoji: '⚠️' };
        return { label: 'MINIMAL RISK', color: '#22c55e', emoji: '✓' };
    };

    const level = getRugLevel(score);

    return (
        <div className="rug-meter-container">
            <h3 className="rug-meter-title">
                <span style={{color: '#ef4444'}}>Rug</span> Pull Risk Meter
            </h3>
            <div className="speedometer">
                <svg viewBox="0 0 200 140" className="speedometer-svg">
                    <defs>
                        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={{stopColor: '#22c55e', stopOpacity: 1}} />
                            <stop offset="25%" style={{stopColor: '#eab308', stopOpacity: 1}} />
                            <stop offset="50%" style={{stopColor: '#f97316', stopOpacity: 1}} />
                            <stop offset="75%" style={{stopColor: '#ef4444', stopOpacity: 1}} />
                            <stop offset="100%" style={{stopColor: '#dc2626', stopOpacity: 1}} />
                        </linearGradient>
                    </defs>

                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="url(#gaugeGradient)"
                        strokeWidth="20"
                        strokeLinecap="round"
                    />

                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="22"
                        strokeLinecap="round"
                    />

                    {[0, 20, 40, 60, 80, 100].map((tick) => {
                        const angle = (tick / 100) * 180 - 90;
                        const radians = (angle * Math.PI) / 180;
                        const x1 = 100 + 70 * Math.cos(radians);
                        const y1 = 100 + 70 * Math.sin(radians);
                        const x2 = 100 + 85 * Math.cos(radians);
                        const y2 = 100 + 85 * Math.sin(radians);
                        return (
                            <line
                                key={tick}
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke="rgba(255,255,255,0.3)"
                                strokeWidth="2"
                            />
                        );
                    })}

                    <line
                        x1="100"
                        y1="100"
                        x2="100"
                        y2="35"
                        stroke={level.color}
                        strokeWidth="3"
                        strokeLinecap="round"
                        style={{
                            transformOrigin: '100px 100px',
                            transform: `rotate(${rotation}deg)`,
                            transition: 'transform 1s ease-out'
                        }}
                    />

                    <circle cx="100" cy="100" r="8" fill={level.color} />
                    <circle cx="100" cy="100" r="4" fill="#1f2937" />

                    <text
                        x="100"
                        y="132"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={level.color}
                        fontSize="36"
                        fontWeight="900"
                        fontFamily="Inter, sans-serif"
                    >
                        {score}
                    </text>
                </svg>

                <div className="rug-score-label-container">
                    <div className="rug-score-label" style={{color: level.color}}>
                        {level.emoji} {level.label}
                    </div>
                </div>
            </div>
            <div className="rug-meter-legend">
                <div className="legend-item">
                    <span className="legend-color" style={{background: '#22c55e'}}></span>
                    <span>0-20 Safe</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{background: '#eab308'}}></span>
                    <span>20-40 Caution</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{background: '#f97316'}}></span>
                    <span>40-60 Warning</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{background: '#ef4444'}}></span>
                    <span>60-80 Danger</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{background: '#dc2626'}}></span>
                    <span>80-100 Critical</span>
                </div>
            </div>
        </div>
    );
};



function App() {
   
    const [contractAddress, setContractAddress] = useState('');
    const [selectedNetwork, setSelectedNetwork] = useState('base');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');

    // Address validation helper functions
    const validateAddress = (address, network) => {
        if (!address) {
            return { valid: false, message: 'Please enter an address.' };
        }
        
        if (network === 'solana') {
            // Solana addresses are base58 encoded, typically 32-44 characters
            if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
                return { 
                    valid: false, 
                    message: 'Please enter a valid Solana address (base58 format).' 
                };
            }
        } else {
            // Base/Ethereum addresses
            if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
                return { 
                    valid: false, 
                    message: 'Please enter a valid Base contract address (0x format).' 
                };
            }
        }
        
        return { valid: true };
    };

    const handleAnalyze = async () => {
        const validation = validateAddress(contractAddress, selectedNetwork);
        if (!validation.valid) {
            setError(validation.message);
            return;
        }

        setError(null);
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${API_BASE_URL}/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contractAddress, 
                    chain: selectedNetwork 
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.details || data.error || 'An unknown error occurred.');
            }

            setAnalysisResult(data);
        } catch (err) {
            setError(`Analysis failed: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitReview = async () => {
        if (reviewRating === 0) {
            alert('Please select a rating (1-5 stars).');
            return;
        }

        try {
             const response = await fetch(`${API_BASE_URL}/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contractAddress: analysisResult.contractAddress,
                    chain: analysisResult.network || analysisResult.chain || selectedNetwork,
                    rating: reviewRating,
                    comment: reviewComment,
                }),
            });
            const updatedData = await response.json();
            if (!response.ok) {
                throw new Error(updatedData.error || 'Failed to submit review.');
            }

            setAnalysisResult(updatedData);
            setReviewRating(0);
            setReviewComment('');

        } catch (err) {
            alert(`Error submitting review: ${err.message}`);
        }
    };

 

    const getScoreClass = (score) => {
        const numScore = parseInt(score, 10);
        if (numScore >= 80) return 'score-high';
        if (numScore >= 50) return 'score-medium';
        return 'score-low';
    };

    const getVerdictClass = (verdict) => {
        if (verdict.includes('Safe')) return 'verdict-safe';
        if (verdict.includes('caution')) return 'verdict-caution';
        return 'verdict-danger';
    };

    return (
        <div className="app-container">
            <main className="main-content">
              
                <div className="header">
                    <div className="badge">
                         Blockchain Security Platform
                    </div>
                    <h1 className="title"><span style={{color: '#ef4444'}}>Rug</span>Radar</h1>
                    <p className="subtitle">
                        Detect Rug Pulls Before They Happen
                        <span className="subtitle-detail">AI-powered scam detection • Protect your crypto investments</span>
                    </p>
                </div>

                <div className="input-card">
                    <div className="network-selector">
                        <label className="input-label">Blockchain Network</label>
                        <div className="network-buttons">
                            <button 
                                className={`network-button ${selectedNetwork === 'base' ? 'active' : ''}`}
                                onClick={() => {
                                    setSelectedNetwork('base');
                                    setContractAddress('');
                                    setError(null);
                                    setAnalysisResult(null);
                                }}
                                disabled={isLoading}
                            >
                                <span className="network-icon">🔵</span>
                                Base
                            </button>
                            <button 
                                className={`network-button ${selectedNetwork === 'solana' ? 'active' : ''}`}
                                onClick={() => {
                                    setSelectedNetwork('solana');
                                    setContractAddress('');
                                    setError(null);
                                    setAnalysisResult(null);
                                }}
                                disabled={isLoading}
                            >
                                <span className="network-icon">🟣</span>
                                Solana
                            </button>
                        </div>
                    </div>
                    
                    <label className="input-label">
                        {selectedNetwork === 'solana' ? 'Program/Token Address' : 'Contract Address'}
                    </label>
                    <div className="input-group">
                        <input
                            type="text"
                            value={contractAddress}
                            onChange={(e) => setContractAddress(e.target.value)}
                            placeholder={selectedNetwork === 'solana' ? 
                                'So11111111111111111111111111111111111111112' : 
                                '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
                            }
                            className="input-field"
                            disabled={isLoading}
                            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                        />
                        <button
                            onClick={handleAnalyze}
                            disabled={isLoading}
                            className="analyze-button"
                        >
                            {isLoading ? (
                                <>
                                    <LoadingSpinner />
                                    <span>Analyzing...</span>
                                </>
                            ) : (
                                <span>Analyze</span>
                            )}
                        </button>
                    </div>
                    <p className="input-hint">
                        Enter a valid {selectedNetwork === 'solana' ? 'Solana program or token address' : 'Base contract address'} to begin security analysis
                        {selectedNetwork === 'solana' && (
                            <span className="hint-detail">
                                <br />Supports: SPL tokens, memecoins, DeFi protocols, NFTs
                            </span>
                        )}
                    </p>
                </div>

                {error && (
                    <div className="error-card">
                        <h4>Analysis Error</h4>
                        <p>{error}</p>
                    </div>
                )}

                {analysisResult && (
                    <div className="results-section">
                        <RugMeter rugScore={analysisResult.rugPullScore || analysisResult.riskAssessment?.overallRiskScore || 0} />

                        <div className="summary-card">
                            <div className="contract-type-badges">
                                <div className="contract-type-badge">
                                    {(analysisResult.network || analysisResult.chain) === 'solana' ? '🟣' : '🔵'}
                                    {analysisResult.contractType || analysisResult.aiAnalysis?.contractType}
                                </div>
                                {analysisResult.isWellKnownProtocol && (
                                    <div className="protocol-badge">
                                        ✅ {analysisResult.protocolName}
                                    </div>
                                )}
                                {analysisResult.cached && (
                                    <div className="cached-badge">
                                        ⚡ Cached Audit
                                    </div>
                                )}
                            </div>

                            <div className={`score-badge ${getScoreClass(
                                analysisResult.aiAnalysis?.securityScore || 
                                analysisResult.riskAssessment?.trustScore || 50
                            )}`}>
                                <span className="score-number">
                                    {analysisResult.aiAnalysis?.securityScore || analysisResult.riskAssessment?.trustScore || 50}
                                </span>
                                <span className="score-label">
                                    {(analysisResult.network || analysisResult.chain) === 'solana' ? 'Trust Score' : 'Security Score'}
                                </span>
                            </div>

                            <div className="contract-details">
                                <p className="contract-address">{analysisResult.contractAddress}</p>

                                {analysisResult.onChainData && (
                                    <div className="on-chain-stats">
                                        <div className="stat-item">
                                            <span className="stat-label">💰 Balance</span>
                                            <span className="stat-value">
                                                {parseFloat(analysisResult.onChainData.balance).toFixed(4)} 
                                                {(analysisResult.network || analysisResult.chain) === 'solana' ? ' SOL' : ' ETH'}
                                            </span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">📈 Total Txns</span>
                                            <span className="stat-value">{analysisResult.onChainData.totalTransactions}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">👥 Unique Users</span>
                                            <span className="stat-value">
                                                {analysisResult.onChainData.transactionAnalysis?.uniqueInteractors || 
                                                 analysisResult.onChainData.transactionAnalysis?.uniqueSigners || 0}
                                            </span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">📈 Activity</span>
                                            <span className="stat-value">{analysisResult.onChainData.transactionAnalysis?.activity || 'Unknown'}</span>
                                        </div>
                                        
                                        {/* Show Solana-specific token info if available */}
                                        {analysisResult.tokenInfo && (
                                            <div className="stat-item">
                                                <span className="stat-label">🪙 Token Supply</span>
                                                <span className="stat-value">
                                                    {parseFloat(analysisResult.tokenInfo.supply?.uiAmountString || '0').toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="summary-box">
                                    <h3>Summary</h3>
                                    <p>
                                        {analysisResult.aiAnalysis?.summary || 
                                         analysisResult.riskAssessment?.summary || 
                                         'Analysis completed successfully.'}
                                    </p>
                                </div>

                                <div className={`verdict-box ${getVerdictClass(
                                    analysisResult.aiAnalysis?.overallVerdict || 
                                    analysisResult.riskAssessment?.summary || 'Analysis complete'
                                )}`}>
                                    <span className="verdict-label">Verdict</span>
                                    <p className="verdict-text">
                                        {analysisResult.aiAnalysis?.overallVerdict || 
                                         analysisResult.riskAssessment?.summary || 
                                         'Analysis completed - check details above'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="vulnerabilities-card">
                            <h3 className="section-title">
                                {(analysisResult.network || analysisResult.chain) === 'solana' ? 'Risk Analysis' : 'Vulnerability Analysis'}
                            </h3>

                            <div className="vulnerabilities-grid">
                                {/* Handle both Base (aiAnalysis.vulnerabilities) and Solana (riskAssessment.risks) formats */}
                                {(analysisResult.aiAnalysis?.vulnerabilities || 
                                  analysisResult.riskAssessment?.risks?.map(risk => ({
                                      name: risk.category,
                                      detected: true,
                                      severity: risk.severity,
                                      details: risk.details || risk.impact
                                  })) || []
                                ).map((vuln, index) => (
                                    <div
                                        key={index}
                                        className={`vulnerability-item ${vuln.detected ? 'detected' : 'safe'}`}
                                    >
                                        <div className={`vuln-icon ${vuln.detected ? 'danger' : 'success'}`}>
                                            {vuln.detected ? '✕' : '✓'}
                                        </div>
                                        <div className="vuln-content">
                                            <h4 className="vuln-name">
                                                {vuln.name}
                                                {vuln.detected && <span className="alert-badge">ALERT</span>}
                                            </h4>
                                            <p className="vuln-details">
                                                {vuln.detected ? vuln.details : 'No issues detected. This appears safe from this vulnerability.'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                
                                {/* Show message if no vulnerabilities/risks found */}
                                {(!analysisResult.aiAnalysis?.vulnerabilities || analysisResult.aiAnalysis.vulnerabilities.length === 0) &&
                                 (!analysisResult.riskAssessment?.risks || analysisResult.riskAssessment.risks.length === 0) && (
                                    <div className="vulnerability-item safe">
                                        <div className="vuln-icon success">✓</div>
                                        <div className="vuln-content">
                                            <h4 className="vuln-name">All Clear</h4>
                                            <p className="vuln-details">No significant risks detected in this analysis.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="reviews-card">
                            <h3 className="section-title">Community Reviews</h3>

                            <div className="review-form">
                                <h4>Leave Your Review</h4>

                                <div className="rating-input">
                                    <span>Your Rating:</span>
                                    <StarRating rating={reviewRating} setRating={setReviewRating} />
                                    {reviewRating > 0 && (
                                        <span className="rating-label">
                                            {reviewRating === 5 ? 'Excellent!' : reviewRating === 4 ? 'Good' : reviewRating === 3 ? 'Fair' : reviewRating === 2 ? 'Poor' : 'Very Poor'}
                                        </span>
                                    )}
                                </div>

                                <textarea
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    className="review-textarea"
                                    rows="4"
                                    placeholder="Share your experience with this contract... (optional)"
                                ></textarea>

                                <button onClick={handleSubmitReview} className="submit-button">
                                    Submit Review
                                </button>
                            </div>

                            <div className="reviews-list">
                                <h4>All Reviews ({analysisResult.userReviews.length})</h4>

                                <div className="reviews-container">
                                    {analysisResult.userReviews.length === 0 ? (
                                        <div className="no-reviews">
                                            <p className="no-reviews-title">No reviews yet</p>
                                            <p className="no-reviews-text">Be the first to share your experience with this contract!</p>
                                        </div>
                                    ) : (
                                        analysisResult.userReviews.map((review, index) => (
                                            <div key={index} className="review-item">
                                                <div className="review-header">
                                                    <div className="review-stars">
                                                        {'★'.repeat(review.rating)}
                                                        <span className="empty-stars">{'★'.repeat(5 - review.rating)}</span>
                                                        <span className="review-score">{review.rating}/5</span>
                                                    </div>
                                                    <div className="review-date">
                                                        {new Date(review.timestamp).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </div>
                                                </div>
                                                <p className="review-comment">
                                                    {review.comment || <span className="no-comment">No comment provided.</span>}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

           
            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-powered">
                        <span>Powered by</span>
                        <span className="powered-by-item">Storacha</span>
                        <span>•</span>
                        <span className="powered-by-item">Base</span>
                        <span>•</span>
                        <span className="powered-by-item">Solana</span>
                        <span>•</span>
                        <span className="powered-by-item">AI</span>
                    </div>
                    <div className="footer-disclaimer">
                        ⚠️ Always do your own research. This tool provides automated analysis, not financial advice.
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default App;
