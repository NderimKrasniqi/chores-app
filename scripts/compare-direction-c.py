#!/usr/bin/env python3
"""Create normalized Direction C visual-comparison evidence.

Approved portrait references are presentation boards containing a rendered
phone. Simulator screenshots contain only the device viewport. This script
extracts the approved viewport, normalizes both images to a common 390x844
coordinate space, masks operating-system-only chrome, and writes images plus
machine-readable metrics. Passing metrics are diagnostic, not sufficient to
mark coverage Verified; the overlay and diff still require inspection.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat


CANONICAL_SIZE = (780, 1688)
REFERENCE_VIEWPORT = (188, 79, 836, 1463)
# The extracted Figma viewport is normalized to a 2x 390pt coordinate space.
# The status/Dynamic Island region is about 30pt tall; masking twice that much
# also erased the app's navigation title and made comparisons misleading.
MASKED_TOP_PX = 60
MASKED_BOTTOM_PX = 26


def parse_box(value: str) -> tuple[int, int, int, int]:
    parts = tuple(int(part) for part in value.split(","))
    if len(parts) != 4:
        raise argparse.ArgumentTypeError("crop must be left,top,right,bottom")
    return parts


def cover_crop(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    target_width, target_height = size
    scale = max(target_width / image.width, target_height / image.height)
    resized = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = (resized.width - target_width) // 2
    top = (resized.height - target_height) // 2
    return resized.crop((left, top, left + target_width, top + target_height))


def mask_os_chrome(image: Image.Image) -> Image.Image:
    masked = image.copy()
    draw = ImageDraw.Draw(masked)
    mask_color = (251, 247, 240)
    draw.rectangle((0, 0, masked.width, MASKED_TOP_PX), fill=mask_color)
    draw.rectangle(
        (0, masked.height - MASKED_BOTTOM_PX, masked.width, masked.height),
        fill=mask_color,
    )
    return masked


def metrics(reference: Image.Image, actual: Image.Image) -> dict[str, float]:
    diff = ImageChops.difference(reference, actual)
    stat = ImageStat.Stat(diff)
    mae = sum(stat.mean) / len(stat.mean)
    rms = math.sqrt(sum(value * value for value in stat.rms) / len(stat.rms))

    blurred_reference = reference.filter(ImageFilter.GaussianBlur(radius=3))
    blurred_actual = actual.filter(ImageFilter.GaussianBlur(radius=3))
    blurred_diff = ImageChops.difference(blurred_reference, blurred_actual)
    blurred_mae = sum(ImageStat.Stat(blurred_diff).mean) / 3

    luminance = diff.convert("L")
    histogram = luminance.histogram()
    changed = sum(histogram[24:])
    changed_percent = changed / (reference.width * reference.height) * 100

    return {
        "mean_absolute_error": round(mae, 3),
        "root_mean_square_error": round(rms, 3),
        "blurred_mean_absolute_error": round(blurred_mae, 3),
        "pixels_over_threshold_percent": round(changed_percent, 3),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reference", required=True, type=Path)
    parser.add_argument("--actual", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--name")
    parser.add_argument(
        "--reference-crop",
        type=parse_box,
        default=REFERENCE_VIEWPORT,
        help="left,top,right,bottom; defaults to the portrait phone viewport",
    )
    args = parser.parse_args()

    name = args.name or args.reference.stem.removesuffix("-approved")
    args.output_dir.mkdir(parents=True, exist_ok=True)

    reference_source = Image.open(args.reference).convert("RGB")
    actual_source = Image.open(args.actual).convert("RGB")
    reference = cover_crop(reference_source.crop(args.reference_crop), CANONICAL_SIZE)
    actual = cover_crop(actual_source, CANONICAL_SIZE)
    reference = mask_os_chrome(reference)
    actual = mask_os_chrome(actual)

    reference_path = args.output_dir / f"{name}-reference-normalized.png"
    actual_path = args.output_dir / f"{name}-simulator-normalized.png"
    overlay_path = args.output_dir / f"{name}-overlay.png"
    diff_path = args.output_dir / f"{name}-diff.png"
    side_by_side_path = args.output_dir / f"{name}-side-by-side.png"
    metrics_path = args.output_dir / f"{name}-metrics.json"

    reference.save(reference_path)
    actual.save(actual_path)
    Image.blend(reference, actual, 0.5).save(overlay_path)

    raw_diff = ImageChops.difference(reference, actual)
    raw_diff.point(lambda channel: min(255, channel * 4)).save(diff_path)

    side_by_side = Image.new("RGB", (CANONICAL_SIZE[0] * 2, CANONICAL_SIZE[1]))
    side_by_side.paste(reference, (0, 0))
    side_by_side.paste(actual, (CANONICAL_SIZE[0], 0))
    side_by_side.save(side_by_side_path)

    result = {
        "name": name,
        "reference": str(args.reference),
        "actual": str(args.actual),
        "canonical_size": list(CANONICAL_SIZE),
        "reference_crop": list(args.reference_crop),
        "masked_os_chrome": {
            "top_px": MASKED_TOP_PX,
            "bottom_px": MASKED_BOTTOM_PX,
        },
        "metrics": metrics(reference, actual),
        "verification": "inspection-required",
    }
    metrics_path.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
