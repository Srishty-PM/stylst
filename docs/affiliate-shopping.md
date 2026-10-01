# STYLST affiliate shop

## Customer experience

- **Shop** is available in the desktop sidebar and mobile navigation.
- The missing-piece buttons in inspiration, matching and saved looks open an in-app collection for that garment.
- Customers browse product cards, search, filter by category and budget, select GBP/USD/EUR, and sort by relevance, price or feed update time. Currency selection filters the catalogue; it does not convert prices or imply international delivery.
- Tapping a card opens product details inside STYLST. Hearts save product IDs on the device, separately for each signed-in account. Saves do not reserve stock.
- **Continue to retailer** preserves the affiliate link exactly. Native iOS/Android uses the already-installed Capacitor Browser plugin; web opens a new retailer tab while keeping STYLST open. The retailer handles payment, delivery and returns.
- Affiliate disclosure appears before the purchase link. Analytics capture product views, saves and retailer-link clicks; clicks are not reported as sales or earned commission.

This is affiliate discovery and retailer handoff. A STYLST-owned basket or checkout across retailers would require merchant commerce APIs and commercial agreements. The unused legacy `shop-recommendations` AI function is not called by this feature.

## Activation status

The checked-in `public/affiliate-catalogue.json` is deliberately empty: no approved affiliate account or retailer feed was available during implementation. The live UI therefore shows a collection-coming-soon state. Fictional test products exist only in `src/test/shop-fixtures.ts`; they are not deployed as retail inventory.

To activate commission-bearing shopping, obtain an approved publisher account, retailer programme access and product-content permission. Download a current feed containing your account's tracked product deep links. No affiliate credentials or feed-download keys belong in this repository or a `VITE_*` value.

## Import an approved feed

The importer runs with Python 3.10+ and standard-library modules only. It supports conventional Awin publisher CSV exports and normalized JSON. It preserves supplied affiliate URLs rather than guessing publisher IDs or creating unapproved links.

1. Copy `docs/affiliate-retailer.example.json` to a local retailer configuration. Replace every placeholder. `productHosts` and `affiliateHosts` are exact hostnames, with no wildcards. Include each authorized hostname actually used by the feed. The example is configuration only, not an active partnership.
2. Set `merchantId` to restrict a CSV to one approved merchant. Use `categoryMapping` to map the retailer's exact category strings to `tops`, `bottoms`, `dresses`, `outerwear`, `shoes`, `bags` or `accessories`; unrecognized categories are skipped.
3. Import the downloaded feed. Replace the timestamp with the time the feed was verified current. Reimporting an old file does not make its prices current.

```sh
python scripts/import_affiliate_feed.py \
  --input /path/to/current-retailer-feed.csv \
  --retailer /path/to/retailer.json \
  --format awin \
  --as-of YYYY-MM-DDTHH:MM:SSZ \
  --output public/affiliate-catalogue.json
```

Important CSV fields: product ID (`merchant_product_id`, `product_id` or `aw_product_id`), `product_name`, `merchant_deep_link`/`deep_link`, `awin_deep_link`, `search_price`/`price`, `currency`, `merchant_category`, `brand_name`, `merchant_image_url`/`image_url`, `colour`, `size`, and `in_stock`. Actual exporter columns vary; inspect the downloaded feed. `--allow-direct-links` is an explicit option for approved retailer products without an affiliate deep link; these links do not establish commission eligibility.

JSON input is a product array or an object containing `products`. Fields use the app names: `id`, `name`, `brand`, `description`, `price`, `originalPrice`, `currency`, `productUrl`, `affiliateUrl`, `imageUrl`, `category`, `colours`, `sizes`, `inStock`, and optional `updatedAt`. Retailer identity comes from the configuration. IDs are namespaced by retailer during import.

The importer replaces that retailer's collection and retains other retailers' recent products. Invalid URLs, ambiguous prices, unavailable stock and unknown categories are skipped. An all-invalid nonempty feed fails without overwriting a working catalogue. An empty feed deliberately clears that retailer's products.

## Keep the catalogue current

For web, the default catalogue is served from the same deployment as STYLST. Publish the imported file along with the app, and refresh it at least daily. The importer sets a 24-hour catalogue expiry by default; `--ttl-hours` accepts 1–48. Individual product timestamps are also limited to 48 hours. Expired collections stop displaying prices and purchase links until refreshed.

For a native app, set `VITE_SHOP_CATALOGUE_URL` to a **public HTTPS URL** serving the same JSON with CORS enabled for the STYLST web and native origins. This lets a daily feed refresh reach installed apps without a new App Store build. The bundled empty catalogue is the fallback when no endpoint is configured; bundled populated catalogues will expire. Use a public catalogue URL, never an affiliate API or authenticated feed-download URL. This implementation provides import tooling, not an automated feed-download service.

The app polls an active collection every minute, requests it without cookies, and validates fields, timestamps and exact approved destination hosts. Product handoff rechecks expiry. Product images use HTTPS and suppress the page referrer. STYLST account IDs, email addresses, wardrobe photos and style prompts are not appended to retailer links.

## Verification and rollout

```sh
npm test
python -m unittest discover -s scripts/tests
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

Check empty/error/expired states, a matching missing-piece collection, currency and budget filters, favourites across visits, and product details. Use an approved retailer link to verify attribution in the network's reporting. Validate a native handoff and return on a physical iPhone/Android before releasing a new mobile build. Automated tests cover the native API call but do not certify device behaviour or partner conversion tracking.

Publishing a GitHub commit does not by itself certify that the custom domain updated. Verify the deployed asset version and Shop route after the host publishes. Existing deployments remain governed by the project's hosting configuration.

References: [Awin product feed publisher guide](https://help.awin.com/developers/docs/product-feed-publisher-guide-intro), [Awin feed columns](https://help.awin.com/developers/docs/hosting-feeds), [Capacitor Browser API](https://capacitorjs.com/docs/apis/browser).
