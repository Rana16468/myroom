# MyRoom

A house listing web application built with Next.js.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)
- A Google OAuth Client ID and Client Secret ([Google Cloud Console](https://console.cloud.google.com/apis/credentials))

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Rana16468/myroom
cd myroom
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root of the project and add the following:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_IP_INFO_URL=https://api.ipify.org/?format=json
NEXT_PUBLIC_API_BASE_URL=https://house-listing-backend-3i16.onrender.com/api/v1
NEXT_PUBLIC_SOCKET_URL=https://house-listing-backend-3i16.onrender.com
```

| Variable                       | Description                                                    |
| ------------------------------ | -------------------------------------------------------------- |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID used for Google login                   |
| `GOOGLE_CLIENT_SECRET`         | Google OAuth client secret (server-side only, keep it private) |
| `NEXT_PUBLIC_IP_INFO_URL`      | IP info API URL used to detect the user's location             |
| `NEXT_PUBLIC_API_BASE_URL`     | Base URL of the backend REST API                               |
| `NEXT_PUBLIC_SOCKET_URL`       | Backend URL used for the real-time socket connection           |

> **Note:** Never commit your `.env` file. Make sure `.env` is listed in `.gitignore`.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command         | Description                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Start the development server |
| `npm run build` | Create a production build    |
| `npm start`     | Run the production build     |

## Backend

The app connects to the hosted backend at:
`https://house-listing-backend-3i16.onrender.com`

> The backend runs on Render's free tier, so the first request may take a few seconds to wake up.

# 🏠 Room Rental Platform – Frontend

> A modern room-finding web app built with **Next.js** and **Redux**, featuring a custom **AI recommendation system** that analyzes user behavior and suggests rooms matching each user's exact needs.

**Language / ভাষা:** [English](#-english) | [বাংলা](#-বাংলা)

🔗 Backend repository: `<your-backend-repo-url>`

---

## 🇬🇧 English

### 📌 Overview

This is the frontend of a room-finding platform where people can search for **family flats, bachelor rooms, sublets, hostels, and offices**. Instead of showing the same list to everyone, the app uses a custom-built AI recommendation engine that studies how a user behaves on the platform and recommends the rooms that best fit their needs.

### 🛠 Tech Stack

| Area                  | Technology                                  |
| --------------------- | ------------------------------------------- |
| Framework             | Next.js                                     |
| Language              | TypeScript / JavaScript                     |
| State & Data Fetching | Redux (Redux Toolkit)                       |
| AI                    | Custom behavior-based recommendation system |
| Backend API           | Node.js + MongoDB + Prisma (separate repo)  |

### ✨ Key Features

**🤖 AI-Powered Recommendations**

- Custom recommendation system integrated directly into the frontend experience
- Analyzes user behavior (such as the rooms they view, save, and search for)
- Suggests rooms based on the user's **exact needs**, not just generic results
- Recommendations improve as the user interacts more with the platform

**🔍 Room Search & Discovery**

- Browse listings by category: `Family`, `Bachelor`, `Sublet`, `Hostel`, `Office`
- Filter by area, neighborhood, and property type
- Room detail pages with address, description, and photo gallery

**❤️ Saved Rooms**

- Save favorite rooms and view them later
- Duplicate saves are prevented

**🚩 Report Listings**

- Report suspicious listings as `Wrong Number`, `Misleading Photos`, or `Scam / Spam`

**👤 User Accounts**

- Sign up / log in and manage your profile
- Role-based access for `USER` and `ADMIN`
- Users can post and manage their own room listings

**⚡ Performance & UX**

- Server-side rendering and fast page loads with Next.js
- Centralized state and API caching with Redux
- Fully responsive design for mobile, tablet, and desktop

### 🧠 How the AI Recommendation Works

```
User Activity  →  Behavior Analysis  →  Need Detection  →  Personalized Room Suggestions
(views, saves,     (patterns &           (budget, type,      (shown on the home page
 searches)          preferences)          area, category)     and listing pages)
```

1. The system collects user interactions (views, saved rooms, searches).
2. It analyzes patterns to understand what the user is really looking for.
3. It ranks available rooms by how well they match the detected needs.
4. The recommended rooms are displayed to the user in real time.

### 🗂 Suggested Project Structure

```
src/
├── app/            # Next.js pages and layouts
├── components/     # Reusable UI components
├── redux/          # Store, slices, and API logic
├── ai/             # Recommendation system integration
├── hooks/          # Custom React hooks
├── utils/          # Helper functions
└── types/          # TypeScript types
```

> Adjust this structure to match your actual folders.

### 🚀 Getting Started

```bash
# 1. Clone the repository
git clone <your-frontend-repo-url>
cd <project-folder>

# 2. Install dependencies
npm install

# 3. Set up environment variables
# Create a .env.local file and add:
# NEXT_PUBLIC_API_URL="your-backend-api-url"

# 4. Run the development server
npm run dev

# 5. Open in browser
# http://localhost:3000
```

### 📸 Screenshots

_Add screenshots of your home page, search page, and recommendation section here._

### 📬 Contact

Feel free to reach out for questions or feedback.

---

## 🇧🇩 বাংলা

### 📌 পরিচিতি

এটি একটি রুম খোঁজার প্ল্যাটফর্মের ফ্রন্টএন্ড, যেখানে মানুষ **ফ্যামিলি ফ্ল্যাট, ব্যাচেলর রুম, সাবলেট, হোস্টেল ও অফিস** খুঁজতে পারে। সবাইকে একই লিস্ট দেখানোর বদলে এখানে একটি কাস্টম এআই রিকমেন্ডেশন সিস্টেম ব্যবহার করা হয়েছে, যা ইউজারের আচরণ বিশ্লেষণ করে তার প্রয়োজন অনুযায়ী সবচেয়ে মানানসই রুম সাজেস্ট করে।

### 🛠 ব্যবহৃত প্রযুক্তি

| ক্ষেত্র            | প্রযুক্তি                                     |
| ------------------ | --------------------------------------------- |
| ফ্রেমওয়ার্ক       | Next.js                                       |
| ভাষা               | TypeScript / JavaScript                       |
| স্টেট ও ডেটা ফেচিং | Redux (Redux Toolkit)                         |
| এআই                | কাস্টম বিহেভিয়ার-ভিত্তিক রিকমেন্ডেশন সিস্টেম |
| ব্যাকএন্ড API      | Node.js + MongoDB + Prisma (আলাদা রিপোজিটরি)  |

### ✨ প্রধান ফিচারসমূহ

**🤖 এআই-চালিত রিকমেন্ডেশন**

- ফ্রন্টএন্ড অভিজ্ঞতার সাথে সরাসরি যুক্ত একটি কাস্টম রিকমেন্ডেশন সিস্টেম
- ইউজারের আচরণ বিশ্লেষণ করে (যেমন কোন রুম দেখছে, সেভ করছে ও সার্চ করছে)
- সাধারণ ফলাফলের বদলে ইউজারের **সুনির্দিষ্ট প্রয়োজন** অনুযায়ী রুম সাজেস্ট করে
- ইউজার যত বেশি প্ল্যাটফর্ম ব্যবহার করে, রিকমেন্ডেশন তত নির্ভুল হয়

**🔍 রুম সার্চ ও ডিসকভারি**

- ক্যাটাগরি অনুযায়ী ব্রাউজ: `Family`, `Bachelor`, `Sublet`, `Hostel`, `Office`
- এলাকা, মহল্লা ও প্রপার্টির ধরন অনুযায়ী ফিল্টার
- ঠিকানা, বিবরণ ও ফটো গ্যালারিসহ রুমের ডিটেইল পেজ

**❤️ সেভ করা রুম**

- পছন্দের রুম সেভ করে পরে দেখার সুবিধা
- একই রুম বারবার সেভ হওয়া আটকানো হয়

**🚩 লিস্টিং রিপোর্ট**

- সন্দেহজনক লিস্টিং রিপোর্ট করা যায়: `ভুল নম্বর`, `বিভ্রান্তিকর ছবি` বা `প্রতারণা / স্প্যাম`

**👤 ইউজার অ্যাকাউন্ট**

- সাইন আপ / লগইন ও প্রোফাইল ম্যানেজমেন্ট
- `USER` ও `ADMIN` রোলভিত্তিক অ্যাক্সেস
- ইউজাররা নিজের রুমের বিজ্ঞাপন পোস্ট ও পরিচালনা করতে পারে

**⚡ পারফরম্যান্স ও ইউজার এক্সপেরিয়েন্স**

- Next.js দিয়ে সার্ভার-সাইড রেন্ডারিং ও দ্রুত পেজ লোড
- Redux দিয়ে কেন্দ্রীয় স্টেট ম্যানেজমেন্ট ও API ক্যাশিং
- মোবাইল, ট্যাবলেট ও ডেস্কটপের জন্য সম্পূর্ণ রেসপনসিভ ডিজাইন

### 🧠 এআই রিকমেন্ডেশন কীভাবে কাজ করে

```
ইউজার অ্যাক্টিভিটি → আচরণ বিশ্লেষণ → প্রয়োজন শনাক্তকরণ → ব্যক্তিগত রুম সাজেশন
(ভিউ, সেভ, সার্চ)     (প্যাটার্ন ও পছন্দ)    (বাজেট, ধরন, এলাকা)   (হোম ও লিস্টিং পেজে)
```

১. সিস্টেম ইউজারের কার্যক্রম সংগ্রহ করে (ভিউ, সেভ করা রুম, সার্চ)।
২. প্যাটার্ন বিশ্লেষণ করে বোঝে ইউজার আসলে কী খুঁজছে।
৩. শনাক্ত করা প্রয়োজনের সাথে কতটা মিলে, সেই অনুযায়ী রুমগুলো সাজায়।
৪. সাজেস্ট করা রুমগুলো ইউজারকে রিয়েল-টাইমে দেখানো হয়।

### 🗂 প্রস্তাবিত প্রজেক্ট স্ট্রাকচার

```
src/
├── app/            # Next.js পেজ ও লেআউট
├── components/     # পুনঃব্যবহারযোগ্য UI কম্পোনেন্ট
├── redux/          # স্টোর, স্লাইস ও API লজিক
├── ai/             # রিকমেন্ডেশন সিস্টেম ইন্টিগ্রেশন
├── hooks/          # কাস্টম React হুক
├── utils/          # হেল্পার ফাংশন
└── types/          # TypeScript টাইপ
```

> আপনার প্রজেক্টের আসল ফোল্ডার অনুযায়ী এটি পরিবর্তন করে নিন।

### 🚀 শুরু করার নিয়ম

```bash
# ১. রিপোজিটরি ক্লোন করুন
git clone <your-frontend-repo-url>
cd <project-folder>

# ২. ডিপেন্ডেন্সি ইনস্টল করুন
npm install

# ৩. এনভায়রনমেন্ট ভেরিয়েবল সেট করুন
# .env.local ফাইল তৈরি করে যোগ করুন:
# NEXT_PUBLIC_API_URL="your-backend-api-url"

# ৪. ডেভেলপমেন্ট সার্ভার চালু করুন
npm run dev

# ৫. ব্রাউজারে খুলুন
# http://localhost:3000
```

### 📸 স্ক্রিনশট

_এখানে হোম পেজ, সার্চ পেজ ও রিকমেন্ডেশন সেকশনের স্ক্রিনশট যোগ করুন।_

### 📬 যোগাযোগ

কোনো প্রশ্ন বা মতামত থাকলে নির্দ্বিধায় যোগাযোগ করুন।
