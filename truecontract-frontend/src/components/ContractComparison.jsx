import React, { useState } from 'react';
import ComparisonSelector from './ComparisonSelector';
import ComparisonDashboard from './ComparisonDashboard';

const ContractComparison = () => {
    const [comparisonData, setComparisonData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleCompare = async (contractAddresses) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:3000/api/analyze/compare', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contractAddresses,
                    forceRefresh: false
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Comparison failed');
            }

            setComparisonData(data);
        } catch (err) {
            setError(`Comparison failed: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async (format) => {
        if (!comparisonData) return;

        try {
            const exportData = {
                summary: comparisonData.summary,
                contracts: comparisonData.contracts,
                exportFormat: format,
                exportTimestamp: new Date().toISOString()
            };

            if (format === 'csv') {
                const csvContent = generateCSV(comparisonData);
                downloadFile(csvContent, 'contract-comparison.csv', 'text/csv');
            } else if (format === 'json') {
                const jsonContent = JSON.stringify(exportData, null, 2);
                downloadFile(jsonContent, 'contract-comparison.json', 'application/json');
            } else if (format === 'pdf') {
                const pdfContent = generatePDFContent(comparisonData);
                downloadFile(pdfContent, 'contract-comparison.txt', 'text/plain');
            }
        } catch (err) {
            alert(`Export failed: ${err.message}`);
        }
    };

    const generateCSV = (data) => {
        const headers = ['Contract', 'Risk Score', 'Security Score', 'Balance (ETH)', 'Transactions', 'Users', 'Activity'];
        const rows = data.contracts.map(contract => [
            contract.contractAddress,
            contract.rugPullScore || 'N/A',
            contract.aiAnalysis?.securityScore || 'N/A',
            contract.onChainData?.balance ? parseFloat(contract.onChainData.balance).toFixed(4) : 'N/A',
            contract.onChainData?.totalTransactions || 'N/A',
            contract.onChainData?.transactionAnalysis?.uniqueInteractors || 'N/A',
            contract.onChainData?.transactionAnalysis?.activity || 'Unknown'
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    };

    const generatePDFContent = (data) => {
        let content = 'CONTRACT COMPARISON REPORT\n';
        content += '========================\n\n';
        content += `Generated: ${new Date().toLocaleString()}\n`;
        content += `Total Contracts: ${data.summary.totalContracts}\n`;
        content += `Average Risk Score: ${data.summary.averageRiskScore.toFixed(1)}\n`;
        content += `Best Contract: ${data.summary.bestContract.contractAddress}\n\n`;

        content += 'DETAILED COMPARISON\n';
        content += '==================\n\n';

        data.contracts.forEach((contract, index) => {
            content += `Contract ${index + 1}: ${contract.contractAddress}\n`;
            content += `Risk Score: ${contract.rugPullScore}\n`;
            content += `Security Score: ${contract.aiAnalysis?.securityScore || 'N/A'}\n`;
            content += `Balance: ${contract.onChainData?.balance ? parseFloat(contract.onChainData.balance).toFixed(4) + ' ETH' : 'N/A'}\n`;
            content += `Transactions: ${contract.onChainData?.totalTransactions || 'N/A'}\n`;
            content += `Activity: ${contract.onChainData?.transactionAnalysis?.activity || 'Unknown'}\n\n`;
        });

        return content;
    };

    const downloadFile = (content, filename, mimeType) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleNewComparison = () => {
        setComparisonData(null);
        setError(null);
    };

    if (comparisonData) {
        return (
            <ComparisonDashboard 
                comparisonData={comparisonData}
                onExport={handleExport}
                onNewComparison={handleNewComparison}
            />
        );
    }

    return (
        <div className="contract-comparison">
            <ComparisonSelector 
                onCompare={handleCompare}
                isLoading={isLoading}
            />
            
            {error && (
                <div className="error-message">
                    <h4>Comparison Error</h4>
                    <p>{error}</p>
                </div>
            )}
        </div>
    );
};

export default ContractComparison;
