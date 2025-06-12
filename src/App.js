import React, { useState, useCallback, useMemo } from 'react';
import { Upload, TrendingUp, DollarSign, PieChart, Calendar, FileText, Calculator, Target, AlertCircle, CheckCircle } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// South African Tax Brackets 2025/2026
const TAX_BRACKETS_2025_26 = [
  { min: 0, max: 262150, rate: 0.18, baseAmount: 0 },
  { min: 262151, max: 410460, rate: 0.26, baseAmount: 47187 },
  { min: 410461, max: 555600, rate: 0.31, baseAmount: 85737 },
  { min: 555601, max: 708310, rate: 0.36, baseAmount: 130740 },
  { min: 708311, max: 1500000, rate: 0.39, baseAmount: 185696 },
  { min: 1500001, max: 1958310, rate: 0.41, baseAmount: 494445 },
  { min: 1958311, max: Infinity, rate: 0.45, baseAmount: 682335 }
];

const PRIMARY_REBATE = 18984;

// Transaction categories for automatic classification
const EXPENSE_CATEGORIES = {
  'Housing': ['SBSA HOMEL', 'bond', 'mortgage', 'rates', 'levy', 'POINT GARDEN'],
  'Insurance': ['DISCINSURE', 'insurance', 'CARTRACK'],
  'Medical': ['DISC PREM', 'medical aid'],
  'Transport': ['ENGEN', 'BP PINELAND', 'petrol', 'ACSA'],
  'Food & Dining': ['WOOLWORTHS', 'Checkers', 'MCD', 'BOOTLEGGER', 'Tops Sunrise'],
  'Utilities': ['AFRIHOST', 'MTN', 'VIRGIN', 'internet', 'phone'],
  'Banking': ['fixed monthly fee', 'bank fees', 'overdraft'],
  'Investment': ['INVESTEC', 'OM UNITTRU', '10XRA COL'],
  'Shopping': ['CLICKS', 'PNA', 'ROZPRINT'],
  'Entertainment': ['Netflix', 'DSTV', 'YouTube', 'Apple'],
  'Professional': ['SARS', 'tax', 'PERSONAL TAX'],
  'Other': []
};

const INCOME_KEYWORDS = [
  // Salary/Employment
  'SALARY', 'WAGES', 'PAY', 'PAYROLL', 'EMPLOYEE', 'EMPLOYER',
  
  // Business/Freelance
  'PAYMENT', 'INVOICE', 'CLIENT', 'CONTRACT', 'FREELANCE', 'CONSULTING',
  'TRANSFER', 'DEPOSIT', 'CREDIT',
  
  // Investment/Returns
  'DIVIDEND', 'INTEREST', 'RETURN', 'INVESTMENT', 'PROFIT',
  
  // Government/Benefits
  'SASSA', 'UIF', 'GRANT', 'PENSION', 'REFUND',
  
  // Common SA company indicators
  'PTY', 'LTD', 'CC', 'PROPRIETARY', 'LIMITED',
  
  // Generic positive transaction indicators
  'INWARD', 'INCOMING', 'RECEIPT', 'RECEIVED'
];

// Inter-account transfer keywords to exclude from income
const TRANSFER_KEYWORDS = [
  'TRANSFER', 'TRF', 'TFRF', 'TRANSF',
  'IB PAYMENT', 'IB TRANSFER', 'INTERNET BANKING',
  'INT ACNT', 'INTERNAL', 'INTER ACCOUNT',
  'FUND TRANSFER', 'FUNDS TRANSFER',
  'OWN ACCOUNT', 'BETWEEN ACCOUNTS',
  'PAYMENT TO', 'PAYMENT FROM',
  'DEBIT ORDER REVERSAL', 'CREDIT REVERSAL'
];

const BankStatementAnalyzer = () => {
  const [statements, setStatements] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [manualEntries, setManualEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [newEntry, setNewEntry] = useState({
    date: '',
    description: '',
    amount: '',
    type: 'expense',
    category: 'Other'
  });

  // Calculate tax liability
  const calculateTax = useCallback((annualIncome) => {
    let tax = 0;
    let remainingIncome = annualIncome;

    for (const bracket of TAX_BRACKETS_2025_26) {
      if (remainingIncome <= 0) break;
      
      const taxableInThisBracket = Math.min(
        remainingIncome,
        bracket.max === Infinity ? remainingIncome : bracket.max - bracket.min + 1
      );
      
      tax += taxableInThisBracket * bracket.rate;
      remainingIncome -= taxableInThisBracket;
    }

    return Math.max(0, tax - PRIMARY_REBATE);
  }, []);

  // Check if transaction is an inter-account transfer
  const isInterAccountTransfer = useCallback((description) => {
    const desc = description.toUpperCase();
    return TRANSFER_KEYWORDS.some(keyword => desc.includes(keyword.toUpperCase()));
  }, []);

  // Check if transaction is income (excluding inter-account transfers)
  const isIncome = useCallback((description, amount) => {
    const desc = description.toUpperCase();
    
    // First check if it's a transfer - if so, not income
    if (isInterAccountTransfer(description)) return false;
    
    // If amount is negative, definitely not income
    if (amount <= 0) return false;
    
    // Check for explicit income keywords
    const hasIncomeKeyword = INCOME_KEYWORDS.some(keyword => desc.includes(keyword.toUpperCase()));
    if (hasIncomeKeyword) return true;
    
    // For positive amounts without clear expense indicators, assume income
    // This helps catch salary payments, client payments, etc. that might not match keywords
    const expenseIndicators = ['FEE', 'CHARGE', 'DEBIT', 'WITHDRAWAL', 'PURCHASE', 'BUY', 'SHOP'];
    const hasExpenseIndicator = expenseIndicators.some(keyword => desc.includes(keyword));
    
    // If it's a positive amount > R100 without expense indicators, likely income
    if (amount > 100 && !hasExpenseIndicator) {
      return true;
    }
    
    return false;
  }, [isInterAccountTransfer]);

  // Categorize transaction based on description
  const categorizeTransaction = useCallback((description) => {
    const desc = description.toUpperCase();
    
    for (const [category, keywords] of Object.entries(EXPENSE_CATEGORIES)) {
      if (keywords.some(keyword => desc.includes(keyword.toUpperCase()))) {
        return category;
      }
    }
    
    return 'Other';
  }, []);

  // Helper function to check if a row is a header
  const isHeaderRow = useCallback((rowText) => {
    const headerKeywords = [
      'date', 'description', 'amount', 'balance', 'debit', 'credit',
      'transaction', 'reference', 'details', 'account', 'statement'
    ];
    const lowerText = rowText.toLowerCase();
    return headerKeywords.some(keyword => lowerText.includes(keyword)) && 
           rowText.length < 50; // Headers are usually short
  }, []);

  // Enhanced amount parsing
  const parseAmount = useCallback((amountStr) => {
    // Remove currency symbols and clean up
    let cleaned = amountStr
      .replace(/[R\s$€£¥]/gi, '') // Remove currency symbols
      .replace(/[,\s]/g, '') // Remove thousands separators and spaces
      .trim();
    
    // Handle negative indicators
    let isNegative = false;
    if (cleaned.includes('-') || amountStr.toLowerCase().includes('dr')) {
      isNegative = true;
      cleaned = cleaned.replace(/[-]/g, '');
    }
    
    const numericAmount = parseFloat(cleaned);
    return isNegative ? -numericAmount : numericAmount;
  }, []);

  // Standardize date format
  const standardizeDate = useCallback((dateStr) => {
    try {
      // Try different date parsing approaches
      let date;
      
      if (/^\d{1,2}[-\/\s]\d{1,2}[-\/\s]\d{4}$/.test(dateStr)) {
        // DD/MM/YYYY format (South African standard)
        const parts = dateStr.split(/[-\/\s]/);
        date = new Date(parts[2], parts[1] - 1, parts[0]);
      } else {
        // Try native parsing
        date = new Date(dateStr);
      }
      
      if (isNaN(date)) {
        console.warn('Could not parse date:', dateStr);
        return dateStr; // Return original if parsing fails
      }
      
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    } catch (error) {
      console.warn('Date parsing error:', error, dateStr);
      return dateStr;
    }
  }, []);

  // Parse positioned text items into transactions
  const parsePositionedText = useCallback((textItems, pageNum) => {
    const transactions = [];
    
    // Sort items by Y position (top to bottom), then by X position (left to right)
    const sortedItems = textItems.sort((a, b) => {
      if (Math.abs(a.y - b.y) < 5) { // Same row (within 5 pixels)
        return a.x - b.x; // Sort by X position
      }
      return b.y - a.y; // Sort by Y position (higher Y first)
    });
    
    // Group items by rows (items with similar Y coordinates)
    const rows = [];
    let currentRow = [];
    let lastY = null;
    
    sortedItems.forEach(item => {
      if (lastY === null || Math.abs(item.y - lastY) < 5) {
        // Same row
        currentRow.push(item);
      } else {
        // New row
        if (currentRow.length > 0) {
          rows.push([...currentRow]);
        }
        currentRow = [item];
      }
      lastY = item.y;
    });
    
    // Add the last row
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
    
    console.log(`Page ${pageNum} - Rows found:`, rows.length);
    
    // Enhanced patterns for different date formats
    const datePatterns = [
      /^\d{1,2}[-\/\s]\d{1,2}[-\/\s]\d{4}$/, // DD/MM/YYYY, DD-MM-YYYY, DD MM YYYY
      /^\d{4}[-\/\s]\d{1,2}[-\/\s]\d{1,2}$/, // YYYY/MM/DD, YYYY-MM-DD
      /^\d{1,2}\s+\w{3}\s+\d{4}$/, // DD MMM YYYY
      /^\w{3}\s+\d{1,2},?\s+\d{4}$/, // MMM DD, YYYY
      /^\d{1,2}\s+\w+\s+\d{4}$/ // DD Month YYYY
    ];
    
    // Enhanced amount patterns
    const amountPatterns = [
      /^[\-\+]?\s*R?\s*\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?$/, // R1,234.56 or 1,234.56
      /^\d{1,3}(?:[,\s]\d{3})*\.\d{2}$/, // 1,234.56
      /^\d+\.\d{2}$/ // Simple 123.45
    ];
    
    // Process each row to find transaction data
    rows.forEach((row, rowIndex) => {
      if (row.length < 3) return; // Need at least 3 items for a transaction
      
      const rowText = row.map(item => item.text).join(' ');
      
      // Skip header rows and non-transaction rows
      if (isHeaderRow(rowText) || rowText.length < 10) return;
      
      // Find date in the row
      let dateText = '';
      let dateIndex = -1;
      
      for (let i = 0; i < row.length; i++) {
        const text = row[i].text;
        if (datePatterns.some(pattern => pattern.test(text))) {
          dateText = text;
          dateIndex = i;
          break;
        }
      }
      
      if (!dateText) return; // No date found, skip row
      
      // Find amounts in the row
      const amounts = [];
      const descriptions = [];
      
      row.forEach((item, index) => {
        const text = item.text;
        
        // Check if it's an amount
        if (amountPatterns.some(pattern => pattern.test(text))) {
          const cleanAmount = parseAmount(text);
          if (!isNaN(cleanAmount) && Math.abs(cleanAmount) > 0.01) {
            amounts.push({
              value: cleanAmount,
              position: item.x,
              original: text
            });
          }
        } 
        // Otherwise, it might be part of description
        else if (index !== dateIndex && text.length > 1 && !text.match(/^\d+$/)) {
          descriptions.push(text);
        }
      });
      
      if (amounts.length === 0) return; // No amounts found
      
      // Create transactions for each amount found
      amounts.forEach(amount => {
        const description = descriptions.join(' ').trim() || 'Transaction';
        
        // Determine if it's income or expense based on context and amount
        const isIncomeTransaction = amount.value > 0 && isIncome(description, amount.value);
        
        const transaction = {
          date: standardizeDate(dateText),
          description: description.substring(0, 100),
          amount: amount.value,
          type: amount.value >= 0 ? 'credit' : 'debit',
          category: isIncomeTransaction ? 'Income' : categorizeTransaction(description),
          isIncome: isIncomeTransaction,
          isTransfer: isInterAccountTransfer(description),
          source: `Page ${pageNum}, Row ${rowIndex + 1}`,
          rawData: rowText
        };
        
        transactions.push(transaction);
        
        console.log(`Transaction found: ${transaction.date} | ${description.substring(0, 20)}... | ${amount.value} | ${amount.original}`);
      });
    });
    
    return transactions;
  }, [isHeaderRow, parseAmount, standardizeDate, isIncome, categorizeTransaction, isInterAccountTransfer]);

  // Enhanced PDF parser using positioned text extraction
  const parsePDFStatement = useCallback(async (file) => {
    try {
      // Load PDF.js if not already loaded
      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      console.log('=== ENHANCED PDF PARSING DEBUG ===');
      console.log('PDF loaded, pages:', pdf.numPages);
      
      let allTransactions = [];
      
      // Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        console.log(`\nPage ${pageNum}:`);
        console.log('Text items found:', textContent.items.length);
        
        // Extract positioned text items instead of raw text
        const textItems = textContent.items.map(item => ({
          text: item.str.trim(),
          x: Math.round(item.transform[4]), // X position
          y: Math.round(item.transform[5]), // Y position
          width: Math.round(item.width),
          height: Math.round(item.height)
        })).filter(item => item.text.length > 0);
        
        console.log('Processed text items:', textItems.length);
        
        // Parse transactions from positioned text
        const pageTransactions = parsePositionedText(textItems, pageNum);
        allTransactions.push(...pageTransactions);
        
        console.log(`Page ${pageNum} transactions found:`, pageTransactions.length);
      }
      
      console.log('Total transactions found:', allTransactions.length);
      return allTransactions;
      
    } catch (error) {
      console.error('Enhanced PDF parsing error:', error);
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }, [parsePositionedText]);

  // Add manual entry
  const addManualEntry = useCallback(() => {
    if (!newEntry.date || !newEntry.description || !newEntry.amount) return;
    
    const entry = {
      ...newEntry,
      id: Date.now(),
      amount: newEntry.type === 'expense' ? -Math.abs(parseFloat(newEntry.amount)) : Math.abs(parseFloat(newEntry.amount)),
      isIncome: newEntry.type === 'income',
      isManual: true
    };
    
    setManualEntries(prev => [...prev, entry]);
    setNewEntry({
      date: '',
      description: '',
      amount: '',
      type: 'expense',
      category: 'Other'
    });
  }, [newEntry]);

  // Delete manual entry
  const deleteManualEntry = useCallback((id) => {
    setManualEntries(prev => prev.filter(entry => entry.id !== id));
  }, []);

  // Deduplicate transactions
  const deduplicateTransactions = useCallback((transactions) => {
    const seen = new Set();
    return transactions.filter(t => {
      const key = `${t.date}-${t.description}-${t.amount}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(async (files) => {
    setLoading(true);
    const errors = [];
    
    try {
      const newTransactions = [];
      
      for (const file of files) {
        try {
          console.log(`Processing file: ${file.name}`);
          const parsed = await parsePDFStatement(file);
          newTransactions.push(...parsed);
          console.log(`Successfully parsed ${parsed.length} transactions from ${file.name}`);
        } catch (error) {
          console.error(`Error parsing ${file.name}:`, error);
          errors.push(`Error parsing ${file.name}: ${error.message}`);
        }
      }
      
      // Deduplicate before adding to existing transactions
      setTransactions(prev => {
        const combined = [...prev, ...newTransactions];
        return deduplicateTransactions(combined);
      });
      setStatements(prev => [...prev, ...Array.from(files)]);
      
      if (newTransactions.length > 0) {
        setActiveTab('dashboard');
      }
      
      // Show errors if any
      if (errors.length > 0) {
        console.error('Parsing errors:', errors);
        alert('Some files could not be parsed:\n' + errors.join('\n'));
      }
      
    } catch (error) {
      console.error('Error processing files:', error);
      alert('Error processing files: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [parsePDFStatement, deduplicateTransactions]);

  // Analytics calculations
  const analytics = useMemo(() => {
    const allTransactions = [...transactions, ...manualEntries];
    const filteredTransactions = allTransactions.filter(t => {
      if (!dateRange.start || !dateRange.end) return true;
      const transDate = new Date(t.date);
      return transDate >= new Date(dateRange.start) && transDate <= new Date(dateRange.end);
    });

    // Filter out inter-account transfers from calculations
    const relevantTransactions = filteredTransactions.filter(t => !t.isTransfer);

    const income = relevantTransactions
      .filter(t => t.isIncome)
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = relevantTransactions
      .filter(t => !t.isIncome && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const categoryBreakdown = {};
    const incomeBreakdown = {};
    
    relevantTransactions.forEach(t => {
      if (t.isIncome) {
        incomeBreakdown[t.category || 'Income'] = (incomeBreakdown[t.category || 'Income'] || 0) + t.amount;
      } else if (t.amount < 0) {
        categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + Math.abs(t.amount);
      }
    });

    const monthlyData = {};
    relevantTransactions.forEach(t => {
      const month = t.date.substring(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { month, income: 0, expenses: 0 };
      }
      if (t.isIncome) {
        monthlyData[month].income += t.amount;
      } else if (t.amount < 0) {
        monthlyData[month].expenses += Math.abs(t.amount);
      }
    });

    const monthlyArray = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    // Tax calculations
    const annualIncome = income * (12 / (monthlyArray.length || 1)); // Project to annual
    const taxLiability = calculateTax(annualIncome);
    const netIncome = annualIncome - taxLiability;

    return {
      totalIncome: income,
      totalExpenses: expenses,
      netCashFlow: income - expenses,
      categoryBreakdown,
      incomeBreakdown,
      monthlyData: monthlyArray,
      annualIncome,
      taxLiability,
      netIncome,
      averageMonthlyIncome: income / (monthlyArray.length || 1),
      averageMonthlyExpenses: expenses / (monthlyArray.length || 1),
      transactionCount: relevantTransactions.length,
      transfersExcluded: filteredTransactions.length - relevantTransactions.length
    };
  }, [transactions, manualEntries, dateRange, calculateTax]);

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#87d068'];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bank Statement Financial Analyzer</h1>
          <p className="text-gray-600">Upload bank statements to analyze income, expenses, and tax liability with South African tax calculations</p>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'upload', name: 'Upload', icon: Upload },
              { id: 'manual', name: 'Manual Entry', icon: FileText },
              { id: 'dashboard', name: 'Dashboard', icon: TrendingUp },
              { id: 'categories', name: 'Categories', icon: PieChart },
              { id: 'tax', name: 'Tax Analysis', icon: Calculator },
              { id: 'forecast', name: 'Forecast', icon: Target }
            ].map(({ id, name, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'manual' && (
          <div className="space-y-6">
            {/* Manual Entry Form */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Add Manual Entry</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={newEntry.description}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Transaction description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newEntry.amount}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newEntry.type}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newEntry.category}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    {Object.keys(EXPENSE_CATEGORIES).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={addManualEntry}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Add Entry
                </button>
              </div>
            </div>

            {/* Manual Entries List */}
            {manualEntries.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Manual Entries</h3>
                <div className="space-y-2">
                  {manualEntries.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">{entry.date}</span>
                        <span className="font-medium">{entry.description}</span>
                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">{entry.category}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`font-semibold ${entry.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          R{Math.abs(entry.amount).toLocaleString()}
                        </span>
                        <button
                          onClick={() => deleteManualEntry(entry.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Bank Statements</h2>
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                loading 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
              onDrop={(e) => {
                e.preventDefault();
                if (!loading) {
                  const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
                  if (files.length > 0) {
                    handleFileUpload(files);
                  }
                }
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              {loading ? (
                <>
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-lg text-blue-600 mb-2">Processing PDF files...</p>
                  <p className="text-sm text-blue-500">This may take a few moments</p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg text-gray-600 mb-2">Drop PDF bank statements here</p>
                  <p className="text-sm text-gray-500 mb-4">or click to browse</p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      if (files.length > 0) {
                        handleFileUpload(files);
                      }
                    }}
                    className="hidden"
                    id="file-upload"
                    disabled={loading}
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
                  >
                    Select PDF Files
                  </label>
                </>
              )}
            </div>
            
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">📝 PDF Parsing Tips</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Upload PDF bank statements directly from your bank</li>
                <li>• Ensure PDFs are not password protected or scanned images</li>
                <li>• The parser works best with text-based PDFs from major SA banks</li>
                <li>• Multiple statement files can be uploaded at once</li>
                <li>• If parsing fails, try manual entry for important transactions</li>
              </ul>
            </div>
            
            {statements.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Uploaded Statements ({transactions.length} transactions parsed)</h3>
                <div className="space-y-2">
                  {statements.map((file, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <FileText className="w-5 h-5 text-gray-500" />
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  ))}
                </div>
                
                {/* Enhanced Debug Section */}
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <details>
                    <summary className="cursor-pointer font-medium text-blue-800 mb-2">
                      🔍 Enhanced Parser Debug Info (Click to expand)
                    </summary>
                    <div className="text-sm text-blue-700 space-y-2">
                      <p><strong>Total transactions found:</strong> {transactions.length}</p>
                      <p><strong>Income transactions:</strong> {transactions.filter(t => t.isIncome).length}</p>
                      <p><strong>Expense transactions:</strong> {transactions.filter(t => !t.isIncome && t.amount < 0).length}</p>
                      <p><strong>Transfer transactions:</strong> {transactions.filter(t => t.isTransfer).length}</p>
                      
                      {transactions.length > 0 && (
                        <div className="mt-3">
                          <p><strong>Sample transactions:</strong></p>
                          <div className="bg-white p-2 rounded border max-h-40 overflow-y-auto">
                            {transactions.slice(0, 10).map((t, i) => (
                              <div key={i} className="text-xs py-1 border-b last:border-b-0">
                                {t.date} | {t.description.substring(0, 30)}... | R{t.amount} | {t.category} | {t.source || 'Old parser'}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs text-blue-600 mt-2">
                        💡 The enhanced parser uses positioned text extraction for better table recognition. Check browser console (F12) for detailed parsing logs.
                      </p>
                    </div>
                  </details>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Date Range Filter & Info */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="border rounded px-3 py-2"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="border rounded px-3 py-2"
                  />
                  <button
                    onClick={() => setDateRange({ start: '', end: '' })}
                    className="px-4 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Clear
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  {analytics.transactionCount} transactions analyzed
                  {analytics.transfersExcluded > 0 && (
                    <span className="text-blue-600"> ({analytics.transfersExcluded} inter-account transfers excluded)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Income</p>
                    <p className="text-2xl font-bold text-green-600">R{analytics.totalIncome.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600">R{analytics.totalExpenses.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-red-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Net Cash Flow</p>
                    <p className={`text-2xl font-bold ${analytics.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      R{analytics.netCashFlow.toLocaleString()}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Estimated Annual Tax</p>
                    <p className="text-2xl font-bold text-orange-600">R{analytics.taxLiability.toLocaleString()}</p>
                  </div>
                  <Calculator className="w-8 h-8 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Monthly Income vs Expenses</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`R${value.toLocaleString()}`, '']} />
                    <Legend />
                    <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Expense Categories</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={Object.entries(analytics.categoryBreakdown).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(analytics.categoryBreakdown).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `R${value.toLocaleString()}`} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-6">
            {/* Income Sources - Itemized */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">💰 Income Sources - Itemized</h2>
              {(() => {
                const allTransactions = [...transactions, ...manualEntries];
                const filteredTransactions = allTransactions.filter(t => {
                  if (!dateRange.start || !dateRange.end) return true;
                  const transDate = new Date(t.date);
                  return transDate >= new Date(dateRange.start) && transDate <= new Date(dateRange.end);
                });
                const incomeTransactions = filteredTransactions.filter(t => t.isIncome && !t.isTransfer);
                
                if (incomeTransactions.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No income transactions found</p>
                      <p className="text-sm text-gray-400 mt-2">Upload statements or add manual entries to see your income breakdown</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                      {incomeTransactions
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((transaction, index) => (
                          <div key={index} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center space-x-4">
                              <div className="text-sm text-gray-500 w-24 font-mono">{transaction.date}</div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{transaction.description}</div>
                                <div className="text-sm text-green-600 font-medium">{transaction.category || 'Income'}</div>
                                {transaction.source && <div className="text-xs text-gray-400">{transaction.source}</div>}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-700 text-lg">+R{transaction.amount.toLocaleString()}</div>
                              <div className="text-xs space-x-2">
                                {transaction.isManual && <span className="text-blue-600 font-medium">Manual Entry</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                    <div className="border-t-2 border-green-200 pt-4">
                      <div className="flex justify-between items-center font-bold text-xl">
                        <span className="text-gray-800">Total Income:</span>
                        <span className="text-green-700">R{incomeTransactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {incomeTransactions.length} transaction{incomeTransactions.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Expense Breakdown by Category */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">💸 Expenses - Itemized by Category</h2>
              {(() => {
                const allTransactions = [...transactions, ...manualEntries];
                const filteredTransactions = allTransactions.filter(t => {
                  if (!dateRange.start || !dateRange.end) return true;
                  const transDate = new Date(t.date);
                  return transDate >= new Date(dateRange.start) && transDate <= new Date(dateRange.end);
                });
                const expenseTransactions = filteredTransactions.filter(t => !t.isIncome && t.amount < 0 && !t.isTransfer);
                
                if (expenseTransactions.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <PieChart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No expense transactions found</p>
                      <p className="text-sm text-gray-400 mt-2">Upload statements or add manual entries to see your expense breakdown</p>
                    </div>
                  );
                }

                // Group by category
                const expensesByCategory = {};
                expenseTransactions.forEach(t => {
                  const category = t.category || 'Other';
                  if (!expensesByCategory[category]) {
                    expensesByCategory[category] = [];
                  }
                  expensesByCategory[category].push(t);
                });

                const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

                return (
                  <div className="space-y-6">
                    {Object.entries(expensesByCategory)
                      .sort(([,a], [,b]) => {
                        const totalA = a.reduce((sum, t) => sum + Math.abs(t.amount), 0);
                        const totalB = b.reduce((sum, t) => sum + Math.abs(t.amount), 0);
                        return totalB - totalA;
                      })
                      .map(([category, categoryTransactions]) => {
                        const categoryTotal = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
                        const percentage = ((categoryTotal / totalExpenses) * 100).toFixed(1);
                        
                        return (
                          <div key={category} className="border border-red-200 rounded-lg overflow-hidden">
                            <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                              <div className="flex justify-between items-center">
                                <h3 className="font-bold text-red-800 text-lg">{category}</h3>
                                <div className="text-right">
                                  <div className="font-bold text-red-700 text-lg">R{categoryTotal.toLocaleString()}</div>
                                  <div className="text-sm text-red-600">{percentage}% of total expenses</div>
                                </div>
                              </div>
                            </div>
                            <div className="p-4 space-y-2 bg-white">
                              {categoryTransactions
                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                .map((transaction, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                                    <div className="flex items-center space-x-4">
                                      <div className="text-sm text-gray-500 w-24 font-mono">{transaction.date}</div>
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900">{transaction.description}</div>
                                        {transaction.source && <div className="text-xs text-gray-400">{transaction.source}</div>}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-red-600">-R{Math.abs(transaction.amount).toLocaleString()}</div>
                                      {transaction.isManual && <div className="text-xs text-blue-600 font-medium">Manual Entry</div>}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        );
                      })}
                    <div className="border-t-2 border-red-200 pt-4">
                      <div className="flex justify-between items-center font-bold text-xl">
                        <span className="text-gray-800">Total Expenses:</span>
                        <span className="text-red-700">R{totalExpenses.toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {expenseTransactions.length} transaction{expenseTransactions.length !== 1 ? 's' : ''} across {Object.keys(expensesByCategory).length} categories
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'tax' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">South African Tax Analysis (2025/2026)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Tax Calculation</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Annual Income:</span>
                      <span className="font-semibold">R{analytics.annualIncome.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax Liability:</span>
                      <span className="font-semibold text-red-600">R{analytics.taxLiability.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Primary Rebate:</span>
                      <span className="font-semibold text-green-600">R{PRIMARY_REBATE.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-3">
                      <span>Net Income:</span>
                      <span className="font-bold text-blue-600">R{analytics.netIncome.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Effective Tax Rate:</span>
                      <span className="font-semibold">{((analytics.taxLiability / analytics.annualIncome) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-3">2025/26 Tax Brackets</h3>
                  <div className="space-y-2 text-sm">
                    {TAX_BRACKETS_2025_26.slice(0, -1).map((bracket, index) => (
                      <div key={index} className="flex justify-between">
                        <span>R{bracket.min.toLocaleString()} - R{bracket.max.toLocaleString()}</span>
                        <span>{(bracket.rate * 100)}%</span>
                      </div>
                    ))}
                    <div className="flex justify-between">
                      <span>R1,958,311+</span>
                      <span>45%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Tax Optimization Recommendations</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">Retirement Annuity Contributions</p>
                    <p className="text-blue-600">Consider maximizing RA contributions (27.5% of income, max R350,000) to reduce taxable income.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">Medical Aid Tax Credits</p>
                    <p className="text-green-600">You're receiving medical aid tax credits which reduce your tax liability.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Provisional Tax</p>
                    <p className="text-yellow-600">As a contractor, ensure you're paying provisional tax to avoid penalties.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'forecast' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Financial Forecast & Recommendations</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">12-Month Projection</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Projected Annual Income:</span>
                      <span className="font-semibold">R{analytics.annualIncome.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Projected Annual Expenses:</span>
                      <span className="font-semibold">R{(analytics.averageMonthlyExpenses * 12).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Projected Tax:</span>
                      <span className="font-semibold">R{analytics.taxLiability.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-3">
                      <span>Net Available:</span>
                      <span className="font-bold">R{(analytics.annualIncome - (analytics.averageMonthlyExpenses * 12) - analytics.taxLiability).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3">Key Insights</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Savings Rate:</strong> You're saving {(((analytics.netCashFlow) / analytics.totalIncome) * 100).toFixed(1)}% of your income.
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>Largest Expense:</strong> {Object.entries(analytics.categoryBreakdown)
                          .sort(([,a], [,b]) => b - a)[0]?.[0]} accounts for {
                          ((Object.entries(analytics.categoryBreakdown)
                            .sort(([,a], [,b]) => b - a)[0]?.[1] / analytics.totalExpenses) * 100).toFixed(1)
                        }% of expenses.
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Monthly Average:</strong> You spend R{analytics.averageMonthlyExpenses.toLocaleString()} per month on average.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Emergency Fund</h4>
                  <p className="text-sm text-gray-600">
                    Target: R{(analytics.averageMonthlyExpenses * 6).toLocaleString()} (6 months expenses)
                  </p>
                </div>
                <div className="p-4 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Investment Goal</h4>
                  <p className="text-sm text-gray-600">
                    Consider investing R{(analytics.netCashFlow * 0.2).toLocaleString()} monthly (20% of surplus)
                  </p>
                </div>
                <div className="p-4 border border-purple-200 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2">Tax Optimization</h4>
                  <p className="text-sm text-gray-600">
                    Max RA contribution: R{Math.min(350000, analytics.annualIncome * 0.275).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 border border-orange-200 rounded-lg">
                  <h4 className="font-medium text-orange-800 mb-2">Debt Reduction</h4>
                  <p className="text-sm text-gray-600">
                    Bond balance appears around R3.7M - consider extra payments to reduce interest
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankStatementAnalyzer;