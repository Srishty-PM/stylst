#!/usr/bin/env python3
"""Import a downloaded, approved retailer CSV or normalized JSON feed. No API keys."""
import argparse
import csv
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

CATEGORIES = {'tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'bags', 'accessories'}
CURRENCIES = {'GBP', 'USD', 'EUR'}
HOST_PATTERN = re.compile(r'^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$', re.I)


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []

    def handle_data(self, value):
        self.parts.append(value)


def clean_text(value, limit):
    parser = PlainText()
    parser.feed(str(value or ''))
    return ' '.join(' '.join(parser.parts).split())[:limit]


def timestamp(value):
    parsed = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('Timestamps must include a timezone')
    return parsed.astimezone(timezone.utc)


def iso(value):
    return value.astimezone(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')


def safe_url(value, hosts=None):
    if not isinstance(value, str) or len(value) > 4096:
        return False
    try:
        parsed = urlsplit(value)
        host = parsed.hostname or ''
        return parsed.scheme == 'https' and not parsed.username and not parsed.password and parsed.port in (None, 443) and bool(HOST_PATTERN.fullmatch(host)) and (hosts is None or host.lower() in hosts)
    except ValueError:
        return False


def price(value):
    text = str(value).strip()
    if not re.fullmatch(r'(?:\d+(?:\.\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?)', text):
        raise ValueError('Invalid price')
    number = Decimal(text.replace(',', ''))
    if not number.is_finite() or number < 0:
        raise ValueError('Invalid price')
    return float(number)


def list_values(value, limit, width):
    values = value if isinstance(value, list) else re.split(r'[|;,]', str(value or ''))
    return list(dict.fromkeys(clean_text(v, width) for v in values if str(v).strip()))[:limit]


def category_for(row, retailer):
    supplied = row.get('category', '')
    if supplied in CATEGORIES:
        return supplied
    source = row.get('merchant_category') or row.get('merchant_product_category_path') or supplied
    mapped = retailer.get('categoryMapping', {}).get(source)
    if mapped in CATEGORIES:
        return mapped
    for pattern, category in [
        (r'\b(dresses?|jumpsuits?)\b', 'dresses'),
        (r'\b(coats?|jackets?|blazers?|outerwear)\b', 'outerwear'),
        (r'\b(shoes?|boots?|heels?|trainers?|sneakers?|sandals?|footwear)\b', 'shoes'),
        (r'\b(handbags?|bags?|totes?|clutches)\b', 'bags'),
        (r'\b(trousers?|jeans|skirts?|shorts|bottoms?)\b', 'bottoms'),
        (r'\b(tops?|shirts?|blouses?|knitwear|jumpers?|sweaters?|cardigans?)\b', 'tops'),
        (r'\b(accessories|jewellery|jewelry|belts?|scarves|sunglasses|hats?)\b', 'accessories'),
    ]:
        if re.search(pattern, str(source).lower()):
            return category
    raise ValueError('Unmapped category')


def validate_retailer(value):
    if not isinstance(value, dict) or not isinstance(value.get('id'), str) or not 1 <= len(value['id']) <= 100 or not isinstance(value.get('name'), str) or not 1 <= len(value['name']) <= 120:
        raise ValueError('Retailer needs an id and name')
    result = {'id': value['id'], 'name': value['name']}
    for field in ('productHosts', 'affiliateHosts'):
        hosts = value.get(field, [])
        if not isinstance(hosts, list) or len(hosts) > 20 or not all(isinstance(h, str) and HOST_PATTERN.fullmatch(h) for h in hosts):
            raise ValueError(f'Invalid {field}')
        result[field] = [host.lower() for host in hosts]
    if not result['productHosts']:
        raise ValueError('At least one product host is required')
    return result


def normalize_row(row, retailer, as_of, allow_direct=False):
    if not isinstance(row, dict):
        raise ValueError('Invalid row')
    merchant_id = str(row.get('merchant_id') or '')
    if retailer.get('merchantId') and merchant_id and merchant_id != str(retailer['merchantId']):
        raise ValueError('Different merchant')
    raw_id = row.get('merchant_product_id') or row.get('product_id') or row.get('aw_product_id') or row.get('id')
    name = clean_text(row.get('product_name') or row.get('name'), 300)
    if not raw_id or not name:
        raise ValueError('Missing product id or name')
    product_id = f"{retailer['id']}:{raw_id}"
    if len(product_id) > 200:
        raise ValueError('Product id is too long')
    link = row.get('merchant_deep_link') or row.get('productUrl') or row.get('deep_link')
    if not safe_url(link, retailer['productHosts']):
        raise ValueError('Product URL is outside the approved retailer hosts')
    affiliate = row.get('awin_deep_link') or row.get('affiliateUrl')
    if affiliate and not safe_url(affiliate, retailer.get('affiliateHosts', [])):
        raise ValueError('Affiliate URL is outside the approved affiliate hosts')
    if not affiliate and not allow_direct:
        raise ValueError('An approved affiliate deep link is required')
    currency = str(row.get('currency') or retailer.get('currency') or '').upper()
    if currency not in CURRENCIES:
        raise ValueError('Unsupported currency')
    stock = row.get('inStock', row.get('in_stock', row.get('stock_status')))
    if stock is False or str(stock).lower().strip() in ('0', 'false', 'out of stock', 'out_of_stock', 'not available') or str(row.get('is_for_sale')).lower().strip() in ('0', 'false'):
        raise ValueError('Unavailable product')
    updated = timestamp(row['updatedAt']) if row.get('updatedAt') else as_of
    if updated > as_of + timedelta(minutes=5) or as_of - updated > timedelta(hours=48):
        raise ValueError('Product timestamp is stale or in the future')
    result = {
        'id': product_id, 'retailerId': retailer['id'], 'name': name,
        'brand': clean_text(row.get('brand_name') or row.get('brand'), 120),
        'description': clean_text(row.get('description'), 5000),
        'price': price(row.get('search_price', row.get('price'))), 'currency': currency,
        'productUrl': link, 'category': category_for(row, retailer),
        'colours': list_values(row.get('colours') or row.get('colour'), 20, 60),
        'sizes': list_values(row.get('sizes') or row.get('size'), 40, 40),
        'inStock': True if stock is True or str(stock).lower().strip() in ('1', 'true', 'in stock', 'in_stock', 'available') else None,
        'updatedAt': iso(updated),
    }
    if affiliate:
        result['affiliateUrl'] = affiliate
    image = row.get('merchant_image_url') or row.get('image_url') or row.get('imageUrl')
    if image and safe_url(image):
        result['imageUrl'] = image
    old_price = row.get('originalPrice') or row.get('product_price_old') or row.get('rrp_price')
    if old_price:
        try:
            original = price(old_price)
            if original > result['price']:
                result['originalPrice'] = original
        except ValueError:
            pass
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--retailer', required=True, type=Path)
    parser.add_argument('--format', choices=('awin', 'json'), default='awin')
    parser.add_argument('--as-of', required=True, help='ISO UTC time the feed was verified current; never the reimport time of an old feed')
    parser.add_argument('--output', type=Path, default=Path('public/affiliate-catalogue.json'))
    parser.add_argument('--ttl-hours', type=int, choices=range(1, 49), default=24)
    parser.add_argument('--allow-direct-links', action='store_true', help='Explicitly allow retailer links that do not earn commission')
    args = parser.parse_args(argv)
    now = datetime.now(timezone.utc)
    as_of = timestamp(args.as_of)
    if as_of > now + timedelta(minutes=5) or now - as_of > timedelta(hours=48):
        raise ValueError('Feed must be verified current within 48 hours')
    retailer_config = json.loads(args.retailer.read_text())
    retailer = validate_retailer(retailer_config)
    retailer_config.update(retailer)
    if args.format == 'awin':
        with args.input.open(encoding='utf-8-sig', newline='') as file:
            rows = list(csv.DictReader(file))
    else:
        source = json.loads(args.input.read_text())
        rows = source.get('products', []) if isinstance(source, dict) else source
    if not isinstance(rows, list):
        raise ValueError('Feed must contain a product list')
    products, rejected, seen = [], 0, set()
    for row in rows:
        try:
            product = normalize_row(row, retailer_config, as_of, args.allow_direct_links)
            if product['id'] not in seen:
                seen.add(product['id'])
                products.append(product)
        except (ValueError, TypeError, KeyError):
            rejected += 1
    if rows and not products:
        raise ValueError('No valid products. Check affiliate links, categories, prices and retailer hosts; existing catalogue was preserved')
    existing = json.loads(args.output.read_text()) if args.output.exists() else {'version': 1, 'retailers': [], 'products': []}
    if existing.get('version') != 1:
        raise ValueError('Unsupported existing catalogue version')
    retained = []
    for product in existing.get('products', []):
        try:
            if product['retailerId'] != retailer['id'] and now - timestamp(product['updatedAt']) <= timedelta(hours=48):
                retained.append(product)
        except (ValueError, TypeError, KeyError):
            continue
    result = {
        'version': 1, 'updatedAt': iso(now), 'expiresAt': iso(now + timedelta(hours=args.ttl_hours)),
        'retailers': [r for r in existing.get('retailers', []) if r['id'] != retailer['id']] + [retailer],
        'products': retained + products,
    }
    if len(result['products']) > 20000 or len(result['retailers']) > 1000:
        raise ValueError('Catalogue is too large; curate the feed before importing')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix('.tmp')
    temporary.write_text(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False) + '\n')
    temporary.replace(args.output)
    print(f"Imported {len(products)} products; rejected {rejected}; retained {len(retained)} from other retailers")


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError) as error:
        raise SystemExit(str(error)) from error
