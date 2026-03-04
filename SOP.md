## Standard Operating Procedure – *NGI Data Tools*

### Purpose

This document is a step-by-step guide to accessing and using the NGI Data Tools web application ([ngi-tools.replit.app](https://ngi-tools.replit.app/)). It covers how to get API credentials, log in, and use each of the available tools for viewing, charting, and exporting natural gas price data.

### Context

NGI Data Tools is an internal web application that connects directly to the NGI API. Users bring their own NGI API credentials (email + API key) to log in. The app does not manage NGI accounts — it uses your credentials to pull data on your behalf and present it in interactive charts, dashboards, and exportable formats.

The app is organized into four sections: **Spot Prices**, **Forward Look**, **LNG**, and **Chart Generators**.

---

### Getting Started

#### How to Request API Credentials

1. Email [Matthew.Johnson@naturalgasintel.com](mailto:Matthew.Johnson@naturalgasintel.com) to request an API key.

2. Your API key will be associated with your NGI email address. You will receive an email and an API key string.

3. Save both your NGI email and API key in your browser's password manager for easy access.

#### How to Log In

1. Navigate to [ngi-tools.replit.app](https://ngi-tools.replit.app/). You will be taken to the login screen.

2. Enter your **NGI Email** and **API Key**.

3. Click **Login**. If your credentials are valid, you will be redirected to the Dashboard.

4. If login fails, double-check that your email and API key are correct. Contact Matthew Johnson if the issue persists.

**Note:** The app runs on Replit and is not always on. If the app has been idle for a while, your session may expire and you will be redirected to the login screen — just log in again. This is normal.

#### Navigating the Dashboard

After logging in, you will see the Dashboard with tool cards organized into four categories. Use the **filter buttons** at the top (All, Spot Prices, Forward Look, LNG, Chart Generators) to narrow down the view. Click any tool card to open it.

---

### Spot Prices

#### Spot Prices

**URL:** Dashboard > Spot Prices

View and chart daily natural gas spot prices. Key features:

- **Single location lookup** — Select a location and date range to view its daily price history as a line chart
- **Multi-location comparison** — Add multiple locations to compare prices side by side on the same chart
- **Yearly overlay** — Compare the same location across multiple years to identify seasonal patterns
- **Five-year average** — Overlay a five-year average line for seasonal context
- **Export options** — Export data organized by flow date or trade date
- **Date range controls** — Adjust start and end dates to focus on any time period

#### Spot Spreads Dashboard

**URL:** Dashboard > Spot Spreads Dashboard

Monitor multiple price spreads simultaneously. Key features:

- **Multi-spread view** — Track several location-pair spreads on one screen
- **Customizable timeframes** — Adjust the lookback period for each spread
- **Quick comparison tools** — Rapidly compare basis differentials across locations

---

### Forward Look

#### Forward Prices

**URL:** Dashboard > Forward Prices

View and analyze forward price curves. Key features:

- **Forward curve visualization** — View the full forward curve for any location
- **Location comparison** — Compare forward curves across multiple locations
- **Contract evolution tracking** — See how a specific contract month's price has changed over time

#### Fixed Forward Spreads Dashboard

**URL:** Dashboard > Fixed Forward Spreads Dashboard

Track fixed forward price spreads (prompt month) over time. Key features:

- **Prompt-month spread tracking** — Monitor the spread between two locations' prompt-month forward prices
- **Customizable timeframes** — Adjust the date range to focus on recent trends or longer histories
- **Multi-spread comparison** — View several location-pair spreads simultaneously

#### Forward Curve Spreads Dashboard

**URL:** Dashboard > Forward Curve Spreads Dashboard

View forward curve spreads across the entire contract strip. Key features:

- **Full curve spread visualization** — See the spread between two locations across all contract months
- **Adjustable forward horizon** — Toggle between 6M, 12M, 24M, and 36M forward views
- **Dashboard layout** — Monitor multiple spread pairs at once

#### Forward Heatmap

**URL:** Dashboard > Forward Heatmap

Compare forward curves between two dates. Key features:

- **Date-to-date comparison** — Select two trade dates and see how the forward curve has shifted
- **Heatmap visualization** — Color-coded cells highlight the magnitude and direction of price changes across contract months

#### Strip Calculator

**URL:** Dashboard > Strip Calculator

Calculate seasonal strip prices from forward curves. Key features:

- **Winter/Summer strip averages** — Automatically calculates seasonal average prices from the forward curve
- **Date range selection** — Specify a range of trade dates to see how strip prices have evolved

#### Forward Table

**URL:** Dashboard > Forward Table

View all locations' forward curves in a single table. Key features:

- **Single trade date view** — Select a date and see every location's forward curve in tabular format
- **Copy functionality** — Copy data directly from the table for use in spreadsheets or other tools

---

### LNG

#### LNG Flows

**URL:** Dashboard > LNG Flows

Track LNG import and export flow volumes. Key features:

- **Flow volume tracking** — View daily LNG flow data
- **Import/export breakdown** — See flows by direction and terminal

#### LNG Netbacks

**URL:** Dashboard > LNG Netbacks

Compare international LNG pricing against Henry Hub. Key features:

- **TTF and JPN/KOR netback prices** — View European and Asian netback prices relative to Henry Hub
- **Forward curve overlay** — See netback spreads across the forward curve
- **Time series analysis** — Track how netback economics have changed over time

---

### Chart Generators

These tools produce publication-ready charts suitable for reports, newsletters, and presentations.

#### Midday Charts

**URL:** Dashboard > Midday Charts

Generate a midday alert chart for a single location. Select the location and the chart is generated with publication-ready formatting.

#### Midday Charts - Multi

**URL:** Dashboard > Midday Charts - Multi

Same as Midday Charts, but compare multiple locations on a single chart.

#### Daily Spot Charts

**URL:** Dashboard > Daily Spot Charts

Generate a publication-ready daily spot price chart for a single location.

#### Daily High/Low Charts

**URL:** Dashboard > Daily High/Low Charts

Generate daily price range charts showing high, low, and average values with a legend. Useful for visualizing intraday price volatility.

#### Daily Spot Charts - Multi

**URL:** Dashboard > Daily Spot Charts - Multi

Compare multiple locations on a single publication-ready daily price chart.

#### Forward Curve - Multi Date Charts

**URL:** Dashboard > Forward Curve - Multi Date Charts

Generate forward curve charts showing price evolution across multiple trade dates. Useful for illustrating how the forward curve has shifted over time.

#### Spot + Forward Charts

**URL:** Dashboard > Spot + Forward Charts

Combine historical daily spot prices with the current forward curve on a single chart, showing both past prices and future expectations in one view.

---

### Troubleshooting

| Problem | Solution |
| --- | --- |
| Login fails | Verify your email and API key are correct. Check for extra spaces. Contact Matthew Johnson if the issue persists. |
| Session expired | You will be redirected to the login page. Simply log in again. |
| Chart not loading | Check that you have selected valid inputs (location, dates). Try refreshing the page. |
| No data returned | The NGI API may not have data for the location/date combination you selected. Try a broader date range or a different location. |
| Page is slow or unresponsive | Try refreshing the browser. If the issue persists, the Replit server may be waking up — wait a moment and try again. |

### Contact

- **API credential requests:** [Matthew.Johnson@naturalgasintel.com](mailto:Matthew.Johnson@naturalgasintel.com)
- **Application issues or feature requests:** Contact the development team
