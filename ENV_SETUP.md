# Environment Variables Setup

This app uses environment variables for all API credentials. This keeps your secrets secure and out of version control.

## Quick Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local`** and fill in your actual API credentials:
   ```env
   LASTFM_API_KEY=your-actual-key-here
   LASTFM_API_SECRET=your-actual-secret-here
   LASTFM_USERNAME=your-username
   LASTFM_PASSWORD=your-password
   DISCOGS_USER_TOKEN=your-token-here
   DISCOGS_USERNAME=your-discogs-username
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   ```

3. **Restart your dev server** if it's running:
   ```bash
   npm run dev
   ```

## Required Variables

### Last.fm API
- `LASTFM_API_KEY` - Your Last.fm API key
- `LASTFM_API_SECRET` - Your Last.fm API secret
- `LASTFM_USERNAME` - Your Last.fm username
- `LASTFM_PASSWORD` - Your Last.fm password

**Get these from:** https://www.last.fm/api/account/create

### Discogs API
- `DISCOGS_USER_TOKEN` - Your Discogs personal access token
- `DISCOGS_USERNAME` - Your Discogs username

**Get these from:** https://www.discogs.com/settings/developers

### Google Cloud Vision API (Optional)
- `GOOGLE_CLOUD_PROJECT_ID` - Your Google Cloud project ID

**Note:** You also need to set `GOOGLE_APPLICATION_CREDENTIALS` as a system environment variable pointing to your service account JSON key file:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
```

## File Locations

- `.env.example` - Template file (committed to git)
- `.env.local` - Your actual credentials (gitignored, never commit this!)
- `.env` - Fallback (gitignored)

## Security Notes

✅ **DO:**
- Keep `.env.local` in your local project directory
- Add `.env.local` to `.gitignore` (already done)
- Use different credentials for development and production
- Rotate credentials if they're exposed

❌ **DON'T:**
- Commit `.env.local` to version control
- Share your `.env.local` file
- Hard-code credentials in source code
- Use production credentials in development

## Verification

The app includes a configuration validator that will show warnings if required variables are missing. You can also check manually:

```bash
# Check if variables are loaded (in Node.js)
node -e "require('dotenv').config({ path: '.env.local' }); console.log(process.env.LASTFM_API_KEY ? 'Set' : 'Missing')"
```

Or visit `/api/config/validate` in your browser to see the validation status.

## Troubleshooting

### Variables not loading?

1. Make sure the file is named `.env.local` (not `.env.local.txt`)
2. Restart your dev server after creating/editing `.env.local`
3. Check that variables don't have quotes around them (unless the quotes are part of the value)
4. Make sure there are no spaces around the `=` sign

### Still having issues?

- Check the console for warnings about missing variables
- Verify your `.env.local` file is in the project root directory
- Make sure Next.js is loading the file (it should automatically)
