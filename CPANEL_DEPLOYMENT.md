# tap2dine cPanel Deployment Guide

## Prerequisites
- cPanel hosting with **Node.js Selector** feature
- Domain pointed to your hosting
- Access to cPanel Terminal or SSH

---

## Step 1: Upload Files

### Option A: Using Git (Recommended)
1. Login to cPanel → **Terminal**
2. Run:
```bash
cd ~/public_html
git clone https://github.com/shabeeliqbal/tap2dine.git
cd tap2dine
```

### Option B: Upload ZIP
1. Download the repository as ZIP from GitHub
2. cPanel → **File Manager** → `public_html`
3. Upload and extract the ZIP file

---

## Step 2: Setup Backend

### 2.1 Create Node.js Application
1. cPanel → **Setup Node.js App**
2. Click **Create Application**
3. Fill in:
   - **Node.js version**: 18.x or 20.x
   - **Application mode**: Production
   - **Application root**: `public_html/tap2dine/backend`
   - **Application URL**: Choose one:
     - Subdomain: `api.yourdomain.com`
     - OR subfolder: `yourdomain.com/api`
   - **Application startup file**: `server.js`
4. Click **Create**

### 2.2 Install Dependencies
1. In the Node.js app page, click **Run NPM Install**
2. Or use Terminal:
```bash
cd ~/public_html/tap2dine/backend
source /home/YOUR_USERNAME/nodevenv/public_html/tap2dine/backend/18/bin/activate
npm install
```

### 2.3 Configure Environment Variables
In Node.js app settings, add these environment variables:

| Variable | Value |
|----------|-------|
| NODE_ENV | production |
| PORT | (cPanel assigns this automatically) |
| JWT_SECRET | your-random-secret-key-here |
| JWT_EXPIRES_IN | 7d |
| FRONTEND_URL | * |

### 2.4 Start the Application
Click **Restart** in the Node.js app settings

---

## Step 3: Setup Frontend

### 3.1 Create Node.js Application
1. cPanel → **Setup Node.js App**
2. Click **Create Application**
3. Fill in:
   - **Node.js version**: 18.x or 20.x
   - **Application mode**: Production
   - **Application root**: `public_html/tap2dine/frontend`
   - **Application URL**: `yourdomain.com` (your main domain)
   - **Application startup file**: `server.js`
4. Click **Create**

### 3.2 Create Custom Server File
Create `~/public_html/tap2dine/frontend/server.js`:

```javascript
const { execSync } = require('child_process');
const path = require('path');

// Start Next.js
process.chdir(path.join(__dirname));
require('next/dist/bin/next');
```

Or use Terminal to create a startup script:
```bash
cd ~/public_html/tap2dine/frontend
echo 'require("next/dist/bin/next")' > server.js
```

### 3.3 Configure Environment Variables
Add these in the Node.js app settings:

| Variable | Value |
|----------|-------|
| NEXT_PUBLIC_API_URL | https://api.yourdomain.com/api (or /api if same domain) |
| NEXT_PUBLIC_SOCKET_URL | https://api.yourdomain.com |
| BACKEND_URL | http://127.0.0.1:BACKEND_PORT |
| NODE_ENV | production |

**Note**: Replace `BACKEND_PORT` with the port assigned to your backend app (find it in backend app settings)

### 3.4 Build the Frontend
Using Terminal:
```bash
cd ~/public_html/tap2dine/frontend
source /home/YOUR_USERNAME/nodevenv/public_html/tap2dine/frontend/18/bin/activate
npm install
npm run build
```

### 3.5 Start the Application
Click **Restart** in the Node.js app settings

---

## Step 4: Configure .htaccess (If Needed)

If you're using subdirectory setup, create `.htaccess` in `public_html`:

```apache
RewriteEngine On

# API requests to backend
RewriteRule ^api/(.*)$ http://127.0.0.1:BACKEND_PORT/api/$1 [P,L]

# Socket.io
RewriteRule ^socket.io/(.*)$ http://127.0.0.1:BACKEND_PORT/socket.io/$1 [P,L]
```

---

## Step 5: Test Your Deployment

1. **Main Site**: `https://yourdomain.com`
2. **Admin Login**: `https://yourdomain.com/admin/login`
3. **API Health**: `https://api.yourdomain.com/api/health`

### Login Credentials:
- **Admin**: Create a new account via registration
- **Superadmin**: `superadmin@tap2dine.com` / `superadmin123`

---

## Troubleshooting

### Application not starting
1. Check Node.js app logs in cPanel
2. Verify environment variables are set correctly
3. Make sure `npm install` and `npm run build` completed successfully

### API Connection Failed
1. Check CORS settings (FRONTEND_URL environment variable)
2. Verify the NEXT_PUBLIC_API_URL is correct
3. Test API directly: `https://api.yourdomain.com/api/health`

### Socket.io Not Working
1. WebSocket might be blocked by hosting - check with support
2. Try using polling: Socket will fallback automatically

### Build Errors
```bash
# Clear cache and rebuild
cd ~/public_html/tap2dine/frontend
rm -rf .next node_modules
npm install
npm run build
```

---

## Updating the Application

```bash
cd ~/public_html/tap2dine
git pull origin main

# Rebuild backend
cd backend
npm install

# Rebuild frontend
cd ../frontend
npm install
npm run build

# Restart both apps in cPanel Node.js Selector
```
