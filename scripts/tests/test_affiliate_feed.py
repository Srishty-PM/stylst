import importlib.util
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('feed', Path(__file__).parents[1] / 'import_affiliate_feed.py')
feed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(feed)


class FeedImportTest(unittest.TestCase):
    def setUp(self):
        self.now = datetime.now(timezone.utc) - timedelta(minutes=1)
        self.retailer = {'id': 'test', 'name': 'Test Boutique', 'productHosts': ['retailer.example'], 'affiliateHosts': ['affiliate.example']}
        self.row = {'product_id': '123', 'product_name': '<b>Beige coat</b>', 'description': '<p>Wool &amp; cotton</p>', 'merchant_deep_link': 'https://retailer.example/coat', 'awin_deep_link': 'https://affiliate.example/click?publisher=1&product=123', 'search_price': '39.95', 'currency': 'GBP', 'merchant_category': 'Coats', 'in_stock': '1'}

    def test_preserves_tracking_and_sanitizes_descriptions(self):
        product = feed.normalize_row(self.row, self.retailer, self.now)
        self.assertEqual(product['affiliateUrl'], self.row['awin_deep_link'])
        self.assertEqual(product['name'], 'Beige coat')
        self.assertEqual(product['description'], 'Wool & cotton')
        self.assertEqual(product['category'], 'outerwear')
        self.assertEqual(product['updatedAt'], feed.iso(self.now))

    def test_bad_prices_domains_and_stock_are_rejected(self):
        for changes in [{'search_price': '39,95'}, {'search_price': '-5'}, {'merchant_deep_link': 'https://retailer.example.evil.example/a'}, {'awin_deep_link': 'javascript:alert(1)'}, {'in_stock': '0'}]:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                feed.normalize_row({**self.row, **changes}, self.retailer, self.now)

    def test_direct_links_require_explicit_choice(self):
        row = {**self.row, 'awin_deep_link': ''}
        with self.assertRaises(ValueError):
            feed.normalize_row(row, self.retailer, self.now)
        self.assertNotIn('affiliateUrl', feed.normalize_row(row, self.retailer, self.now, allow_direct=True))

    def test_feed_import_replaces_one_retailer_without_duplication(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source, config, output = root / 'input.json', root / 'retailer.json', root / 'catalogue.json'
            source.write_text(json.dumps([self.row, self.row]))
            config.write_text(json.dumps(self.retailer))
            args = ['--input', str(source), '--retailer', str(config), '--format', 'json', '--as-of', feed.iso(self.now), '--output', str(output)]
            feed.main(args)
            product = json.loads(output.read_text())['products'][0]
            existing = json.loads(output.read_text())
            existing['retailers'].append({**self.retailer, 'id': 'other'})
            existing['products'].append({**product, 'id': 'other:1', 'retailerId': 'other'})
            output.write_text(json.dumps(existing))
            feed.main(args)
            result = json.loads(output.read_text())
            self.assertEqual(len(result['products']), 2)
            self.assertEqual(len(result['retailers']), 2)
            original = output.read_text()
            source.write_text(json.dumps([{**self.row, 'search_price': 'bad'}]))
            with self.assertRaises(ValueError):
                feed.main(args)
            self.assertEqual(output.read_text(), original)

    def test_stale_feeds_cannot_be_reimported_as_current(self):
        with self.assertRaises(ValueError):
            feed.normalize_row({**self.row, 'updatedAt': feed.iso(self.now - timedelta(hours=49))}, self.retailer, self.now)


if __name__ == '__main__':
    unittest.main()
