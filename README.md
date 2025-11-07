# My Spend Tracker 💰

A simple, mobile-friendly web application to track your personal monthly expenses.

## Features

- 📱 Mobile-first responsive design
- 📅 Monthly expense tracking with quick month switching
- 🧾 Two-page workflow: monthly summary + detailed ledger
- 🏷️ Category-based expense organization and breakdown
- 💾 Local data storage (no server required)
- ✨ Clean and intuitive interface

## Deployment Options

### Option 1: GitHub Pages (Recommended - Free & Easy)

1. **Create a GitHub repository:**
   - Go to [github.com](https://github.com) and create a new repository
   - Name it something like `spend-tracker` or `my-expenses`

2. **Push your code:**
   ```bash
   git add .
   git commit -m "Initial commit: Expense tracker app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under **Source**, select **main** branch and **/ (root)** folder
   - Click **Save**
   - Your site will be live at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

4. **Access from your phone:**
   - Open the URL in your phone's browser
   - Add it to your home screen for quick access

### Option 2: Netlify (Drag & Drop - Easiest)

1. **Go to [netlify.com](https://netlify.com)** and sign up (free)

2. **Deploy:**
   - Drag and drop this entire folder onto the Netlify dashboard
   - Or connect your GitHub repository for automatic deployments

3. **Access your site:**
   - Netlify will give you a URL like `your-app-name.netlify.app`
   - You can customize the domain name in settings

### Option 3: Vercel (Also Easy)

1. **Go to [vercel.com](https://vercel.com)** and sign up (free)

2. **Deploy:**
   - Install Vercel CLI: `npm i -g vercel`
   - Run `vercel` in this folder and follow the prompts
   - Or connect your GitHub repository through the dashboard

3. **Access your site:**
   - Vercel will provide a URL automatically

### Option 4: Local Server (For Testing)

If you want to test locally before deploying:

```bash
# Using Python (if installed)
python -m http.server 8000

# Or using Node.js http-server
npx http-server -p 8000
```

Then open `http://localhost:8000` in your browser.

## Usage

1. Open `index.html` for the **Summary** view
   - Switch months with the arrows or dropdowns
   - Review totals, average per expense, top category, and recent items
   - Tap **View Details** to jump into the ledger page
2. Open `details.html` for the **Detail** view
   - Add expenses with description, amount, category, and date
   - Browse the full list of expenses for the selected month
   - Delete individual expenses (× button) or clear the entire month

## Data Storage

All data is stored locally in your browser using localStorage. This means:
- ✅ Your data stays private (never leaves your device)
- ✅ Works offline
- ⚠️ Data is tied to your browser/device
- ⚠️ Clearing browser data will delete your expenses

## Files

- `index.html` - Summary dashboard
- `details.html` - Expense management ledger
- `styles.css` - Styling and responsive design
- `tracker.js` - Shared data layer and state manager
- `summary.js` - Summary page interactions
- `details.js` - Detail page interactions

