#!/usr/bin/env python3
"""Reject an iPhone launch screenshot that contains only a blank web view.

The first launch should render the photographic STYLST landing page. Inspect
the body, excluding the status bar, using only Python's standard library so
the check works on the Xcode runner without another image dependency.
"""

import struct
import sys
import zlib
from pathlib import Path


def body_content_ratio(path):
    data = Path(path).read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "Screenshot is not a PNG"
    offset, image_data, header = 8, bytearray(), None
    while offset < len(data):
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        kind = data[offset + 4:offset + 8]
        payload = data[offset + 8:offset + 8 + length]
        if kind == b"IHDR":
            header = struct.unpack(">IIBBBBB", payload)
        elif kind == b"IDAT":
            image_data.extend(payload)
        elif kind == b"IEND":
            break
        offset += length + 12
    assert header is not None, "PNG header is missing"
    width, height, depth, color, compression, filtering, interlace = header
    assert depth == 8 and color in (2, 6), "Expected an RGB/RGBA screenshot"
    assert compression == filtering == interlace == 0, "Unsupported PNG encoding"
    channels = 4 if color == 6 else 3
    stride = width * channels
    pixels = zlib.decompress(image_data)
    assert len(pixels) == height * (stride + 1), "Incomplete screenshot pixels"
    previous = bytearray(stride)
    samples = nonwhite = 0
    for y in range(height):
        start = y * (stride + 1)
        method = pixels[start]
        row = bytearray(pixels[start + 1:start + 1 + stride])
        assert method in range(5), "Unknown PNG filter"
        if method:
            for i in range(stride):
                left = row[i - channels] if i >= channels else 0
                above = previous[i]
                upper_left = previous[i - channels] if i >= channels else 0
                if method == 1:
                    predictor = left
                elif method == 2:
                    predictor = above
                elif method == 3:
                    predictor = (left + above) // 2
                else:
                    p = left + above - upper_left
                    distances = (abs(p - left), abs(p - above), abs(p - upper_left))
                    predictor = (left, above, upper_left)[distances.index(min(distances))]
                row[i] = (row[i] + predictor) & 255
        if y >= height // 6 and y % 8 == 0:
            for x in range(0, width, 8):
                i = x * channels
                samples += 1
                nonwhite += min(row[i:i + 3]) < 240
        previous = row
    assert samples, "Screenshot body is missing"
    return nonwhite / samples


if __name__ == "__main__":
    ratio = body_content_ratio(sys.argv[1])
    print(f"Visible content in app body: {ratio:.1%}")
    if ratio < 0.05:
        sys.exit("The STYLST landing page has not rendered yet")
