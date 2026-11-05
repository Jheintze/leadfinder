# LeadFinder

**AI-assisted restaurant prospecting and outreach platform**

LeadFinder is a full-stack web application designed to streamline restaurant prospecting and outreach. It helps identify potential restaurant leads, discover publicly available contact email addresses, and prepare personalized outreach messages in one place.

The project combines external data sources, automated email discovery, AI-assisted workflows, and Gmail integration to reduce the manual work involved in finding and contacting potential business customers.

## Features

### Restaurant Discovery
- Search for restaurants by city and business type.
- Retrieve business information using the Open Places API.
- Use location data from OpenStreetMap's Nominatim service.
- Store discovered restaurants in Supabase to avoid repeatedly processing the same leads.
- Track search progress to continue discovering new restaurants.

### Email Discovery
- Automatically check restaurant websites for publicly available email addresses.
- Search common contact and legal-information pages.
- Track which restaurants have already been checked.
- Store discovered email addresses for later outreach.

### AI-Assisted Outreach
- Generate personalized outreach messages using OpenAI.
- Use restaurant information to create relevant message drafts.
- Customize and edit messages before sending.
- Connect Gmail through OAuth and send messages directly from the application.

### AI Agent
- Interact with the application through an AI-powered agent.
- Use dedicated tools to search for restaurants, find contact emails, and prepare outreach messages.
- Combine multiple steps into a single conversational workflow.

### Automation
- Prepare daily restaurant lead batches automatically.
- Track batch status, processed restaurants, and discovered email addresses.
- Maintain a history of automation runs.
- Use Vercel Cron for scheduled execution.

### Demo Mode
- Explore the main application without creating an account.
- Try restaurant searches, email discovery, AI-generated outreach, and the agent workflow.
- Authentication is required for restricted account-dependent functionality.

## Technology Stack

| Technology | Purpose |
|---|---|
| Next.js 16 | Full-stack application framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling and responsive UI |
| Supabase | PostgreSQL database and authentication |
| OpenAI API (GPT-4.1 mini) | AI-generated outreach and agent workflows |
| Gmail API / OAuth 2.0 | Email account integration and sending |
| Open Places API | Restaurant and business discovery |
| Nominatim / OpenStreetMap | Geocoding and location data |
| Vercel | Hosting and scheduled automation |

## Architecture

LeadFinder is built around several connected workflows:

1. **Discovery:** A user searches for restaurants. Location data is resolved, external business data is retrieved, and new leads are stored in Supabase.
2. **Email enrichment:** The application checks restaurant websites for publicly available contact information and saves discovered addresses.
3. **Outreach preparation:** Restaurant information is passed to OpenAI to generate relevant outreach drafts.
4. **Sending:** Users can review and edit messages before sending them through their connected Gmail account.
5. **Automation:** Scheduled runs prepare batches of new restaurant leads and track their progress in the database.

The AI agent uses application-specific tools to interact with these workflows rather than relying solely on conversational responses.

## Getting Started

### Prerequisites

- Node.js
- npm
- A Supabase project
- An OpenAI API key
- An Open Places API key
- Google OAuth credentials with Gmail API access

### Installation

Clone the repository:

```bash
git clone https://github.com/Jheintze/leadfinder
cd leadfinder
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file in the project root and configure the required credentials for Supabase, OpenAI, the Open Places API, and Google OAuth.

For scheduled automation, configure `CRON_SECRET` in the deployment environment.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Status

LeadFinder is an actively developed portfolio project. Its core restaurant discovery, email enrichment, AI-assisted outreach, Gmail integration, and agent workflows have been implemented.

The application also includes a public demo mode so visitors can explore its main functionality without registering.

Scheduled automation is configured for Vercel Cron and requires deployment configuration before its production behaviour can be verified.

## Purpose

LeadFinder was built to explore how AI can be integrated into practical business workflows—not just as a chatbot, but as part of an application that searches, processes, enriches, and organizes real-world data.

The project focuses on full-stack development, external API integrations, database design, OAuth authentication, AI tool orchestration, and automation.