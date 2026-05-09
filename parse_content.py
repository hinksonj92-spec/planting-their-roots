#!/usr/bin/env python3
"""
Parse Phase 0 markdown content into structured JSON for the app.
Reads from content/phase-0/ and outputs to src/data/
"""

import json
import re
import os
from pathlib import Path

CONTENT_DIR = Path("/sessions/blissful-dazzling-mccarthy/mnt/Perpetual Sovereignty/content/phase-0")
OUTPUT_DIR = Path("/sessions/blissful-dazzling-mccarthy/mnt/outputs/planting-their-roots/src/data")

BAND_DIRS = {
    1: "Band 1 — Infant",
    2: "Band 2 — Toddler",
    3: "Band 3 — Pre-Phase 1",
}

DOMAIN_MAP = {
    "LANG": "Language Acquisition",
    "MOTR": "Motor Development",
    "NUMR": "Numeracy Roots",
    "SOCL": "Social-Emotional Foundation",
    "ROUT": "Routine & Habit Formation",
    "SENS": "Sensory & Environmental Awareness",
    "INDP": "Independence & Practical Life",
}

WEEK_DOMAINS = {1: "LANG", 2: "MOTR", 3: "NUMR", 4: "SOCL", 5: "ROUT", 6: "SENS", 7: "INDP"}


def parse_weekly_guide(filepath: Path, band: int, week: int) -> dict:
    """Parse a weekly guide markdown file into structured data."""
    text = filepath.read_text(encoding="utf-8")
    domain_code = WEEK_DOMAINS[week]

    # Extract parent frame (italic line after title)
    frame_match = re.search(r'\*"(.+?)"\*', text)
    parent_frame = frame_match.group(1) if frame_match else ""

    # Extract Why This Matters
    why_match = re.search(r'### Why This Matters\n\n(.+?)(?=\n\n###|\n---)', text, re.DOTALL)
    why_this_matters = why_match.group(1).strip() if why_match else ""

    # Extract This Week's Focus items (handles optional blank line after heading)
    focus_match = re.search(r"### This Week's Focus\n\n?((?:- .+\n?)+)", text)
    focus_items = []
    if focus_match:
        focus_items = [line.lstrip("- ").strip() for line in focus_match.group(1).strip().split("\n") if line.strip().startswith("-")]

    # Extract Keep Doing
    keep_match = re.search(r'### Keep Doing.*?\n(.+?)(?=\n\n###|\n---)', text, re.DOTALL)
    keep_doing = keep_match.group(1).strip() if keep_match else ""

    # Extract What You Need
    need_match = re.search(r'### What You Need\n(.+?)(?=\n\n---|\n\n###|\n\n####)', text, re.DOTALL)
    what_you_need = need_match.group(1).strip() if need_match else ""

    # Extract daily moments (#### headers)
    moments = []
    moment_pattern = re.compile(
        r'####\s+(.+?)\n\n'
        r'(?:>\s*\*\*SAY THIS:\*\*\n((?:>\s*.+\n?)+))?'
        r'\n*\*\*DO THIS:\*\*\n((?:- .+\n?)+)'
        r'\n*\*(.+?)\*',
        re.MULTILINE
    )

    # More flexible parsing: split by #### headers
    sections = re.split(r'\n---\n', text)
    sort_order = 0
    for section in sections:
        header_match = re.search(r'####\s+(.+)', section)
        if not header_match:
            continue

        moment_name = header_match.group(1).strip()

        # Extract SAY THIS (blockquote)
        say_match = re.search(r'>\s*\*\*SAY THIS:\*\*\n((?:>.*\n?)+)', section)
        say_this = ""
        if say_match:
            lines = say_match.group(1).strip().split("\n")
            say_this = " ".join(line.lstrip("> ").strip().strip('"').strip("'") for line in lines if line.strip())

        # Extract DO THIS (bullet list)
        do_match = re.search(r'\*\*DO THIS:\*\*\n((?:- .+\n?)+)', section)
        do_this = []
        if do_match:
            do_this = [line.lstrip("- ").strip() for line in do_match.group(1).strip().split("\n") if line.strip().startswith("-")]

        # Extract What this builds (italic line)
        builds_match = re.search(r'\*What this builds:(.+?)\*', section)
        what_this_builds = builds_match.group(1).strip() if builds_match else ""

        if say_this or do_this:
            moments.append({
                "moment_name": moment_name,
                "say_this": say_this,
                "do_this": do_this,
                "what_this_builds": what_this_builds,
                "sort_order": sort_order,
            })
            sort_order += 1

    # Extract weekly reflection questions
    reflection_match = re.search(r'## End of Week.*?\n((?:.*\n)*)', text)
    reflection_questions = []
    if reflection_match:
        for line in reflection_match.group(1).split("\n"):
            if "___" in line and line.startswith("-"):
                q = re.sub(r':?\s*_+\s*$', '', line.lstrip("- ")).strip()
                if q:
                    reflection_questions.append(q)

    return {
        "band": band,
        "week_number": week,
        "domain_code": domain_code,
        "title": f"Week {week}: {DOMAIN_MAP[domain_code]}",
        "parent_frame": parent_frame,
        "why_this_matters": why_this_matters,
        "focus_items": focus_items,
        "keep_doing": keep_doing,
        "what_you_need": what_you_need,
        "daily_moments": moments,
        "reflection_questions": reflection_questions,
    }


def parse_moment_cards(filepath: Path, band: int) -> list:
    """Parse moment cards markdown into structured data."""
    text = filepath.read_text(encoding="utf-8")
    cards = []

    # Split by ## headers (each card starts with ##)
    card_sections = re.split(r'\n## (?!All Cards)', text)

    for section in card_sections:
        if not section.strip() or "All Cards" in section[:50]:
            continue

        # Card title
        title_match = re.match(r'(.+?)(?:\n|$)', section.strip())
        if not title_match:
            continue
        moment_name = title_match.group(1).strip()

        # Domains tagged (handles both "Language" and "LANGUAGE" formats)
        domains_match = re.search(r'\*\*Domains?:\*\*\s*(.+)', section)
        domains_tagged = []
        if domains_match:
            domain_str = domains_match.group(1).upper()  # Normalize to uppercase
            domain_name_to_code = {
                "LANGUAGE": "LANG", "MOTOR": "MOTR", "NUMERACY": "NUMR",
                "SOCIAL": "SOCL", "ROUTINE": "ROUT",
                "SENSORY": "SENS", "INDEPENDENCE": "INDP",
            }
            for name, code in domain_name_to_code.items():
                if name in domain_str:
                    domains_tagged.append(code)

        # Post at
        post_match = re.search(r'Post at:\s*(.+?)(?:\n|$)', section)
        post_at = post_match.group(1).strip() if post_match else ""

        # SAY THIS
        say_match = re.search(r'>\s*\*\*SAY THIS:\*\*\n((?:>.*\n?)+)', section)
        say_this = ""
        if say_match:
            lines = say_match.group(1).strip().split("\n")
            say_this = " ".join(line.lstrip("> ").strip().strip('"').strip("'") for line in lines if line.strip())

        # DO THIS
        do_match = re.search(r'\*\*DO THIS:\*\*\n((?:- .+\n?)+)', section)
        do_this = []
        if do_match:
            do_this = [line.lstrip("- ").strip() for line in do_match.group(1).strip().split("\n") if line.strip().startswith("-")]

        # What this builds
        builds_match = re.search(r'\*\*What this builds:\*\*\s*(.+?)(?:\n|$)', section)
        what_this_builds = builds_match.group(1).strip() if builds_match else ""

        # Closing line (italic at end)
        closing_match = re.findall(r'\n\*([^*]+)\*\s*$', section)
        closing_line = closing_match[-1].strip() if closing_match else ""

        if moment_name and (say_this or do_this):
            # Clean "During " prefix
            clean_name = re.sub(r'^During\s+', '', moment_name)
            cards.append({
                "band": band,
                "moment_name": clean_name,
                "domains_tagged": domains_tagged,
                "say_this": say_this,
                "do_this": do_this,
                "what_this_builds": what_this_builds,
                "post_at": post_at,
                "closing_line": closing_line,
            })

    return cards


def parse_rhythm_sheet(filepath: Path, band: int) -> dict:
    """Parse rhythm sheet markdown into structured data."""
    text = filepath.read_text(encoding="utf-8")
    sections = []

    for tod in ["MORNING", "MIDDAY", "EVENING"]:
        match = re.search(rf'### {tod}\n\n((?:- .+\n?)+)\n\n\*(.+?)\*', text)
        if match:
            items = [line.lstrip("- ").strip() for line in match.group(1).strip().split("\n") if line.strip().startswith("-")]
            what_is_built = match.group(2).replace("What is being built: ", "").strip()
            sections.append({
                "time_of_day": tod,
                "items": items,
                "what_is_built": what_is_built,
            })

    # Weekly check-in questions
    checkin_match = re.search(r'### WEEKLY CHECK-IN\n\n.*?\n\n((?:- .+\n?)+)', text, re.DOTALL)
    checkin = []
    if checkin_match:
        for line in checkin_match.group(1).split("\n"):
            if line.strip().startswith("-"):
                q = re.sub(r'\s*_+\s*$', '', line.lstrip("- ")).strip()
                if q:
                    checkin.append(q)

    return {
        "band": band,
        "sections": sections,
        "weekly_checkin": checkin,
    }


def parse_milestones(filepath: Path, band: int) -> list:
    """Parse milestone tracker markdown into structured data."""
    text = filepath.read_text(encoding="utf-8")
    milestones = []

    domain_code_map = {
        "Language Acquisition": "LANG",
        "Motor Development": "MOTR",
        "Numeracy Roots": "NUMR",
        "Social-Emotional Foundation": "SOCL",
        "Routine & Habit Formation": "ROUT",
        "Sensory & Environmental Awareness": "SENS",
        "Independence & Practical Life": "INDP",
    }

    current_domain = None
    sort_order = 0

    for line in text.split("\n"):
        # Check for domain header — supports both "### Domain N: Name" and "### Name"
        domain_match = re.match(r'###\s+(?:Domain \d+:\s*)?(.+)', line)
        if domain_match:
            domain_name = domain_match.group(1).strip()
            if domain_name in domain_code_map:
                current_domain = domain_code_map[domain_name]
                continue

        # Check for table row (milestone)
        if current_domain and line.startswith("|") and "---" not in line and "Milestone" not in line:
            parts = [p.strip() for p in line.split("|")]
            parts = [p for p in parts if p]  # Remove empty strings
            if len(parts) >= 2:
                description = parts[0].strip()
                typical_range = parts[1].strip()
                if description and typical_range and "Date" not in typical_range:
                    milestones.append({
                        "band": band,
                        "domain_code": current_domain,
                        "description": description,
                        "typical_range": typical_range,
                        "sort_order": sort_order,
                    })
                    sort_order += 1

    return milestones


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_guides = []
    all_cards = []
    all_rhythms = []
    all_milestones = []

    for band, dir_name in BAND_DIRS.items():
        band_dir = CONTENT_DIR / dir_name
        if not band_dir.exists():
            print(f"Warning: {band_dir} not found, skipping")
            continue

        # Parse weekly guides
        for week in range(1, 8):
            domain_code = WEEK_DOMAINS[week]
            filename = f"PTR-B{band}-W{week}-{domain_code}.md"
            filepath = band_dir / filename
            if filepath.exists():
                guide = parse_weekly_guide(filepath, band, week)
                all_guides.append(guide)
                print(f"  Parsed: {filename} ({len(guide['daily_moments'])} moments)")
            else:
                print(f"  Missing: {filename}")

        # Parse moment cards
        cards_file = band_dir / f"PTR-B{band}-Cards.md"
        if cards_file.exists():
            cards = parse_moment_cards(cards_file, band)
            all_cards.extend(cards)
            print(f"  Parsed: {cards_file.name} ({len(cards)} cards)")

        # Parse rhythm sheet
        rhythm_file = band_dir / f"PTR-B{band}-Rhythm.md"
        if rhythm_file.exists():
            rhythm = parse_rhythm_sheet(rhythm_file, band)
            all_rhythms.append(rhythm)
            print(f"  Parsed: {rhythm_file.name} ({len(rhythm['sections'])} sections)")

        # Parse milestones
        miles_file = band_dir / f"PTR-B{band}-Milestones.md"
        if miles_file.exists():
            miles = parse_milestones(miles_file, band)
            all_milestones.extend(miles)
            print(f"  Parsed: {miles_file.name} ({len(miles)} milestones)")

    # Write output files
    with open(OUTPUT_DIR / "weekly-guides.json", "w") as f:
        json.dump(all_guides, f, indent=2)
    print(f"\nWrote {len(all_guides)} weekly guides")

    with open(OUTPUT_DIR / "moment-cards.json", "w") as f:
        json.dump(all_cards, f, indent=2)
    print(f"Wrote {len(all_cards)} moment cards")

    with open(OUTPUT_DIR / "rhythm-sheets.json", "w") as f:
        json.dump(all_rhythms, f, indent=2)
    print(f"Wrote {len(all_rhythms)} rhythm sheets")

    with open(OUTPUT_DIR / "milestones.json", "w") as f:
        json.dump(all_milestones, f, indent=2)
    print(f"Wrote {len(all_milestones)} milestones")


if __name__ == "__main__":
    main()
