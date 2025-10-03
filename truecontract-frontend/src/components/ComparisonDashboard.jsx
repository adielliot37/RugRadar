import React from 'react';

const ComparisonDashboard = ({ comparisonData, onExport, onNewComparison }) => {
    const { summary, contracts } = comparisonData;

    const getRiskLevel = (score) => {
        if (score >= 80) return { label: 'EXTREME DANGER', color: '#dc2626', emoji: '🚨' };
        if (score >= 60) return { label: 'HIGH RISK', color: '#ef4444', emoji: '⚠️' };
        if (score >= 40) return { label: 'MODERATE RISK', color: '#f97316', emoji: '⚡' };
        if (score >= 20) return { label: 'LOW RISK', color: '#eab308', emoji: '⚠️' };
        return { label: 'MINIMAL RISK', color: '#22c55e', emoji: '✓' };
    };

    const formatAddress = (address) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const formatNumber = (num) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    return (
        <div className="comparison-dashboard">
            <div className="comparison-header">
                <h2>📈 Comparison Results</h2>
                <div className="comparison-actions">
                    <button onClick={onNewComparison} className="new-comparison-btn">
                        New Comparison
                    </button>
                    <button onClick={() => onExport('pdf')} className="export-btn">
                        Export PDF
                    </button>
                    <button onClick={() => onExport('csv')} className="export-btn">
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="comparison-summary">
                <div className="summary-card">
                    <h4>📊 Summary</h4>
                    <div className="summary-stats">
                        <div className="stat-item">
                            <span className="stat-label">Total Contracts</span>
                            <span className="stat-value">{summary.totalContracts}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Average Risk</span>
                            <span className="stat-value">{summary.averageRiskScore.toFixed(1)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Lowest Risk</span>
                            <span className="stat-value">{summary.lowestRisk}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Highest Risk</span>
                            <span className="stat-value">{summary.highestRisk}</span>
                        </div>
                    </div>
                </div>

                <div className="best-contract-card">
                    <h4>🏆 Best Choice</h4>
                    <div className="best-contract">
                        <div className="contract-address">
                            {formatAddress(summary.bestContract.contractAddress)}
                        </div>
                        <div className="risk-score">
                            Risk: {summary.bestContract.rugPullScore}
                        </div>
                        <div className="risk-level">
                            {getRiskLevel(summary.bestContract.rugPullScore).emoji} {getRiskLevel(summary.bestContract.rugPullScore).label}
                        </div>
                    </div>
                </div>
            </div>

            <div className="risk-chart-container">
                <h3>Risk Score Comparison</h3>
                <div className="risk-chart">
                    {contracts.map((contract, index) => {
                        const riskLevel = getRiskLevel(contract.rugPullScore);
                        const maxScore = Math.max(...contracts.map(c => c.rugPullScore));
                        const percentage = (contract.rugPullScore / maxScore) * 100;
                        
                        return (
                            <div key={index} className="risk-bar">
                                <div className="risk-bar-label">
                                    <span className="contract-name">Contract {index + 1}</span>
                                    <span className="contract-address">{formatAddress(contract.contractAddress)}</span>
                                </div>
                                <div className="risk-bar-container">
                                    <div 
                                        className="risk-bar-fill"
                                        style={{ 
                                            width: `${percentage}%`,
                                            backgroundColor: riskLevel.color
                                        }}
                                    >
                                        <span className="risk-score">{contract.rugPullScore}</span>
                                    </div>
                                </div>
                                <div className="risk-level">
                                    {riskLevel.emoji} {riskLevel.label}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="comparison-table-container">
                <h3>Detailed Metrics Comparison</h3>
                <div className="comparison-table">
                    <div className="table-header">
                        <div className="header-cell">Metric</div>
                        {contracts.map((contract, index) => (
                            <div key={index} className="header-cell">
                                Contract {index + 1}
                                <div className="contract-address">{formatAddress(contract.contractAddress)}</div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="table-row">
                        <div className="metric-cell">Risk Score</div>
                        {contracts.map((contract, index) => (
                            <div key={index} className="data-cell">
                                <span className="risk-score" style={{ color: getRiskLevel(contract.rugPullScore).color }}>
                                    {contract.rugPullScore}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="table-row">
                        <div className="metric-cell">Security Score</div>
                        {contracts.map((contract, index) => (
                            <div key={index} className="data-cell">
                                {contract.aiAnalysis?.securityScore || 'N/A'}
                            </div>
                        ))}
                    </div>

                    <div className="table-row">
                        <div className="metric-cell">Balance (ETH)</div>
                        {contracts.map((contract, index) => (
                            <div key={index} className="data-cell">
                                {contract.onChainData?.balance ? parseFloat(contract.onChainData.balance).toFixed(4) : 'N/A'}
                            </div>
                        ))}
                    </div>

                    <div className="table-row">
                        <div className="metric-cell">Total Transactions</div>
                        {contracts.map((contract, index) => (
                            <div key={index} className="data-cell">
                                {contract.onChainData?.totalTransactions ? formatNumber(contract.onChainData.totalTransactions) : 'N/A'}
                            </div>
                        ))}
                    </div>

                    <div className="table-row">
                        <div className="metric-cell">Unique Users</div>
                        {contracts.map((contract, index) => (
                            <div key={index} className="data-cell">
                                {contract.onChainData?.transactionAnalysis?.uniqueInteractors || 'N/A'}
                            </div>
                        ))}
                    </div>

                    <div className="table-row">
                        <div className="metric-cell">Activity Level</div>
                        {contracts.map((contract, index) => (
                            <div key={index} className="data-cell">
                                {contract.onChainData?.transactionAnalysis?.activity || 'Unknown'}
                            </div>
                        ))}
                    </div>

                    <div className="table-row">
                        <div className="metric-cell">Contract Type</div>
                        {contracts.map((contract, index) => (
                            <div key={index} className="data-cell">
                                {contract.aiAnalysis?.contractType || 'Unknown'}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="vulnerability-comparison">
                <h3>Vulnerability Analysis</h3>
                <div className="vulnerability-grid">
                    {contracts.map((contract, index) => (
                        <div key={index} className="vulnerability-card">
                            <h4>Contract {index + 1}</h4>
                            <div className="vulnerability-list">
                                {contract.aiAnalysis?.vulnerabilities?.map((vuln, vulnIndex) => (
                                    <div key={vulnIndex} className={`vulnerability-item ${vuln.detected ? 'detected' : 'safe'}`}>
                                        <span className="vuln-icon">{vuln.detected ? '✕' : '✓'}</span>
                                        <span className="vuln-name">{vuln.name}</span>
                                    </div>
                                )) || <div className="no-vulnerabilities">No vulnerability data available</div>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ComparisonDashboard;
