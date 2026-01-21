# Screenshot Guide for Dashboard Cards

## Dimensions

- **Capture size:** 520px × 280px (2x for retina sharpness)
- **Display size:** 260px × 140px
- **Aspect ratio:** ~1.86:1

## Format

- **PNG** (best for UI screenshots with text/charts)
- Keep file size under 200KB each

## Save Location

```
static/images/tools/
```

## Filenames

| Tool | Filename |
|------|----------|
| Spot Prices | `spot-prices.png` |
| Spot Spreads Dashboard | `spot-spreads-dashboard.png` |
| Forward Prices | `forward-prices.png` |
| Fixed Forward Spreads Dashboard | `fixed-forward-spreads-dashboard.png` |
| Forward Curve Spreads Dashboard | `forward-curve-spreads-dashboard.png` |
| LNG Flows | `lng-flows.png` |
| LNG Netbacks | `lng-netbacks.png` |
| Midday Charts | `midday-charts.png` |
| Daily Price Charts | `daily-price-charts.png` |

## How to Capture

1. Open each tool page and load a chart with good sample data
2. Use Windows Snipping Tool (`Win+Shift+S`) to capture just the chart area
3. Resize or crop to 520×280 (or maintain the ~1.86:1 ratio)
4. Save as PNG to `static/images/tools/`

## After Saving

Once all images are saved, update the dashboard template to reference them instead of the SVG placeholders.
