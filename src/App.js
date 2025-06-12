import React, { useState, useCallback, useMemo } from 'react';
import { Upload, TrendingUp, DollarSign, PieChart, Calendar, FileText, Calculator, Target, AlertCircle, CheckCircle } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ============================================================================
// MODULAR PDF PARSER - All modules embedded in single file
// ============================================================================

// PDF Text Extraction Module
const PDFTextExtractor = {
  async loadPDFJS() {
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
  },

  async extractPositionedText(file) {
    await this.loadPDFJS();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    console.log('=== PDF TEXT EXTRACTION ===');
    console.log('PDF loaded, pages:', pdf.numPages);
    
    const allPages = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const textItems = textContent.items.map(item => ({
        text: item.str.trim(),
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
        width: Math.round(item.width),
        height: Math.round(item.height)
      })).filter(item => item.text.length > 0);
      
      console.log(`Page ${pageNum}: ${textItems.length} text items extracted`);
      
      allPages.push({
        pageNum,
        textItems,
        rawTextContent: textContent
      });
    }
    
    return allPages;
  }
};

// Text Processing Module
const TextProcessor = {
  groupTextIntoRows(textItems, pageNum, tolerance = 8) {  // Increased tolerance
    const sortedItems = textItems.sort((a, b) => {
      if (Math.abs(a.y - b.y) < tolerance) {
        return a.x - b.x;
      }
      return b.y - a.y;
    });
    
    const rows = [];
    let currentRow = [];
    let lastY = null;
    
    sortedItems.forEach(item => {
      if (lastY === null || Math.abs(item.y - lastY) < tolerance) {
        currentRow.push(item);
      } else {
        if (currentRow.length > 0) {
          rows.push([...currentRow]);
        }
        currentRow = [item];
      }
      lastY = item.y;
    });
    
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
    
    console.log(`Page ${pageNum} - Grouped into ${rows.length} rows`);
    return rows;
  },

  debugRows(rows, pageNum, maxRows = 10) {
    console.log(`\n=== PAGE ${pageNum} ROW ANALYSIS ===`);
    rows.slice(0, maxRows).forEach((row, index) => {
      const rowText = row.map(item => item.text).join(' | ');
      console.log(`Row ${index + 1}: "${rowText}"`);
    });
  }
};

// Pattern Detection Module
const PatternDetector = {
  // More flexible date patterns for SA banks
  datePatterns: [
    /^\d{1,2}[-\/\s]\d{1,2}[-\/\s]\d{4}$/,    // DD/MM/YYYY
    /^\d{4}[-\/\s]\d{1,2}[-\/\s]\d{1,2}$/,    // YYYY/MM/DD  
    /^\d{1,2}\s+\w{3}\s+\d{4}$/,              // DD MMM YYYY
    /^\w{3}\s+\d{1,2},?\s+\d{4}$/,            // MMM DD, YYYY
    /^\d{1,2}\s+\w+\s+\d{4}$/,                // DD Month YYYY
    /^\d{2}\s\w{3}$/,                         // DD MMM
    /^\d{1,2}\s\w{3}$/,                       // D MMM
    /^\d{2}\/\d{2}$/,                         // DD/MM
    /^\d{1,2}\/\d{1,2}$/                      // D/M
  ],

  // More flexible amount patterns
  amountPatterns: [
    /^[\-\+]?\s*R?\s*\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?$/,  // R1,234.56
    /^\d{1,3}(?:[,\s]\d{3})*\.\d{2}$/,                       // 1,234.56
    /^\d+\.\d{2}$/,                                          // 123.45
    /^[\-\+]?\d{1,8}\.?\d{0,2}$/,                           // Simple numbers
    /^\d{1,3}(?:\s\d{3})*\.\d{2}$/                          // Space-separated thousands
  ],

  isDate(text) {
    const cleanText = text.trim();
    return this.datePatterns.some(pattern => pattern.test(cleanText));
  },

  isAmount(text) {
    const cleanText = text.replace(/\s+/g, '').trim();
    if (cleanText.length === 0) return false;
    
    const isAmountPattern = this.amountPatterns.some(pattern => pattern.test(cleanText));
    const parsedAmount = this.parseAmount(text);
    
    return isAmountPattern && parsedAmount !== null && Math.abs(parsedAmount) >= 0.01;
  },

  parseAmount(amountStr) {
    try {
      let cleaned = amountStr
        .replace(/[R\s$€£¥]/gi, '')
        .replace(/[,]/g, '')  // Remove commas
        .replace(/\s+/g, '')  // Remove all spaces
        .trim();
      
      let isNegative = false;
      if (cleaned.includes('-') || amountStr.toLowerCase().includes('dr')) {
        isNegative = true;
        cleaned = cleaned.replace(/[-]/g, '');
      }
      
      const numericAmount = parseFloat(cleaned);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return null;
      }
      
      return isNegative ? -numericAmount : numericAmount;
    } catch (error) {
      return null;
    }
  },

  standardizeDate(dateStr) {
    try {
      let date;
      
      if (/^\d{1,2}[-\/\s]\d{1,2}[-\/\s]\d{4}$/.test(dateStr)) {
        const parts = dateStr.split(/[-\/\s]/);
        date = new Date(parts[2], parts[1] - 1, parts[0]);
      } else if (/^\d{2}\s\w{3}$/.test(dateStr) || /^\d{1,2}\s\w{3}$/.test(dateStr)) {
        // Handle DD MMM format - assume current year
        date = new Date(dateStr + ' 2024');
      } else {
        date = new Date(dateStr);
      }
      
      if (isNaN(date)) {
        return dateStr;
      }
      
      return date.toISOString().split('T')[0];
    } catch (error) {
      return dateStr;
    }
  }
};

// Enhanced Transaction Detection Module  
const TransactionDetector = {
  isHeaderRow(rowText) {
    const headerKeywords = [
      'date', 'description', 'amount', 'balance', 'debit', 'credit',
      'transaction', 'reference', 'details', 'account', 'statement',
      'opening', 'closing', 'brought forward', 'carried forward'
    ];
    const lowerText = rowText.toLowerCase();
    const hasHeaderKeyword = headerKeywords.some(keyword => lowerText.includes(keyword));
    const isShort = rowText.length < 100;
    
    return hasHeaderKeyword && isShort;
  },

  detectTransactionInRow(row, rowIndex, pageNum) {
    const rowText = row.map(item => item.text).join(' ');
    
    console.log(`\n--- Analyzing Row ${rowIndex + 1} on Page ${pageNum} ---`);
    console.log(`Row text: "${rowText}"`);
    console.log(`Row items:`, row.map(item => `"${item.text}"`));
    
    // Skip obviously non-transaction rows
    if (this.isHeaderRow(rowText)) {
      console.log(`❌ Skipped: Header row`);
      return null;
    }
    
    if (rowText.length < 5) {  // Reduced from 10
      console.log(`❌ Skipped: Too short (${rowText.length} chars)`);
      return null;
    }
    
    if (row.length < 2) {  // Need at least 2 items
      console.log(`❌ Skipped: Too few items (${row.length})`);
      return null;
    }
    
    // Find dates and amounts in the row
    const dates = [];
    const amounts = [];
    const descriptions = [];
    
    row.forEach((item, index) => {
      const text = item.text.trim();
      
      if (PatternDetector.isDate(text)) {
        dates.push({ text, index, item });
        console.log(`📅 Found date: "${text}" at position ${index}`);
      } else if (PatternDetector.isAmount(text)) {
        const amount = PatternDetector.parseAmount(text);
        if (amount !== null) {
          amounts.push({ value: amount, text, index, item });
          console.log(`💰 Found amount: "${text}" = ${amount} at position ${index}`);
        }
      } else if (text.length > 1 && !text.match(/^\d+$/) && !text.match(/^[A-Z]{1,3}$/)) {
        descriptions.push({ text, index, item });
      }
    });
    
    console.log(`📊 Analysis: ${dates.length} dates, ${amounts.length} amounts, ${descriptions.length} descriptions`);
    
    // More flexible requirements
    let hasDateLikeText = dates.length > 0;
    let hasAmountLikeText = amounts.length > 0;
    
    // If no explicit dates found, look for number-like patterns that could be dates
    if (!hasDateLikeText) {
      const possibleDates = row.filter(item => 
        /\d/.test(item.text) && 
        item.text.length >= 2 && 
        item.text.length <= 10
      );
      if (possibleDates.length > 0) {
        console.log(`🔍 Possible date candidates:`, possibleDates.map(d => d.text));
        // Use first number-like text as potential date
        hasDateLikeText = true;
        dates.push({ text: possibleDates[0].text, index: 0, item: possibleDates[0] });
      }
    }
    
    // If no explicit amounts found, look for any numbers
    if (!hasAmountLikeText) {
      const possibleAmounts = row.filter(item => {
        const text = item.text.replace(/[^\d\.\-]/g, '');
        return /^\d+\.?\d*$/.test(text) && parseFloat(text) > 0;
      });
      if (possibleAmounts.length > 0) {
        console.log(`🔍 Possible amount candidates:`, possibleAmounts.map(a => a.text));
        possibleAmounts.forEach(item => {
          const amount = parseFloat(item.text.replace(/[^\d\.\-]/g, ''));
          if (!isNaN(amount) && amount > 0) {
            amounts.push({ value: amount, text: item.text, index: 0, item });
            hasAmountLikeText = true;
          }
        });
      }
    }
    
    // Require at least some structured data
    if (!hasDateLikeText && !hasAmountLikeText) {
      console.log(`❌ Rejected: No dates or amounts found`);
      return null;
    }
    
    if (descriptions.length === 0 && rowText.length > 5) {
      // Use the entire row text as description if no specific description items
      descriptions.push({ text: rowText, index: 0, item: row[0] });
    }
    
    // Create transaction(s)
    const transactions = [];
    const primaryDate = dates.length > 0 ? dates[0] : { text: 'Unknown', index: 0 };
    const description = descriptions.map(d => d.text).join(' ').trim() || rowText.trim() || 'Transaction';
    
    if (amounts.length === 0) {
      // Create a transaction even without explicit amounts for debugging
      amounts.push({ value: 0, text: 'N/A', index: 0 });
    }
    
    amounts.forEach(amount => {
      const transaction = {
        date: PatternDetector.standardizeDate(primaryDate.text),
        description: description.substring(0, 100),
        amount: amount.value,
        type: amount.value >= 0 ? 'credit' : 'debit',
        source: `Page ${pageNum}, Row ${rowIndex + 1}`,
        rawData: rowText,
        debug: {
          dateFound: primaryDate.text,
          amountFound: amount.text,
          descriptionItems: descriptions.length,
          originalRow: row.map(item => item.text)
        }
      };
      
      transactions.push(transaction);
      console.log(`✅ Created transaction: ${transaction.date} | ${description.substring(0, 20)}... | ${amount.value}`);
    });
    
    return transactions.length === 1 ? transactions[0] : transactions;
  },

  parseTransactionsFromRows(rows, pageNum) {
    console.log(`\n=== TRANSACTION DETECTION PAGE ${pageNum} ===`);
    const transactions = [];
    
    // Enhanced debugging - show sample rows
    TextProcessor.debugRows(rows, pageNum, 10);
    
    rows.forEach((row, rowIndex) => {
      const result = this.detectTransactionInRow(row, rowIndex, pageNum);
      
      if (result) {
        if (Array.isArray(result)) {
          transactions.push(...result);
        } else {
          transactions.push(result);
        }
      }
    });
    
    console.log(`📈 Page ${pageNum} final result: ${transactions.length} transactions found`);
    return transactions;
  }
};

// Transaction categorization
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

const TransactionCategorizer = {
  categorizeTransaction(description) {
    const desc = description.toUpperCase();
    for (const [category, keywords] of Object.entries(EXPENSE_CATEGORIES)) {
      if (keywords.some(keyword => desc.includes(keyword.toUpperCase()))) {
        return category;
      }
    }
    return 'Other';
  },

  isIncome(description, amount) {
    return amount > 0 && !description.toLowerCase().includes('transfer');
  },

  processTransaction(transaction) {
    const isIncomeTransaction = this.isIncome(transaction.description, transaction.amount);
    return {
      ...transaction,
      category: isIncomeTransaction ? 'Income' : this.categorizeTransaction(transaction.description),
      isIncome: isIncomeTransaction,
      isTransfer: false  // Simplified for now
    };
  },

  deduplicateTransactions(transactions) {
    const seen = new Set();
    return transactions.filter(t => {
      const key = `${t.date}-${t.description}-${t.amount}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
};

// Main PDF Parser
const BankStatementPDFParser = {
  async parseFile(file) {
    try {
      console.log(`\n=== PARSING FILE: ${file.name} ===`);
      
      const pages = await PDFTextExtractor.extractPositionedText(file);
      let allTransactions = [];
      
      for (const page of pages) {
        const { pageNum, textItems } = page;
        const rows = TextProcessor.groupTextIntoRows(textItems, pageNum);
        const pageTransactions = TransactionDetector.parseTransactionsFromRows(rows, pageNum);
        allTransactions.push(...pageTransactions);
      }
      
      console.log(`\n🎯 FINAL RESULT: ${allTransactions.length} transactions found`);
      return allTransactions;
      
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

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

  // Handle file upload using modular parser
  const handleFileUpload = useCallback(async (files) => {
    setLoading(true);
    const errors = [];
    
    try {
      const newTransactions = [];
      
      for (const file of files) {
        try {
          console.log(`\n=== PROCESSING FILE: ${file.name} ===`);
          
          const rawTransactions = await BankStatementPDFParser.parseFile(file);
          const processedTransactions = rawTransactions.map(t => 
            TransactionCategorizer.processTransaction(t)
          );
          
          newTransactions.push(...processedTransactions);
          console.log(`✅ Successfully processed ${processedTransactions.length} transactions from ${file.name}`);
          
        } catch (error) {
          console.error(`❌ Error parsing ${file.name}:`, error);
          errors.push(`Error parsing ${file.name}: ${error.message}`);
        }
      }
      
      setTransactions(prev => {
        const combined = [...prev, ...newTransactions];
        return TransactionCategorizer.deduplicateTransactions(combined);
      });
      
      setStatements(prev => [...prev, ...Array.from(files)]);
      
      if (newTransactions.length > 0) {
        setActiveTab('dashboard');
      }
      
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
  }, []);

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

  const deleteManualEntry = useCallback((id) => {
    setManualEntries(prev => prev.filter(entry => entry.id !== id));
  }, []);

  // Analytics calculations
  const analytics = useMemo(() => {
    const allTransactions = [...transactions, ...manualEntries];
    const filteredTransactions = allTransactions.filter(t => {
      if (!dateRange.start || !dateRange.end) return true;
      const transDate = new Date(t.date);
      return transDate >= new Date(dateRange.start) && transDate <= new Date(dateRange.end);
    });

    const relevantTransactions = filteredTransactions.filter(t => !t.isTransfer);

    const income = relevantTransactions
      .filter(t => t.isIncome)
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = relevantTransactions
      .filter(t => !t.isIncome && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const categoryBreakdown = {};
    
    relevantTransactions.forEach(t => {
      if (!t.isIncome && t.amount < 0) {
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
    const annualIncome = income * (12 / (monthlyArray.length || 1));
    const taxLiability = calculateTax(annualIncome);

    return {
      totalIncome: income,
      totalExpenses: expenses,
      netCashFlow: income - expenses,
      categoryBreakdown,
      monthlyData: monthlyArray,
      annualIncome,
      taxLiability,
      netIncome: annualIncome - taxLiability,
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

        {/* Upload Tab */}
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
                  <p className="text-sm text-blue-500">Check console for detailed parsing logs</p>
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
              <h4 className="font-medium text-yellow-800 mb-2">🔧 Enhanced Debugging Parser</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• This version has enhanced debugging and more flexible pattern matching</li>
                <li>• Check browser console (F12) for detailed step-by-step parsing logs</li>
                <li>• The parser now attempts to find transactions even with imperfect data</li>
                <li>• Report any issues with console logs for quick fixes</li>
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
                
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <details>
                    <summary className="cursor-pointer font-medium text-blue-800 mb-2">
                      🔍 Enhanced Debug Info (Click to expand)
                    </summary>
                    <div className="text-sm text-blue-700 space-y-2">
                      <p><strong>Total transactions found:</strong> {transactions.length}</p>
                      <p><strong>Income transactions:</strong> {transactions.filter(t => t.isIncome).length}</p>
                      <p><strong>Expense transactions:</strong> {transactions.filter(t => !t.isIncome && t.amount < 0).length}</p>
                      
                      {transactions.length > 0 && (
                        <div className="mt-3">
                          <p><strong>Sample transactions:</strong></p>
                          <div className="bg-white p-2 rounded border max-h-40 overflow-y-auto">
                            {transactions.slice(0, 10).map((t, i) => (
                              <div key={i} className="text-xs py-1 border-b last:border-b-0">
                                {t.date} | {t.description.substring(0, 30)}... | R{t.amount} | {t.source || 'Manual'}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs text-blue-600 mt-2">
                        💡 Enhanced parser with flexible pattern matching. All parsing steps logged to console.
                      </p>
                    </div>
                  </details>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual Entry Tab */}
        {activeTab === 'manual' && (
          <div className="space-y-6">
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

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
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

        {/* Other tabs simplified for focus */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Transaction Categories</h2>
            <p className="text-gray-600">Detailed category breakdown coming soon...</p>
          </div>
        )}

        {activeTab === 'tax' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Tax Analysis</h2>
            <p className="text-gray-600">Tax calculations coming soon...</p>
          </div>
        )}

        {activeTab === 'forecast' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Financial Forecast</h2>
            <p className="text-gray-600">Forecasting coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankStatementAnalyzer;