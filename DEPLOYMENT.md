# Deploy Bank Statement Analyzer to Render

This guide will help you deploy the Bank Statement Analyzer React application to Render from a GitHub repository.

## Prerequisites

- GitHub account
- Render account (free at [render.com](https://render.com))
- Git installed on your local machine

## Step 1: Prepare Your Project Structure

Create the following project structure in a new directory:

```
bank-statement-analyzer/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── App.js
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

## Step 2: Create Required Files

### package.json
```json
{
  "name": "bank-statement-analyzer",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "lucide-react": "^0.263.1",
    "recharts": "^2.8.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
```

### public/index.html
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Bank Statement Financial Analyzer for South African taxes" />
    <title>Bank Statement Analyzer</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
```

### src/index.js
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### src/index.css
```css
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
```

### src/App.js
Copy the entire Bank Statement Analyzer component code from the artifact above.

## Step 3: Initialize Git Repository

1. Open terminal in your project directory
2. Initialize Git:
```bash
git init
git add .
git commit -m "Initial commit: Bank Statement Analyzer"
```

## Step 4: Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Name it "bank-statement-analyzer"
3. Don't initialize with README (we already have one)
4. Copy the repository URL

## Step 5: Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/bank-statement-analyzer.git
git branch -M main
git push -u origin main
```

## Step 6: Deploy to Render

1. **Sign up/Login to Render**
   - Go to [render.com](https://render.com)
   - Sign up or login (you can use your GitHub account)

2. **Create New Web Service**
   - Click "New +" button
   - Select "Web Service"
   - Connect your GitHub account if not already connected

3. **Configure Repository**
   - Select your "bank-statement-analyzer" repository
   - Click "Connect"

4. **Configure Build Settings**
   - **Name**: `bank-statement-analyzer` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose closest to your users (e.g., Oregon for global, Frankfurt for Europe)
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s build -l 3000`

5. **Environment Variables** (Optional)
   - You can add any environment variables if needed
   - For this app, none are required

6. **Advanced Settings**
   - **Auto-Deploy**: Leave enabled (deploys automatically on git push)
   - **Build Minutes**: Should be sufficient on free plan

7. **Deploy**
   - Click "Create Web Service"
   - Wait for the build and deployment (usually 2-5 minutes)

## Step 7: Access Your Application

Once deployment is complete:
- Your app will be available at: `https://your-app-name.onrender.com`
- Render provides a free SSL certificate automatically

## Step 8: Set Up Custom Domain (Optional)

If you have a custom domain:
1. Go to your Render dashboard
2. Click on your service
3. Go to "Settings" tab
4. Scroll to "Custom Domains"
5. Add your domain and follow DNS configuration instructions

## Troubleshooting

### Common Issues:

1. **Build Fails**
   - Check the build logs in Render dashboard
   - Ensure package.json has correct dependencies
   - Verify build command is correct

2. **App Won't Start**
   - Check start command: `npx serve -s build -l 3000`
   - Ensure port 3000 is being used

3. **PDF Parsing Issues**
   - PDF.js loads from CDN, ensure HTTPS is working
   - Check browser console for CORS or loading errors

4. **Memory Issues**
   - Free tier has 512MB RAM limit
   - Large PDF files might cause issues
   - Consider upgrading to paid plan if needed

### Updating Your App:

1. Make changes to your code locally
2. Commit and push to GitHub:
```bash
git add .
git commit -m "Update: description of changes"
git push origin main
```
3. Render will automatically rebuild and deploy

## Features Available:

✅ **Real PDF Upload & Parsing**: Uses PDF.js to extract transaction data  
✅ **South African Tax Calculations**: 2025/2026 tax brackets  
✅ **Expense Categorization**: Automatic classification of transactions  
✅ **Financial Analytics**: Income, expenses, and cash flow analysis  
✅ **Manual Entry**: Add transactions manually if needed  
✅ **Interactive Charts**: Visual representation of financial data  
✅ **Responsive Design**: Works on desktop and mobile  

## Security Notes:

- All PDF processing happens in the browser (client-side)
- No data is sent to servers for processing
- Files are not stored permanently
- Use HTTPS in production (provided by Render)

## Cost:

- **Render Free Tier**: 
  - 750 hours/month of usage
  - Automatic sleep after 15 minutes of inactivity
  - 512MB RAM
  - Perfect for personal use

- **Render Paid Plans**: Start at $7/month for always-on service

Your Bank Statement Analyzer is now live and ready to help analyze financial data with South African tax calculations!