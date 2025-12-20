# Pockets - Shared Expense Tracking App

**Make it extremely easy for willing people to share expenses transparently and settle them.**

Pockets is a modern web application that simplifies group expense management. No registration required to participate—just share a link and start tracking expenses!

## 🌟 Features

- **No Registration Required**: Participants can join events and view expenses without creating an account
- **Smart Split Calculation**: Automatically divides expenses equally among participants
- **Minimized Settlements**: Uses an algorithm to minimize the number of transactions needed
- **Email Notifications**: Automatic settlement emails when events close
- **Payment Tracking**: Mark payments as paid or pending
- **Mobile-First Design**: Responsive and accessible on all devices
- **Real-time Updates**: See expenses and participants update instantly

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth (Magic Links)
- **Email**: Nodemailer (Gmail SMTP)
- **Notifications**: Telegram Bot API

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Gmail account for SMTP (with App Password)
- Telegram Bot (optional, for support notifications)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/mcpeblocker/pockets.uz.git
cd pockets.uz
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Email Configuration (Gmail SMTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=mcpeblockeruzs@gmail.com

# Telegram Bot Configuration (Optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_ADMIN_ID=your_telegram_chat_id
```

### 4. Set Up Supabase

#### Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and anon key to `.env`

#### Run Database Migrations

In your Supabase project dashboard:

1. Go to SQL Editor
2. Run the migrations in order:
   - First, copy and execute `supabase/migrations/20231220000000_initial_schema.sql`
   - Then, copy and execute `supabase/migrations/20231220000001_sync_auth_users.sql`

This will create all necessary tables, Row Level Security policies, and automatic user syncing from Supabase Auth to the users table.

### 5. Configure Email (Gmail)

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Create a new app password
3. Add the app password to `.env` as `EMAIL_PASS`

### 6. Set Up Telegram Bot (Optional)

1. Create a bot with [@BotFather](https://t.me/botfather) on Telegram
2. Copy the bot token to `.env` as `TELEGRAM_BOT_TOKEN`
3. Get your Telegram user ID (use [@userinfobot](https://t.me/userinfobot))
4. Add your user ID to `.env` as `TELEGRAM_ADMIN_ID`

### 7. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 8. Build for Production

```bash
npm run build
npm start
```

## 📖 Usage Guide

### For Participants (No Account Needed)

1. Click the event link shared by the organizer
2. Click "Join This Event"
3. Enter your name and email or Telegram username
4. View all expenses and your share
5. When the event closes, receive settlement instructions via email

### For Organizers

1. Sign in with your email (magic link, no password)
2. Create a new event from your dashboard
3. Share the event link with participants
4. Add expenses as they occur
5. Close the event when ready to settle
6. Settlement calculations and emails are sent automatically
7. Mark payments as "paid" as people settle up

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Public read access for events (anyone with link can view)
- Only event owners can modify their events
- Authentication required only for event creation
- Secure environment variable handling

## 📱 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS Amplify
- Self-hosted with Docker

Make sure to:
- Set all environment variables
- Configure the `NEXT_PUBLIC_SITE_URL` correctly
- Enable server-side rendering

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

ISC License - see LICENSE file for details

## 💬 Support

- **FAQ**: Visit [/faq](https://pockets.uz/faq) for common questions
- **Support Form**: Use the contact form on the homepage
- **Issues**: Open an issue on GitHub

---

Built with ❤️ using Next.js and Supabase
