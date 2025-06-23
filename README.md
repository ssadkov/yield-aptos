# <img src="https://img.icons8.com/color/48/000000/artificial-intelligence.png" width="30" alt="AI"/> Yield AI

**Yield AI** is an AI agent designed to optimize yield farming and simplify portfolio management on **Aptos**.

## <img src="https://img.icons8.com/color/48/000000/info.png" width="25" alt="About"/> About Yield AI

We're building our application on top of the **Move Agent Kit** framework. Currently, we've integrated two protocols: **Joule** and **Echelon**.

#### Key Features:
You can generate your own wallet using your Google account, top it up, and let Yield AI find the best yield farming strategy for your assets. You get a full overview of your DeFi portfolio.

## <img src="https://img.icons8.com/color/48/000000/why-quest.png" width="25" alt="Why"/> Why Yield AI?

With countless yield farming opportunities in the crypto space, identifying the best pool with the highest APR can be overwhelming. **Yield AI** takes care of the heavy lifting, enabling you to earn with just a touch of a button. 

Aptos' fast and low-cost transactions further enhance the efficiency of the process.

## Technologies We Used

- **Node.js**
- **React**
- **OpenAI API**
- **Vercel AI**
- **Move Agent Kit**
- **Tailwind CSS**

## <img src="https://img.icons8.com/color/48/000000/workflow.png" width="25" alt="Workflow"/> Workflow

<img src="https://sheremetev.aoserver.ru/storage/8ae7c3e09485cbe7701b2aa305ba9078/Marketing/FinKeeper/Yield-AI-Workflow.jpeg" width="500" alt="Yield AI Workflow"/>

## Our Team

<img src="https://sheremetev.aoserver.ru/storage/8ae7c3e09485cbe7701b2aa305ba9078/Marketing/FinKeeper/Our-team.png?1742809829000" width="500" alt="Our Team"/>

## <img src="https://img.icons8.com/color/48/000000/link.png" width="25" alt="Link"/> Link

**[Yield AI](https://yield-a.vercel.app/)**

[Yield AI swagger API](https://yield-a.vercel.app/swagger)

Integration example: [FinKeeper](https://finkeeper.pro/app) 
[FinKeeper source](https://github.com/finkeeper/finkeeper/blob/main/www/frontend/modules/app/components/APTApi.php#L10)

## API Caching Configuration

### Cache Headers

The API endpoints use configurable caching to balance performance and data freshness:

#### Available Functions

- `getCacheHeaders(maxAge)` - Set cache duration in seconds (default: 5)
- `getNoCacheHeaders()` - Completely disable caching

#### Usage Examples

```javascript
import { getCacheHeaders, getNoCacheHeaders } from "../../../../lib/utils";

// Set 5-second cache
return NextResponse.json(data, {
  headers: getCacheHeaders(5)
});

// Disable caching completely
return NextResponse.json(data, {
  headers: getNoCacheHeaders()
});
```

#### Cache Headers Explained

- `max-age=5` - Browser cache duration (5 seconds)
- `s-maxage=5` - CDN cache duration (5 seconds)  
- `stale-while-revalidate=10` - Serve stale content while revalidating (10 seconds)
- `CDN-Cache-Control` - Vercel CDN specific header
- `Vercel-CDN-Cache-Control` - Vercel CDN specific header

### Current Cache Settings

- **Hyperion userPositions**: 5 seconds
- **Hyperion pools**: 5 seconds  
- **Joule pools**: 5 seconds

### To Disable Caching

If you want to completely disable caching for an endpoint, use:

```javascript
return NextResponse.json(data, {
  headers: getNoCacheHeaders()
});
```

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## 🛠 Environment Variables
IMPORTANT!

Before running the app locally, create a `.env.local` file in the root directory (see example in repo).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
