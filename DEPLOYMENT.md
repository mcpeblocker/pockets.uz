# Production Deployment Guide for pockets.uz

This guide provides step-by-step instructions for deploying Pockets to production on `pockets.uz`.

## Prerequisites

- Domain: `pockets.uz` (and optionally `api.pockets.uz` for backend)
- Server/VPS with Node.js 18+ installed
- SSL certificate (Let's Encrypt recommended)
- Gmail account with App Password configured
- (Optional) Telegram bot for support notifications

## Environment Variables

Create a `.env` file in the project root with the following:

```env
# Frontend Configuration
NEXT_PUBLIC_SITE_URL=https://pockets.uz
NEXT_PUBLIC_API_URL=https://api.pockets.uz

# Backend Configuration
PORT=3001
HOST=0.0.0.0
FRONTEND_URL=https://pockets.uz
SITE_URL=https://pockets.uz
DATABASE_PATH=/var/www/pockets/server/data/pockets.db
JWT_SECRET=<generate-with-openssl-rand-hex-32>

# Email Configuration (Gmail SMTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password_16_chars
EMAIL_FROM=your_email@gmail.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false

# Telegram Bot (Optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_ADMIN_ID=your_telegram_chat_id

# Node Environment
NODE_ENV=production
```

### Generating JWT Secret

```bash
openssl rand -hex 32
```

### Gmail App Password Setup

1. Enable 2-factor authentication on your Gmail account
2. Go to [Google Account Settings](https://myaccount.google.com/apppasswords)
3. Generate an App Password for "Mail"
4. Use the 16-character password in `EMAIL_PASS`

## Backend Deployment

### Option 1: Direct Node.js Deployment

1. **Clone and install:**
   ```bash
   git clone <your-repo-url>
   cd pockets/server
   npm install --production
   ```

2. **Initialize database:**
   ```bash
   npm run migrate
   ```

3. **Set up process manager (PM2 recommended):**
   ```bash
   npm install -g pm2
   pm2 start npm --name "pockets-backend" -- start
   pm2 save
   pm2 startup
   ```

4. **Configure reverse proxy (nginx):**
   ```nginx
   server {
       listen 80;
       server_name api.pockets.uz;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Option 2: Docker Deployment

See `Dockerfile` and `docker-compose.yml` for containerized deployment.

## Frontend Deployment

### Option 1: Vercel (Recommended)

1. Push code to GitHub
2. Import repository in [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SITE_URL=https://pockets.uz`
   - `NEXT_PUBLIC_API_URL=https://api.pockets.uz`
   - `TELEGRAM_BOT_TOKEN` (optional)
   - `TELEGRAM_ADMIN_ID` (optional)
4. Deploy

### Option 2: Self-Hosted

1. **Build and start:**
   ```bash
   npm install --production
   npm run build
   NODE_ENV=production npm start
   ```

2. **Use PM2:**
   ```bash
   pm2 start npm --name "pockets-frontend" -- start
   ```

3. **Configure nginx:**
   ```nginx
   server {
       listen 80;
       server_name pockets.uz;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## SSL/HTTPS Setup

### Using Let's Encrypt (Certbot)

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d pockets.uz -d api.pockets.uz
```

Certbot will automatically configure nginx and set up auto-renewal.

### Using Cloudflare

1. Add your domain to Cloudflare
2. Update nameservers
3. Enable "Full (strict)" SSL mode
4. Cloudflare will handle SSL automatically

## DNS Configuration

### For subdomain setup (api.pockets.uz):

1. Add A record:
   - Name: `api`
   - Type: `A`
   - Value: Your server IP address
   - TTL: Auto

2. Add A record for main domain:
   - Name: `@` (or `pockets.uz`)
   - Type: `A`
   - Value: Your server IP address (or Vercel IP if using Vercel)
   - TTL: Auto

## Verification Checklist

- [ ] Backend health check: `curl https://api.pockets.uz/api/health`
- [ ] Frontend loads: `https://pockets.uz`
- [ ] User signup works
- [ ] Email verification emails are sent
- [ ] User can sign in after verification
- [ ] Event creation works
- [ ] Expense tracking works
- [ ] Email links point to correct domain
- [ ] CORS is configured correctly
- [ ] SSL certificates are valid
- [ ] Database has write permissions
- [ ] PM2 processes are running (if self-hosted)

## Troubleshooting

### Backend not accessible

- Check firewall: `sudo ufw allow 3001`
- Verify backend is running: `pm2 list`
- Check logs: `pm2 logs pockets-backend`

### CORS errors

- Ensure `FRONTEND_URL` in backend `.env` matches `NEXT_PUBLIC_SITE_URL` exactly
- Check nginx headers are forwarding correctly

### Email not sending

- Verify Gmail App Password is correct
- Check email logs in backend: `pm2 logs pockets-backend`
- Ensure `EMAIL_USER` and `EMAIL_PASS` are set correctly

### Database errors

- Ensure database directory exists: `mkdir -p /var/www/pockets/server/data`
- Check write permissions: `chmod 755 /var/www/pockets/server/data`
- Verify `DATABASE_PATH` in `.env` is correct

## Maintenance

### Database Backups

```bash
# Backup SQLite database
cp /var/www/pockets/server/data/pockets.db /var/backups/pockets-$(date +%Y%m%d).db
```

### Logs

```bash
# Backend logs
pm2 logs pockets-backend

# Frontend logs (if self-hosted)
pm2 logs pockets-frontend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Updates

```bash
# Pull latest code
git pull origin main

# Restart services
pm2 restart pockets-backend
pm2 restart pockets-frontend  # if self-hosted
```
