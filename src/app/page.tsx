"use client";

import React, { useState } from 'react';

type ChemoSessionData = {
  averageSessionCostUSD: number,
  costs: {
    totalLossesUSD: number,
    chemoSession: number
  }
}

const getMessage = (chemoSessions: number) => {
  if (chemoSessions === 0) {
    return "Congrats! You're a savvy trader with no losses to regret.";
  } else if (chemoSessions <= 5) {
    return "Oops! Looks like someone could've funded a few chemo sessions. Time to rethink those trades?";
  } else if (chemoSessions <= 10) {
    return "Wow, you could've been a chemo hero! Maybe consider donating some of those future gains?";
  } else {
    return "Whoa! You could've built a whole chemo clinic with those losses. Remember, donating is always a good investment.";
  }
};

export default function Home() {
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ChemoSessionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/calculate-chemo-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage || 'Failed to fetch data');
      }

      const data = await response.json();
      setResult(data);
    } catch (error: any) { // eslint-disable-line
      console.error(error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">EVM Donation Shamer</h1>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="mb-4">
          <label htmlFor="walletAddress" className="block text-gray-700 font-bold mb-2">
            Enter Wallet Address:
          </label>
          <input
            type="text"
            id="walletAddress"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-300 leading-tight focus:outline-none focus:shadow-outline"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer"
          disabled={isLoading}
        >
          {isLoading ? 'Calculating...' : 'Calculate'}
        </button>
      </form>

      {error && <div className="text-red-500 mb-4">{error}</div>}

        <div className="shadow-md border-gray-700 border-2 rounded px-8 pt-6 pb-8 mb-4">
          {isLoading ? (
            <p className="text-xl mb-4">
              Loading...
            </p>
          ) : result ? (
              <>
              <p className="text-xl mb-4">
                {getMessage(result.costs.chemoSession)}
              </p>

              <p className="text-xl mb-4">
                Based on your Ethereum transaction history, you could have donated for{' '}
                <span className="font-bold">{result.costs.chemoSession}</span> chemo treatment sessions!
              </p>
              <p className="text-gray-500 text-base">
                Your total estimated losses were <span className="font-bold">${result.costs.totalLossesUSD.toFixed(2)}</span>.
              </p>
              <p className="text-gray-500 text-base">
                The average cost per chemo session <span className="font-bold">${result.averageSessionCostUSD.toFixed(2)}</span>.
              </p>
              </>
          ) : null }
        </div>
    </div>
  );
}