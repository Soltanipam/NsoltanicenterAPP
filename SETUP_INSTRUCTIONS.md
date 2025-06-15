# Google API Setup Instructions

## Error: "API key not valid. Please pass a valid API key."

This error occurs because the Google API key is not properly configured. Follow these steps to fix it:

### Step 1: Get a Google API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the required APIs:
   - Go to "APIs & Services" > "Library"
   - Search for and enable "Google Sheets API"
   - Search for and enable "Google Drive API"

### Step 2: Create API Key

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the generated API key

### Step 3: Configure Your Environment

1. Open your `.env` file
2. Replace the placeholder with your actual API key:
   ```
   VITE_GOOGLE_API_KEY=your_actual_api_key_here
   ```

### Step 4: Restart Your Development Server

After updating the `.env` file, restart your development server:
```bash
npm run dev
```

### Important Notes:

- Keep your API key secure and never commit it to version control
- The API key should have access to Google Sheets API and Google Drive API
- Make sure your Google Sheets document is accessible with the API key
- If you're still getting errors, check that the spreadsheet ID in `src/config/googleConfig.ts` is correct

### Troubleshooting:

If you continue to have issues:
1. Verify the API key is correctly copied (no extra spaces)
2. Check that the Google Sheets API is enabled in your Google Cloud project
3. Ensure the spreadsheet exists and is accessible
4. Try creating a new API key if the current one doesn't work