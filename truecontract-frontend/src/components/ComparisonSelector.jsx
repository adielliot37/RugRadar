import React, { useState } from 'react';

const ComparisonSelector = ({ onCompare, isLoading }) => {
    const [contractAddresses, setContractAddresses] = useState(['', '']);
    const [errors, setErrors] = useState({});

    const validateAddress = (address) => {
        if (!address) return 'Address is required';
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return 'Invalid contract address format';
        return null;
    };

    const handleAddressChange = (index, value) => {
        const newAddresses = [...contractAddresses];
        newAddresses[index] = value;
        setContractAddresses(newAddresses);

        if (errors[index]) {
            const newErrors = { ...errors };
            delete newErrors[index];
            setErrors(newErrors);
        }
    };

    const addContract = () => {
        if (contractAddresses.length < 5) {
            setContractAddresses([...contractAddresses, '']);
        }
    };

    const removeContract = (index) => {
        if (contractAddresses.length > 2) {
            const newAddresses = contractAddresses.filter((_, i) => i !== index);
            setContractAddresses(newAddresses);
            
            const newErrors = { ...errors };
            delete newErrors[index];
            setErrors(newErrors);
        }
    };

    const handleCompare = () => {
        const newErrors = {};
        const validAddresses = [];

        contractAddresses.forEach((address, index) => {
            const error = validateAddress(address);
            if (error) {
                newErrors[index] = error;
            } else {
                validAddresses.push(address);
            }
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        if (validAddresses.length < 2) {
            alert('Please enter at least 2 valid contract addresses');
            return;
        }

        onCompare(validAddresses);
    };

    const clearAll = () => {
        setContractAddresses(['', '']);
        setErrors({});
    };

    return (
        <div className="comparison-selector">
            <div className="comparison-header">
                <h3>📊 Contract Comparison Tool</h3>
                <p>Compare up to 5 smart contracts side-by-side</p>
            </div>

            <div className="contract-inputs">
                {contractAddresses.map((address, index) => (
                    <div key={index} className="contract-input-group">
                        <label className="contract-input-label">
                            Contract {index + 1}
                        </label>
                        <div className="contract-input-wrapper">
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => handleAddressChange(index, e.target.value)}
                                placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
                                className={`contract-input ${errors[index] ? 'error' : ''}`}
                                disabled={isLoading}
                            />
                            {contractAddresses.length > 2 && (
                                <button
                                    type="button"
                                    onClick={() => removeContract(index)}
                                    className="remove-contract-btn"
                                    disabled={isLoading}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        {errors[index] && (
                            <span className="error-message">{errors[index]}</span>
                        )}
                    </div>
                ))}
            </div>

            <div className="comparison-actions">
                {contractAddresses.length < 5 && (
                    <button
                        type="button"
                        onClick={addContract}
                        className="add-contract-btn"
                        disabled={isLoading}
                    >
                        + Add Contract ({contractAddresses.length}/5)
                    </button>
                )}
                
                <div className="action-buttons">
                    <button
                        type="button"
                        onClick={clearAll}
                        className="clear-btn"
                        disabled={isLoading}
                    >
                        Clear All
                    </button>
                    <button
                        type="button"
                        onClick={handleCompare}
                        className="compare-btn"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="spinner-small"></div>
                                Comparing...
                            </>
                        ) : (
                            'Compare Contracts'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ComparisonSelector;
