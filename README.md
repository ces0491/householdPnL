# Bank Statement Analyzer

A comprehensive financial analysis tool for South African bank statements with automatic PDF parsing, expense categorization, and tax calculations.

![Bank Statement Analyzer](https://img.shields.io/badge/React-18.2.0-blue)
![PDF.js](https://img.shields.io/badge/PDF.js-3.11-green)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-blue)

## 🚀 Features

### 📄 PDF Processing
- **Real PDF Upload**: Drag & drop or select PDF bank statements
- **Automatic Text Extraction**: Uses PDF.js to parse transaction data
- **Smart Transaction Detection**: Recognizes dates, amounts, and descriptions
- **Multiple File Support**: Upload multiple statements at once

### 💰 Financial Analysis
- **Income Tracking**: Automatic income detection and categorization
- **Expense Categorization**: Smart categorization of expenses (Housing, Food, Transport, etc.)
- **Cash Flow Analysis**: Monthly income vs expense tracking
- **Inter-account Transfer Detection**: Excludes transfers from income calculations

### 🇿🇦 South African Tax Features
- **2025/2026 Tax Brackets**: Current SA tax rates and brackets
- **Tax Liability Calculation**: Automatic tax estimation based on income
- **Primary Rebate**: Includes R18,984 primary rebate
- **Tax Optimization Tips**: Recommendations for RA contributions and tax planning

### 📊 Visual Analytics
- **Interactive Charts**: Income vs expenses, category breakdowns
- **Monthly Trends**: Track financial patterns over time
- **Pie Charts**: Visual expense category distribution
- **Key Metrics Dashboard**: Quick overview of financial health

### ✍️ Manual Entry
- **Add Transactions**: Manual entry for missing or cash transactions
- **Category Selection**: Choose from predefined categories
- **Income/Expense Types**: Specify transaction types
- **Edit & Delete**: Manage manual entries easily

### 📈 Forecasting & Recommendations
- **Annual Projections**: Estimate yearly income and expenses
- **Savings Rate**: Calculate percentage of income saved
- **Emergency Fund Goals**: Recommend 6-month expense buffer
- **Investment Suggestions**: Based on surplus cash flow

## 🛠️ Technology Stack

- **Frontend**: React 18.2, Tailwind CSS
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React for consistent iconography
- **PDF Processing**: PDF.js for client-side PDF parsing
- **State Management**: React Hooks (useState, useCallback, useMemo)

## 🔧 Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- Modern web browser with JavaScript enabled

### Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/bank-statement-analyzer.git
cd bank-statement-analyzer

# Install dependencies
npm install

# Start development server
npm start

# Open http://localhost:3000 in your browser
```

### Production Build
```bash
# Create production build
npm run build

# Serve production build locally
npx serve -s build
```

## 🚀 Deployment

### Render (Recommended)
1. Push code to GitHub repository
2. Connect GitHub to Render
3. Configure build settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s build -l 3000`
4. Deploy automatically

See [Deployment Guide](./DEPLOYMENT.md) for detailed instructions.

### Other Platforms
- **Netlify**: Drag & drop build folder or connect GitHub
- **Vercel**: Import GitHub repository
- **GitHub Pages**: Use `gh-pages` package

## 📖 Usage Guide

### 1. Upload Bank Statements
- Click "Upload" tab
- Drag & drop PDF files or click "Select PDF Files"
- Wait for processing (may take a few moments for large files)

### 2. Review Dashboard
- View total income, expenses, and net cash flow
- Check monthly trends and category breakdowns
- Review tax liability estimation

### 3. Add Manual Entries
- Use "Manual Entry" tab for cash transactions
- Fill in date, description, amount, type, and category
- Entries appear in all analytics

### 4. Analyze Categories
- "Categories" tab shows detailed transaction breakdown
- Review income sources and expense categories
- Identify spending patterns

### 5. Tax Planning
- "Tax Analysis" tab shows SA tax calculations
- Review tax optimization recommendations
- Plan RA contributions and other deductions

### 6. Financial Forecasting
- "Forecast" tab projects annual figures
- Get personalized recommendations
- Set savings and investment goals

## 🔒 Privacy & Security

- **Client-Side Processing**: All PDF parsing happens in your browser
- **No Data Upload**: Files are not sent to external servers
- **Local Storage**: Data stays on your device
- **HTTPS**: Secure connection when deployed
- **No Tracking**: No analytics or user tracking

## 🎯 Supported Bank Formats

The parser works best with text-based PDFs from major South African banks:
- Standard Bank
- FNB
- ABSA
- Nedbank
- Capitec
- African Bank
- Investec

**Note**: Scanned or image-based PDFs may not parse correctly. Use original PDF statements from your bank's online portal.

## 🔍 Transaction Categories

### Income Detection
- Salary payments
- Freelance/contract payments
- Investment returns
- Business income

### Expense Categories
- **Housing**: Bond payments, rates, levies
- **Insurance**: Medical aid, car insurance
- **Transport**: Petrol, public transport
- **Food & Dining**: Groceries, restaurants
- **Utilities**: Internet, phone, electricity
- **Medical**: Healthcare, pharmacy
- **Shopping**: Retail purchases
- **Entertainment**: Streaming, movies
- **Professional**: Tax, legal, business
- **Investment**: Portfolio contributions
- **Other**: Miscellaneous expenses

## 🐛 Troubleshooting

### PDF Won't Parse
- Ensure PDF is text-based (not scanned image)
- Try downloading fresh PDF from bank
- Use manual entry for problematic transactions

### Missing Transactions
- Check if transactions are categorized as transfers
- Add missing items via Manual Entry
- Verify date range filters

### Incorrect Categorization
- Categories are based on transaction descriptions
- Add manual entries with correct categories
- Future versions will allow custom rules

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Report bugs via GitHub Issues
- **Features**: Request features via GitHub Issues
- **Documentation**: Check deployment guide and code comments

## 🗺️ Roadmap

- [ ] Custom categorization rules
- [ ] Export reports to PDF/Excel
- [ ] Multi-currency support
- [ ] Bank API integrations
- [ ] Investment portfolio tracking
- [ ] Budget planning tools
- [ ] Mobile app version

---

**Made with ❤️ for South African financial planning**