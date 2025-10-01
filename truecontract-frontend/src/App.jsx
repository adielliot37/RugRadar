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



function App() {
   
    const [contractAddress, setContractAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');

   
    const handleAnalyze = async () => {
        if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
            setError('Please enter a valid Ethereum-style address.');
            return;
        }

        setError(null);
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${API_BASE_URL}/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contractAddress }),
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
                    <label className="input-label">
                        Contract Address
                    </label>
                    <div className="input-group">
                        <input
                            type="text"
                            value={contractAddress}
                            onChange={(e) => setContractAddress(e.target.value)}
                            placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
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
                        Enter a valid Base blockchain contract address to begin security analysis
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
                        <div className="summary-card">
                            <div className={`score-badge ${getScoreClass(analysisResult.aiAnalysis.securityScore)}`}>
                                <span className="score-number">{analysisResult.aiAnalysis.securityScore}</span>
                                <span className="score-label">Security Score</span>
                            </div>

                            <div className="contract-details">
                                <h2 className="contract-type">{analysisResult.aiAnalysis.contractType}</h2>
                                <p className="contract-address">{analysisResult.contractAddress}</p>

                                <div className="summary-box">
                                    <h3>Summary</h3>
                                    <p>{analysisResult.aiAnalysis.summary}</p>
                                </div>

                                <div className={`verdict-box ${getVerdictClass(analysisResult.aiAnalysis.overallVerdict)}`}>
                                    <span className="verdict-label">Verdict</span>
                                    <p className="verdict-text">{analysisResult.aiAnalysis.overallVerdict}</p>
                                </div>
                            </div>
                        </div>

                        <div className="vulnerabilities-card">
                            <h3 className="section-title">Vulnerability Analysis</h3>

                            <div className="vulnerabilities-grid">
                                {analysisResult.aiAnalysis.vulnerabilities.map((vuln, index) => (
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
                                                {vuln.detected ? vuln.details : 'No issues detected. This contract appears safe from this vulnerability.'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
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
