import React, { useState } from 'react';
import { Calculator, Upload, TrendingUp, AlertCircle } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('overview');

  const taxBrackets = [
    { income: "R0 - R262,150", rate: "18%" },
    { income: "R262,151 - R410,460", rate: "26%" },
    { income: "R410,461 - R555,600", rate: "31%" },
    { income: "R555,601 - R708,310", rate: "36%" },
    { income: "R708,311 - R1,500,000", rate: "39%" },
    { income: "R1,500,001 - R1,958,310", rate: "41%" },
    { income: "R1,958,311+", rate: "45%" }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            South African Bank Statement Analyzer
          </h1>
          <p className="text-gray-600">
            Financial analysis tool with SA tax calculations (2025/2026 tax year)
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-800">Demo Version</h3>
              <p className="text-blue-700 text-sm">
                This demonstrates the Bank Statement Analyzer concept. 
                Production version would include PDF parsing and real transaction processing.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('tax')}
              className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'tax'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Tax Calculator</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </button>
          </nav>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <Upload className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold mb-2">PDF Processing</h3>
              <p className="text-sm text-gray-600">
                Upload bank statement PDFs for automatic transaction extraction and categorization.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <Calculator className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-semibold mb-2">SA Tax Calculator</h3>
              <p className="text-sm text-gray-600">
                Calculate tax liability using current South African tax brackets and rebates.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <TrendingUp className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-semibold mb-2">Financial Analytics</h3>
              <p className="text-sm text-gray-600">
                Track expenses, analyze income patterns, and get financial insights.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'tax' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">SA Tax Brackets 2025/2026</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Taxable Income</th>
                    <th className="text-left py-2">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {taxBrackets.map((bracket, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2">{bracket.income}</td>
                      <td className="py-2 font-medium">{bracket.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                Primary Rebate: R18,984 | Secondary Rebate (65+): R6,030 | Tertiary Rebate (75+): R2,016
              </p>
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Bank Statements</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-gray-600 mb-2">Upload PDF statements</p>
              <p className="text-sm text-gray-500 mb-4">Demo version</p>
              <button className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                Select Files
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
